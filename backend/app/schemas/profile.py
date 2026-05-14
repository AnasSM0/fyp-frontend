from pydantic import BaseModel, Field


class CandidateProfileBase(BaseModel):
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
    profile_visibility: bool = False
    availability_status: str = Field(default="open", max_length=40)
    profile_complete: bool = False


class CandidateProfileUpdate(CandidateProfileBase):
    pass


class CandidateProfileRead(CandidateProfileBase):
    id: str
    user_id: str

    model_config = {"from_attributes": True}


class CompanyProfileBase(BaseModel):
    company_name: str | None = Field(default=None, max_length=180)
    recruiter_name: str | None = Field(default=None, max_length=160)
    website: str | None = Field(default=None, max_length=500)
    industry: str | None = Field(default=None, max_length=120)
    company_size: str | None = Field(default=None, max_length=80)
    role_title: str | None = Field(default=None, max_length=120)


class CompanyProfileUpdate(CompanyProfileBase):
    pass


class CompanyProfileRead(CompanyProfileBase):
    id: str
    user_id: str

    model_config = {"from_attributes": True}
