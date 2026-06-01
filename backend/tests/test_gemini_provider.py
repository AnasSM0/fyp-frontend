from __future__ import annotations

import io
import json
import logging
import urllib.error
from types import SimpleNamespace

import pytest

from app.core.config import Settings
from app.services.embedding_provider import build_embedding_provider
from app.services.gemini_provider import GeminiProvider
from app.services.rag_ingestion_service import build_rag_embedding_provider
from app.services.ai_provider import ProviderOutputError


class FakeResponse:
    def __init__(self, body: dict):
        self.body = body

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def read(self) -> bytes:
        return json.dumps(self.body).encode("utf-8")


def test_config_defaults_gemini_primary_and_stub_embeddings() -> None:
    settings = Settings(_env_file=None)

    assert settings.default_ai_provider == "gemini"
    assert settings.embedding_provider == "stub"
    assert settings.rag_embedding_provider == "stub"
    assert settings.rag_embedding_model == "deterministic-stub"


def test_gemini_generate_content_uses_header_auth_and_rest_response_mime(monkeypatch) -> None:
    captured = {}

    def fake_urlopen(request, timeout):
        captured["url"] = request.full_url
        captured["timeout"] = timeout
        captured["headers"] = dict(request.header_items())
        captured["payload"] = json.loads(request.data.decode("utf-8"))
        return FakeResponse(
            {
                "candidates": [
                    {"content": {"parts": [{"text": '{"ok": true}'}]}}
                ]
            }
        )

    monkeypatch.setattr("urllib.request.urlopen", fake_urlopen)
    provider = GeminiProvider(api_key="secret-test-key", model="gemini-2.0-flash-lite", timeout_seconds=1.5)

    assert provider._generate_json("Return JSON") == '{"ok": true}'
    assert captured["url"].endswith("/v1beta/models/gemini-2.0-flash-lite:generateContent")
    assert "secret-test-key" not in captured["url"]
    assert captured["timeout"] == 1.5
    assert captured["headers"]["X-goog-api-key"] == "secret-test-key"
    assert captured["payload"]["generationConfig"]["responseMimeType"] == "application/json"
    assert "response_mime_type" not in captured["payload"]["generationConfig"]


def test_gemini_http_errors_include_status_reason_and_model(monkeypatch) -> None:
    error_body = {
        "error": {
            "code": 404,
            "status": "NOT_FOUND",
            "message": "models/gemini-2.0-flash-lite is not found for API version v1beta",
        }
    }

    def fake_urlopen(*_, **__):
        raise urllib.error.HTTPError(
            url="https://generativelanguage.googleapis.com/v1beta/models/bad:generateContent",
            code=404,
            msg="Not Found",
            hdrs=None,
            fp=io.BytesIO(json.dumps(error_body).encode("utf-8")),
        )

    monkeypatch.setattr("urllib.request.urlopen", fake_urlopen)
    provider = GeminiProvider(api_key="secret-test-key", model="bad-model")

    with pytest.raises(ProviderOutputError) as exc:
        provider._generate_json("Return JSON")

    message = str(exc.value)
    assert "HTTP 404" in message
    assert "model_not_found" in message
    assert "NOT_FOUND" in message
    assert "bad-model" in message
    assert "secret-test-key" not in message


def test_gemini_429_is_classified_in_error_message(monkeypatch) -> None:
    error_body = {
        "error": {
            "code": 429,
            "status": "RESOURCE_EXHAUSTED",
            "message": "Quota exceeded for requests per minute.",
        }
    }

    def fake_urlopen(*_, **__):
        raise urllib.error.HTTPError(
            url="https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent",
            code=429,
            msg="Too Many Requests",
            hdrs=None,
            fp=io.BytesIO(json.dumps(error_body).encode("utf-8")),
        )

    monkeypatch.setattr("urllib.request.urlopen", fake_urlopen)
    provider = GeminiProvider(api_key="secret-test-key", model="gemini-2.0-flash-lite")

    with pytest.raises(ProviderOutputError) as exc:
        provider._generate_json("Return JSON")

    message = str(exc.value)
    assert "HTTP 429" in message
    assert "rate_limited" in message
    assert "RESOURCE_EXHAUSTED" in message
    assert "Quota exceeded" in message
    assert "secret-test-key" not in message


def test_candidate_embedding_provider_does_not_use_gemini_by_default(monkeypatch) -> None:
    monkeypatch.setattr(
        "app.services.embedding_provider.get_settings",
        lambda: SimpleNamespace(
            embedding_provider="stub",
            gemini_api_key="configured-gemini-key",
            gemini_embedding_model="text-embedding-004",
            stub_embedding_dimensions=64,
        ),
    )

    provider = build_embedding_provider()

    assert provider.primary is None
    result = provider.embed_text("React FastAPI PostgreSQL")
    assert result.provider == "stub"


def test_live_gemini_embedding_blocked_when_disabled(monkeypatch, caplog) -> None:
    monkeypatch.setattr(
        "app.services.embedding_provider.get_settings",
        lambda: SimpleNamespace(
            embedding_provider="gemini",
            enable_live_embedding_calls=False,
            gemini_api_key="configured-gemini-key",
            gemini_embedding_model="text-embedding-004",
            stub_embedding_dimensions=64,
        ),
    )

    with caplog.at_level(logging.WARNING):
        provider = build_embedding_provider()

    assert provider.primary is None
    assert "[LIVE_EMBEDDING_BLOCKED]" in caplog.text
    assert "provider=gemini" in caplog.text


def test_rag_embedding_provider_does_not_use_gemini_by_default(monkeypatch) -> None:
    monkeypatch.setattr(
        "app.services.rag_ingestion_service.get_settings",
        lambda: SimpleNamespace(
            rag_embedding_provider="stub",
            rag_embedding_model="deterministic-stub",
            gemini_api_key="configured-gemini-key",
            stub_embedding_dimensions=64,
        ),
    )

    provider = build_rag_embedding_provider()

    assert provider.primary is None
    result = provider.embed_text("rubric context")
    assert result.provider == "stub"
