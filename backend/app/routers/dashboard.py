"""HTTP endpoint for the user Dashboard.

Nothing but auth + delegate + return: the service already scopes every
query to current_user.id, and a brand-new user with zero applications is a
valid 200 (all zeros, empty list) rather than an error case to handle here.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.database import get_db
from app.models.user import User
from app.schemas.dashboard import DashboardResponse
from app.services import dashboard_service

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardResponse)
def get_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DashboardResponse:
    return dashboard_service.get_dashboard(db, current_user.id)
