"""Business logic for JobApplication persistence, decoupled from FastAPI and HTTP concerns.

Every function here is scoped by `user_id`. That's deliberate: ownership
enforcement lives at this layer, not in the router, so any future caller
(a different router, a background job, a script) gets the same guarantee
for free instead of having to re-implement it.
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.job_application import JobApplication
from app.schemas.job_application import JobApplicationCreate, JobApplicationUpdate


def create_application(
    db: Session, user_id: int, data: JobApplicationCreate
) -> JobApplication:
    """Persist a new job application owned by `user_id`.

    `user_id` is a plain function argument, never read off `data` — the
    schema has no user_id field, so the router is the only place ownership
    is decided, and it always sources it from the authenticated JWT.
    """
    application = JobApplication(
        user_id=user_id,
        company=data.company,
        position=data.position,
        job_url=str(data.job_url) if data.job_url is not None else None,
        job_description=data.job_description,
        status=data.status,
        application_date=data.application_date,
        notes=data.notes,
    )
    db.add(application)
    db.commit()
    db.refresh(application)
    return application


def get_applications_for_user(
    db: Session, user_id: int, skip: int = 0, limit: int = 100
) -> list[JobApplication]:
    """Fetch a page of `user_id`'s applications, newest first."""
    stmt = (
        select(JobApplication)
        .where(JobApplication.user_id == user_id)
        .order_by(JobApplication.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    return list(db.execute(stmt).scalars().all())


def get_application_for_user(
    db: Session, application_id: int, user_id: int
) -> JobApplication | None:
    """Fetch a single application, but only if it belongs to `user_id`.

    The WHERE clause filters on id AND user_id together, so "doesn't exist"
    and "exists but belongs to someone else" both come back as None. The
    router turns either case into the same 404 — a caller can't tell an
    application id belongs to another user just by probing it.
    """
    stmt = select(JobApplication).where(
        JobApplication.id == application_id,
        JobApplication.user_id == user_id,
    )
    return db.execute(stmt).scalar_one_or_none()


def update_application(
    db: Session, application_id: int, user_id: int, data: JobApplicationUpdate
) -> JobApplication | None:
    """Apply a partial update to an application owned by `user_id`.

    Returns None if no such application exists for this user (caller turns
    that into a 404). Only fields the client actually set are touched
    (`exclude_unset`), so omitted fields keep their current value instead
    of being reset to null. `id`, `user_id`, and `created_at` aren't fields
    on JobApplicationUpdate at all, so there's no way to pass them in.
    """
    application = get_application_for_user(db, application_id, user_id)
    if application is None:
        return None

    updates = data.model_dump(exclude_unset=True)
    if updates.get("job_url") is not None:
        updates["job_url"] = str(updates["job_url"])

    for field, value in updates.items():
        setattr(application, field, value)

    db.commit()
    db.refresh(application)
    return application


def delete_application(db: Session, application_id: int, user_id: int) -> bool:
    """Delete an application owned by `user_id`.

    Returns True if a row was deleted, False if no such application exists
    for this user — the router turns False into a 404.
    """
    application = get_application_for_user(db, application_id, user_id)
    if application is None:
        return False

    db.delete(application)
    db.commit()
    return True
