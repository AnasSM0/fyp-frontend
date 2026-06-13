from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


MatchingMode = Literal["vector", "keyword_fallback"]
InviteStatus = Literal["pending", "accepted", "declined", "withdrawn"]


class RecruiterActivityItem(BaseModel):
    id: str
    event_type: str
    title: str
    description: str
    entity_type: str
    entity_id: str
    created_at: datetime


class RecruiterDashboardSummary(BaseModel):
    verified_pool_count: int
    shortlisted_count: int
    pending_requests_count: int
    accepted_requests_count: int
    recent_activity: list[RecruiterActivityItem]


class RecruiterCandidateSearchItem(BaseModel):
    candidate_id: str
    profile_id: str
    full_name: str | None
    target_role: str | None
    university: str | None
    degree: str | None
    location: str | None = None
    skills: list[str]
    tech_stack: list[str]
    verified_score: float | None
    semantic_match_percent: float
    match_explanation: str
    assessment_status: str
    profile_status: str
    is_shortlisted: bool
    has_active_invite: bool
    invite_status: InviteStatus | None = None
    latest_report_id: str | None = None


class RecruiterCandidateSearchResponse(BaseModel):
    items: list[RecruiterCandidateSearchItem]
    total: int
    page: int
    page_size: int
    matching_mode: MatchingMode


class RecruiterReportPreview(BaseModel):
    report_id: str
    assessment_session_id: str
    overall_score: float
    role_fit: str | None
    summary: str
    strengths: list[str]
    growth_areas: list[str]
    question_feedback_preview: list[dict]


class RecruiterCandidateProfileResponse(BaseModel):
    candidate_id: str
    profile_id: str
    full_name: str | None
    target_role: str | None
    university: str | None
    degree: str | None
    location: str | None = None
    skills: list[str]
    tech_stack: list[str]
    projects: list[dict]
    work_experience: list[dict]
    verified_score: float | None
    profile_evidence_score: float
    academic_score: float
    consistency_score: float
    integrity_penalty: float
    latest_report: RecruiterReportPreview | None
    is_shortlisted: bool
    has_active_invite: bool
    invite_status: InviteStatus | None = None


class RecruiterInviteCreate(BaseModel):
    candidate_id: str
    message: str | None = Field(default=None, max_length=4000)
    proposed_role: str | None = Field(default=None, max_length=160)
    interview_mode: Literal["online", "onsite"] | None = None


class RecruiterInviteCandidateSummary(BaseModel):
    candidate_id: str
    full_name: str | None
    target_role: str | None
    university: str | None
    verified_score: float | None


class RecruiterInviteItem(BaseModel):
    id: str
    candidate_id: str
    role_title: str
    message: str
    interview_mode: str | None = None
    status: InviteStatus
    created_at: datetime
    updated_at: datetime
    candidate: RecruiterInviteCandidateSummary


class RecruiterInviteListResponse(BaseModel):
    items: list[RecruiterInviteItem]


class CandidateRequestCompany(BaseModel):
    company_name: str | None
    recruiter_name: str | None
    industry: str | None = None


class CandidateRequestItem(BaseModel):
    id: str
    recruiter_id: str
    company: CandidateRequestCompany
    role_title: str
    message: str
    interview_mode: str | None = None
    status: InviteStatus
    created_at: datetime
    updated_at: datetime


class CandidateRequestListResponse(BaseModel):
    items: list[CandidateRequestItem]
