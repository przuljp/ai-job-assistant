"""Prepare and validate the resume-to-job analysis task."""

from __future__ import annotations

from pydantic import ValidationError

from app.ai import client
from app.ai.client import AIInvalidResponseError
from app.ai.prompts import RESUME_JOB_MATCH_SYSTEM_PROMPT
from app.schemas.ai_analysis import AIAnalysisResult


class InvalidAnalysisInput(ValueError):
    """Raised when analysis input contains no meaningful text."""


def _require_meaningful_text(value: str, label: str) -> str:
    normalized = value.strip()
    if sum(character.isalnum() for character in normalized) < 10:
        raise InvalidAnalysisInput(f"{label} contains no meaningful text.")
    return normalized


def analyze_resume_against_job(
    resume_text: str, job_description: str
) -> AIAnalysisResult:
    """Return a validated comparison of resume text and a job description."""
    resume_text = _require_meaningful_text(resume_text, "Resume")
    job_description = _require_meaningful_text(job_description, "Job description")

    user_prompt = f"""\
Compare the following resume with the following job description.

<resume>
{resume_text}
</resume>

<job_description>
{job_description}
</job_description>
"""
    result = client.request_structured_output(
        system_prompt=RESUME_JOB_MATCH_SYSTEM_PROMPT,
        user_prompt=user_prompt,
        response_model=AIAnalysisResult,
    )
    try:
        return AIAnalysisResult.model_validate(result)
    except ValidationError as exc:
        raise AIInvalidResponseError(
            "The provider returned an invalid structured analysis."
        ) from exc
