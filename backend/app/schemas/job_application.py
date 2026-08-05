from __future__ import annotations

import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl

# Mirrors the `status_check` CHECK constraint on job_applications.status in
# the database. Keeping it here means an invalid status is rejected as a 422
# at the API boundary instead of surfacing as a raw IntegrityError/500.
JobApplicationStatus = Literal["Saved", "Applied", "Interview", "Rejected", "Accepted"]


class JobApplicationCreate(BaseModel):
    company: str = Field(min_length=1, max_length=150)
    position: str = Field(min_length=1, max_length=150)
    job_url: HttpUrl | None = None
    job_description: str | None = None
    status: JobApplicationStatus
    application_date: datetime.date | None = None
    notes: str | None = None


class JobApplicationUpdate(BaseModel):
    company: str | None = Field(default=None, min_length=1, max_length=150)
    position: str | None = Field(default=None, min_length=1, max_length=150)
    job_url: HttpUrl | None = None
    job_description: str | None = None
    status: JobApplicationStatus | None = None
    application_date: datetime.date | None = None
    notes: str | None = None


class JobApplicationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    company: str
    position: str
    job_url: str | None
    job_description: str | None
    status: JobApplicationStatus
    application_date: datetime.date | None
    notes: str | None
    created_at: datetime.datetime
    updated_at: datetime.datetime
