from fastapi import APIRouter, Depends, Header

from app.api.deps import require_candidate
from app.models.user import User
from app.schemas.ai import OnboardingChatRequest, OnboardingChatResponse
from app.services.onboarding_ai_service import generate_onboarding_chat

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/onboarding/chat", response_model=OnboardingChatResponse)
def onboarding_chat(
    payload: OnboardingChatRequest,
    current_user: User = Depends(require_candidate),
    x_ai_provider: str | None = Header(default=None, alias="X-AI-Provider"),
) -> OnboardingChatResponse:
    return generate_onboarding_chat(payload, provider_name=x_ai_provider)
