import json
from types import SimpleNamespace
import urllib.error
import pytest

from app.schemas.evaluation import AIBatchEvaluationDraft, AIProjectQualityEvaluation
from app.services.ai_provider import (
    ProviderOutputError,
    ProviderState,
    batch_evaluation_system_prompt,
    batch_evaluation_user_prompt,
    parse_structured_output,
)
from app.services.ai_provider_factory import build_ai_provider
from app.services.ai_provider_health import provider_health_entry
from app.services.openrouter_provider import OpenRouterProvider


ANSWER_JSON = json.dumps(
    {
        "technical_accuracy": 82,
        "problem_solving": 80,
        "communication_clarity": 78,
        "reasoning_depth": 81,
        "code_quality": 76,
        "expected_concepts_covered": ["API contract"],
        "missing_concepts": ["edge cases"],
        "confidence": 86,
        "short_feedback": "Evidence-based evaluation.",
        "transcript_evidence": ["candidate explained API contract"],
    }
)

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
        "candidate_summary": "Candidate is progressing toward junior full-stack readiness.",
        "recruiter_summary": "Candidate shows credible junior full-stack signals.",
        "role_fit_summary": "Aligned with Full Stack Developer fundamentals.",
        "recommended_next_steps": ["Practice error handling."],
        "improvement_plan": [{"day": "Day 1", "focus": "API errors", "task": "Design 4 error cases."}],
    }
)


def provider(**overrides) -> OpenRouterProvider:
    values = {
        "api_key": "test-openrouter-key",
        "base_url": "https://openrouter.test/api/v1",
        "model": "qwen/qwen3-next-80b-a3b-instruct:free",
        "coder_model": "qwen/qwen3-coder-480b-a35b-instruct:free",
        "fallback_model": "openai/gpt-oss-120b:free",
        "app_name": "HirdUp Test",
        "site_url": "http://testserver",
        "timeout_seconds": 1,
    }
    values.update(overrides)
    return OpenRouterProvider(**values)


def fake_profile():
    return SimpleNamespace(
        full_name="Alex Chen",
        target_role="Full Stack Developer",
        experience_level="Student / Early Career",
        skills=["React", "FastAPI"],
        tech_stack=["React", "FastAPI", "PostgreSQL"],
        project_summary="Built a full-stack assessment app.",
        career_goal="Junior full-stack developer",
        portfolio_url=None,
        linkedin_url=None,
        resume_url=None,
    )


def fake_answer(*, code_text="", question_type="conceptual", category="technical_fundamentals", metadata=None):
    return SimpleNamespace(
        answer_text="I would validate the request, define the API contract, and handle errors clearly.",
        code_text=code_text,
        duration_seconds=120,
        answer_metadata=metadata or {},
        assessment_question=SimpleNamespace(
            question_text="How would you design this API?",
            question_type=question_type,
            category=category,
            expected_concepts=["API contract", "validation", "error handling"],
            scoring_rubric={"technical_accuracy": 40, "communication": 20},
        ),
    )


def batch_payload(*, code_text: str = "", answer_text: str = "I would validate inputs.") -> dict:
    return {
        "profile": {
            "target_role": "Full Stack Developer",
            "tech_stack": ["React", "FastAPI", "PostgreSQL"],
            "project_summary": "Built a full-stack assessment app.",
        },
        "session": {"target_role": "Full Stack Developer", "total_questions": 1},
        "integrity_summary": {"integrity_score": 100, "risk_level": "clean"},
        "questions": [
            {
                "question": {
                    "assessment_question_id": "q1",
                    "question_text": "Design a FastAPI endpoint.",
                    "question_type": "coding" if code_text else "conceptual",
                    "category": "api-design",
                    "expected_concepts": ["validation", "error handling"],
                    "rubric_hint": {"scoring_keys": ["api_design"]},
                },
                "answer": {
                    "answer_status": "answered" if answer_text or code_text else "skipped",
                    "answer_text": answer_text,
                    "code_text": code_text,
                    "latest_run_result": {"status": "passed"} if code_text else None,
                },
            }
        ],
    }


class FakeResponse:
    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def read(self):
        return json.dumps({"choices": [{"message": {"content": ANSWER_JSON}}]}).encode("utf-8")


def test_openrouter_request_uses_configured_headers(monkeypatch):
    seen = {}

    def fake_urlopen(request, timeout):
        seen["url"] = request.full_url
        seen["timeout"] = timeout
        seen["authorization"] = request.get_header("Authorization")
        seen["referer"] = request.get_header("Http-referer")
        seen["title"] = request.get_header("X-title")
        seen["body"] = json.loads(request.data.decode("utf-8"))
        return FakeResponse()

    monkeypatch.setattr("urllib.request.urlopen", fake_urlopen)
    result = provider().evaluate_answer(fake_profile(), fake_answer())

    assert result.technical_accuracy == 82
    assert seen["url"] == "https://openrouter.test/api/v1/chat/completions"
    assert seen["authorization"] == "Bearer test-openrouter-key"
    assert seen["referer"] == "http://testserver"
    assert seen["title"] == "HirdUp Test"
    assert seen["body"]["model"] == "qwen/qwen3-next-80b-a3b-instruct:free"


def test_normal_answer_uses_default_model(monkeypatch):
    openrouter = provider()
    models = []

    def fake_chat(*, model, prompt, max_tokens):
        models.append(model)
        return ANSWER_JSON

    monkeypatch.setattr(openrouter, "_chat_completion", fake_chat)
    openrouter.evaluate_answer(fake_profile(), fake_answer())

    assert models == ["qwen/qwen3-next-80b-a3b-instruct:free"]
    assert openrouter.state.model == "qwen/qwen3-next-80b-a3b-instruct:free"
    assert openrouter.state.model_attempts[0]["status"] == "success"


def test_coding_answer_uses_coder_model_first(monkeypatch):
    openrouter = provider()
    models = []

    def fake_chat(*, model, prompt, max_tokens):
        models.append(model)
        assert "Code runner result" in prompt
        return ANSWER_JSON

    monkeypatch.setattr(openrouter, "_chat_completion", fake_chat)
    answer = fake_answer(
        code_text="def solve(items):\n    return items",
        question_type="coding",
        metadata={"latest_run_result": {"status": "failed", "passed_count": 1, "failed_count": 1}},
    )
    openrouter.evaluate_answer(fake_profile(), answer)

    assert models == ["qwen/qwen3-coder-480b-a35b-instruct:free"]
    assert openrouter.state.model == "qwen/qwen3-coder-480b-a35b-instruct:free"


def test_openrouter_model_fallback_before_other_providers(monkeypatch):
    openrouter = provider()
    models = []

    def fake_chat(*, model, prompt, max_tokens):
        models.append(model)
        if model != "openai/gpt-oss-120b:free":
            raise ProviderOutputError(f"OpenRouter model_not_found for model {model} (HTTP 404)")
        return ANSWER_JSON

    monkeypatch.setattr(openrouter, "_chat_completion", fake_chat)
    openrouter.evaluate_answer(fake_profile(), fake_answer(code_text="print('x')", question_type="coding"))

    assert models == [
        "qwen/qwen3-coder-480b-a35b-instruct:free",
        "qwen/qwen3-next-80b-a3b-instruct:free",
        "openai/gpt-oss-120b:free",
    ]
    assert openrouter.state.model == "openai/gpt-oss-120b:free"
    assert [item["status"] for item in openrouter.state.model_attempts] == ["failed", "failed", "success"]
    assert "qwen/qwen3-coder-480b-a35b-instruct:free" in openrouter.state.warnings[0]


def test_openrouter_429_stops_model_cascade(monkeypatch):
    openrouter = provider()
    models = []

    def fake_chat(*, model, prompt, max_tokens, system_prompt=None):
        models.append(model)
        raise ProviderOutputError(f"OpenRouter rate_limited for model {model} (HTTP 429)")

    monkeypatch.setattr(openrouter, "_chat_completion", fake_chat)

    with pytest.raises(ProviderOutputError):
        openrouter.evaluate_answer(fake_profile(), fake_answer(code_text="print('x')", question_type="coding"))

    assert models == ["qwen/qwen3-coder-480b-a35b-instruct:free"]
    assert openrouter.state.failure_reason["openrouter"] == "rate_limited"
    assert openrouter.state.failure_scope["openrouter"] == "account"
    assert openrouter.state.model_attempts[0]["failure_scope"] == "account"


def test_openrouter_single_model_mode_uses_one_model(monkeypatch):
    openrouter = provider(single_model_mode=True)
    models = []

    def fake_chat(*, model, prompt, max_tokens, system_prompt=None):
        models.append(model)
        raise ProviderOutputError(f"OpenRouter malformed structured output for model {model}")

    monkeypatch.setattr(openrouter, "_chat_completion", fake_chat)

    with pytest.raises(ProviderOutputError):
        openrouter.evaluate_answer(fake_profile(), fake_answer(code_text="print('x')", question_type="coding"))

    assert models == ["qwen/qwen3-coder-480b-a35b-instruct:free"]


def test_batch_prompt_includes_role_specific_interviewer_and_code_review_framing(monkeypatch):
    openrouter = provider()
    seen = {}

    def fake_chat(*, model, prompt, max_tokens, system_prompt=None):
        seen["system_prompt"] = system_prompt
        seen["prompt"] = prompt
        return COMPACT_BATCH_JSON

    monkeypatch.setattr(openrouter, "_chat_completion", fake_chat)
    result = openrouter.evaluate_assessment_batch(
        batch_payload(code_text="def solve(payload):\n    return {'ok': True}")
    )

    assert result.question_evaluations[0].question_id == "q1"
    assert "Full Stack Developer" in seen["system_prompt"]
    assert "senior technical interviewer evaluating a candidate for the role" in seen["system_prompt"]
    assert "senior engineer reviewing an applicant's code for Full Stack Developer" in seen["system_prompt"]
    assert "Penalize idk, blank, skipped, or irrelevant responses" in seen["system_prompt"]
    assert '"question_evaluations"' in seen["prompt"]


def test_batch_prompt_instructs_penalizing_weak_answers():
    payload = batch_payload(answer_text="idk")
    system_prompt = batch_evaluation_system_prompt(payload)
    user_prompt = batch_evaluation_user_prompt(payload)

    assert "Penalize idk, blank, skipped, or irrelevant responses" in system_prompt
    assert 'Use "insufficient" for idk, blank, vague, irrelevant, or too-short answers' in user_prompt


def test_compact_batch_schema_defaults_and_score_clamping():
    draft = AIBatchEvaluationDraft.model_validate(
        {
            "question_evaluations": [
                {"question_id": "q1", "score": 150},
                {"question_id": "q2", "score": -20, "answer_status": "idk"},
            ],
            "candidate_summary": "usable core summary",
        }
    )

    assert draft.question_evaluations[0].score == 100
    assert draft.question_evaluations[0].answer_status == "answered"
    assert draft.question_evaluations[0].skill_area == "General"
    assert draft.question_evaluations[1].score == 0
    assert draft.question_evaluations[1].answer_status == "insufficient"
    assert draft.category_scores.technical_accuracy == 0
    assert draft.recommended_next_steps == []


def test_markdown_wrapped_compact_batch_json_is_extracted():
    wrapped = f"Here is the result:\n```json\n{COMPACT_BATCH_JSON}\n```"
    draft = parse_structured_output(wrapped, AIBatchEvaluationDraft)

    assert draft.question_evaluations[0].question_id == "q1"
    assert draft.recruiter_summary.startswith("Candidate shows")


def test_429_marks_openrouter_unhealthy(monkeypatch):
    class RateLimitedOpenRouter:
        def __init__(self, *_, **kwargs):
            self.state = ProviderState(provider="openrouter", model=kwargs.get("model", "openrouter-test-model"))

        def evaluate_project_profile(self, *_):
            raise ProviderOutputError("OpenRouter rate_limited for model test-model (HTTP 429)")

    monkeypatch.setattr(
        "app.services.ai_provider_factory.get_settings",
        lambda: SimpleNamespace(
            default_ai_provider="openrouter",
            enable_ai_fallback=True,
            openrouter_api_key="configured",
            openrouter_base_url="https://openrouter.test/api/v1",
            openrouter_model="openrouter-default",
            openrouter_coder_model="openrouter-coder",
            openrouter_fallback_model="openrouter-fallback",
            openrouter_app_name="HirdUp Test",
            openrouter_site_url="http://testserver",
            openrouter_evaluation_timeout_ms=15000,
            openrouter_onboarding_timeout_ms=1200,
            ai_provider_failure_cooldown_seconds=300,
            nvidia_api_key="",
            gemini_api_key="",
        ),
    )
    monkeypatch.setattr("app.services.ai_provider_factory.OpenRouterProvider", RateLimitedOpenRouter)

    ai_provider = build_ai_provider("openrouter")
    result = ai_provider.evaluate_project_profile(fake_profile())
    metadata = ai_provider.state.metadata().model_dump()

    assert result.project_quality_score > 0
    assert metadata["actual_provider"] == "stub"
    assert metadata["failure_reason"]["openrouter"] == "rate_limited"
    assert metadata["failure_scope"]["openrouter"] == "account"
    assert provider_health_entry("openrouter", "evaluation") is not None


def test_missing_openrouter_key_falls_back_safely(monkeypatch):
    monkeypatch.setattr(
        "app.services.ai_provider_factory.get_settings",
        lambda: SimpleNamespace(
            default_ai_provider="openrouter",
            enable_ai_fallback=True,
            openrouter_api_key="",
            openrouter_evaluation_timeout_ms=15000,
            openrouter_onboarding_timeout_ms=1200,
            ai_provider_failure_cooldown_seconds=300,
            nvidia_api_key="",
            gemini_api_key="",
        ),
    )
    ai_provider = build_ai_provider()
    metadata = ai_provider.state.metadata().model_dump()

    assert metadata["requested_provider"] == "openrouter"
    assert metadata["actual_provider"] == "stub"
    assert any("OpenRouter API key missing" in warning for warning in metadata["warnings"])
