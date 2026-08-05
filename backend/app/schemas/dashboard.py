from __future__ import annotations

import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.job_application import JobApplicationStatus


class LatestApplication(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company: str
    position: str
    status: JobApplicationStatus
    application_date: datetime.date | None


class DashboardResponse(BaseModel):
    total_applications: int
    saved_count: int
    applied_count: int
    interview_count: int
    accepted_count: int
    rejected_count: int
    latest_applications: list[LatestApplication]
