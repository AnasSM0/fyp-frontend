from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from app.services.redis_service import cooldown_ttl, redis_config_enabled, set_cooldown


@dataclass
class ProviderHealthEntry:
    provider: str
    capability: str
    failure_reason: str
    cooldown_until: datetime
    failure_scope: str = "model"


_PROVIDER_HEALTH: dict[tuple[str, str, str], ProviderHealthEntry] = {}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def mark_provider_unhealthy(
    provider: str,
    capability: str,
    failure_reason: str,
    cooldown_seconds: int,
) -> ProviderHealthEntry:
    return mark_provider_unhealthy_with_scope(
        provider,
        capability,
        failure_reason,
        cooldown_seconds,
        failure_scope="model",
    )


def mark_provider_unhealthy_with_scope(
    provider: str,
    capability: str,
    failure_reason: str,
    cooldown_seconds: int,
    *,
    failure_scope: str = "model",
    model: str | None = None,
    retry_after_seconds: int | None = None,
) -> ProviderHealthEntry:
    ttl_seconds = max(0, int(retry_after_seconds or cooldown_seconds))
    entry = ProviderHealthEntry(
        provider=provider,
        capability=capability,
        failure_reason=failure_reason,
        cooldown_until=_now() + timedelta(seconds=ttl_seconds),
        failure_scope=failure_scope,
    )
    _PROVIDER_HEALTH[(provider, capability, "")] = entry
    if model:
        _PROVIDER_HEALTH[(provider, capability, model)] = entry
        set_cooldown(provider_cooldown_key(provider, model), ttl_seconds)
    return entry


def provider_cooldown_key(provider: str, model: str) -> str:
    return f"provider_cooldown:{provider}:{model}"


def provider_health_entry(provider: str, capability: str, model: str | None = None) -> ProviderHealthEntry | None:
    if model and redis_config_enabled():
        ttl = cooldown_ttl(provider_cooldown_key(provider, model))
        if ttl is not None:
            return ProviderHealthEntry(
                provider=provider,
                capability=capability,
                failure_reason="provider_cooldown_active",
                cooldown_until=_now() + timedelta(seconds=ttl),
                failure_scope="account",
            )
    entry = _PROVIDER_HEALTH.get((provider, capability, model or "")) or _PROVIDER_HEALTH.get((provider, capability, ""))
    if entry is None:
        return None
    if entry.cooldown_until <= _now():
        _PROVIDER_HEALTH.pop((provider, capability), None)
        return None
    return entry


def provider_is_healthy(provider: str, capability: str, model: str | None = None) -> bool:
    return provider_health_entry(provider, capability, model=model) is None


def provider_health_snapshot(capability: str) -> dict[str, str]:
    snapshot: dict[str, str] = {}
    for provider in ("deepseek", "openrouter", "nvidia", "gemini"):
        entry = provider_health_entry(provider, capability)
        snapshot[provider] = "cooldown" if entry else "healthy"
    return snapshot


def provider_cooldown_snapshot(capability: str) -> dict[str, str]:
    snapshot: dict[str, str] = {}
    for provider in ("deepseek", "openrouter", "nvidia", "gemini"):
        entry = provider_health_entry(provider, capability)
        if entry:
            snapshot[provider] = entry.cooldown_until.isoformat()
    return snapshot


def reset_provider_health() -> None:
    _PROVIDER_HEALTH.clear()
