from fastapi import APIRouter, Depends, Header, HTTPException, UploadFile, status

from app.api.deps import require_candidate
from app.models.user import User
from app.schemas.onboarding import ResumeParseResponse
from app.services.ai_provider import ProviderOutputError
from app.services.resume_onboarding_service import parse_resume_upload

router = APIRouter(prefix="/onboarding", tags=["onboarding"])


@router.post("/resume/parse", response_model=ResumeParseResponse)
async def parse_resume(
    file: UploadFile,
    current_user: User = Depends(require_candidate),
    x_ai_provider: str | None = Header(default=None, alias="X-AI-Provider"),
) -> ResumeParseResponse:
    try:
        return await parse_resume_upload(file, provider_name=x_ai_provider)
    except HTTPException:
        raise
    except ProviderOutputError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "detail": "Resume parsing failed. Please enter details manually.",
                "reason": "resume_parse_failed",
                "retryable": True,
            },
        ) from exc
