"""HTTP endpoints for the Resume resource.

Every endpoint requires a valid JWT and scopes all reads/writes to
current_user.id. No filesystem or session handling happens here — it's all
delegated to resume_service.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.database import get_db
from app.models.resume import Resume
from app.models.user import User
from app.schemas.resume import ResumeResponse
from app.services import resume_service
from app.services.resume_service import InvalidResumeFile

router = APIRouter(prefix="/resumes", tags=["resumes"])

_NOT_FOUND = HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found.")


@router.post(
    "/upload",
    response_model=ResumeResponse,
    status_code=status.HTTP_201_CREATED,
)
def upload_resume(
    file: UploadFile = File(...),
    title: str | None = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Resume:
    try:
        return resume_service.upload_resume(db, current_user.id, file, title)
    except InvalidResumeFile as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc


@router.get("", response_model=list[ResumeResponse])
def list_resumes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Resume]:
    return resume_service.get_resumes_for_user(db, current_user.id)


@router.get("/{resume_id}", response_model=ResumeResponse)
def get_resume(
    resume_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Resume:
    resume = resume_service.get_resume_for_user(db, resume_id, current_user.id)
    if resume is None:
        raise _NOT_FOUND
    return resume


@router.delete("/{resume_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_resume(
    resume_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    deleted = resume_service.delete_resume(db, resume_id, current_user.id)
    if not deleted:
        raise _NOT_FOUND
