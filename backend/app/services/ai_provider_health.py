from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone


@dataclass
class ProviderHealthEntry:
    provider: str
    capability: str
    failure_reason: str
    cooldown_until: datetime
    failure_scope: str = "model"


_PROVIDER_HEALTH: dict[tuple[str, str], ProviderHealthEntry] = {}


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
) -> ProviderHealthEntry:
    entry = ProviderHealthEntry(
        provider=provider,
        capability=capability,
        failure_reason=failure_reason,
        cooldown_until=_now() + timedelta(seconds=max(0, cooldown_seconds)),
        failure_scope=failure_scope,
    )
    _PROVIDER_HEALTH[(provider, capability)] = entry
    return entry


def provider_health_entry(provider: str, capability: str) -> ProviderHealthEntry | None:
    entry = _PROVIDER_HEALTH.get((provider, capability))
    if entry is None:
        return None
    if entry.cooldown_until <= _now():
        _PROVIDER_HEALTH.pop((provider, capability), None)
        return None
    return entry


def provider_is_healthy(provider: str, capability: str) -> bool:
    return provider_health_entry(provider, capability) is None


def provider_health_snapshot(capability: str) -> dict[str, str]:
    snapshot: dict[str, str] = {}
    for provider in ("openrouter", "nvidia", "gemini"):
        entry = provider_health_entry(provider, capability)
        snapshot[provider] = "cooldown" if entry else "healthy"
    return snapshot


def provider_cooldown_snapshot(capability: str) -> dict[str, str]:
    snapshot: dict[str, str] = {}
    for provider in ("openrouter", "nvidia", "gemini"):
        entry = provider_health_entry(provider, capability)
        if entry:
            snapshot[provider] = entry.cooldown_until.isoformat()
    return snapshot


def reset_provider_health() -> None:
    _PROVIDER_HEALTH.clear()
