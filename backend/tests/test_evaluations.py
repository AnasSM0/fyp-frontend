from fastapi.testclient import TestClient
from types import SimpleNamespace
import logging
import threading
import time
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.assessment import AssessmentAnswer, AssessmentSession
from app.models.evaluation import EvaluationReport
from app.core.config import Settings
from app.schemas.evaluation import (
    AIAnswerEvaluation,
    AIBatchEvaluationDraft,
    AIFinalReportDraft,
    AIProjectQualityEvaluation,
)
from app.services.ai_provider import ProviderOutputError, ProviderState
from app.services.ai_call_audit import end_ai_call, start_ai_call
from app.services.ai_provider_factory import build_ai_provider
from app.services.gemini_provider import FallbackAIProvider
from app.services.evaluation_service import generate_evaluation_report, report_generation_lock
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


def eval_settings(**overrides):
    values = {
        "batch_evaluation_enabled": False,
        "ai_free_tier_mode": True,
        "ai_required_for_evaluation": False,
        "allow_stub_evaluation": True,
        "evaluation_max_ai_calls_per_report": 1,
        "evaluation_disable_provider_fallback": True,
        "enable_rag_evaluation": True,
        "enable_rag_evaluation_fallback": True,
        "rag_rubric_top_k": 5,
    }
    values.update(overrides)
    return SimpleNamespace(**values)


def test_stub_provider_generates_report_and_stores_answer_evaluation(
    client: TestClient, db_session: Session, monkeypatch
) -> None:
    monkeypatch.setattr("app.services.evaluation_service.get_settings", lambda: eval_settings())
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
    monkeypatch.setattr("app.services.evaluation_service.get_settings", lambda: eval_settings())
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
    monkeypatch.setattr("app.services.evaluation_service.get_settings", lambda: eval_settings())
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
    monkeypatch.setattr("app.services.evaluation_service.get_settings", lambda: eval_settings())
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
        return AIFinalReportDraft(
            strengths=["Clear API reasoning."],
            weaknesses=["Needs more edge-case depth."],
            recommended_improvements=["Practice explaining failure modes."],
            role_fit=[{"role": "Full Stack Developer", "score": 82, "reason": "Aligned assessment evidence."}],
            recruiter_summary="OpenRouter-generated recruiter summary.",
            transcript_evidence=["Candidate discussed API contract."],
        )


class BatchCountingProvider(DummyReasoningProvider):
    provider_name = "openrouter"

    def __init__(self):
        super().__init__(model="batch-test-model")
        self.batch_calls = 0
        self.answer_calls = 0
        self.project_calls = 0
        self.final_calls = 0
        self.last_payload = None
        self.lock = threading.Lock()
        self.sleep_seconds = 0
        self.fail_once = False

    def evaluate_assessment_batch(self, payload):
        with self.lock:
            self.batch_calls += 1
            should_fail = self.fail_once
            self.fail_once = False
        if self.sleep_seconds:
            time.sleep(self.sleep_seconds)
        if should_fail:
            raise ProviderOutputError("forced provider failure")
        self.last_payload = payload
        question_evaluations = []
        for item in payload["questions"]:
            question = item["question"]
            answer = item["answer"]
            status_label = answer.get("answer_status") or "answered"
            score = 88 if status_label == "answered" else 90
            question_evaluations.append(
                {
                    "question_id": question["assessment_question_id"],
                    "score": score,
                    "answer_status": status_label,
                    "skill_area": question.get("category") or "General",
                    "strengths": question.get("expected_concepts") or [],
                    "missing_concepts": [],
                    "feedback": "Batch provider evaluated this answer.",
                    "improvement_tip": "Practice missing concepts.",
                }
            )
        return AIBatchEvaluationDraft(
            question_evaluations=question_evaluations,
            category_scores={
                "technical_accuracy": 82,
                "problem_solving": 80,
                "communication": 78,
                "code_quality": 76,
                "system_design": 74,
            },
            overall_strengths=["Batch evaluation covered the whole session."],
            overall_growth_areas=["Review low-scoring answers."],
            candidate_summary="Candidate summary from batch provider.",
            recruiter_summary="OpenRouter-style batch report summary.",
            role_fit_summary="Aligned with Full Stack Developer evidence.",
            recommended_next_steps=["Practice missing concepts."],
            improvement_plan=[
                {"day": "Day 1", "focus": "Weak area", "task": "Practice one similar prompt."}
            ],
        )

    def evaluate_answer(self, *_):
        self.answer_calls += 1
        raise AssertionError("per-answer evaluation should be bypassed in batch mode")

    def evaluate_project_profile(self, *_):
        self.project_calls += 1
        raise AssertionError("project/profile evaluation should be included in batch mode")

    def generate_final_report(self, *_):
        self.final_calls += 1
        raise AssertionError("final report generation should be included in batch mode")


class AuditedGeminiBatchProvider(BatchCountingProvider):
    provider_name = "gemini"

    def __init__(self, *, fail_rate_limited: bool = False):
        super().__init__()
        self.state = ProviderState(provider="gemini", model="gemini-test-model")
        self.fail_rate_limited = fail_rate_limited

    def evaluate_assessment_batch(self, payload):
        prompt_chars = len(str(payload))
        record, started = start_ai_call(
            purpose="batch_evaluation",
            provider="gemini",
            model=self.state.model,
            endpoint_path="/v1beta/models/gemini-test-model:generateContent",
            prompt_char_count=prompt_chars,
            estimated_payload_size_chars=prompt_chars,
            question_count=len(payload.get("questions") or []),
            answer_count=sum(
                1
                for item in payload.get("questions") or []
                if (item.get("answer") or {}).get("answer_status") != "skipped"
            ),
        )
        if self.fail_rate_limited:
            with self.lock:
                self.batch_calls += 1
            end_ai_call(
                record,
                started,
                success=False,
                status_code=429,
                failure_reason="rate_limited",
                retry_after_seconds=60,
            )
            raise ProviderOutputError("Gemini request failed with HTTP 429 rate_limited")
        result = super().evaluate_assessment_batch(payload)
        end_ai_call(record, started, success=True, status_code=200)
        return result


class DoubleAuditedBatchProvider(BatchCountingProvider):
    provider_name = "gemini"

    def __init__(self):
        super().__init__()
        self.state = ProviderState(provider="gemini", model="gemini-double-call-test-model")

    def evaluate_assessment_batch(self, payload):
        prompt_chars = len(str(payload))
        for _ in range(2):
            record, started = start_ai_call(
                purpose="batch_evaluation",
                provider="gemini",
                model=self.state.model,
                endpoint_path="/v1beta/models/gemini-test-model:generateContent",
                prompt_char_count=prompt_chars,
                estimated_payload_size_chars=prompt_chars,
                question_count=len(payload.get("questions") or []),
                answer_count=sum(
                    1
                    for item in payload.get("questions") or []
                    if (item.get("answer") or {}).get("answer_status") != "skipped"
                ),
            )
            end_ai_call(record, started, success=True, status_code=200)
        return super().evaluate_assessment_batch(payload)


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
        "ai_free_tier_mode": True,
        "evaluation_max_ai_calls_per_report": 1,
        "evaluation_disable_provider_fallback": True,
        "ai_required_for_evaluation": True,
        "allow_stub_evaluation": False,
        "enable_nvidia_fallback": False,
        "enable_gemini_fallback": False,
    }
    values.update(overrides)
    return SimpleNamespace(**values)


def test_malformed_provider_falls_back_to_stub(client: TestClient, db_session: Session, monkeypatch) -> None:
    monkeypatch.setattr("app.services.evaluation_service.get_settings", lambda: eval_settings())
    _, session_id = make_completed_session(client, db_session, "fallback@example.com")
    session = db_session.get(AssessmentSession, session_id)
    assert session is not None
    report = generate_evaluation_report(db_session, session, provider=FallbackAIProvider(BadProvider()))
    metadata = report.report_json["provider_metadata"]
    assert metadata["provider"] == "stub"
    assert metadata["fallback_used"] is True
    assert "fallback" in metadata["warnings"][0].lower()


def test_provider_header_stub_metadata(client: TestClient, db_session: Session, monkeypatch) -> None:
    monkeypatch.setattr(
        "app.services.evaluation_service.get_settings",
        lambda: eval_settings(ai_required_for_evaluation=False, allow_stub_evaluation=True),
    )
    monkeypatch.setattr(
        "app.services.ai_provider_factory.get_settings",
        lambda: fake_settings(ai_required_for_evaluation=False, allow_stub_evaluation=True),
    )
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


def test_default_provider_missing_key_returns_unavailable_when_stub_disabled(
    client: TestClient, db_session: Session, monkeypatch
) -> None:
    monkeypatch.setattr(
        "app.services.evaluation_service.get_settings",
        lambda: eval_settings(
            batch_evaluation_enabled=True,
            ai_required_for_evaluation=True,
            allow_stub_evaluation=False,
        ),
    )
    monkeypatch.setattr("app.services.ai_provider_factory.get_settings", lambda: fake_settings())
    candidate, session_id = make_completed_session(client, db_session, "default-openrouter@example.com")
    response = client.post(
        f"/evaluations/sessions/{session_id}/generate",
        json={},
        headers=auth_header(candidate["access_token"]),
    )
    assert response.status_code == 503
    detail = response.json()["detail"]
    metadata = detail["provider_metadata"]
    assert detail["reason"] == "provider_error"
    assert detail["fallback_skipped"] is True
    assert metadata["requested_provider"] == "openrouter"
    assert metadata["actual_provider"] == "stub"
    assert metadata["fallback_chain"] == ["openrouter"]
    assert db_session.scalar(select(EvaluationReport).where(EvaluationReport.session_id == session_id)) is None


def test_evaluation_uses_openrouter_primary(client: TestClient, db_session: Session, monkeypatch) -> None:
    monkeypatch.setattr("app.services.evaluation_service.get_settings", lambda: eval_settings())
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
    assert metadata["actual_provider"] == "openrouter", metadata
    assert metadata["provider"] == "openrouter"
    assert metadata["fallback_used"] is False
    assert metadata["model"] == "openrouter-default-test-model"


def test_free_tier_evaluation_config_loads() -> None:
    settings = Settings(
        _env_file=None,
        ai_free_tier_mode=True,
        batch_evaluation_enabled=True,
        evaluation_max_ai_calls_per_report=1,
        evaluation_disable_provider_fallback=True,
        openrouter_single_model_mode=True,
        ai_required_for_evaluation=True,
        allow_stub_evaluation=False,
        enable_nvidia_fallback=False,
        enable_gemini_fallback=False,
        report_generation_lock_enabled=False,
    )

    assert settings.ai_free_tier_mode is True
    assert settings.batch_evaluation_enabled is True
    assert settings.evaluation_max_ai_calls_per_report == 1
    assert settings.evaluation_disable_provider_fallback is True
    assert settings.openrouter_single_model_mode is True
    assert settings.ai_required_for_evaluation is True
    assert settings.allow_stub_evaluation is False


def test_free_tier_provider_factory_disables_evaluation_fallback(monkeypatch) -> None:
    monkeypatch.setattr(
        "app.services.ai_provider_factory.get_settings",
        lambda: fake_settings(
            default_ai_provider="gemini",
            gemini_api_key="configured-gemini-key",
            openrouter_api_key="configured-openrouter-key",
            enable_ai_fallback=True,
            ai_free_tier_mode=True,
            evaluation_disable_provider_fallback=True,
            evaluation_max_ai_calls_per_report=1,
            ai_required_for_evaluation=True,
            allow_stub_evaluation=False,
        ),
    )
    monkeypatch.setattr("app.services.ai_provider_factory.GeminiProvider", DummyGeminiProvider)
    monkeypatch.setattr("app.services.ai_provider_factory.OpenRouterProvider", SuccessfulOpenRouterProvider)

    provider = build_ai_provider("gemini")
    metadata = provider.state.metadata().model_dump()

    assert metadata["requested_provider"] == "gemini"
    assert metadata["actual_provider"] == "gemini"
    assert metadata["fallback_chain"] == ["gemini"]
    assert metadata["fallback_skipped"] is True


def test_batch_mode_uses_one_provider_call_and_bypasses_per_answer_path(
    client: TestClient, db_session: Session, monkeypatch
) -> None:
    provider = BatchCountingProvider()
    monkeypatch.setattr(
        "app.services.evaluation_service.get_settings",
        lambda: eval_settings(
            batch_evaluation_enabled=True,
            ai_required_for_evaluation=True,
            allow_stub_evaluation=False,
        ),
    )
    monkeypatch.setattr("app.services.evaluation_service.build_ai_provider", lambda _: provider)
    candidate, session_id = make_completed_session(client, db_session, "batch-one-call@example.com")

    response = client.post(
        f"/evaluations/sessions/{session_id}/generate",
        json={},
        headers=auth_header(candidate["access_token"]),
    )

    assert response.status_code == 200
    assert provider.batch_calls == 1
    assert provider.answer_calls == 0
    assert provider.project_calls == 0
    assert provider.final_calls == 0
    report_json = response.json()["report_json"]
    session_row = db_session.get(AssessmentSession, session_id)
    assert report_json["evaluation_mode"] == "batch"
    assert len(report_json["question_wise_scores"]) == session_row.total_questions
    assert provider.last_payload["mode"] == "free_tier_batch_v1"
    assert len(provider.last_payload["questions"]) == session_row.total_questions
    assert all(item["question"]["rubric_context"] for item in provider.last_payload["questions"])
    assert all("why_matched" not in str(item["question"]["rubric_context"]) for item in provider.last_payload["questions"])
    assert "candidate_id" not in provider.last_payload["profile"]
    assert "project_summary" not in provider.last_payload["profile"]
    assert all("rubric_hint" not in item["question"] for item in provider.last_payload["questions"])
    assert all("answer_id" not in item["answer"] for item in provider.last_payload["questions"])
    assert all("latest_run_result" not in item["answer"] for item in provider.last_payload["questions"])
    assert all(len(str(item["answer"].get("answer_text") or "")) <= 1215 for item in provider.last_payload["questions"])
    assert report_json["batch_payload_size_summary"]["total_estimated_chars"] < 15000
    assert report_json["provider_metadata"]["actual_provider"] == "openrouter"


def test_batch_report_ai_audit_logs_one_gemini_call(
    client: TestClient, db_session: Session, monkeypatch, caplog
) -> None:
    provider = AuditedGeminiBatchProvider()
    monkeypatch.setattr(
        "app.services.evaluation_service.get_settings",
        lambda: eval_settings(
            batch_evaluation_enabled=True,
            ai_required_for_evaluation=True,
            allow_stub_evaluation=False,
            report_generation_lock_enabled=True,
            evaluation_max_ai_calls_per_report=1,
        ),
    )
    monkeypatch.setattr("app.services.evaluation_service.build_ai_provider", lambda _: provider)
    candidate, session_id = make_completed_session(client, db_session, "batch-audit-gemini@example.com")

    with caplog.at_level(logging.INFO):
        response = client.post(
            f"/evaluations/sessions/{session_id}/generate",
            json={},
            headers=auth_header(candidate["access_token"]),
        )

    assert response.status_code == 200
    assert provider.batch_calls == 1
    log_text = caplog.text
    assert "[AI_CALL_START]" in log_text
    assert "purpose=batch_evaluation" in log_text
    assert "provider=gemini" in log_text
    assert "[REPORT_AI_SUMMARY]" in log_text
    assert "total_ai_calls=1" in log_text
    assert "gemini_calls=1" in log_text
    assert "embedding_calls=0" in log_text


def test_batch_mode_stops_when_ai_call_budget_exceeded(
    client: TestClient, db_session: Session, monkeypatch
) -> None:
    provider = DoubleAuditedBatchProvider()
    monkeypatch.setattr(
        "app.services.evaluation_service.get_settings",
        lambda: eval_settings(
            batch_evaluation_enabled=True,
            ai_required_for_evaluation=True,
            allow_stub_evaluation=False,
            report_generation_lock_enabled=True,
            evaluation_max_ai_calls_per_report=1,
        ),
    )
    monkeypatch.setattr("app.services.evaluation_service.build_ai_provider", lambda _: provider)
    candidate, session_id = make_completed_session(client, db_session, "batch-max-calls@example.com")

    response = client.post(
        f"/evaluations/sessions/{session_id}/generate",
        json={},
        headers=auth_header(candidate["access_token"]),
    )

    assert response.status_code == 500
    detail = response.json()["detail"]
    assert detail["reason"] == "max_ai_calls_exceeded"
    assert detail["total_ai_calls"] == 2
    assert db_session.scalar(select(EvaluationReport).where(EvaluationReport.session_id == session_id)) is None


def test_gemini_429_audit_and_safe_response_when_stub_disabled(
    client: TestClient, db_session: Session, monkeypatch, caplog
) -> None:
    provider = AuditedGeminiBatchProvider(fail_rate_limited=True)
    monkeypatch.setattr(
        "app.services.evaluation_service.get_settings",
        lambda: eval_settings(
            batch_evaluation_enabled=True,
            ai_required_for_evaluation=True,
            allow_stub_evaluation=False,
            report_generation_lock_enabled=True,
            ai_provider_failure_cooldown_seconds=300,
        ),
    )
    monkeypatch.setattr(
        "app.services.evaluation_service.build_ai_provider",
        lambda _: FallbackAIProvider(
            provider,
            requested_provider="gemini",
            fallback_chain=["gemini"],
            allow_stub=False,
            disable_provider_fallback=True,
            fallback_skipped_reason="Free-tier evaluation mode allows one provider call; fallback chain skipped.",
        ),
    )
    candidate, session_id = make_completed_session(client, db_session, "batch-gemini-429-audit@example.com")

    with caplog.at_level(logging.INFO):
        response = client.post(
            f"/evaluations/sessions/{session_id}/generate",
            json={},
            headers=auth_header(candidate["access_token"]),
        )

    assert response.status_code == 429
    detail = response.json()["detail"]
    assert detail["reason"] == "rate_limited"
    assert detail["provider"] == "gemini"
    assert detail["model"] == "gemini-test-model"
    assert detail["retryable"] is True
    assert detail["retry_after_seconds"] == 300
    assert detail["total_ai_calls"] == 1
    assert detail["fallback_skipped"] is True
    assert db_session.scalar(select(EvaluationReport).where(EvaluationReport.session_id == session_id)) is None
    assert "[AI_CALL_END]" in caplog.text
    assert "status=429" in caplog.text
    assert "reason=rate_limited" in caplog.text
    assert "[REPORT_AI_SUMMARY]" in caplog.text
    assert "status=failed" in caplog.text


def test_large_batch_payload_warning_logged(
    client: TestClient, db_session: Session, monkeypatch, caplog
) -> None:
    provider = AuditedGeminiBatchProvider()
    monkeypatch.setattr(
        "app.services.evaluation_service.get_settings",
        lambda: eval_settings(
            batch_evaluation_enabled=True,
            ai_required_for_evaluation=True,
            allow_stub_evaluation=False,
            report_generation_lock_enabled=True,
            ai_evaluation_large_payload_warning_chars=1,
        ),
    )
    monkeypatch.setattr("app.services.evaluation_service.build_ai_provider", lambda _: provider)
    candidate, session_id = make_completed_session(client, db_session, "batch-large-payload-warning@example.com")

    with caplog.at_level(logging.WARNING):
        response = client.post(
            f"/evaluations/sessions/{session_id}/generate",
            json={},
            headers=auth_header(candidate["access_token"]),
        )

    assert response.status_code == 200
    assert "[EVALUATION_PAYLOAD_LARGE]" in caplog.text


def test_batch_mode_forces_idk_and_skipped_answers_low(
    client: TestClient, db_session: Session, monkeypatch
) -> None:
    provider = BatchCountingProvider()
    monkeypatch.setattr(
        "app.services.evaluation_service.get_settings",
        lambda: eval_settings(
            batch_evaluation_enabled=True,
            ai_required_for_evaluation=True,
            allow_stub_evaluation=False,
        ),
    )
    monkeypatch.setattr("app.services.evaluation_service.build_ai_provider", lambda _: provider)
    seed_question_bank(db_session)
    candidate = signup(client, "batch-idk@example.com", "candidate")
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
            "duration_seconds": 10,
            "metadata": {},
        },
        headers=headers,
    )
    assert answer.status_code == 200
    finish = client.post(f"/assessments/sessions/{session_id}/finish", json={}, headers=headers)
    assert finish.status_code == 200

    response = client.post(f"/evaluations/sessions/{session_id}/generate", json={}, headers=headers)

    assert response.status_code == 200
    question_scores = response.json()["report_json"]["question_wise_scores"]
    assert question_scores[0]["answer_status"] == "insufficient_response"
    assert question_scores[0]["score"] <= 15
    assert all(item["answer_status"] == "skipped" for item in question_scores[1:])
    assert all(item["score"] == 0 for item in question_scores[1:])


def test_batch_mode_fills_missing_question_evaluations(
    client: TestClient, db_session: Session, monkeypatch
) -> None:
    class PartialBatchProvider(BatchCountingProvider):
        def evaluate_assessment_batch(self, payload):
            self.batch_calls += 1
            self.last_payload = payload
            first_question = payload["questions"][0]["question"]
            return AIBatchEvaluationDraft(
                question_evaluations=[
                    {
                        "question_id": first_question["assessment_question_id"],
                        "score": 81,
                        "answer_status": "answered",
                        "skill_area": first_question.get("category") or "General",
                        "strengths": ["Answered first question."],
                        "missing_concepts": [],
                        "feedback": "First question evaluated.",
                        "improvement_tip": "Keep practicing.",
                    }
                ],
                category_scores={
                    "technical_accuracy": 80,
                    "problem_solving": 80,
                    "communication": 80,
                    "code_quality": 80,
                    "system_design": 80,
                },
                recruiter_summary="Partial batch response still had usable summary.",
            )

    provider = PartialBatchProvider()
    monkeypatch.setattr(
        "app.services.evaluation_service.get_settings",
        lambda: eval_settings(
            batch_evaluation_enabled=True,
            ai_required_for_evaluation=True,
            allow_stub_evaluation=False,
        ),
    )
    monkeypatch.setattr("app.services.evaluation_service.build_ai_provider", lambda _: provider)
    candidate, session_id = make_completed_session(client, db_session, "batch-missing-question@example.com")

    response = client.post(
        f"/evaluations/sessions/{session_id}/generate",
        json={},
        headers=auth_header(candidate["access_token"]),
    )

    assert response.status_code == 200
    report_json = response.json()["report_json"]
    assert report_json["batch_missing_question_ids"]
    missing_scores = [
        item for item in report_json["question_wise_scores"] if item["assessment_question_id"] in report_json["batch_missing_question_ids"]
    ]
    assert missing_scores
    assert all(item["answer_status"] in {"insufficient_response", "skipped"} for item in missing_scores)
    assert all(item["score"] <= 20 for item in missing_scores)


def test_batch_mode_uses_generic_rubric_fallback_without_rag_docs(
    client: TestClient, db_session: Session, monkeypatch
) -> None:
    provider = BatchCountingProvider()
    monkeypatch.setattr(
        "app.services.evaluation_service.get_settings",
        lambda: eval_settings(
            batch_evaluation_enabled=True,
            ai_required_for_evaluation=True,
            allow_stub_evaluation=False,
            ai_free_tier_mode=True,
            rag_evaluation_embedding_mode="local",
        ),
    )
    monkeypatch.setattr("app.services.evaluation_service.build_ai_provider", lambda _: provider)
    candidate, session_id = make_completed_session(client, db_session, "batch-generic-rubric@example.com")

    response = client.post(
        f"/evaluations/sessions/{session_id}/generate",
        json={},
        headers=auth_header(candidate["access_token"]),
    )

    assert response.status_code == 200
    first_rubric = provider.last_payload["questions"][0]["question"]["rubric_context"][0]
    assert first_rubric["rubric_id"].startswith("generic-")
    assert first_rubric["expected_concepts"]
    assert 3 <= len(first_rubric["scoring_bullets"]) <= 5
    assert response.json()["report_json"]["rubric_retrieval_summary"]["fallback_used"] is True


def test_batch_mode_blocks_stub_when_real_ai_required(
    client: TestClient, db_session: Session, monkeypatch
) -> None:
    monkeypatch.setattr(
        "app.services.evaluation_service.get_settings",
        lambda: eval_settings(
            batch_evaluation_enabled=True,
            ai_required_for_evaluation=True,
            allow_stub_evaluation=False,
        ),
    )
    monkeypatch.setattr(
        "app.services.evaluation_service.build_ai_provider",
        lambda _: FallbackAIProvider(None, requested_provider="openrouter"),
    )
    candidate, session_id = make_completed_session(client, db_session, "batch-stub-blocked@example.com")

    response = client.post(
        f"/evaluations/sessions/{session_id}/generate",
        json={},
        headers=auth_header(candidate["access_token"]),
    )

    assert response.status_code == 409
    assert "Real AI evaluation is required" in response.json()["detail"]
    assert db_session.scalar(select(EvaluationReport).where(EvaluationReport.session_id == session_id)) is None


def test_explicit_stub_provider_does_not_create_live_report_when_disabled(
    client: TestClient, db_session: Session, monkeypatch
) -> None:
    monkeypatch.setattr(
        "app.services.evaluation_service.get_settings",
        lambda: eval_settings(
            batch_evaluation_enabled=True,
            ai_required_for_evaluation=True,
            allow_stub_evaluation=False,
            report_generation_lock_enabled=True,
        ),
    )
    monkeypatch.setattr(
        "app.services.ai_provider_factory.get_settings",
        lambda: fake_settings(ai_required_for_evaluation=True, allow_stub_evaluation=False),
    )
    candidate, session_id = make_completed_session(client, db_session, "batch-explicit-stub-blocked@example.com")

    response = client.post(
        f"/evaluations/sessions/{session_id}/generate",
        json={},
        headers={**auth_header(candidate["access_token"]), "X-AI-Provider": "stub"},
    )

    assert response.status_code == 503
    detail = response.json()["detail"]
    assert detail["code"] == "ai_provider_unavailable"
    assert detail["provider_metadata"]["actual_provider"] == "stub"
    assert db_session.scalar(select(EvaluationReport).where(EvaluationReport.session_id == session_id)) is None


def test_openrouter_429_returns_retryable_error_when_stub_disabled(
    client: TestClient, db_session: Session, monkeypatch
) -> None:
    class RateLimitedBatchProvider(DummyReasoningProvider):
        provider_name = "openrouter"

        def evaluate_assessment_batch(self, *_):
            raise ProviderOutputError("OpenRouter account-level rate_limited for model openrouter-default (HTTP 429)")

    monkeypatch.setattr(
        "app.services.evaluation_service.get_settings",
        lambda: eval_settings(
            batch_evaluation_enabled=True,
            ai_required_for_evaluation=True,
            allow_stub_evaluation=False,
            report_generation_lock_enabled=True,
            ai_provider_failure_cooldown_seconds=300,
        ),
    )
    monkeypatch.setattr(
        "app.services.evaluation_service.build_ai_provider",
        lambda _: FallbackAIProvider(
            RateLimitedBatchProvider(),
            requested_provider="openrouter",
            fallback_chain=["openrouter", "stub"],
            allow_stub=False,
        ),
    )
    candidate, session_id = make_completed_session(client, db_session, "batch-429-blocked@example.com")

    response = client.post(
        f"/evaluations/sessions/{session_id}/generate",
        json={},
        headers=auth_header(candidate["access_token"]),
    )

    assert response.status_code == 429
    detail = response.json()["detail"]
    assert detail["code"] == "ai_provider_unavailable"
    assert detail["retry_after_seconds"] == 300
    metadata = detail["provider_metadata"]
    assert metadata["failure_reason"]["openrouter"] == "rate_limited"
    assert metadata["failure_scope"]["openrouter"] == "account"
    assert db_session.scalar(select(EvaluationReport).where(EvaluationReport.session_id == session_id)) is None


def test_existing_report_returns_without_ai_call_when_lock_enabled(
    client: TestClient, db_session: Session, monkeypatch
) -> None:
    provider = BatchCountingProvider()
    monkeypatch.setattr(
        "app.services.evaluation_service.get_settings",
        lambda: eval_settings(
            batch_evaluation_enabled=True,
            ai_required_for_evaluation=True,
            allow_stub_evaluation=False,
            report_generation_lock_enabled=True,
        ),
    )
    monkeypatch.setattr("app.services.evaluation_service.build_ai_provider", lambda _: provider)
    candidate, session_id = make_completed_session(client, db_session, "batch-existing-lock@example.com")
    headers = auth_header(candidate["access_token"])

    first = client.post(f"/evaluations/sessions/{session_id}/generate", json={}, headers=headers)
    assert first.status_code == 200
    assert provider.batch_calls == 1

    second = client.post(f"/evaluations/sessions/{session_id}/generate", json={}, headers=headers)
    assert second.status_code == 200
    assert second.json()["id"] == first.json()["id"]
    assert provider.batch_calls == 1


def test_force_regenerate_updates_existing_report_with_lock(
    client: TestClient, db_session: Session, monkeypatch
) -> None:
    provider = BatchCountingProvider()
    monkeypatch.setattr(
        "app.services.evaluation_service.get_settings",
        lambda: eval_settings(
            batch_evaluation_enabled=True,
            ai_required_for_evaluation=True,
            allow_stub_evaluation=False,
            report_generation_lock_enabled=True,
        ),
    )
    monkeypatch.setattr("app.services.evaluation_service.build_ai_provider", lambda _: provider)
    candidate, session_id = make_completed_session(client, db_session, "batch-force-lock@example.com")
    headers = auth_header(candidate["access_token"])

    first = client.post(f"/evaluations/sessions/{session_id}/generate", json={}, headers=headers)
    forced = client.post(
        f"/evaluations/sessions/{session_id}/generate",
        json={"force_regenerate": True},
        headers=headers,
    )

    assert first.status_code == 200
    assert forced.status_code == 200
    assert first.json()["id"] == forced.json()["id"]
    assert provider.batch_calls == 2
    reports = db_session.scalars(select(EvaluationReport).where(EvaluationReport.session_id == session_id)).all()
    assert len(reports) == 1


def test_generation_lock_releases_on_provider_failure(
    client: TestClient, db_session: Session, monkeypatch
) -> None:
    provider = BatchCountingProvider()
    provider.fail_once = True
    monkeypatch.setattr(
        "app.services.evaluation_service.get_settings",
        lambda: eval_settings(
            batch_evaluation_enabled=True,
            ai_required_for_evaluation=True,
            allow_stub_evaluation=False,
            report_generation_lock_enabled=True,
            ai_provider_failure_cooldown_seconds=300,
        ),
    )
    monkeypatch.setattr("app.services.evaluation_service.build_ai_provider", lambda _: provider)
    candidate, session_id = make_completed_session(client, db_session, "batch-lock-release@example.com")
    headers = auth_header(candidate["access_token"])

    failed = client.post(f"/evaluations/sessions/{session_id}/generate", json={}, headers=headers)
    succeeded = client.post(f"/evaluations/sessions/{session_id}/generate", json={}, headers=headers)

    assert failed.status_code == 503
    assert succeeded.status_code == 200
    assert provider.batch_calls == 2


def test_concurrent_generate_calls_make_one_provider_call(
    client: TestClient, db_session: Session, monkeypatch
) -> None:
    provider = BatchCountingProvider()
    monkeypatch.setattr(
        "app.services.evaluation_service.get_settings",
        lambda: eval_settings(
            batch_evaluation_enabled=True,
            ai_required_for_evaluation=True,
            allow_stub_evaluation=False,
            report_generation_lock_enabled=True,
        ),
    )
    monkeypatch.setattr("app.services.evaluation_service.build_ai_provider", lambda _: provider)
    candidate, session_id = make_completed_session(client, db_session, "batch-concurrent-lock@example.com")
    headers = auth_header(candidate["access_token"])

    lock = report_generation_lock(session_id)
    assert lock.acquire(blocking=False) is True
    try:
        blocked = client.post(f"/evaluations/sessions/{session_id}/generate", json={}, headers=headers)
    finally:
        lock.release()
    assert blocked.status_code == 202
    assert blocked.json()["detail"]["code"] == "generation_in_progress"
    assert provider.batch_calls == 0

    generated = client.post(f"/evaluations/sessions/{session_id}/generate", json={}, headers=headers)
    assert generated.status_code == 200
    assert provider.batch_calls == 1


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
        lambda: fake_settings(
            gemini_api_key="configured-gemini-key",
            ai_free_tier_mode=False,
            evaluation_disable_provider_fallback=False,
            ai_required_for_evaluation=False,
            allow_stub_evaluation=True,
            enable_gemini_fallback=True,
        ),
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
        lambda: fake_settings(
            nvidia_api_key="configured-nvidia-key",
            gemini_api_key="configured-gemini-key",
            ai_free_tier_mode=False,
            evaluation_disable_provider_fallback=False,
            ai_required_for_evaluation=False,
            allow_stub_evaluation=True,
            enable_gemini_fallback=True,
        ),
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
    monkeypatch.setattr("app.services.evaluation_service.get_settings", lambda: eval_settings())
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
    monkeypatch.setattr("app.services.evaluation_service.get_settings", lambda: eval_settings())
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
    monkeypatch.setattr("app.services.evaluation_service.get_settings", lambda: eval_settings())
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
    monkeypatch.setattr("app.services.evaluation_service.get_settings", lambda: eval_settings())
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
    monkeypatch.setattr("app.services.evaluation_service.get_settings", lambda: eval_settings())
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
    monkeypatch.setattr("app.services.evaluation_service.get_settings", lambda: eval_settings())
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
