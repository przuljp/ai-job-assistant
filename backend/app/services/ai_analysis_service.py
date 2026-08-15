"""Application workflow for resume-to-job AI analysis."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.ai import analyzer as ai_analyzer
from app.ai.client import (
    AIConfigurationError,
    AIInvalidResponseError,
    AIModelRefusalError,
    AIProviderError,
)
from app.models.ai_analysis import AIAnalysis
from app.models.job_application import JobApplication
from app.models.resume import Resume
from app.schemas.ai_analysis import AIAnalysisResponse, AIAnalysisSummaryResponse
from app.services import job_application_service, resume_service
from app.services.document_extraction_service import DocumentExtractionError


class AnalysisResourceNotFoundError(LookupError):
    """Raised when an owned application or resume cannot be found."""


class MissingJobDescriptionError(ValueError):
    """Raised when an application has no meaningful job description."""


class ResumeExtractionError(ValueError):
    """Raised when the selected resume cannot provide usable text."""


class AnalysisRefusedError(ValueError):
    """Raised when the model refuses the supplied analysis content."""


class AnalysisNotConfiguredError(RuntimeError):
    """Raised when the AI provider is not configured."""


class AnalysisUnavailableError(RuntimeError):
    """Raised when the AI provider does not return a usable result."""


def _to_analysis_response(analysis: AIAnalysis) -> AIAnalysisResponse:
    """Flatten persisted JSONB details into the public response schema."""
    return AIAnalysisResponse(
        id=analysis.id,
        job_application_id=analysis.job_application_id,
        resume_id=analysis.resume_id,
        match_score=analysis.match_score,
        created_at=analysis.created_at,
        **analysis.details,
    )


def get_analyses_for_application(
    db: Session,
    user_id: int,
    application_id: int,
) -> list[AIAnalysisSummaryResponse]:
    """Return newest-first summaries for an application owned by the user."""
    application = job_application_service.get_application_for_user(
        db, application_id, user_id
    )
    if application is None:
        raise AnalysisResourceNotFoundError

    stmt = (
        select(AIAnalysis)
        .join(Resume, AIAnalysis.resume_id == Resume.id)
        .where(
            AIAnalysis.job_application_id == application.id,
            Resume.user_id == user_id,
        )
        .order_by(AIAnalysis.created_at.desc().nulls_last(), AIAnalysis.id.desc())
    )
    analyses = db.execute(stmt).scalars().all()
    return [
        AIAnalysisSummaryResponse.model_validate(
            {
                "id": analysis.id,
                "job_application_id": analysis.job_application_id,
                "resume_id": analysis.resume_id,
                "match_score": analysis.match_score,
                "created_at": analysis.created_at,
            }
        )
        for analysis in analyses
    ]


def get_analysis_for_user(
    db: Session,
    user_id: int,
    analysis_id: int,
) -> AIAnalysisResponse | None:
    """Return an analysis only when both related resources belong to the user."""
    stmt = (
        select(AIAnalysis)
        .join(JobApplication, AIAnalysis.job_application_id == JobApplication.id)
        .join(Resume, AIAnalysis.resume_id == Resume.id)
        .where(
            AIAnalysis.id == analysis_id,
            JobApplication.user_id == user_id,
            Resume.user_id == user_id,
        )
    )
    analysis = db.execute(stmt).scalar_one_or_none()
    return _to_analysis_response(analysis) if analysis is not None else None


def analyze_application(
    db: Session,
    user_id: int,
    application_id: int,
    resume_id: int,
) -> AIAnalysisResponse:
    """Analyze two owned resources, persist the result, and return it flat."""
    application = job_application_service.get_application_for_user(
        db, application_id, user_id
    )
    if application is None:
        raise AnalysisResourceNotFoundError

    resume = resume_service.get_resume_for_user(db, resume_id, user_id)
    if resume is None:
        raise AnalysisResourceNotFoundError

    job_description = (application.job_description or "").strip()
    if sum(character.isalnum() for character in job_description) < 10:
        raise MissingJobDescriptionError(
            "The job application needs a meaningful job description."
        )

    try:
        resume_text = resume_service.extract_resume_text(resume)
    except DocumentExtractionError as exc:
        raise ResumeExtractionError(str(exc)) from exc

    try:
        result = ai_analyzer.analyze_resume_against_job(
            resume_text, job_description
        )
    except AIModelRefusalError as exc:
        raise AnalysisRefusedError(
            "The AI model could not analyze the supplied content."
        ) from exc
    except AIConfigurationError as exc:
        raise AnalysisNotConfiguredError("AI analysis is not configured.") from exc
    except (AIProviderError, AIInvalidResponseError) as exc:
        raise AnalysisUnavailableError(
            "AI analysis is temporarily unavailable."
        ) from exc

    analysis = AIAnalysis(
        job_application_id=application.id,
        resume_id=resume_id,
        match_score=result.match_score,
        details=result.model_dump(exclude={"match_score"}, mode="json"),
    )
    db.add(analysis)
    try:
        db.commit()
        db.refresh(analysis)
    except SQLAlchemyError:
        db.rollback()
        raise

    return _to_analysis_response(analysis)
