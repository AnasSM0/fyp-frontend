from fastapi.testclient import TestClient
from types import SimpleNamespace
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.assessment import AssessmentAnswer, AssessmentSession
from app.models.evaluation import EvaluationReport
from app.schemas.evaluation import AIAnswerEvaluation, AIProjectQualityEvaluation
from app.services.ai_provider import ProviderOutputError, ProviderState
from app.services.ai_provider_factory import build_ai_provider
from app.services.gemini_provider import FallbackAIProvider
from app.services.evaluation_service import generate_evaluation_report
from app.services.question_bank_seed import seed_question_bank
from app.services.scoring_service import (
    calculate_verified_score,
    capped_project_quality,
    normalize_gpa,
)


def auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def signup(client: TestClient, email: str, role: str) -> dict:
    response = client.post(
        "/auth/signup",
        json={"email": email, "password": "password123", "role": role},
    )
    assert response.status_code == 201
    return response.json()


def create_candidate_profile(client: TestClient, token: str, **overrides) -> dict:
    payload = {
        "full_name": "Alex Chen",
        "university": "FAST NUCES",
        "degree": "BS Computer Science",
        "graduation_year": 2026,
        "gpa": 3.7,
        "target_role": "Full Stack Developer",
        "experience_level": "Student / Early Career",
        "tech_stack": ["React", "Next.js", "TypeScript", "FastAPI"],
        "skills": ["React", "TypeScript", "System Design", "Python"],
        "portfolio_url": "https://alex.example",
        "linkedin_url": "https://linkedin.example/alex",
        "resume_url": "https://resume.example/alex.pdf",
        "profile_visibility": False,
        "availability_status": "open",
        "profile_complete": True,
    }
    payload.update(overrides)
    response = client.put("/profiles/candidate/me", json=payload, headers=auth_header(token))
    assert response.status_code == 200
    return response.json()


def make_completed_session(client: TestClient, db_session: Session, email: str = "eval@example.com"):
    seed_question_bank(db_session)
    candidate = signup(client, email, "candidate")
    create_candidate_profile(client, candidate["access_token"])
    headers = auth_header(candidate["access_token"])
    session = client.post("/assessments/sessions", json={}, headers=headers).json()
    session_id = session["session"]["id"]
    question_id = session["current_question"]["id"]
    answer = client.post(
        f"/assessments/sessions/{session_id}/answers",
        json={
            "assessment_question_id": question_id,
            "answer_text": (
                "I would clarify requirements, define component boundaries, handle loading "
                "and error states, then validate the API contract with TypeScript types."
            ),
            "code_text": "type Candidate = { id: string; skills: string[] }",
            "duration_seconds": 210,
            "metadata": {"test": True},
        },
        headers=headers,
    )
    assert answer.status_code == 200
    finish = client.post(f"/assessments/sessions/{session_id}/finish", json={}, headers=headers)
    assert finish.status_code == 200
    return candidate, session_id


def test_stub_provider_generates_report_and_stores_answer_evaluation(
    client: TestClient, db_session: Session, monkeypatch
) -> None:
    monkeypatch.setattr(
        "app.services.evaluation_service.build_ai_provider",
        lambda _: FallbackAIProvider(None),
    )
    candidate, session_id = make_completed_session(client, db_session)
    response = client.post(
        f"/evaluations/sessions/{session_id}/generate",
        json={},
        headers=auth_header(candidate["access_token"]),
    )
    assert response.status_code == 200
    report = response.json()
    assert report["verified_score"] > 0
    assert report["report_json"]["provider_metadata"]["provider"] == "stub"
    assert report["report_json"]["provider_metadata"]["fallback_used"] is True
    assert report["report_json"]["question_wise_scores"]

    answer = db_session.scalar(select(AssessmentAnswer))
    assert answer is not None
    assert answer.ai_evaluation["technical_accuracy"] > 0


def test_generate_report_is_idempotent(client: TestClient, db_session: Session, monkeypatch) -> None:
    monkeypatch.setattr(
        "app.services.evaluation_service.build_ai_provider",
        lambda _: FallbackAIProvider(None),
    )
    candidate, session_id = make_completed_session(client, db_session, "idempotent-report@example.com")
    headers = auth_header(candidate["access_token"])

    first = client.post(f"/evaluations/sessions/{session_id}/generate", json={}, headers=headers)
    second = client.post(f"/evaluations/sessions/{session_id}/generate", json={}, headers=headers)

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["id"] == second.json()["id"]
    reports = db_session.scalars(select(EvaluationReport).where(EvaluationReport.session_id == session_id)).all()
    assert len(reports) == 1


def test_force_regenerate_updates_existing_report(client: TestClient, db_session: Session, monkeypatch) -> None:
    monkeypatch.setattr(
        "app.services.evaluation_service.build_ai_provider",
        lambda _: FallbackAIProvider(None),
    )
    candidate, session_id = make_completed_session(client, db_session, "force-regenerate@example.com")
    headers = auth_header(candidate["access_token"])

    first = client.post(f"/evaluations/sessions/{session_id}/generate", json={}, headers=headers).json()
    second = client.post(
        f"/evaluations/sessions/{session_id}/generate",
        json={"force_regenerate": True},
        headers=headers,
    ).json()

    assert first["id"] == second["id"]
    assert second["session_id"] == session_id


def test_report_includes_all_questions_and_scores_idk_low(
    client: TestClient, db_session: Session, monkeypatch
) -> None:
    monkeypatch.setattr(
        "app.services.evaluation_service.build_ai_provider",
        lambda _: FallbackAIProvider(None),
    )
    seed_question_bank(db_session)
    candidate = signup(client, "all-questions-idk@example.com", "candidate")
    create_candidate_profile(client, candidate["access_token"])
    headers = auth_header(candidate["access_token"])
    session_response = client.post("/assessments/sessions", json={}, headers=headers).json()
    session_id = session_response["session"]["id"]
    first_question_id = session_response["current_question"]["id"]
    answer = client.post(
        f"/assessments/sessions/{session_id}/answers",
        json={
            "assessment_question_id": first_question_id,
            "answer_text": "idk",
            "duration_seconds": 30,
            "metadata": {},
        },
        headers=headers,
    )
    assert answer.status_code == 200
    finish = client.post(f"/assessments/sessions/{session_id}/finish", json={}, headers=headers)
    assert finish.status_code == 200

    report = client.post(f"/evaluations/sessions/{session_id}/generate", json={}, headers=headers).json()
    session_row = db_session.get(AssessmentSession, session_id)
    question_scores = report["report_json"]["question_wise_scores"]

    assert len(question_scores) == session_row.total_questions
    assert question_scores[0]["answer_status"] == "insufficient_response"
    assert question_scores[0]["score"] <= 15
    assert all(item["answer_status"] == "skipped" for item in question_scores[1:])
    assert all(item["score"] == 0 for item in question_scores[1:])
    assert report["ai_test_score"] < 30


class BadProvider:
    state = ProviderState(provider="gemini", model="bad-test-provider")

    def evaluate_answer(self, *_):
        raise ProviderOutputError("malformed json")

    def evaluate_project_profile(self, *_):
        raise ProviderOutputError("malformed json")

    def generate_final_report(self, *_):
        raise ProviderOutputError("malformed json")


class DummyReasoningProvider:
    provider_name = "gemini"

    def __init__(self, *_, **kwargs):
        self.state = ProviderState(
            provider=self.provider_name,
            model=kwargs.get("model", f"{self.provider_name}-test-model"),
        )

    def evaluate_answer(self, *_):
        raise NotImplementedError

    def evaluate_project_profile(self, *_):
        return AIProjectQualityEvaluation(
            project_quality_score=70,
            clarity_score=70,
            technical_depth_score=70,
            role_relevance_score=70,
            stack_alignment_score=70,
            complexity_score=70,
            impact_score=70,
            summary="dummy project profile evaluation",
            limitations=[],
        )

    def generate_final_report(self, *_):
        raise NotImplementedError


class DummyGeminiProvider(DummyReasoningProvider):
    provider_name = "gemini"


class SuccessfulOpenRouterProvider(DummyReasoningProvider):
    provider_name = "openrouter"

    def evaluate_answer(self, *_):
        return AIAnswerEvaluation(
            technical_accuracy=84,
            problem_solving=82,
            communication_clarity=80,
            reasoning_depth=81,
            code_quality=78,
            expected_concepts_covered=["API contract"],
            missing_concepts=["edge cases"],
            confidence=88,
            short_feedback="OpenRouter evaluated this answer.",
            transcript_evidence=["Candidate discussed API contract."],
        )

    def generate_final_report(self, *_):
        from app.schemas.evaluation import AIFinalReportDraft

        return AIFinalReportDraft(
            strengths=["Clear API reasoning."],
            weaknesses=["Needs more edge-case depth."],
            recommended_improvements=["Practice explaining failure modes."],
            role_fit=[{"role": "Full Stack Developer", "score": 82, "reason": "Aligned assessment evidence."}],
            recruiter_summary="OpenRouter-generated recruiter summary.",
            transcript_evidence=["Candidate discussed API contract."],
        )


class FailingNvidiaProvider(DummyReasoningProvider):
    provider_name = "nvidia"

    def evaluate_project_profile(self, *_):
        raise ProviderOutputError("nvidia forced failure")


def fake_settings(**overrides):
    values = {
        "default_ai_provider": "openrouter",
        "enable_ai_fallback": True,
        "openrouter_api_key": "",
        "openrouter_base_url": "https://openrouter.test/v1",
        "openrouter_model": "openrouter-default-test-model",
        "openrouter_coder_model": "openrouter-coder-test-model",
        "openrouter_fallback_model": "openrouter-fallback-test-model",
        "openrouter_app_name": "XLR8Hire Test",
        "openrouter_site_url": "http://testserver",
        "openrouter_onboarding_timeout_ms": 1200,
        "openrouter_evaluation_timeout_ms": 15000,
        "nvidia_api_key": "",
        "nvidia_base_url": "https://integrate.api.nvidia.com/v1",
        "nvidia_model": "nvidia-test-model",
        "gemini_api_key": "",
        "gemini_model": "gemini-test-model",
    }
    values.update(overrides)
    return SimpleNamespace(**values)


def test_malformed_provider_falls_back_to_stub(client: TestClient, db_session: Session) -> None:
    _, session_id = make_completed_session(client, db_session, "fallback@example.com")
    session = db_session.get(AssessmentSession, session_id)
    assert session is not None
    report = generate_evaluation_report(db_session, session, provider=FallbackAIProvider(BadProvider()))
    metadata = report.report_json["provider_metadata"]
    assert metadata["provider"] == "stub"
    assert metadata["fallback_used"] is True
    assert "fallback" in metadata["warnings"][0].lower()


def test_provider_header_stub_metadata(client: TestClient, db_session: Session) -> None:
    candidate, session_id = make_completed_session(client, db_session, "stub-header@example.com")
    response = client.post(
        f"/evaluations/sessions/{session_id}/generate",
        json={},
        headers={**auth_header(candidate["access_token"]), "X-AI-Provider": "stub"},
    )
    assert response.status_code == 200
    metadata = response.json()["report_json"]["provider_metadata"]
    assert metadata["requested_provider"] == "stub"
    assert metadata["actual_provider"] == "stub"
    assert metadata["provider"] == "stub"
    assert metadata["fallback_used"] is True
    assert metadata["fallback_chain"] == ["stub"]


def test_default_provider_is_openrouter_and_falls_back_to_stub(
    client: TestClient, db_session: Session, monkeypatch
) -> None:
    monkeypatch.setattr("app.services.ai_provider_factory.get_settings", lambda: fake_settings())
    candidate, session_id = make_completed_session(client, db_session, "default-openrouter@example.com")
    response = client.post(
        f"/evaluations/sessions/{session_id}/generate",
        json={},
        headers=auth_header(candidate["access_token"]),
    )
    assert response.status_code == 200
    metadata = response.json()["report_json"]["provider_metadata"]
    assert metadata["requested_provider"] == "openrouter"
    assert metadata["actual_provider"] == "stub"
    assert metadata["provider"] == "stub"
    assert metadata["fallback_used"] is True
    assert metadata["fallback_chain"][:3] == ["openrouter", "nvidia", "gemini"]
    assert any("OpenRouter API key missing" in warning for warning in metadata["warnings"])


def test_evaluation_uses_openrouter_primary(client: TestClient, db_session: Session, monkeypatch) -> None:
    monkeypatch.setattr(
        "app.services.ai_provider_factory.get_settings",
        lambda: fake_settings(openrouter_api_key="configured-openrouter"),
    )
    monkeypatch.setattr("app.services.ai_provider_factory.OpenRouterProvider", SuccessfulOpenRouterProvider)
    candidate, session_id = make_completed_session(client, db_session, "openrouter-primary@example.com")

    response = client.post(
        f"/evaluations/sessions/{session_id}/generate",
        json={},
        headers=auth_header(candidate["access_token"]),
    )

    assert response.status_code == 200
    metadata = response.json()["report_json"]["provider_metadata"]
    assert metadata["requested_provider"] == "openrouter"
    assert metadata["actual_provider"] == "openrouter"
    assert metadata["provider"] == "openrouter"
    assert metadata["fallback_used"] is False
    assert metadata["model"] == "openrouter-default-test-model"


def test_invalid_provider_header_rejected(client: TestClient, db_session: Session) -> None:
    candidate, session_id = make_completed_session(client, db_session, "invalid-provider@example.com")
    response = client.post(
        f"/evaluations/sessions/{session_id}/generate",
        json={},
        headers={**auth_header(candidate["access_token"]), "X-AI-Provider": "claude"},
    )
    assert response.status_code == 422
    assert "Unsupported AI provider" in response.json()["detail"]


def test_missing_nvidia_key_falls_back_to_configured_gemini(monkeypatch) -> None:
    monkeypatch.setattr(
        "app.services.ai_provider_factory.get_settings",
        lambda: fake_settings(gemini_api_key="configured-gemini-key"),
    )
    monkeypatch.setattr("app.services.ai_provider_factory.GeminiProvider", DummyGeminiProvider)
    provider = build_ai_provider("nvidia")
    metadata = provider.state.metadata().model_dump()
    assert metadata["requested_provider"] == "nvidia"
    assert metadata["actual_provider"] == "gemini"
    assert metadata["fallback_used"] is True
    assert any("NVIDIA API key missing" in warning for warning in metadata["warnings"])


def test_nvidia_failure_falls_back_to_configured_gemini(monkeypatch, client: TestClient) -> None:
    candidate = signup(client, "provider-fallback-profile@example.com", "candidate")
    profile = create_candidate_profile(client, candidate["access_token"])
    monkeypatch.setattr(
        "app.services.ai_provider_factory.get_settings",
        lambda: fake_settings(nvidia_api_key="configured-nvidia-key", gemini_api_key="configured-gemini-key"),
    )
    monkeypatch.setattr("app.services.ai_provider_factory.NVIDIAProvider", FailingNvidiaProvider)
    monkeypatch.setattr("app.services.ai_provider_factory.GeminiProvider", DummyGeminiProvider)
    provider = build_ai_provider("nvidia")
    result = provider.evaluate_project_profile(SimpleNamespace(**profile))
    metadata = provider.state.metadata().model_dump()
    assert result.project_quality_score == 70
    assert metadata["requested_provider"] == "nvidia"
    assert metadata["actual_provider"] == "gemini"
    assert metadata["fallback_used"] is True
    assert any("NVIDIA project/profile evaluation failed" in warning for warning in metadata["warnings"])


def test_recruiter_cannot_generate_report(client: TestClient, db_session: Session) -> None:
    _, session_id = make_completed_session(client, db_session, "owner-report@example.com")
    recruiter = signup(client, "report-recruiter@example.com", "recruiter")
    response = client.post(
        f"/evaluations/sessions/{session_id}/generate",
        json={},
        headers=auth_header(recruiter["access_token"]),
    )
    assert response.status_code == 403


def test_other_candidate_cannot_access_private_report(
    client: TestClient, db_session: Session, monkeypatch
) -> None:
    monkeypatch.setattr(
        "app.services.evaluation_service.build_ai_provider",
        lambda _: FallbackAIProvider(None),
    )
    owner, session_id = make_completed_session(client, db_session, "private-owner@example.com")
    intruder = signup(client, "private-intruder@example.com", "candidate")
    create_candidate_profile(client, intruder["access_token"])

    report = client.post(
        f"/evaluations/sessions/{session_id}/generate",
        json={},
        headers=auth_header(owner["access_token"]),
    ).json()
    blocked_report = client.get(
        f"/evaluations/reports/{report['id']}",
        headers=auth_header(intruder["access_token"]),
    )
    blocked_session_report = client.get(
        f"/evaluations/reports/session/{session_id}",
        headers=auth_header(intruder["access_token"]),
    )
    assert blocked_report.status_code == 404
    assert blocked_session_report.status_code == 404


def test_candidate_can_request_on_demand_report_coach(
    client: TestClient, db_session: Session, monkeypatch
) -> None:
    monkeypatch.setattr(
        "app.services.evaluation_service.build_ai_provider",
        lambda *_args, **_kwargs: FallbackAIProvider(None),
    )
    candidate, session_id = make_completed_session(client, db_session, "coach-owner@example.com")
    headers = auth_header(candidate["access_token"])
    report = client.post(f"/evaluations/sessions/{session_id}/generate", json={}, headers=headers).json()

    response = client.post(
        f"/evaluations/reports/{report['id']}/coach",
        json={"prompt_type": "study_plan", "message": "Help me prepare to retake."},
        headers=headers,
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["answer"]
    assert payload["cached"] is False
    assert payload["provider_metadata"]["actual_provider"] == "stub"


def test_other_candidate_cannot_request_report_coach(
    client: TestClient, db_session: Session, monkeypatch
) -> None:
    monkeypatch.setattr(
        "app.services.evaluation_service.build_ai_provider",
        lambda *_args, **_kwargs: FallbackAIProvider(None),
    )
    owner, session_id = make_completed_session(client, db_session, "coach-private-owner@example.com")
    intruder = signup(client, "coach-private-intruder@example.com", "candidate")
    create_candidate_profile(client, intruder["access_token"])
    report = client.post(
        f"/evaluations/sessions/{session_id}/generate",
        json={},
        headers=auth_header(owner["access_token"]),
    ).json()

    response = client.post(
        f"/evaluations/reports/{report['id']}/coach",
        json={"prompt_type": "explain_weakest_question"},
        headers=auth_header(intruder["access_token"]),
    )

    assert response.status_code == 404


def test_in_progress_and_empty_completed_session_blocked(
    client: TestClient, db_session: Session, monkeypatch
) -> None:
    monkeypatch.setattr(
        "app.services.evaluation_service.build_ai_provider",
        lambda _: FallbackAIProvider(None),
    )
    seed_question_bank(db_session)
    candidate = signup(client, "blocked-generation@example.com", "candidate")
    create_candidate_profile(client, candidate["access_token"])
    headers = auth_header(candidate["access_token"])
    session = client.post("/assessments/sessions", json={}, headers=headers).json()
    session_id = session["session"]["id"]

    in_progress = client.post(
        f"/evaluations/sessions/{session_id}/generate", json={}, headers=headers
    )
    assert in_progress.status_code == 409

    session_row = db_session.get(AssessmentSession, session_id)
    assert session_row is not None
    session_row.status = "completed"
    db_session.commit()
    empty = client.post(f"/evaluations/sessions/{session_id}/generate", json={}, headers=headers)
    assert empty.status_code == 409


def test_existing_report_returned_unless_force_regenerate(
    client: TestClient, db_session: Session, monkeypatch
) -> None:
    monkeypatch.setattr(
        "app.services.evaluation_service.build_ai_provider",
        lambda _: FallbackAIProvider(None),
    )
    candidate, session_id = make_completed_session(client, db_session, "regenerate@example.com")
    headers = auth_header(candidate["access_token"])
    first = client.post(f"/evaluations/sessions/{session_id}/generate", json={}, headers=headers)
    second = client.post(f"/evaluations/sessions/{session_id}/generate", json={}, headers=headers)
    forced = client.post(
        f"/evaluations/sessions/{session_id}/generate",
        json={"force_regenerate": True},
        headers=headers,
    )
    assert first.status_code == 200
    assert second.status_code == 200
    assert forced.status_code == 200
    assert first.json()["id"] == second.json()["id"] == forced.json()["id"]


def test_publish_latest_and_report_by_session(
    client: TestClient, db_session: Session, monkeypatch
) -> None:
    monkeypatch.setattr(
        "app.services.evaluation_service.build_ai_provider",
        lambda _: FallbackAIProvider(None),
    )
    candidate, session_id = make_completed_session(client, db_session, "publish@example.com")
    headers = auth_header(candidate["access_token"])
    report = client.post(f"/evaluations/sessions/{session_id}/generate", json={}, headers=headers).json()

    latest = client.get("/evaluations/reports/me/latest", headers=headers)
    by_session = client.get(f"/evaluations/reports/session/{session_id}", headers=headers)
    published = client.post(f"/evaluations/reports/{report['id']}/publish", headers=headers)

    assert latest.status_code == 200
    assert latest.json()["id"] == report["id"]
    assert by_session.status_code == 200
    assert by_session.json()["id"] == report["id"]
    assert published.status_code == 200
    assert published.json()["report"]["published"] is True


def test_verified_score_and_gpa_normalization() -> None:
    assert normalize_gpa(3.6) == (90, "gpa_4_scale")
    assert normalize_gpa(8.5) == (85, "gpa_10_scale")
    assert normalize_gpa(None) == (70, "missing_neutral_fallback")
    project = AIProjectQualityEvaluation(
        project_quality_score=60,
        clarity_score=60,
        technical_depth_score=60,
        role_relevance_score=60,
        stack_alignment_score=60,
        complexity_score=60,
        impact_score=60,
        summary="ok",
        limitations=[],
    )
    assert calculate_verified_score(80, project, 90, 100) == 79


def test_missing_profile_evidence_caps_project_quality(client: TestClient, db_session: Session) -> None:
    candidate = signup(client, "cap-profile@example.com", "candidate")
    profile = create_candidate_profile(
        client,
        candidate["access_token"],
        portfolio_url=None,
        linkedin_url=None,
        resume_url=None,
    )
    from app.models.profile import CandidateProfile

    profile_row = db_session.get(CandidateProfile, profile["id"])
    assert profile_row is not None
    raw = AIProjectQualityEvaluation(
        project_quality_score=95,
        clarity_score=95,
        technical_depth_score=95,
        role_relevance_score=95,
        stack_alignment_score=95,
        complexity_score=95,
        impact_score=95,
        summary="strong",
        limitations=[],
    )
    capped, source = capped_project_quality(profile_row, raw.project_quality_score)
    assert capped == 55
    assert source == "missing_project_links_cap_55"
