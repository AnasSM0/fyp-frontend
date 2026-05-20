from pydantic import BaseModel, Field


class GenerateReportRequest(BaseModel):
    force_regenerate: bool = False


class AIAnswerEvaluation(BaseModel):
    technical_accuracy: int = Field(ge=0, le=100)
    problem_solving: int = Field(ge=0, le=100)
    communication_clarity: int = Field(ge=0, le=100)
    reasoning_depth: int = Field(ge=0, le=100)
    code_quality: int = Field(ge=0, le=100)
    expected_concepts_covered: list[str]
    missing_concepts: list[str]
    confidence: int = Field(ge=0, le=100)
    short_feedback: str
    transcript_evidence: list[str]


class AIProjectQualityEvaluation(BaseModel):
    project_quality_score: int = Field(ge=0, le=100)
    clarity_score: int = Field(ge=0, le=100)
    technical_depth_score: int = Field(ge=0, le=100)
    role_relevance_score: int = Field(ge=0, le=100)
    stack_alignment_score: int = Field(ge=0, le=100)
    complexity_score: int = Field(ge=0, le=100)
    impact_score: int = Field(ge=0, le=100)
    summary: str
    limitations: list[str]


class AIFinalReportDraft(BaseModel):
    strengths: list[str]
    weaknesses: list[str]
    recommended_improvements: list[str]
    role_fit: list[dict]
    recruiter_summary: str
    transcript_evidence: list[str]


class ProviderMetadata(BaseModel):
    requested_provider: str | None = None
    actual_provider: str
    provider: str
    model: str
    fallback_used: bool
    fallback_chain: list[str] = Field(default_factory=list)
    warnings: list[str]
    generated_at: str


class EvaluationReportRead(BaseModel):
    id: str
    session_id: str
    candidate_id: str
    ai_test_score: float
    technical_score: float
    communication_score: float
    problem_solving_score: float
    system_design_score: float
    code_quality_score: float
    project_quality_score: float
    academic_score: float
    integrity_score: float
    verified_score: float
    recruiter_summary: str
    published: bool

    model_config = {"from_attributes": True}


class EvaluationReportDetail(EvaluationReportRead):
    report_json: dict


class PublishReportResponse(BaseModel):
    report: EvaluationReportDetail
