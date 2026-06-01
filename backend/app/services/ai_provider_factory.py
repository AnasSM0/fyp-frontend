from __future__ import annotations

from fastapi import HTTPException, status

from app.core.config import get_settings
from app.services.ai_provider import AIProvider, FallbackAIProvider
from app.services.ai_provider_health import provider_health_entry
from app.services.gemini_provider import GeminiProvider
from app.services.nvidia_provider import NVIDIAProvider
from app.services.openrouter_provider import OpenRouterProvider


ALLOWED_AI_PROVIDERS = {"openrouter", "nvidia", "gemini", "stub"}


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


def fallback_order(
    requested_provider: str,
    enable_ai_fallback: bool,
    *,
    enable_nvidia_fallback: bool = True,
    enable_gemini_fallback: bool = True,
) -> list[str]:
    if requested_provider == "stub":
        return ["stub"]
    ordered = [requested_provider]
    if enable_ai_fallback:
        provider_candidates = ["openrouter"]
        if enable_nvidia_fallback:
            provider_candidates.append("nvidia")
        if enable_gemini_fallback:
            provider_candidates.append("gemini")
        for provider_name in provider_candidates:
            if provider_name not in ordered:
                ordered.append(provider_name)
    ordered.append("stub")
    return ordered


def setting_value(settings, name: str, default):
    return getattr(settings, name, default)


def timeout_seconds(timeout_ms: int) -> float:
    return max(0.1, timeout_ms / 1000)


def build_real_provider(provider_name: str, *, timeout_ms: int | None = None) -> tuple[AIProvider | None, str | None]:
    settings = get_settings()
    timeout = timeout_seconds(timeout_ms) if timeout_ms is not None else None
    if provider_name == "openrouter":
        api_key = setting_value(settings, "openrouter_api_key", "")
        if not api_key:
            return None, "OpenRouter API key missing; skipping OpenRouter provider."
        try:
            kwargs = {"timeout_seconds": timeout} if timeout is not None else {}
            return (
                OpenRouterProvider(
                    api_key=api_key,
                    base_url=setting_value(settings, "openrouter_base_url", "https://openrouter.ai/api/v1"),
                    model=setting_value(settings, "openrouter_model", "qwen/qwen3-next-80b-a3b-instruct:free"),
                    coder_model=setting_value(settings, "openrouter_coder_model", "qwen/qwen3-coder-480b-a35b-instruct:free"),
                    fallback_model=setting_value(settings, "openrouter_fallback_model", "openai/gpt-oss-120b:free"),
                    app_name=setting_value(settings, "openrouter_app_name", "XLR8Hire"),
                    site_url=setting_value(settings, "openrouter_site_url", "http://localhost:3000"),
                    single_model_mode=bool(setting_value(settings, "openrouter_single_model_mode", False)),
                    **kwargs,
                ),
                None,
            )
        except Exception as exc:
            return None, f"OpenRouter provider initialization failed; skipping OpenRouter provider. {exc}"
    if provider_name == "nvidia":
        if not settings.nvidia_api_key:
            return None, "NVIDIA API key missing; skipping NVIDIA provider."
        try:
            kwargs = {"timeout_seconds": timeout} if timeout is not None else {}
            return (
                NVIDIAProvider(
                    api_key=settings.nvidia_api_key,
                    base_url=settings.nvidia_base_url,
                    model=settings.nvidia_model,
                    **kwargs,
                ),
                None,
            )
        except Exception as exc:
            return None, f"NVIDIA provider initialization failed; skipping NVIDIA provider. {exc}"
    if provider_name == "gemini":
        if not settings.gemini_api_key:
            return None, "Gemini API key missing; skipping Gemini provider."
        try:
            kwargs = {"timeout_seconds": timeout} if timeout is not None else {}
            return GeminiProvider(api_key=settings.gemini_api_key, model=settings.gemini_model, **kwargs), None
        except Exception as exc:
            return None, f"Gemini provider initialization failed; skipping Gemini provider. {exc}"
    return None, None


def onboarding_chain(requested_provider: str, settings) -> list[str]:
    if requested_provider == "stub":
        return ["stub"]
    max_attempts = max(1, int(setting_value(settings, "ai_onboarding_max_real_provider_attempts", 1)))
    real_chain = [requested_provider][:max_attempts]
    return [*real_chain, "stub"]


def build_ai_provider(provider_name: str | None = None, *, capability: str = "evaluation") -> FallbackAIProvider:
    settings = get_settings()
    requested_provider = normalize_provider_name(provider_name) or normalize_provider_name(
        settings.default_ai_provider
    ) or "openrouter"
    requested_provider = validate_provider_name(requested_provider)

    is_onboarding = capability == "onboarding"
    fast_onboarding = is_onboarding and bool(setting_value(settings, "ai_fast_onboarding_mode", True))
    single_call_evaluation = capability == "evaluation" and (
        bool(setting_value(settings, "evaluation_disable_provider_fallback", False))
        or (
            bool(setting_value(settings, "ai_free_tier_mode", False))
            and int(setting_value(settings, "evaluation_max_ai_calls_per_report", 1)) <= 1
        )
    )
    chain = (
        onboarding_chain(requested_provider, settings)
        if fast_onboarding
        else [requested_provider]
        if single_call_evaluation
        else fallback_order(
            requested_provider,
            settings.enable_ai_fallback,
            enable_nvidia_fallback=bool(setting_value(settings, "enable_nvidia_fallback", True)),
            enable_gemini_fallback=bool(setting_value(settings, "enable_gemini_fallback", True)),
        )
    )
    timeout_ms = (
        setting_value(settings, "openrouter_onboarding_timeout_ms", setting_value(settings, "ai_onboarding_provider_timeout_ms", 1200))
        if is_onboarding
        else setting_value(settings, "openrouter_evaluation_timeout_ms", setting_value(settings, "ai_evaluation_provider_timeout_ms", 15000))
    )
    cooldown_seconds = setting_value(settings, "ai_provider_failure_cooldown_seconds", 300)
    skip_unhealthy = (
        bool(setting_value(settings, "ai_onboarding_skip_unhealthy_providers", True))
        if is_onboarding
        else True
    )
    if requested_provider == "stub":
        return FallbackAIProvider(
            None,
            fallback_warning="Stub provider explicitly requested.",
            requested_provider=requested_provider,
            fallback_chain=chain,
            capability=capability,
            cooldown_seconds=cooldown_seconds,
            fast_mode_used=fast_onboarding,
            allow_stub=not (
                capability == "evaluation"
                and bool(setting_value(settings, "ai_required_for_evaluation", False))
                and not bool(setting_value(settings, "allow_stub_evaluation", True))
            ),
            disable_provider_fallback=single_call_evaluation,
            fallback_skipped_reason="Free-tier evaluation mode allows one provider call; fallback chain skipped."
            if single_call_evaluation
            else None,
        )

    providers: list[AIProvider] = []
    warnings: list[str] = []
    skipped_providers: list[str] = []
    for chain_provider in chain:
        if chain_provider == "stub":
            continue
        health_entry = provider_health_entry(chain_provider, capability)
        if skip_unhealthy and health_entry is not None:
            skipped_providers.append(chain_provider)
            warnings.append(
                f"{chain_provider.upper()} provider is cooling down for {capability}; "
                f"skipping until {health_entry.cooldown_until.isoformat()} "
                f"after {health_entry.failure_reason}."
            )
            continue
        provider, warning = build_real_provider(chain_provider, timeout_ms=timeout_ms)
        if provider is not None:
            providers.append(provider)
        if warning and not providers:
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
        capability=capability,
        cooldown_seconds=cooldown_seconds,
        skipped_providers=skipped_providers,
        fast_mode_used=fast_onboarding,
        allow_stub=not (
            capability == "evaluation"
            and bool(setting_value(settings, "ai_required_for_evaluation", False))
            and not bool(setting_value(settings, "allow_stub_evaluation", True))
        ),
        disable_provider_fallback=single_call_evaluation,
        fallback_skipped_reason="Free-tier evaluation mode allows one provider call; fallback chain skipped."
        if single_call_evaluation
        else None,
    )
