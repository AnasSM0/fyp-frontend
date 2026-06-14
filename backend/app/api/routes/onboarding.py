from fastapi import APIRouter, Depends, Header, UploadFile

from app.api.deps import require_candidate
from app.models.user import User
from app.schemas.onboarding import ResumeParseResponse
from app.services.resume_onboarding_service import parse_resume_upload

router = APIRouter(prefix="/onboarding", tags=["onboarding"])


@router.post("/resume/parse", response_model=ResumeParseResponse)
async def parse_resume(
    file: UploadFile,
    current_user: User = Depends(require_candidate),
    x_ai_provider: str | None = Header(default=None, alias="X-AI-Provider"),
) -> ResumeParseResponse:
    return await parse_resume_upload(file, provider_name=x_ai_provider)
