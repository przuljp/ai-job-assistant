"""HTTP endpoint for resume-to-job AI analysis."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.database import get_db
from app.models.user import User
from app.schemas.ai_analysis import (
    AIAnalysisRequest,
    AIAnalysisResponse,
    AIAnalysisSummaryResponse,
)
from app.services import ai_analysis_service

router = APIRouter(tags=["ai-analysis"])


@router.post(
    "/applications/{application_id}/analyze",
    response_model=AIAnalysisResponse,
    status_code=status.HTTP_201_CREATED,
)
def analyze_job_application(
    application_id: int,
    request: AIAnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AIAnalysisResponse:
    try:
        return ai_analysis_service.analyze_application(
            db=db,
            user_id=current_user.id,
            application_id=application_id,
            resume_id=request.resume_id,
        )
    except ai_analysis_service.AnalysisResourceNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job application or resume not found.",
        ) from exc
    except ai_analysis_service.MissingJobDescriptionError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except ai_analysis_service.ResumeExtractionError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(exc),
        ) from exc
    except ai_analysis_service.AnalysisRefusedError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(exc),
        ) from exc
    except ai_analysis_service.AnalysisNotConfiguredError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI analysis is not configured.",
        ) from exc
    except ai_analysis_service.AnalysisUnavailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI analysis is temporarily unavailable.",
        ) from exc


@router.get(
    "/applications/{application_id}/analyses",
    response_model=list[AIAnalysisSummaryResponse],
)
def list_application_analyses(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[AIAnalysisSummaryResponse]:
    try:
        return ai_analysis_service.get_analyses_for_application(
            db=db,
            user_id=current_user.id,
            application_id=application_id,
        )
    except ai_analysis_service.AnalysisResourceNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job application not found.",
        ) from exc


@router.get(
    "/analyses/{analysis_id}",
    response_model=AIAnalysisResponse,
)
def get_analysis(
    analysis_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AIAnalysisResponse:
    analysis = ai_analysis_service.get_analysis_for_user(
        db=db,
        user_id=current_user.id,
        analysis_id=analysis_id,
    )
    if analysis is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="AI analysis not found.",
        )
    return analysis
