from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


InviteStatus = Literal["pending", "accepted", "declined", "withdrawn"]
InviteResponseStatus = Literal["accepted", "declined"]


class CandidateMarketplaceSummary(BaseModel):
    id: str
    full_name: str | None
    university: str | None
    target_role: str | None
    skills: list[str]
    tech_stack: list[str]
    availability_status: str
    profile_visibility: bool
    verified_score: float | None = None
    recruiter_summary: str | None = None


class CompanyMarketplaceSummary(BaseModel):
    id: str | None
    company_name: str | None
    recruiter_name: str | None
    industry: str | None = None
    website: str | None = None


class SavedCandidateRead(BaseModel):
    id: str
    candidate: CandidateMarketplaceSummary
    saved_at: datetime


class SavedCandidateStatus(BaseModel):
    candidate_id: str
    saved: bool
    saved_candidate_id: str | None = None


class SavedCandidateListResponse(BaseModel):
    items: list[SavedCandidateRead]


class InviteCreate(BaseModel):
    candidate_id: str
    role_title: str = Field(min_length=1, max_length=160)
    message: str = Field(min_length=1, max_length=4000)
    salary_range: str | None = Field(default=None, max_length=120)
    opportunity_type: str = Field(default="interview", max_length=80)
    interview_window: str | None = Field(default=None, max_length=160)
    note: str | None = Field(default=None, max_length=4000)


class InviteRespond(BaseModel):
    status: InviteResponseStatus
    response_message: str | None = Field(default=None, max_length=4000)


class InviteRead(BaseModel):
    id: str
    candidate_id: str
    recruiter_id: str
    company_id: str | None
    role_title: str
    message: str
    salary_range: str | None
    opportunity_type: str
    interview_window: str | None
    note: str | None
    status: InviteStatus
    response_message: str | None
    created_at: datetime
    updated_at: datetime
    responded_at: datetime | None

    model_config = {"from_attributes": True}


class RecruiterInviteRead(InviteRead):
    candidate: CandidateMarketplaceSummary


class CandidateInviteRead(InviteRead):
    company: CompanyMarketplaceSummary


class RecruiterInviteListResponse(BaseModel):
    items: list[RecruiterInviteRead]


class CandidateInviteListResponse(BaseModel):
    items: list[CandidateInviteRead]


class ActivityEventRead(BaseModel):
    id: str
    event_type: str
    title: str
    description: str
    entity_type: str
    entity_id: str
    metadata_json: dict
    actor_user_id: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ActivityFeedResponse(BaseModel):
    items: list[ActivityEventRead]
