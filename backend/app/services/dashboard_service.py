"""Aggregation queries for the authenticated user's dashboard."""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.ai_analysis import AIAnalysis
from app.models.job_application import JobApplication
from app.models.resume import Resume
from app.schemas.dashboard import DashboardResponse, LatestApplication


def get_dashboard(db: Session, user_id: int) -> DashboardResponse:
    """Build a database-aggregated dashboard summary for ``user_id``."""
    application_counts_stmt = select(
        func.count(JobApplication.id).label("total_applications"),
        func.count(JobApplication.id)
        .filter(JobApplication.status == "Saved")
        .label("saved_count"),
        func.count(JobApplication.id)
        .filter(JobApplication.status == "Applied")
        .label("applied_count"),
        func.count(JobApplication.id)
        .filter(JobApplication.status == "Interview")
        .label("interview_count"),
        func.count(JobApplication.id)
        .filter(JobApplication.status == "Rejected")
        .label("rejected_count"),
        func.count(JobApplication.id)
        .filter(JobApplication.status == "Accepted")
        .label("accepted_count"),
    ).where(JobApplication.user_id == user_id)
    application_counts = db.execute(application_counts_stmt).one()

    resume_count_stmt = select(func.count(Resume.id)).where(Resume.user_id == user_id)
    resume_count = db.scalar(resume_count_stmt) or 0

    analysis_count_stmt = (
        select(func.count(AIAnalysis.id))
        .join(JobApplication, AIAnalysis.job_application_id == JobApplication.id)
        .join(Resume, AIAnalysis.resume_id == Resume.id)
        .where(
            JobApplication.user_id == user_id,
            Resume.user_id == user_id,
        )
    )
    analysis_count = db.scalar(analysis_count_stmt) or 0

    latest_stmt = (
        select(JobApplication)
        .where(JobApplication.user_id == user_id)
        .order_by(
            JobApplication.created_at.desc().nulls_last(),
            JobApplication.id.desc(),
        )
        .limit(5)
    )
    latest = db.execute(latest_stmt).scalars().all()

    return DashboardResponse(
        total_applications=application_counts.total_applications,
        saved_count=application_counts.saved_count,
        applied_count=application_counts.applied_count,
        interview_count=application_counts.interview_count,
        rejected_count=application_counts.rejected_count,
        accepted_count=application_counts.accepted_count,
        resume_count=resume_count,
        analysis_count=analysis_count,
        latest_applications=[LatestApplication.model_validate(app) for app in latest],
    )
