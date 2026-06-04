from __future__ import annotations

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.services.ai_provider import ProviderOutputError
from app.services.ai_provider_factory import build_ai_provider
from app.services.ai_provider_health import (
    ProviderHealthEntry,
    mark_provider_unhealthy_with_scope,
    provider_cooldown_key,
    reset_provider_health,
)
from app.services.redis_service import RedisLockResult

from test_evaluations import BatchCountingProvider, auth_header, eval_settings, make_completed_session


def test_redis_config_defaults_disabled() -> None:
    settings = Settings(_env_file=None)

    assert settings.redis_enabled is False
    assert settings.redis_url == ""
    assert settings.redis_report_lock_ttl_seconds == 300
    assert settings.redis_provider_cooldown_default_seconds == 300


def test_redis_unavailable_falls_back_to_memory_and_logs(monkeypatch, caplog) -> None:
    import app.services.redis_service as redis_service

    redis_service.reset_redis_client_for_tests()
    monkeypatch.setattr(
        redis_service,
        "get_settings",
        lambda: SimpleNamespace(redis_enabled=True, redis_url="redis://127.0.0.1:1"),
    )

    with caplog.at_level("WARNING"):
        result = redis_service.acquire_lock("report_generation_lock:test", "token", 10)

    assert result.acquired is None
    assert result.fallback_to_memory is True
    assert result.redis_enabled is True
    assert "Redis unavailable" in caplog.text or "Redis lock operation failed" in caplog.text


def test_redis_lock_already_exists_blocks_generation_without_provider_call(
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
            redis_report_lock_ttl_seconds=300,
        ),
    )
    monkeypatch.setattr("app.services.evaluation_service.build_ai_provider", lambda _: provider)
    monkeypatch.setattr(
        "app.services.evaluation_service.acquire_lock",
        lambda *_args, **_kwargs: RedisLockResult(acquired=False, fallback_to_memory=False, redis_enabled=True),
    )
    candidate, session_id = make_completed_session(client, db_session, "redis-lock-blocked@example.com")

    response = client.post(
        f"/evaluations/sessions/{session_id}/generate",
        json={},
        headers=auth_header(candidate["access_token"]),
    )

    assert response.status_code == 202
    detail = response.json()["detail"]
    assert detail["reason"] == "generation_already_in_progress"
    assert detail["redis_enabled"] is True
    assert provider.batch_calls == 0


def test_redis_lock_releases_after_success(client: TestClient, db_session: Session, monkeypatch) -> None:
    provider = BatchCountingProvider()
    released = []
    monkeypatch.setattr(
        "app.services.evaluation_service.get_settings",
        lambda: eval_settings(
            batch_evaluation_enabled=True,
            ai_required_for_evaluation=True,
            allow_stub_evaluation=False,
            report_generation_lock_enabled=True,
            redis_report_lock_ttl_seconds=300,
        ),
    )
    monkeypatch.setattr("app.services.evaluation_service.build_ai_provider", lambda _: provider)
    monkeypatch.setattr(
        "app.services.evaluation_service.acquire_lock",
        lambda *_args, **_kwargs: RedisLockResult(acquired=True, fallback_to_memory=False, redis_enabled=True),
    )
    monkeypatch.setattr("app.services.evaluation_service.release_lock", lambda key, token: released.append((key, token)))
    candidate, session_id = make_completed_session(client, db_session, "redis-lock-success@example.com")

    response = client.post(
        f"/evaluations/sessions/{session_id}/generate",
        json={},
        headers=auth_header(candidate["access_token"]),
    )

    assert response.status_code == 200
    assert provider.batch_calls == 1
    assert released
    assert released[0][0] == f"report_generation_lock:{session_id}"


def test_redis_lock_releases_after_provider_failure(client: TestClient, db_session: Session, monkeypatch) -> None:
    provider = BatchCountingProvider()
    provider.fail_once = True
    released = []
    monkeypatch.setattr(
        "app.services.evaluation_service.get_settings",
        lambda: eval_settings(
            batch_evaluation_enabled=True,
            ai_required_for_evaluation=True,
            allow_stub_evaluation=False,
            report_generation_lock_enabled=True,
            redis_report_lock_ttl_seconds=300,
        ),
    )
    monkeypatch.setattr("app.services.evaluation_service.build_ai_provider", lambda _: provider)
    monkeypatch.setattr(
        "app.services.evaluation_service.acquire_lock",
        lambda *_args, **_kwargs: RedisLockResult(acquired=True, fallback_to_memory=False, redis_enabled=True),
    )
    monkeypatch.setattr("app.services.evaluation_service.release_lock", lambda key, token: released.append((key, token)))
    candidate, session_id = make_completed_session(client, db_session, "redis-lock-failure@example.com")

    response = client.post(
        f"/evaluations/sessions/{session_id}/generate",
        json={},
        headers=auth_header(candidate["access_token"]),
    )

    assert response.status_code == 503
    assert released
    assert provider.batch_calls == 1


def test_existing_report_returns_without_lock_or_provider_call(client: TestClient, db_session: Session, monkeypatch) -> None:
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
    candidate, session_id = make_completed_session(client, db_session, "redis-existing-report@example.com")
    headers = auth_header(candidate["access_token"])

    first = client.post(f"/evaluations/sessions/{session_id}/generate", json={}, headers=headers)
    monkeypatch.setattr("app.services.evaluation_service.acquire_lock", lambda *_args, **_kwargs: (_ for _ in ()).throw(AssertionError("lock should not be acquired")))
    second = client.post(f"/evaluations/sessions/{session_id}/generate", json={}, headers=headers)

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["id"] == second.json()["id"]
    assert provider.batch_calls == 1


def test_provider_429_sets_redis_cooldown_key(monkeypatch) -> None:
    reset_provider_health()
    calls = []
    monkeypatch.setattr("app.services.ai_provider_health.redis_config_enabled", lambda: True)
    monkeypatch.setattr("app.services.ai_provider_health.set_cooldown", lambda key, ttl: calls.append((key, ttl)) or True)

    mark_provider_unhealthy_with_scope(
        "deepseek",
        "evaluation",
        "rate_limited",
        300,
        failure_scope="account",
        model="deepseek-chat",
        retry_after_seconds=42,
    )

    assert calls == [("provider_cooldown:deepseek:deepseek-chat", 42)]


def test_active_provider_cooldown_prevents_provider_call(monkeypatch) -> None:
    reset_provider_health()

    def active_entry(provider: str, capability: str, model: str | None = None):
        return ProviderHealthEntry(
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
            redis_provider_cooldown_default_seconds=300,
            ai_provider_failure_cooldown_seconds=300,
            ai_onboarding_skip_unhealthy_providers=True,
            ai_fast_onboarding_mode=True,
        ),
    )

    provider = build_ai_provider("deepseek")

    with pytest.raises(ProviderOutputError):
        provider.evaluate_assessment_batch({"questions": []})

    metadata = provider.state.metadata().model_dump()
    assert metadata["provider_cooldown_active"] is True
    assert metadata["failure_reason"]["deepseek"] == "provider_cooldown_active"
    assert metadata["retry_after_seconds"]["deepseek"] > 0
    assert metadata["cooldown_key"] == provider_cooldown_key("deepseek", "deepseek-chat")
