"""Business logic for Resume persistence and local file storage.

File handling (validation, saving, deleting) and database operations both
live here, per the "routers stay thin" rule — a router should never touch
the filesystem or a SQLAlchemy session directly.
"""

from __future__ import annotations

import shutil
from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.resume import Resume
from app.services import document_extraction_service

# backend/uploads/resumes — resolved from this file's location rather than
# the process's current working directory, so it's the same path whether
# uvicorn is launched from backend/ or elsewhere.
UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads" / "resumes"

_ALLOWED_CONTENT_TYPE = "application/pdf"
_ALLOWED_EXTENSION = ".pdf"


class InvalidResumeFile(ValueError):
    """Raised when an uploaded file fails PDF validation."""


def _validate_pdf(file: UploadFile) -> None:
    if not file.filename:
        raise InvalidResumeFile("Uploaded file must have a filename.")
    if Path(file.filename).suffix.lower() != _ALLOWED_EXTENSION:
        raise InvalidResumeFile("Only PDF files are allowed.")
    if file.content_type != _ALLOWED_CONTENT_TYPE:
        raise InvalidResumeFile("Only PDF files are allowed.")


def _save_file(file: UploadFile) -> str:
    """Stream the upload to disk under a fresh UUID filename.

    Uses `shutil.copyfileobj` on the underlying SpooledTemporaryFile rather
    than `file.read()` into a bytes object, so memory use stays bounded
    regardless of file size. Returns the generated filename (not full path)
    — that's what gets stored in the database.
    """
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    stored_filename = f"{uuid4().hex}{_ALLOWED_EXTENSION}"
    destination = UPLOAD_DIR / stored_filename
    with destination.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return stored_filename


def upload_resume(
    db: Session, user_id: int, file: UploadFile, title: str | None = None
) -> Resume:
    """Validate, save to disk, and record a new resume owned by `user_id`.

    Raises InvalidResumeFile if the upload isn't a PDF or has no filename —
    the router translates that into a 400. `title` defaults to the
    original filename (without extension) when the client doesn't supply one.
    """
    _validate_pdf(file)
    stored_filename = _save_file(file)

    resume = Resume(
        user_id=user_id,
        title=title or Path(file.filename).stem,
        file_url=stored_filename,
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)
    return resume


def get_resumes_for_user(db: Session, user_id: int) -> list[Resume]:
    """Fetch all of `user_id`'s resumes, most recently uploaded first."""
    stmt = (
        select(Resume)
        .where(Resume.user_id == user_id)
        .order_by(Resume.uploaded_at.desc())
    )
    return list(db.execute(stmt).scalars().all())


def get_resume_for_user(db: Session, resume_id: int, user_id: int) -> Resume | None:
    """Fetch a single resume, but only if it belongs to `user_id`.

    Same pattern as JobApplication: "doesn't exist" and "belongs to someone
    else" both come back as None, so the router can 404 both identically.
    """
    stmt = select(Resume).where(Resume.id == resume_id, Resume.user_id == user_id)
    return db.execute(stmt).scalar_one_or_none()


def extract_resume_text_for_user(
    db: Session, resume_id: int, user_id: int
) -> str | None:
    """Extract text only when the selected resume belongs to ``user_id``.

    ``None`` deliberately represents both a missing resume and one owned by
    another user, preserving the module's existing non-disclosing ownership
    behavior. Expected file/PDF failures are raised by the document service.
    """
    resume = get_resume_for_user(db, resume_id, user_id)
    if resume is None:
        return None

    file_path = UPLOAD_DIR / resume.file_url
    return document_extraction_service.extract_pdf_text(file_path)


def delete_resume(db: Session, resume_id: int, user_id: int) -> bool:
    """Delete a resume (DB row + file) owned by `user_id`.

    Returns True if deleted, False if no such resume exists for this user.
    The DB row is removed first since that's what the app actually reflects
    to the user; the file removal is best-effort afterward (`missing_ok`
    swallows the case where it's already gone).
    """
    resume = get_resume_for_user(db, resume_id, user_id)
    if resume is None:
        return False

    file_path = UPLOAD_DIR / resume.file_url
    db.delete(resume)
    db.commit()

    file_path.unlink(missing_ok=True)
    return True
