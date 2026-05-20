from types import SimpleNamespace

from fastapi.testclient import TestClient


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
