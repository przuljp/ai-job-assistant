"""Aggregation queries for the authenticated user's dashboard.

Read-only, and produces a DashboardResponse directly rather than an ORM
model: a dashboard is a view over multiple queries, not a single backing
row, so there's no lower-level entity for the router to receive and reshape.
"""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.job_application import JobApplication
from app.schemas.dashboard import DashboardResponse, LatestApplication

_STATUS_FIELD_MAP = {
    "Saved": "saved_count",
    "Applied": "applied_count",
    "Interview": "interview_count",
    "Accepted": "accepted_count",
    "Rejected": "rejected_count",
}


def get_dashboard(db: Session, user_id: int) -> DashboardResponse:
    """Build the dashboard summary for `user_id`.

    Two queries total: one grouped COUNT for the per-status breakdown, one
    LIMIT-5 for the recent applications — not five separate COUNT queries,
    and not "fetch every row and count in Python".
    """
    status_counts_stmt = (
        select(JobApplication.status, func.count())
        .where(JobApplication.user_id == user_id)
        .group_by(JobApplication.status)
    )
    counts_by_status = dict(db.execute(status_counts_stmt).all())

    counts = dict.fromkeys(_STATUS_FIELD_MAP.values(), 0)
    for status_value, count in counts_by_status.items():
        field = _STATUS_FIELD_MAP.get(status_value)
        if field is not None:
            counts[field] = count

    latest_stmt = (
        select(JobApplication)
        .where(JobApplication.user_id == user_id)
        .order_by(JobApplication.created_at.desc())
        .limit(5)
    )
    latest = db.execute(latest_stmt).scalars().all()

    return DashboardResponse(
        total_applications=sum(counts_by_status.values()),
        latest_applications=[LatestApplication.model_validate(app) for app in latest],
        **counts,
    )
