from __future__ import annotations

from datetime import datetime
from unittest.mock import Mock

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.ai import client as ai_client
from app.models.ai_analysis import AIAnalysis
from app.models.job_application import JobApplication
from app.models.resume import Resume
from app.schemas.ai_analysis import AIAnalysisResponse, AIAnalysisSummaryResponse
from app.services import ai_analysis_service


def test_user_can_list_owned_analyses_newest_first(
    client: TestClient,
    db_session: Session,
    auth_headers_a: dict[str, str],
    application_a: JobApplication,
    resume_a: Resume,
    analysis_a: AIAnalysis,
) -> None:
    newer_analysis = AIAnalysis(
        id=2_000_303,
        job_application_id=application_a.id,
        resume_id=resume_a.id,
        match_score=91,
        details=analysis_a.details,
        created_at=datetime(2026, 8, 15, 12, 0, 0),
    )
    db_session.add(newer_analysis)
    db_session.flush()

    response = client.get(
        f"/applications/{application_a.id}/analyses",
        headers=auth_headers_a,
    )

    assert response.status_code == 200
    payload = [AIAnalysisSummaryResponse.model_validate(item) for item in response.json()]
    assert [item.id for item in payload] == [newer_analysis.id, analysis_a.id]
    assert set(response.json()[0]) == {
        "id",
        "job_application_id",
        "resume_id",
        "match_score",
        "created_at",
    }


def test_empty_analysis_history_returns_empty_list(
    client: TestClient,
    auth_headers_a: dict[str, str],
    application_a: JobApplication,
) -> None:
    response = client.get(
        f"/applications/{application_a.id}/analyses",
        headers=auth_headers_a,
    )

    assert response.status_code == 200
    assert response.json() == []


def test_missing_application_history_returns_404(
    client: TestClient,
    auth_headers_a: dict[str, str],
) -> None:
    response = client.get(
        "/applications/999999/analyses",
        headers=auth_headers_a,
    )

    assert response.status_code == 404


def test_cross_user_application_history_returns_404(
    client: TestClient,
    auth_headers_a: dict[str, str],
    application_b: JobApplication,
) -> None:
    response = client.get(
        f"/applications/{application_b.id}/analyses",
        headers=auth_headers_a,
    )

    assert response.status_code == 404


def test_user_can_retrieve_owned_analysis_with_flattened_details(
    client: TestClient,
    auth_headers_a: dict[str, str],
    analysis_a: AIAnalysis,
) -> None:
    response = client.get(f"/analyses/{analysis_a.id}", headers=auth_headers_a)

    assert response.status_code == 200
    payload = AIAnalysisResponse.model_validate(response.json())
    assert payload.id == analysis_a.id
    assert payload.match_score == analysis_a.match_score
    assert payload.summary == analysis_a.details["summary"]
    assert payload.strengths == analysis_a.details["strengths"]
    assert payload.missing_skills == analysis_a.details["missing_skills"]
    assert payload.recommendations == analysis_a.details["recommendations"]
    assert "details" not in response.json()


def test_missing_analysis_returns_404(
    client: TestClient,
    auth_headers_a: dict[str, str],
) -> None:
    response = client.get("/analyses/999999", headers=auth_headers_a)

    assert response.status_code == 404


def test_cross_user_analysis_returns_404(
    client: TestClient,
    auth_headers_a: dict[str, str],
    analysis_b: AIAnalysis,
) -> None:
    response = client.get(f"/analyses/{analysis_b.id}", headers=auth_headers_a)

    assert response.status_code == 404


def test_analysis_with_cross_user_resume_is_hidden(
    client: TestClient,
    db_session: Session,
    auth_headers_a: dict[str, str],
    application_a: JobApplication,
    resume_b: Resume,
) -> None:
    invalid_analysis = AIAnalysis(
        id=2_000_304,
        job_application_id=application_a.id,
        resume_id=resume_b.id,
        match_score=50,
        details={
            "summary": "This row must not be visible.",
            "strengths": [],
            "missing_skills": [],
            "recommendations": [],
        },
        created_at=datetime(2026, 8, 15, 13, 0, 0),
    )
    db_session.add(invalid_analysis)
    db_session.flush()

    list_response = client.get(
        f"/applications/{application_a.id}/analyses",
        headers=auth_headers_a,
    )
    detail_response = client.get(
        f"/analyses/{invalid_analysis.id}",
        headers=auth_headers_a,
    )

    assert list_response.status_code == 200
    assert list_response.json() == []
    assert detail_response.status_code == 404


@pytest.mark.parametrize(
    "path",
    [
        "/applications/1/analyses",
        "/analyses/1",
    ],
)
def test_history_endpoints_require_authentication(
    client: TestClient,
    path: str,
) -> None:
    response = client.get(path)

    assert response.status_code == 401


def test_history_endpoints_do_not_call_ai_analyzer(
    client: TestClient,
    auth_headers_a: dict[str, str],
    application_a: JobApplication,
    analysis_a: AIAnalysis,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    analyze_mock = Mock(side_effect=AssertionError("History must not invoke AI."))
    client_mock = Mock(side_effect=AssertionError("History must not invoke OpenAI."))
    monkeypatch.setattr(
        ai_analysis_service.ai_analyzer,
        "analyze_resume_against_job",
        analyze_mock,
    )
    monkeypatch.setattr(ai_client, "request_structured_output", client_mock)

    list_response = client.get(
        f"/applications/{application_a.id}/analyses",
        headers=auth_headers_a,
    )
    detail_response = client.get(
        f"/analyses/{analysis_a.id}",
        headers=auth_headers_a,
    )

    assert list_response.status_code == 200
    assert detail_response.status_code == 200
    analyze_mock.assert_not_called()
    client_mock.assert_not_called()
