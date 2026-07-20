from __future__ import annotations

import datetime

from pydantic import BaseModel, ConfigDict, Field


class ResumeCreate(BaseModel):
    title: str = Field(min_length=1, max_length=100)
    file_url: str = Field(min_length=1)


class ResumeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    title: str
    file_url: str
    uploaded_at: datetime.datetime
