from __future__ import annotations

import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints


NonEmptyString = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class AIAnalysisRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    resume_id: int = Field(gt=0)


class AIAnalysisResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    match_score: int = Field(ge=0, le=100)
    summary: NonEmptyString
    strengths: list[NonEmptyString]
    missing_skills: list[NonEmptyString]
    recommendations: list[NonEmptyString]


class AIAnalysisSummaryResponse(BaseModel):
    id: int
    job_application_id: int
    resume_id: int
    match_score: int = Field(ge=0, le=100)
    created_at: datetime.datetime


class AIAnalysisResponse(AIAnalysisResult):
    id: int
    job_application_id: int
    resume_id: int
    created_at: datetime.datetime
