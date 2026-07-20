from __future__ import annotations

import datetime

from pydantic import BaseModel, ConfigDict


class AIAnalysisResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    job_application_id: int
    resume_id: int
    match_score: int | None
    feedback: str | None
    created_at: datetime.datetime
