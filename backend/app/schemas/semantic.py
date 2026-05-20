from datetime import datetime

from pydantic import BaseModel, Field


class EmbeddingProviderMetadata(BaseModel):
    provider: str
    model: str
    dimensions: int
    fallback_used: bool
    warnings: list[str] = Field(default_factory=list)


class CandidateEmbeddingRead(BaseModel):
    id: str
    candidate_id: str
    report_id: str | None
    source_type: str
    embedding_model: str
    embedding_provider: str
    embedding_dimensions: int
    fallback_used: bool
    metadata_json: dict
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CandidateEmbeddingStatus(BaseModel):
    profile_exists: bool
    profile_visible: bool
    latest_published_report_id: str | None
    has_embedding: bool
    embedding: CandidateEmbeddingRead | None = None


class CandidateEmbeddingRebuildResponse(BaseModel):
    embedding: CandidateEmbeddingRead
    provider_metadata: EmbeddingProviderMetadata


class CandidateSearchFilters(BaseModel):
    role: str | None = Field(default=None, max_length=160)
    skills: list[str] = Field(default_factory=list)
    minimum_verified_score: float | None = Field(default=None, ge=0, le=100)
    availability_status: str | None = Field(default=None, max_length=40)
    experience_level: str | None = Field(default=None, max_length=80)
    university: str | None = Field(default=None, max_length=160)
    integrity_risk_level: str | None = Field(default=None, max_length=40)


class CandidateSearchRequest(BaseModel):
    query: str = Field(min_length=2, max_length=1200)
    filters: CandidateSearchFilters = Field(default_factory=CandidateSearchFilters)
    limit: int = Field(default=10, ge=1, le=50)


class CandidateSearchProfileSummary(BaseModel):
    id: str
    full_name: str | None
    university: str | None
    degree: str | None
    graduation_year: int | None
    target_role: str | None
    experience_level: str | None
    tech_stack: list[str]
    skills: list[str]
    availability_status: str


class CandidateSearchResult(BaseModel):
    candidate_id: str
    report_id: str
    profile: CandidateSearchProfileSummary
    verified_score: float
    semantic_match_score: float
    final_match_score: float
    matched_skills: list[str]
    missing_skills: list[str]
    role_fit: float
    integrity_risk_level: str
    recruiter_summary: str
    match_explanation: str
    fallback_mode_used: bool


class CandidateSearchResponse(BaseModel):
    query: str
    filters: CandidateSearchFilters
    result_count: int
    fallback_mode_used: bool
    provider_metadata: EmbeddingProviderMetadata
    results: list[CandidateSearchResult]


class RecruiterSearchRead(BaseModel):
    id: str
    recruiter_id: str
    query: str
    filters_json: dict
    result_count: int
    fallback_mode_used: bool
    provider: str
    model: str
    created_at: datetime

    model_config = {"from_attributes": True}
