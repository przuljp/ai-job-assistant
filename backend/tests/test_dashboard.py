from __future__ import annotations

from datetime import date, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.ai_analysis import AIAnalysis
from app.models.job_application import JobApplication
from app.models.resume import Resume
from app.models.user import User
from app.schemas.dashboard import DashboardResponse


def _add_application(
    db: Session,
    *,
    application_id: int,
    user_id: int,
    status: str,
    created_at: datetime,
) -> JobApplication:
    application = JobApplication(
        id=application_id,
        user_id=user_id,
        company=f"Company {application_id}",
        position=f"Position {application_id}",
        status=status,
        application_date=date(2026, 8, 15),
        created_at=created_at,
    )
    db.add(application)
    db.flush()
    return application


def test_dashboard_requires_authentication(client: TestClient) -> None:
    response = client.get("/dashboard")

    assert response.status_code == 401


def test_new_user_dashboard_is_empty(
    client: TestClient,
    auth_headers_a: dict[str, str],
) -> None:
    response = client.get("/dashboard", headers=auth_headers_a)

    assert response.status_code == 200
    assert response.json() == {
        "total_applications": 0,
        "saved_count": 0,
        "applied_count": 0,
        "interview_count": 0,
        "rejected_count": 0,
        "accepted_count": 0,
        "resume_count": 0,
        "analysis_count": 0,
        "latest_applications": [],
    }


def test_application_and_status_counts_are_user_scoped(
    client: TestClient,
    db_session: Session,
    auth_headers_a: dict[str, str],
    user_a: User,
    application_a: JobApplication,
    application_b: JobApplication,
) -> None:
    statuses = ["Saved", "Applied", "Interview", "Rejected", "Accepted"]
    for offset, status in enumerate(statuses, start=1):
        _add_application(
            db_session,
            application_id=2_001_000 + offset,
            user_id=user_a.id,
            status=status,
            created_at=datetime(2026, 8, 10) + timedelta(hours=offset),
        )

    response = client.get("/dashboard", headers=auth_headers_a)

    assert response.status_code == 200
    payload = DashboardResponse.model_validate(response.json())
    assert payload.total_applications == 6
    assert payload.saved_count == 2
    assert payload.applied_count == 1
    assert payload.interview_count == 1
    assert payload.rejected_count == 1
    assert payload.accepted_count == 1
    assert application_b.id not in [item.id for item in payload.latest_applications]


def test_resume_count_is_user_scoped(
    client: TestClient,
    auth_headers_a: dict[str, str],
    resume_a: Resume,
    resume_b: Resume,
) -> None:
    response = client.get("/dashboard", headers=auth_headers_a)

    assert response.status_code == 200
    assert response.json()["resume_count"] == 1


def test_analysis_count_requires_both_owned_resources(
    client: TestClient,
    db_session: Session,
    auth_headers_a: dict[str, str],
    application_a: JobApplication,
    resume_b: Resume,
    analysis_a: AIAnalysis,
    analysis_b: AIAnalysis,
) -> None:
    cross_resume_analysis = AIAnalysis(
        id=2_001_301,
        job_application_id=application_a.id,
        resume_id=resume_b.id,
        match_score=50,
        details={
            "summary": "Must not be counted.",
            "strengths": [],
            "missing_skills": [],
            "recommendations": [],
        },
        created_at=datetime(2026, 8, 15, 13, 0, 0),
    )
    db_session.add(cross_resume_analysis)
    db_session.flush()

    response = client.get("/dashboard", headers=auth_headers_a)

    assert response.status_code == 200
    assert response.json()["analysis_count"] == 1


def test_latest_applications_are_limited_ordered_and_lightweight(
    client: TestClient,
    db_session: Session,
    auth_headers_a: dict[str, str],
    user_a: User,
    application_b: JobApplication,
) -> None:
    created = []
    for offset in range(7):
        created.append(
            _add_application(
                db_session,
                application_id=2_002_000 + offset,
                user_id=user_a.id,
                status="Saved",
                created_at=datetime(2026, 8, 1) + timedelta(days=offset),
            )
        )

    response = client.get("/dashboard", headers=auth_headers_a)

    assert response.status_code == 200
    latest = response.json()["latest_applications"]
    assert len(latest) == 5
    assert [item["id"] for item in latest] == [app.id for app in reversed(created[-5:])]
    assert application_b.id not in [item["id"] for item in latest]
    assert set(latest[0]) == {
        "id",
        "company",
        "position",
        "status",
        "application_date",
        "created_at",
    }
