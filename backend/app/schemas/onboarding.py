from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.schemas.evaluation import ProviderMetadata


RESUME_PROFILE_FIELDS = (
    "full_name",
    "email",
    "phone",
    "university",
    "degree",
    "graduation_year",
    "gpa",
    "target_role",
    "experience_level",
    "skills",
    "tech_stack",
    "projects",
    "work_experience",
    "github_url",
    "linkedin_url",
    "portfolio_url",
)


class ExtractedProject(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    description: str | None = Field(default=None, max_length=1200)
    technologies: list[str] = Field(default_factory=list)
    github_url: str | None = Field(default=None, max_length=500)
    live_url: str | None = Field(default=None, max_length=500)


class ExtractedWorkExperience(BaseModel):
    company: str | None = Field(default=None, max_length=200)
    role: str | None = Field(default=None, max_length=200)
    duration: str | None = Field(default=None, max_length=160)
    description: str | None = Field(default=None, max_length=1200)


class ExtractedCandidateProfile(BaseModel):
    full_name: str | None = Field(default=None, max_length=160)
    email: str | None = Field(default=None, max_length=254)
    phone: str | None = Field(default=None, max_length=80)
    university: str | None = Field(default=None, max_length=160)
    degree: str | None = Field(default=None, max_length=160)
    graduation_year: int | None = Field(default=None, ge=1900, le=2100)
    gpa: float | None = Field(default=None, ge=0, le=100)
    target_role: str | None = Field(default=None, max_length=160)
    experience_level: Literal["student", "fresh", "junior", "intermediate", "advanced"] | None = None
    skills: list[str] = Field(default_factory=list)
    tech_stack: list[str] = Field(default_factory=list)
    projects: list[ExtractedProject] = Field(default_factory=list)
    work_experience: list[ExtractedWorkExperience] = Field(default_factory=list)
    github_url: str | None = Field(default=None, max_length=500)
    linkedin_url: str | None = Field(default=None, max_length=500)
    portfolio_url: str | None = Field(default=None, max_length=500)

    @field_validator("skills", "tech_stack")
    @classmethod
    def clean_string_list(cls, value: list[str]) -> list[str]:
        cleaned: list[str] = []
        seen: set[str] = set()
        for item in value or []:
            text = str(item).strip()
            key = text.lower()
            if text and key not in seen:
                cleaned.append(text[:80])
                seen.add(key)
        return cleaned


class ResumeConfidence(BaseModel):
    full_name: float = 0
    email: float = 0
    phone: float = 0
    university: float = 0
    degree: float = 0
    graduation_year: float = 0
    gpa: float = 0
    target_role: float = 0
    experience_level: float = 0
    skills: float = 0
    tech_stack: float = 0
    projects: float = 0
    work_experience: float = 0
    github_url: float = 0
    linkedin_url: float = 0
    portfolio_url: float = 0

    @field_validator("*", mode="before")
    @classmethod
    def clamp_confidence(cls, value) -> float:
        try:
            numeric = float(value)
        except (TypeError, ValueError):
            return 0
        return max(0, min(1, numeric))


class ResumeParseDraft(BaseModel):
    extracted_profile: ExtractedCandidateProfile = Field(default_factory=ExtractedCandidateProfile)
    confidence: ResumeConfidence = Field(default_factory=ResumeConfidence)
    warnings: list[str] = Field(default_factory=list)


class ResumeParseResponse(ResumeParseDraft):
    status: Literal["parsed"] = "parsed"
    raw_text_preview: str
    provider_metadata: ProviderMetadata


class ResumeParseFailure(BaseModel):
    detail: str
    reason: str
    retryable: bool
