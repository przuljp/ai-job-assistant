"""HTTP endpoints for the JobApplication resource.

Every endpoint requires a valid JWT (`Depends(get_current_user)`) and scopes
all reads/writes to `current_user.id`. None of these functions decide
ownership themselves — they hand `current_user.id` to the service layer and
trust its return value (None/False means "not found or not yours").
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.database import get_db
from app.models.job_application import JobApplication
from app.models.user import User
from app.schemas.job_application import (
    JobApplicationCreate,
    JobApplicationResponse,
    JobApplicationUpdate,
)
from app.services import job_application_service

router = APIRouter(prefix="/applications", tags=["job-applications"])

_NOT_FOUND = HTTPException(
    status_code=status.HTTP_404_NOT_FOUND,
    detail="Job application not found.",
)


@router.post(
    "",
    response_model=JobApplicationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_job_application(
    application_data: JobApplicationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> JobApplication:
    return job_application_service.create_application(
        db, current_user.id, application_data
    )


@router.get("", response_model=list[JobApplicationResponse])
def list_job_applications(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[JobApplication]:
    return job_application_service.get_applications_for_user(
        db, current_user.id, skip=skip, limit=limit
    )


@router.get("/{application_id}", response_model=JobApplicationResponse)
def get_job_application(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> JobApplication:
    application = job_application_service.get_application_for_user(
        db, application_id, current_user.id
    )
    if application is None:
        raise _NOT_FOUND
    return application


@router.put("/{application_id}", response_model=JobApplicationResponse)
def update_job_application(
    application_id: int,
    application_data: JobApplicationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> JobApplication:
    application = job_application_service.update_application(
        db, application_id, current_user.id, application_data
    )
    if application is None:
        raise _NOT_FOUND
    return application


@router.delete("/{application_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job_application(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    deleted = job_application_service.delete_application(
        db, application_id, current_user.id
    )
    if not deleted:
        raise _NOT_FOUND
