from __future__ import annotations

from collections.abc import Generator
from datetime import datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.db.database import engine, get_db
from app.main import app
from app.models.ai_analysis import AIAnalysis
from app.models.job_application import JobApplication
from app.models.resume import Resume
from app.models.user import User


@pytest.fixture(autouse=True)
def no_openai_api_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)


@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    connection = engine.connect()
    outer_transaction = connection.begin()
    session = Session(bind=connection, join_transaction_mode="create_savepoint")

    try:
        yield session
    finally:
        session.close()
        if outer_transaction.is_active:
            outer_transaction.rollback()
        connection.close()


@pytest.fixture
def client(db_session: Session) -> Generator[TestClient, None, None]:
    def override_get_db() -> Generator[Session, None, None]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.fixture
def user_a(db_session: Session) -> User:
    user = User(
        id=2_000_001,
        full_name="Test User A",
        email="ai-analysis-user-a@example.invalid",
        password_hash="not-used-in-tests",
    )
    db_session.add(user)
    db_session.flush()
    return user


@pytest.fixture
def user_b(db_session: Session) -> User:
    user = User(
        id=2_000_002,
        full_name="Test User B",
        email="ai-analysis-user-b@example.invalid",
        password_hash="not-used-in-tests",
    )
    db_session.add(user)
    db_session.flush()
    return user


@pytest.fixture
def auth_headers_a(user_a: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(user_a.id)}"}


@pytest.fixture
def application_a(db_session: Session, user_a: User) -> JobApplication:
    application = JobApplication(
        id=2_000_101,
        user_id=user_a.id,
        company="Acme",
        position="Backend Developer",
        status="Saved",
        job_description=(
            "Seeking a Python backend developer with FastAPI, PostgreSQL, AWS, "
            "and Redis experience."
        ),
    )
    db_session.add(application)
    db_session.flush()
    return application


@pytest.fixture
def application_b(db_session: Session, user_b: User) -> JobApplication:
    application = JobApplication(
        id=2_000_102,
        user_id=user_b.id,
        company="Other Company",
        position="Platform Engineer",
        status="Saved",
        job_description="Seeking a platform engineer with cloud experience.",
    )
    db_session.add(application)
    db_session.flush()
    return application


@pytest.fixture
def resume_a(db_session: Session, user_a: User) -> Resume:
    resume = Resume(
        id=2_000_201,
        user_id=user_a.id,
        title="Resume A",
        file_url="resume-a.pdf",
    )
    db_session.add(resume)
    db_session.flush()
    return resume


@pytest.fixture
def resume_b(db_session: Session, user_b: User) -> Resume:
    resume = Resume(
        id=2_000_202,
        user_id=user_b.id,
        title="Resume B",
        file_url="resume-b.pdf",
    )
    db_session.add(resume)
    db_session.flush()
    return resume


@pytest.fixture
def analysis_a(
    db_session: Session,
    application_a: JobApplication,
    resume_a: Resume,
) -> AIAnalysis:
    analysis = AIAnalysis(
        id=2_000_301,
        job_application_id=application_a.id,
        resume_id=resume_a.id,
        match_score=82,
        details={
            "summary": "Strong backend profile with relevant technologies.",
            "strengths": ["Python", "FastAPI", "PostgreSQL"],
            "missing_skills": ["AWS", "Redis"],
            "recommendations": ["Highlight FastAPI projects more clearly."],
        },
        created_at=datetime(2026, 8, 15, 10, 0, 0),
    )
    db_session.add(analysis)
    db_session.flush()
    return analysis


@pytest.fixture
def analysis_b(
    db_session: Session,
    application_b: JobApplication,
    resume_b: Resume,
) -> AIAnalysis:
    analysis = AIAnalysis(
        id=2_000_302,
        job_application_id=application_b.id,
        resume_id=resume_b.id,
        match_score=61,
        details={
            "summary": "Partial platform engineering match.",
            "strengths": ["Python"],
            "missing_skills": ["Kubernetes"],
            "recommendations": ["Add cloud infrastructure examples."],
        },
        created_at=datetime(2026, 8, 15, 11, 0, 0),
    )
    db_session.add(analysis)
    db_session.flush()
    return analysis
