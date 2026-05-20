from __future__ import annotations

from fastapi import HTTPException, status

from app.core.config import get_settings
from app.services.ai_provider import AIProvider, FallbackAIProvider
from app.services.gemini_provider import GeminiProvider
from app.services.nvidia_provider import NVIDIAProvider


ALLOWED_AI_PROVIDERS = {"nvidia", "gemini", "stub"}


def normalize_provider_name(provider_name: str | None) -> str | None:
    normalized = (provider_name or "").strip().lower()
    return normalized or None


def validate_provider_name(provider_name: str) -> str:
    if provider_name not in ALLOWED_AI_PROVIDERS:
        allowed = ", ".join(sorted(ALLOWED_AI_PROVIDERS))
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Unsupported AI provider '{provider_name}'. Use one of: {allowed}.",
        )
    return provider_name


def fallback_order(requested_provider: str, enable_ai_fallback: bool) -> list[str]:
    if requested_provider == "stub":
        return ["stub"]
    ordered = [requested_provider]
    if enable_ai_fallback:
        for provider_name in ("nvidia", "gemini"):
            if provider_name not in ordered:
                ordered.append(provider_name)
    ordered.append("stub")
    return ordered


def build_real_provider(provider_name: str) -> tuple[AIProvider | None, str | None]:
    settings = get_settings()
    if provider_name == "nvidia":
        if not settings.nvidia_api_key:
            return None, "NVIDIA API key missing; skipping NVIDIA provider."
        try:
            return (
                NVIDIAProvider(
                    api_key=settings.nvidia_api_key,
                    base_url=settings.nvidia_base_url,
                    model=settings.nvidia_model,
                ),
                None,
            )
        except Exception as exc:
            return None, f"NVIDIA provider initialization failed; skipping NVIDIA provider. {exc}"
    if provider_name == "gemini":
        if not settings.gemini_api_key:
            return None, "Gemini API key missing; skipping Gemini provider."
        try:
            return GeminiProvider(api_key=settings.gemini_api_key, model=settings.gemini_model), None
        except Exception as exc:
            return None, f"Gemini provider initialization failed; skipping Gemini provider. {exc}"
    return None, None


def build_ai_provider(provider_name: str | None = None) -> FallbackAIProvider:
    settings = get_settings()
    requested_provider = normalize_provider_name(provider_name) or normalize_provider_name(
        settings.default_ai_provider
    ) or "nvidia"
    requested_provider = validate_provider_name(requested_provider)

    chain = fallback_order(requested_provider, settings.enable_ai_fallback)
    if requested_provider == "stub":
        return FallbackAIProvider(
            None,
            fallback_warning="Stub provider explicitly requested.",
            requested_provider=requested_provider,
            fallback_chain=chain,
        )

    providers: list[AIProvider] = []
    warnings: list[str] = []
    for chain_provider in chain:
        if chain_provider == "stub":
            continue
        provider, warning = build_real_provider(chain_provider)
        if provider is not None:
            providers.append(provider)
        if warning:
            warnings.append(warning)

    primary = providers[0] if providers else None
    fallbacks = providers[1:]
    stub_warning = (
        "No configured real AI provider available; deterministic stub fallback used."
        if primary is None
        else "Deterministic stub fallback used after real AI provider failure."
    )
    return FallbackAIProvider(
        primary,
        fallback_warning=stub_warning,
        requested_provider=requested_provider,
        fallback_providers=fallbacks,
        initial_warnings=warnings,
        fallback_chain=chain,
    )
