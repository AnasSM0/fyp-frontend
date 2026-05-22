from types import SimpleNamespace

from fastapi.testclient import TestClient

from app.schemas.ai import OnboardingAIResponseDraft
from app.services.ai_provider import ProviderOutputError, ProviderState, parse_structured_output


def auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def signup(client: TestClient, email: str, role: str) -> dict:
    response = client.post(
        "/auth/signup",
        json={"email": email, "password": "password123", "role": role},
    )
    assert response.status_code == 201
    return response.json()


def fake_settings(**overrides):
    values = {
        "default_ai_provider": "nvidia",
        "enable_ai_fallback": True,
        "ai_onboarding_provider_timeout_ms": 1200,
        "ai_evaluation_provider_timeout_ms": 15000,
        "ai_provider_failure_cooldown_seconds": 300,
        "ai_fast_onboarding_mode": True,
        "ai_onboarding_skip_unhealthy_providers": True,
        "ai_onboarding_max_real_provider_attempts": 1,
        "nvidia_api_key": "",
        "nvidia_base_url": "https://integrate.api.nvidia.com/v1",
        "nvidia_model": "nvidia-test-model",
        "gemini_api_key": "",
        "gemini_model": "gemini-test-model",
    }
    values.update(overrides)
    return SimpleNamespace(**values)


def onboarding_payload(**overrides) -> dict:
    payload = {
        "current_profile": {
            "target_role": None,
            "tech_stack": [],
            "skills": [],
        },
        "user_message": "I use React, Next.js, TypeScript and FastAPI for full-stack projects.",
        "conversation_history": [
            {"role": "assistant", "content": "What technologies do you use most?"}
        ],
        "current_step": "tech_stack",
    }
    payload.update(overrides)
    return payload


def test_candidate_can_call_onboarding_chat_stub(
    client: TestClient, monkeypatch
) -> None:
    monkeypatch.setattr("app.services.ai_provider_factory.get_settings", lambda: fake_settings())
    candidate = signup(client, "onboarding-ai@example.com", "candidate")
    response = client.post(
        "/ai/onboarding/chat",
        json=onboarding_payload(),
        headers={**auth_header(candidate["access_token"]), "X-AI-Provider": "stub"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["assistant_message"]
    assert body["extracted_fields"]["target_role"]
    assert "React" in body["suggested_skills"]
    assert body["next_question"]
    assert body["provider_metadata"]["requested_provider"] == "stub"
    assert body["provider_metadata"]["actual_provider"] == "stub"
    assert body["provider_metadata"]["fast_mode_used"] is True


def test_onboarding_chat_candidate_only(client: TestClient) -> None:
    recruiter = signup(client, "onboarding-recruiter@example.com", "recruiter")
    response = client.post(
        "/ai/onboarding/chat",
        json=onboarding_payload(),
        headers=auth_header(recruiter["access_token"]),
    )
    assert response.status_code == 403


def test_onboarding_chat_requires_token(client: TestClient) -> None:
    response = client.post("/ai/onboarding/chat", json=onboarding_payload())
    assert response.status_code == 401


def test_onboarding_chat_rejects_empty_message(client: TestClient) -> None:
    candidate = signup(client, "onboarding-empty@example.com", "candidate")
    response = client.post(
        "/ai/onboarding/chat",
        json=onboarding_payload(user_message=""),
        headers=auth_header(candidate["access_token"]),
    )
    assert response.status_code == 422


def test_onboarding_chat_default_requests_nvidia_and_falls_back_to_stub(
    client: TestClient, monkeypatch
) -> None:
    monkeypatch.setattr("app.services.ai_provider_factory.get_settings", lambda: fake_settings())
    candidate = signup(client, "onboarding-default@example.com", "candidate")
    response = client.post(
        "/ai/onboarding/chat",
        json=onboarding_payload(),
        headers=auth_header(candidate["access_token"]),
    )

    assert response.status_code == 200
    metadata = response.json()["provider_metadata"]
    assert metadata["requested_provider"] == "nvidia"
    assert metadata["actual_provider"] == "stub"
    assert metadata["fallback_used"] is True
    assert "nvidia" in metadata["fallback_chain"]


def test_onboarding_chat_invalid_provider_rejected(client: TestClient) -> None:
    candidate = signup(client, "onboarding-invalid-provider@example.com", "candidate")
    response = client.post(
        "/ai/onboarding/chat",
        json=onboarding_payload(),
        headers={**auth_header(candidate["access_token"]), "X-AI-Provider": "openrouter"},
    )
    assert response.status_code == 422
    assert "Unsupported AI provider" in response.json()["detail"]


def test_onboarding_chat_does_not_invent_hard_facts(client: TestClient, monkeypatch) -> None:
    monkeypatch.setattr("app.services.ai_provider_factory.get_settings", lambda: fake_settings())
    candidate = signup(client, "onboarding-hard-facts@example.com", "candidate")
    response = client.post(
        "/ai/onboarding/chat",
        json=onboarding_payload(user_message="I know React and FastAPI."),
        headers={**auth_header(candidate["access_token"]), "X-AI-Provider": "stub"},
    )

    assert response.status_code == 200
    fields = response.json()["extracted_fields"]
    assert fields["university"] is None
    assert fields["graduation_year"] is None
    assert fields["gpa"] is None
    assert fields["linkedin_url"] is None


def test_onboarding_chat_response_does_not_expose_api_keys(client: TestClient, monkeypatch) -> None:
    monkeypatch.setattr(
        "app.services.ai_provider_factory.get_settings",
        lambda: fake_settings(nvidia_api_key="secret-nvidia-key", gemini_api_key="secret-gemini-key"),
    )
    candidate = signup(client, "onboarding-secrets@example.com", "candidate")
    response = client.post(
        "/ai/onboarding/chat",
        json=onboarding_payload(),
        headers={**auth_header(candidate["access_token"]), "X-AI-Provider": "stub"},
    )
    raw = response.text
    assert response.status_code == 200
    assert "secret-nvidia-key" not in raw
    assert "secret-gemini-key" not in raw


def test_wrapped_onboarding_json_is_repaired() -> None:
    raw = """
Here is the structured result:
```json
{
  "assistant_message": "I found full-stack signals.",
  "extracted_fields": {"target_role": "Full Stack Developer", "tech_stack": ["React"]},
  "suggested_skills": ["React"],
  "inferred_target_role": "Full Stack Developer",
  "inferred_experience_level": "Student / Early Career",
  "missing_fields": ["project_summary"],
  "profile_completion_delta": 20,
  "next_question": "What project best proves this?",
  "confidence": 80
}
```
"""
    draft = parse_structured_output(raw, OnboardingAIResponseDraft)
    assert draft.inferred_target_role == "Full Stack Developer"
    assert draft.extracted_fields.tech_stack == ["React"]


def test_partial_onboarding_json_gets_safe_defaults() -> None:
    raw = '{"assistant_message": "I found React and FastAPI.", "next_question": "What project proves this?"}'
    draft = parse_structured_output(raw, OnboardingAIResponseDraft)
    assert draft.assistant_message
    assert draft.next_question
    assert draft.extracted_fields.tech_stack == []
    assert draft.profile_completion_delta == 0
    assert draft.confidence == 50


class FailingNvidiaOnboardingProvider:
    def __init__(self, *_, **kwargs):
        self.state = ProviderState(provider="nvidia", model=kwargs.get("model", "nvidia-test-model"))

    def generate_onboarding_chat(self, *_):
        raise ProviderOutputError("Provider returned malformed structured output")


class TimeoutNvidiaOnboardingProvider(FailingNvidiaOnboardingProvider):
    def generate_onboarding_chat(self, *_):
        raise ProviderOutputError("NVIDIA request timed out")


class RateLimitedGeminiOnboardingProvider:
    calls = 0

    def __init__(self, *_, **kwargs):
        self.state = ProviderState(provider="gemini", model=kwargs.get("model", "gemini-test-model"))

    def generate_onboarding_chat(self, *_):
        type(self).calls += 1
        raise ProviderOutputError("Gemini request failed with HTTP 429")


def test_fast_onboarding_mode_does_not_walk_full_chain(client: TestClient, monkeypatch) -> None:
    monkeypatch.setattr(
        "app.services.ai_provider_factory.get_settings",
        lambda: fake_settings(nvidia_api_key="configured-nvidia", gemini_api_key="configured-gemini"),
    )
    monkeypatch.setattr("app.services.ai_provider_factory.NVIDIAProvider", FailingNvidiaOnboardingProvider)
    candidate = signup(client, "onboarding-fast-chain@example.com", "candidate")

    response = client.post(
        "/ai/onboarding/chat",
        json=onboarding_payload(),
        headers=auth_header(candidate["access_token"]),
    )

    assert response.status_code == 200
    metadata = response.json()["provider_metadata"]
    assert metadata["requested_provider"] == "nvidia"
    assert metadata["actual_provider"] == "stub"
    assert metadata["fast_mode_used"] is True
    assert metadata["real_provider_attempts"] == 1
    assert metadata["failure_reason"]["nvidia"] == "malformed_structured_output"
    assert "gemini" not in metadata["latency_ms"]


def test_onboarding_timeout_falls_back_with_timeout_metadata(client: TestClient, monkeypatch) -> None:
    monkeypatch.setattr(
        "app.services.ai_provider_factory.get_settings",
        lambda: fake_settings(nvidia_api_key="configured-nvidia"),
    )
    monkeypatch.setattr("app.services.ai_provider_factory.NVIDIAProvider", TimeoutNvidiaOnboardingProvider)
    candidate = signup(client, "onboarding-timeout@example.com", "candidate")

    response = client.post(
        "/ai/onboarding/chat",
        json=onboarding_payload(),
        headers=auth_header(candidate["access_token"]),
    )

    assert response.status_code == 200
    metadata = response.json()["provider_metadata"]
    assert metadata["actual_provider"] == "stub"
    assert metadata["failure_reason"]["nvidia"] == "timeout"
    assert metadata["latency_ms"]["nvidia"] >= 0


def test_gemini_429_marks_unhealthy_and_skips_next_request(client: TestClient, monkeypatch) -> None:
    RateLimitedGeminiOnboardingProvider.calls = 0
    monkeypatch.setattr(
        "app.services.ai_provider_factory.get_settings",
        lambda: fake_settings(default_ai_provider="gemini", gemini_api_key="configured-gemini"),
    )
    monkeypatch.setattr("app.services.ai_provider_factory.GeminiProvider", RateLimitedGeminiOnboardingProvider)
    candidate = signup(client, "onboarding-gemini-429@example.com", "candidate")
    headers = {**auth_header(candidate["access_token"]), "X-AI-Provider": "gemini"}

    first = client.post("/ai/onboarding/chat", json=onboarding_payload(), headers=headers)
    second = client.post("/ai/onboarding/chat", json=onboarding_payload(), headers=headers)

    assert first.status_code == 200
    assert second.status_code == 200
    assert RateLimitedGeminiOnboardingProvider.calls == 1
    first_metadata = first.json()["provider_metadata"]
    second_metadata = second.json()["provider_metadata"]
    assert first_metadata["failure_reason"]["gemini"] == "rate_limited"
    assert second_metadata["skipped_providers"] == ["gemini"]
    assert second_metadata["provider_health"]["gemini"] == "cooldown"
    assert "gemini" in second_metadata["cooldown_until"]


def test_stub_onboarding_asks_project_question_after_stack_signal(client: TestClient, monkeypatch) -> None:
    monkeypatch.setattr("app.services.ai_provider_factory.get_settings", lambda: fake_settings())
    candidate = signup(client, "onboarding-stub-quality@example.com", "candidate")
    response = client.post(
        "/ai/onboarding/chat",
        json=onboarding_payload(
            user_message="I built a full-stack dashboard with React, FastAPI, PostgreSQL, JWT auth, and Docker.",
            current_profile={"target_role": "Full Stack Developer", "tech_stack": [], "skills": []},
        ),
        headers={**auth_header(candidate["access_token"]), "X-AI-Provider": "stub"},
    )

    assert response.status_code == 200
    body = response.json()
    assert "PostgreSQL" in body["suggested_skills"]
    assert body["extracted_fields"]["project_summary"]
    assert "project" in body["next_question"].lower() or "assessment" in body["next_question"].lower()
