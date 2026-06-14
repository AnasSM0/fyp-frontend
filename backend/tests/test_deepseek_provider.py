import io
import json
import urllib.error
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest

from app.schemas.evaluation import AIBatchEvaluationDraft
from app.services.ai_call_audit import report_ai_audit
from app.services.ai_provider import ProviderOutputError, ProviderState
from app.services.ai_provider_factory import build_ai_provider
from app.services.deepseek_provider import DeepSeekProvider


COMPACT_BATCH_JSON = json.dumps(
    {
        "question_evaluations": [
            {
                "question_id": "q1",
                "score": 82,
                "answer_status": "answered",
                "skill_area": "API design",
                "strengths": ["clear API contract"],
                "missing_concepts": ["edge cases"],
                "feedback": "Good role-relevant API reasoning.",
                "improvement_tip": "Add concrete failure modes.",
            }
        ],
        "category_scores": {
            "technical_accuracy": 82,
            "problem_solving": 80,
            "communication": 78,
            "code_quality": 76,
            "system_design": 74,
        },
        "overall_strengths": ["Clear API reasoning."],
        "overall_growth_areas": ["Needs edge-case depth."],
        "candidate_summary": "Candidate is progressing toward junior readiness.",
        "recruiter_summary": "Candidate shows credible junior signals.",
        "role_fit_summary": "Aligned with Full Stack Developer fundamentals.",
        "recommended_next_steps": ["Practice error handling."],
        "improvement_plan": [{"day": "Day 1", "focus": "API errors", "task": "Design 4 error cases."}],
    }
)


def batch_payload() -> dict:
    return {
        "profile": {"target_role": "Full Stack Developer", "tech_stack": ["FastAPI"]},
        "session": {"target_role": "Full Stack Developer", "total_questions": 1},
        "integrity_summary": {"integrity_score": 100, "risk_level": "clean"},
        "questions": [
            {
                "question": {
                    "assessment_question_id": "q1",
                    "question_text": "Design a FastAPI endpoint.",
                    "question_type": "conceptual",
                    "category": "api-design",
                    "expected_concepts": ["validation", "error handling"],
                    "rubric_context": [
                        {
                            "rubric_id": "generic-api",
                            "rubric_title": "API rubric",
                            "category": "api",
                            "expected_concepts": ["validation"],
                            "scoring_bullets": ["Defines contract."],
                        }
                    ],
                },
                "answer": {"answer_status": "answered", "answer_text": "Validate inputs.", "code_text": ""},
            }
        ],
    }


class FakeResponse:
    status = 200

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def read(self):
        return json.dumps({"choices": [{"message": {"content": COMPACT_BATCH_JSON}}]}).encode("utf-8")


def provider(**overrides) -> DeepSeekProvider:
    values = {
        "api_key": "test-deepseek-key",
        "base_url": "https://deepseek.test",
        "model": "deepseek-chat",
        "reasoner_model": "deepseek-reasoner",
        "timeout_seconds": 1,
    }
    values.update(overrides)
    return DeepSeekProvider(**values)


def test_deepseek_request_uses_openai_compatible_endpoint_and_headers(monkeypatch):
    seen = {}

    def fake_urlopen(request, timeout):
        seen["url"] = request.full_url
        seen["timeout"] = timeout
        seen["authorization"] = request.get_header("Authorization")
        seen["content_type"] = request.get_header("Content-type")
        seen["body"] = json.loads(request.data.decode("utf-8"))
        return FakeResponse()

    monkeypatch.setattr("urllib.request.urlopen", fake_urlopen)
    result = provider().evaluate_assessment_batch(batch_payload())

    assert result.question_evaluations[0].question_id == "q1"
    assert seen["url"] == "https://deepseek.test/chat/completions"
    assert seen["timeout"] == 1
    assert seen["authorization"] == "Bearer test-deepseek-key"
    assert seen["content_type"] == "application/json"
    assert seen["body"]["model"] == "deepseek-chat"
    assert seen["body"]["temperature"] == 0.15


def test_deepseek_batch_records_one_audit_call(monkeypatch):
    monkeypatch.setattr("urllib.request.urlopen", lambda *_args, **_kwargs: FakeResponse())

    with report_ai_audit("session-1", max_ai_calls=1) as audit:
        provider().evaluate_assessment_batch(batch_payload())

    assert audit.total_ai_calls == 1
    assert audit.count_provider("deepseek") == 1
    assert audit.count_purpose("batch_evaluation") == 1


def test_deepseek_missing_key_fails_without_http_request(monkeypatch):
    called = False

    def fake_urlopen(*_args, **_kwargs):
        nonlocal called
        called = True
        return FakeResponse()

    monkeypatch.setattr("urllib.request.urlopen", fake_urlopen)
    deepseek = provider(api_key="")

    with pytest.raises(ProviderOutputError):
        deepseek.evaluate_assessment_batch(batch_payload())

    assert called is False
    assert deepseek.state.failure_reason["deepseek"] == "missing_api_key"
    assert deepseek.state.model_attempts[0]["status"] == "failed"


def test_deepseek_429_records_retry_after_and_sanitized_error(monkeypatch):
    def fake_urlopen(*_args, **_kwargs):
        headers = {"Retry-After": "42"}
        body = io.BytesIO(json.dumps({"error": {"message": "rate limit reached"}}).encode("utf-8"))
        raise urllib.error.HTTPError("https://deepseek.test", 429, "Too Many Requests", headers, body)

    monkeypatch.setattr("urllib.request.urlopen", fake_urlopen)
    deepseek = provider()

    with pytest.raises(ProviderOutputError):
        deepseek.evaluate_assessment_batch(batch_payload())

    assert deepseek.state.failure_reason["deepseek"] == "rate_limited"
    assert deepseek.state.failure_scope["deepseek"] == "account"
    assert deepseek.state.status_code["deepseek"] == 429
    assert deepseek.state.retry_after_seconds["deepseek"] == 42
    assert deepseek.state.sanitized_error_body["deepseek"] == "rate limit reached"


def test_deepseek_markdown_wrapped_json_is_repaired(monkeypatch):
    deepseek = provider()

    def fake_chat(*_args, **_kwargs):
        return f"```json\n{COMPACT_BATCH_JSON}\n```"

    monkeypatch.setattr(deepseek, "_chat_completion", fake_chat)

    result = deepseek.evaluate_assessment_batch(batch_payload())

    assert isinstance(result, AIBatchEvaluationDraft)
    assert result.question_evaluations[0].score == 82
    assert deepseek.state.model_attempts[0]["status"] == "success"


def test_factory_default_provider_selects_deepseek(monkeypatch):
    class SuccessfulDeepSeek:
        def __init__(self, *_, **kwargs):
            self.state = ProviderState(provider="deepseek", model=kwargs.get("model", "deepseek-chat"))

    monkeypatch.setattr(
        "app.services.ai_provider_factory.get_settings",
        lambda: SimpleNamespace(
            default_ai_provider="deepseek",
            enable_ai_fallback=True,
            deepseek_api_key="configured",
            deepseek_base_url="https://deepseek.test",
            deepseek_model="deepseek-chat",
            deepseek_reasoner_model="deepseek-reasoner",
            deepseek_timeout_ms=15000,
            ai_free_tier_mode=True,
            evaluation_max_ai_calls_per_report=1,
            evaluation_disable_provider_fallback=True,
            ai_required_for_evaluation=True,
            allow_stub_evaluation=False,
            ai_provider_failure_cooldown_seconds=300,
        ),
    )
    monkeypatch.setattr("app.services.ai_provider_factory.DeepSeekProvider", SuccessfulDeepSeek)

    ai_provider = build_ai_provider()
    metadata = ai_provider.state.metadata().model_dump()

    assert metadata["requested_provider"] == "deepseek"
    assert metadata["actual_provider"] == "deepseek"
    assert metadata["fallback_chain"] == ["deepseek"]


def test_factory_explicit_provider_selects_deepseek(monkeypatch):
    class SuccessfulDeepSeek:
        def __init__(self, *_, **kwargs):
            self.state = ProviderState(provider="deepseek", model=kwargs.get("model", "deepseek-chat"))

    monkeypatch.setattr(
        "app.services.ai_provider_factory.get_settings",
        lambda: SimpleNamespace(
            default_ai_provider="openrouter",
            enable_ai_fallback=True,
            deepseek_api_key="configured",
            deepseek_base_url="https://deepseek.test",
            deepseek_model="deepseek-chat",
            deepseek_reasoner_model="deepseek-reasoner",
            deepseek_timeout_ms=15000,
            ai_free_tier_mode=True,
            evaluation_max_ai_calls_per_report=1,
            evaluation_disable_provider_fallback=True,
            ai_required_for_evaluation=True,
            allow_stub_evaluation=False,
            ai_provider_failure_cooldown_seconds=300,
        ),
    )
    monkeypatch.setattr("app.services.ai_provider_factory.DeepSeekProvider", SuccessfulDeepSeek)

    ai_provider = build_ai_provider("deepseek")
    metadata = ai_provider.state.metadata().model_dump()

    assert metadata["requested_provider"] == "deepseek"
    assert metadata["actual_provider"] == "deepseek"


def test_factory_explicit_gemini_overrides_deepseek_default(monkeypatch):
    class SuccessfulGemini:
        def __init__(self, *_, **kwargs):
            self.state = ProviderState(provider="gemini", model=kwargs.get("model", "gemini-test-model"))

    monkeypatch.setattr(
        "app.services.ai_provider_factory.get_settings",
        lambda: SimpleNamespace(
            default_ai_provider="deepseek",
            enable_ai_fallback=True,
            deepseek_api_key="configured",
            deepseek_base_url="https://deepseek.test",
            deepseek_model="deepseek-chat",
            deepseek_reasoner_model="deepseek-reasoner",
            deepseek_timeout_ms=15000,
            gemini_api_key="configured-gemini-key",
            gemini_model="gemini-test-model",
            ai_free_tier_mode=True,
            evaluation_max_ai_calls_per_report=1,
            evaluation_disable_provider_fallback=True,
            ai_required_for_evaluation=True,
            allow_stub_evaluation=False,
            ai_provider_failure_cooldown_seconds=300,
        ),
    )
    monkeypatch.setattr("app.services.ai_provider_factory.GeminiProvider", SuccessfulGemini)

    ai_provider = build_ai_provider("gemini")
    metadata = ai_provider.state.metadata().model_dump()

    assert metadata["requested_provider"] == "gemini"
    assert metadata["actual_provider"] == "gemini"
    assert metadata["fallback_chain"][0] == "gemini"
    assert "deepseek" in metadata["fallback_chain"]
    assert metadata["fallback_skipped"] is False


def test_factory_selected_gemini_falls_back_to_deepseek_when_rate_limited(monkeypatch):
    class RateLimitedGemini:
        def __init__(self, *_, **kwargs):
            self.state = ProviderState(provider="gemini", model=kwargs.get("model", "gemini-test-model"))

        def evaluate_assessment_batch(self, *_):
            self.state.failure_reason["gemini"] = "rate_limited"
            self.state.status_code["gemini"] = 429
            raise ProviderOutputError("Gemini request failed with HTTP 429 rate_limited")

    class SuccessfulDeepSeek:
        def __init__(self, *_, **kwargs):
            self.state = ProviderState(provider="deepseek", model=kwargs.get("model", "deepseek-chat"))

        def evaluate_assessment_batch(self, *_):
            return AIBatchEvaluationDraft(
                question_evaluations=[],
                category_scores={
                    "technical_accuracy": 80,
                    "problem_solving": 80,
                    "communication": 80,
                    "code_quality": 80,
                    "system_design": 80,
                },
                overall_strengths=["Fallback succeeded."],
                overall_growth_areas=[],
                candidate_summary="DeepSeek generated the report after Gemini was rate limited.",
                recruiter_summary="DeepSeek fallback worked.",
                role_fit_summary="Fallback preserved report generation.",
                recommended_next_steps=[],
                improvement_plan=[],
            )

    monkeypatch.setattr(
        "app.services.ai_provider_factory.get_settings",
        lambda: SimpleNamespace(
            default_ai_provider="deepseek",
            enable_ai_fallback=True,
            deepseek_api_key="configured-deepseek-key",
            deepseek_base_url="https://deepseek.test",
            deepseek_model="deepseek-chat",
            deepseek_reasoner_model="deepseek-reasoner",
            deepseek_timeout_ms=15000,
            gemini_api_key="configured-gemini-key",
            gemini_model="gemini-test-model",
            ai_free_tier_mode=True,
            evaluation_max_ai_calls_per_report=1,
            evaluation_disable_provider_fallback=True,
            ai_required_for_evaluation=True,
            allow_stub_evaluation=False,
            ai_provider_failure_cooldown_seconds=300,
        ),
    )
    monkeypatch.setattr("app.services.ai_provider_factory.GeminiProvider", RateLimitedGemini)
    monkeypatch.setattr("app.services.ai_provider_factory.DeepSeekProvider", SuccessfulDeepSeek)

    ai_provider = build_ai_provider("gemini")
    result = ai_provider.evaluate_assessment_batch({"questions": []})
    metadata = ai_provider.state.metadata().model_dump()

    assert result.candidate_summary == "DeepSeek generated the report after Gemini was rate limited."
    assert metadata["requested_provider"] == "gemini"
    assert metadata["actual_provider"] == "deepseek"
    assert metadata["fallback_used"] is True
    assert metadata["fallback_skipped"] is False
    assert metadata["failure_reason"]["gemini"] == "rate_limited"


def test_factory_explicit_provider_ignores_stale_cooldown_before_fallback(monkeypatch):
    class SuccessfulGemini:
        def __init__(self, *_, **kwargs):
            self.state = ProviderState(provider="gemini", model=kwargs.get("model", "gemini-test-model"))

    def active_entry(provider: str, capability: str, model: str | None = None):
        if provider != "gemini":
            return None
        return SimpleNamespace(
            provider=provider,
            capability=capability,
            failure_reason="provider_cooldown_active",
            cooldown_until=datetime.now(timezone.utc) + timedelta(seconds=42),
            failure_scope="account",
        )

    monkeypatch.setattr("app.services.ai_provider_factory.provider_health_entry", active_entry)
    monkeypatch.setattr(
        "app.services.ai_provider_factory.get_settings",
        lambda: SimpleNamespace(
            default_ai_provider="deepseek",
            enable_ai_fallback=True,
            deepseek_api_key="configured-deepseek-key",
            deepseek_base_url="https://deepseek.test",
            deepseek_model="deepseek-chat",
            deepseek_reasoner_model="deepseek-reasoner",
            deepseek_timeout_ms=15000,
            gemini_api_key="configured-gemini-key",
            gemini_model="gemini-test-model",
            ai_free_tier_mode=True,
            evaluation_max_ai_calls_per_report=1,
            evaluation_disable_provider_fallback=True,
            ai_required_for_evaluation=True,
            allow_stub_evaluation=False,
            redis_provider_cooldown_default_seconds=300,
            ai_provider_failure_cooldown_seconds=300,
        ),
    )
    monkeypatch.setattr("app.services.ai_provider_factory.GeminiProvider", SuccessfulGemini)

    ai_provider = build_ai_provider("gemini")
    metadata = ai_provider.state.metadata().model_dump()

    assert metadata["requested_provider"] == "gemini"
    assert metadata["actual_provider"] == "gemini"
    assert "gemini" not in metadata["skipped_providers"]
    assert any("explicitly selected" in warning for warning in metadata["warnings"])


def test_deepseek_single_provider_mode_does_not_fallback_to_stub(monkeypatch):
    monkeypatch.setattr(
        "app.services.ai_provider_factory.get_settings",
        lambda: SimpleNamespace(
            default_ai_provider="deepseek",
            enable_ai_fallback=True,
            deepseek_api_key="",
            deepseek_base_url="https://deepseek.test",
            deepseek_model="deepseek-chat",
            deepseek_reasoner_model="deepseek-reasoner",
            deepseek_timeout_ms=15000,
            ai_free_tier_mode=True,
            evaluation_max_ai_calls_per_report=1,
            evaluation_disable_provider_fallback=True,
            ai_required_for_evaluation=True,
            allow_stub_evaluation=False,
            ai_provider_failure_cooldown_seconds=300,
        ),
    )

    ai_provider = build_ai_provider()
    with pytest.raises(ProviderOutputError):
        ai_provider.evaluate_assessment_batch(batch_payload())

    metadata = ai_provider.state.metadata().model_dump()
    assert metadata["actual_provider"] == "deepseek"
    assert metadata["fallback_chain"] == ["deepseek"]
    assert metadata["fallback_skipped"] is True
    assert metadata["failure_reason"]["deepseek"] == "missing_api_key"
