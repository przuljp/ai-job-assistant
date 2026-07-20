from __future__ import annotations

import datetime

from pydantic import BaseModel, ConfigDict, Field, HttpUrl


class JobApplicationCreate(BaseModel):
    company: str = Field(min_length=1, max_length=150)
    position: str = Field(min_length=1, max_length=150)
    job_url: HttpUrl | None = None
    job_description: str | None = None
    status: str = Field(min_length=1, max_length=20)
    application_date: datetime.date | None = None
    notes: str | None = None


class JobApplicationUpdate(BaseModel):
    company: str | None = Field(default=None, min_length=1, max_length=150)
    position: str | None = Field(default=None, min_length=1, max_length=150)
    job_url: HttpUrl | None = None
    job_description: str | None = None
    status: str | None = Field(default=None, min_length=1, max_length=20)
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
    status: str
    application_date: datetime.date | None
    notes: str | None
    created_at: datetime.datetime
    updated_at: datetime.datetime
