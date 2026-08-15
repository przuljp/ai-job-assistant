from __future__ import annotations

from unittest.mock import Mock

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai import client as ai_client
from app.models.ai_analysis import AIAnalysis
from app.models.job_application import JobApplication
from app.models.resume import Resume
from app.schemas.ai_analysis import AIAnalysisResponse, AIAnalysisResult
from app.services import ai_analysis_service, resume_service
from app.services.document_extraction_service import UnreadablePDFError


@pytest.fixture
def analysis_result() -> AIAnalysisResult:
    return AIAnalysisResult(
        match_score=82,
        summary="Strong backend profile with relevant technologies.",
        strengths=["Python", "FastAPI", "PostgreSQL"],
        missing_skills=["AWS", "Redis"],
        recommendations=[
            "Highlight FastAPI projects more clearly.",
            "Mention any cloud experience.",
        ],
    )


def test_successful_analysis_is_returned_and_persisted(
    client: TestClient,
    db_session: Session,
    auth_headers_a: dict[str, str],
    application_a: JobApplication,
    resume_a: Resume,
    analysis_result: AIAnalysisResult,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    resume_text = "Python FastAPI PostgreSQL backend developer experience."
    extract_mock = Mock(return_value=resume_text)
    analyze_mock = Mock(return_value=analysis_result)
    monkeypatch.setattr(resume_service, "extract_resume_text", extract_mock)
    monkeypatch.setattr(
        ai_analysis_service.ai_analyzer,
        "analyze_resume_against_job",
        analyze_mock,
    )

    response = client.post(
        f"/applications/{application_a.id}/analyze",
        json={"resume_id": resume_a.id},
        headers=auth_headers_a,
    )

    assert response.status_code == 201
    payload = AIAnalysisResponse.model_validate(response.json())
    assert payload.job_application_id == application_a.id
    assert payload.resume_id == resume_a.id
    assert payload.match_score == analysis_result.match_score
    assert payload.summary == analysis_result.summary
    assert payload.strengths == analysis_result.strengths
    assert payload.missing_skills == analysis_result.missing_skills
    assert payload.recommendations == analysis_result.recommendations

    analysis = db_session.execute(select(AIAnalysis)).scalar_one()
    expected_details = analysis_result.model_dump(exclude={"match_score"})
    assert analysis.match_score == analysis_result.match_score
    assert analysis.details == expected_details
    assert "match_score" not in analysis.details
    extract_mock.assert_called_once_with(resume_a)
    analyze_mock.assert_called_once_with(resume_text, application_a.job_description)


def test_unauthenticated_request_returns_401(client: TestClient) -> None:
    response = client.post("/applications/1/analyze", json={"resume_id": 1})

    assert response.status_code == 401


@pytest.mark.parametrize(
    "body",
    [
        {"resume_id": 0},
        {"resume_id": -1},
        {"resume_id": 1, "user_id": 1},
    ],
)
def test_invalid_request_body_returns_422(
    client: TestClient,
    auth_headers_a: dict[str, str],
    application_a: JobApplication,
    body: dict[str, int],
) -> None:
    response = client.post(
        f"/applications/{application_a.id}/analyze",
        json=body,
        headers=auth_headers_a,
    )

    assert response.status_code == 422


def test_missing_application_returns_404(
    client: TestClient,
    auth_headers_a: dict[str, str],
    resume_a: Resume,
) -> None:
    response = client.post(
        "/applications/999999/analyze",
        json={"resume_id": resume_a.id},
        headers=auth_headers_a,
    )

    assert response.status_code == 404


def test_cross_user_application_returns_404(
    client: TestClient,
    auth_headers_a: dict[str, str],
    application_b: JobApplication,
    resume_a: Resume,
) -> None:
    response = client.post(
        f"/applications/{application_b.id}/analyze",
        json={"resume_id": resume_a.id},
        headers=auth_headers_a,
    )

    assert response.status_code == 404


def test_missing_resume_returns_404(
    client: TestClient,
    auth_headers_a: dict[str, str],
    application_a: JobApplication,
) -> None:
    response = client.post(
        f"/applications/{application_a.id}/analyze",
        json={"resume_id": 999999},
        headers=auth_headers_a,
    )

    assert response.status_code == 404


def test_cross_user_resume_returns_404(
    client: TestClient,
    auth_headers_a: dict[str, str],
    application_a: JobApplication,
    resume_b: Resume,
) -> None:
    response = client.post(
        f"/applications/{application_a.id}/analyze",
        json={"resume_id": resume_b.id},
        headers=auth_headers_a,
    )

    assert response.status_code == 404


@pytest.mark.parametrize("job_description", [None, "", "   "])
def test_missing_or_empty_job_description_returns_400(
    client: TestClient,
    db_session: Session,
    auth_headers_a: dict[str, str],
    application_a: JobApplication,
    resume_a: Resume,
    job_description: str | None,
) -> None:
    application_a.job_description = job_description
    db_session.flush()

    response = client.post(
        f"/applications/{application_a.id}/analyze",
        json={"resume_id": resume_a.id},
        headers=auth_headers_a,
    )

    assert response.status_code == 400
    assert response.json() == {
        "detail": "The job application needs a meaningful job description."
    }


def test_pdf_extraction_failure_returns_clean_422(
    client: TestClient,
    auth_headers_a: dict[str, str],
    application_a: JobApplication,
    resume_a: Resume,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def fail_extraction(resume: Resume) -> str:
        raise UnreadablePDFError("The resume PDF is corrupted or could not be read.")

    monkeypatch.setattr(resume_service, "extract_resume_text", fail_extraction)

    response = client.post(
        f"/applications/{application_a.id}/analyze",
        json={"resume_id": resume_a.id},
        headers=auth_headers_a,
    )

    assert response.status_code == 422
    assert response.json() == {
        "detail": "The resume PDF is corrupted or could not be read."
    }


@pytest.mark.parametrize(
    ("provider_error", "expected_status"),
    [
        (ai_client.AIModelRefusalError("raw refusal details"), 422),
        (ai_client.AIProviderError("sk-secret raw provider failure"), 502),
    ],
)
def test_ai_failures_are_sanitized(
    client: TestClient,
    auth_headers_a: dict[str, str],
    application_a: JobApplication,
    resume_a: Resume,
    provider_error: Exception,
    expected_status: int,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        resume_service,
        "extract_resume_text",
        lambda resume: "Python FastAPI PostgreSQL backend experience.",
    )
    monkeypatch.setattr(
        ai_analysis_service.ai_analyzer,
        "analyze_resume_against_job",
        Mock(side_effect=provider_error),
    )

    response = client.post(
        f"/applications/{application_a.id}/analyze",
        json={"resume_id": resume_a.id},
        headers=auth_headers_a,
    )

    assert response.status_code == expected_status
    body = response.text
    assert "sk-secret" not in body
    assert "raw provider" not in body
    assert "raw refusal" not in body


def test_invalid_structured_result_returns_sanitized_502(
    client: TestClient,
    db_session: Session,
    auth_headers_a: dict[str, str],
    application_a: JobApplication,
    resume_a: Resume,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        resume_service,
        "extract_resume_text",
        lambda resume: "Python FastAPI PostgreSQL backend experience.",
    )
    monkeypatch.setattr(
        ai_client,
        "request_structured_output",
        lambda **kwargs: {
            "match_score": 999,
            "summary": "invalid provider payload",
            "strengths": [],
            "missing_skills": [],
            "recommendations": [],
        },
    )

    response = client.post(
        f"/applications/{application_a.id}/analyze",
        json={"resume_id": resume_a.id},
        headers=auth_headers_a,
    )

    assert response.status_code == 502
    assert response.json() == {
        "detail": "AI analysis is temporarily unavailable."
    }
    assert db_session.execute(select(AIAnalysis)).scalar_one_or_none() is None
