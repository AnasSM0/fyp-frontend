from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.evaluation import ProviderMetadata


class OnboardingConversationMessage(BaseModel):
    role: Literal["assistant", "user"]
    content: str = Field(min_length=1, max_length=1000)


class OnboardingProfileDraft(BaseModel):
    full_name: str | None = Field(default=None, max_length=160)
    university: str | None = Field(default=None, max_length=160)
    degree: str | None = Field(default=None, max_length=160)
    graduation_year: int | None = Field(default=None, ge=1900, le=2100)
    gpa: float | None = Field(default=None, ge=0, le=10)
    target_role: str | None = Field(default=None, max_length=160)
    experience_level: str | None = Field(default=None, max_length=80)
    tech_stack: list[str] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)
    portfolio_url: str | None = Field(default=None, max_length=500)
    linkedin_url: str | None = Field(default=None, max_length=500)
    resume_url: str | None = Field(default=None, max_length=500)
    availability_status: str | None = Field(default=None, max_length=40)
    project_summary: str | None = Field(default=None, max_length=1200)
    career_goal: str | None = Field(default=None, max_length=800)


class OnboardingExtractedFields(BaseModel):
    full_name: str | None = Field(default=None, max_length=160)
    university: str | None = Field(default=None, max_length=160)
    degree: str | None = Field(default=None, max_length=160)
    graduation_year: int | None = Field(default=None, ge=1900, le=2100)
    gpa: float | None = Field(default=None, ge=0, le=10)
    target_role: str | None = Field(default=None, max_length=160)
    experience_level: str | None = Field(default=None, max_length=80)
    tech_stack: list[str] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)
    portfolio_url: str | None = Field(default=None, max_length=500)
    linkedin_url: str | None = Field(default=None, max_length=500)
    resume_url: str | None = Field(default=None, max_length=500)
    availability_status: str | None = Field(default=None, max_length=40)
    project_summary: str | None = Field(default=None, max_length=1200)
    career_goal: str | None = Field(default=None, max_length=800)


class OnboardingChatRequest(BaseModel):
    current_profile: OnboardingProfileDraft = Field(default_factory=OnboardingProfileDraft)
    user_message: str = Field(min_length=1, max_length=2000)
    conversation_history: list[OnboardingConversationMessage] = Field(default_factory=list, max_length=20)
    current_step: str | None = Field(default=None, max_length=80)


class OnboardingAIResponseDraft(BaseModel):
    assistant_message: str = Field(min_length=1, max_length=1200)
    extracted_fields: OnboardingExtractedFields = Field(default_factory=OnboardingExtractedFields)
    suggested_skills: list[str] = Field(default_factory=list)
    inferred_target_role: str | None = Field(default=None, max_length=160)
    inferred_experience_level: str | None = Field(default=None, max_length=80)
    missing_fields: list[str] = Field(default_factory=list)
    profile_completion_delta: int = Field(ge=0, le=100)
    next_question: str = Field(min_length=1, max_length=500)
    confidence: int = Field(ge=0, le=100)


class OnboardingChatResponse(OnboardingAIResponseDraft):
    provider_metadata: ProviderMetadata
