from __future__ import annotations

from app.schemas.ai import OnboardingAIResponseDraft, OnboardingChatRequest, OnboardingChatResponse
from app.services.ai_provider_factory import build_ai_provider


HARD_FACT_FIELDS = {
    "full_name",
    "university",
    "degree",
    "graduation_year",
    "gpa",
    "portfolio_url",
    "linkedin_url",
    "resume_url",
    "availability_status",
}


def evidence_text(payload: OnboardingChatRequest) -> str:
    parts = [payload.user_message]
    parts.extend(item.content for item in payload.conversation_history)
    for value in payload.current_profile.model_dump().values():
        if isinstance(value, list):
            parts.extend(str(item) for item in value)
        elif value is not None:
            parts.append(str(value))
    return " ".join(parts).lower()


def hard_fact_is_supported(field_name: str, value, payload: OnboardingChatRequest, evidence: str) -> bool:
    if value in (None, "", []):
        return True
    existing = getattr(payload.current_profile, field_name, None)
    if existing == value:
        return True
    if isinstance(value, str):
        return value.lower() in evidence
    return str(value).lower() in evidence


def remove_unsupported_hard_facts(
    draft: OnboardingAIResponseDraft, payload: OnboardingChatRequest
) -> OnboardingAIResponseDraft:
    evidence = evidence_text(payload)
    extracted = draft.extracted_fields.model_copy(deep=True)
    warnings: list[str] = []
    for field_name in HARD_FACT_FIELDS:
        value = getattr(extracted, field_name)
        if not hard_fact_is_supported(field_name, value, payload, evidence):
            setattr(extracted, field_name, None)
            warnings.append(field_name)
    draft.extracted_fields = extracted
    if warnings:
        missing = set(draft.missing_fields)
        missing.update(warnings)
        draft.missing_fields = sorted(missing)
    return draft


def generate_onboarding_chat(
    payload: OnboardingChatRequest,
    provider_name: str | None = None,
) -> OnboardingChatResponse:
    provider = build_ai_provider(provider_name, capability="onboarding")
    draft = provider.generate_onboarding_chat(payload)
    draft = remove_unsupported_hard_facts(draft, payload)
    return OnboardingChatResponse(
        **draft.model_dump(),
        provider_metadata=provider.state.metadata(),
    )
