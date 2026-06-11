from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Literal


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


class AIRubricContextItem(BaseModel):
    document_id: str
    title: str
    category: str
    tech_stack: list[str] = Field(default_factory=list)
    expected_concepts: list[str] = Field(default_factory=list)
    scoring_rubric: dict = Field(default_factory=dict)
    score: dict = Field(default_factory=dict)
    why_matched: str | None = None


class AIRubricContext(BaseModel):
    rag_enabled: bool
    fallback_used: bool = False
    items: list[AIRubricContextItem] = Field(default_factory=list)
    metadata: dict = Field(default_factory=dict)


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


def _clamp_score(value) -> int:
    try:
        return max(0, min(100, int(value)))
    except (TypeError, ValueError):
        return 0


def _clean_string_list(value) -> list[str]:
    if value is None:
        return []
    if not isinstance(value, list):
        value = [value]
    return [str(item).strip() for item in value if str(item).strip()]


class AICompactQuestionEvaluation(BaseModel):
    question_id: str = ""
    score: int = 0
    answer_status: str = "answered"
    skill_area: str = "General"
    confidence: int = 70
    must_have_covered: list[str] = Field(default_factory=list)
    must_have_missing: list[str] = Field(default_factory=list)
    strengths: list[str] = Field(default_factory=list)
    missing_concepts: list[str] = Field(default_factory=list)
    feedback: str = ""
    improvement_tip: str = ""
    suggested_score_cap: int | None = None
    evidence_found: list[str] = Field(default_factory=list)
    generic_answer_flags: list[str] = Field(default_factory=list)
    applied_score_caps: list[dict] = Field(default_factory=list)
    feedback_summary: str = ""

    @field_validator("score", "confidence", mode="before")
    @classmethod
    def clamp_score(cls, value) -> int:
        return _clamp_score(value)

    @field_validator("suggested_score_cap", mode="before")
    @classmethod
    def clamp_optional_score(cls, value) -> int | None:
        if value in (None, ""):
            return None
        return _clamp_score(value)

    @field_validator("answer_status", mode="before")
    @classmethod
    def normalize_answer_status(cls, value) -> str:
        normalized = str(value or "answered").strip().lower()
        if normalized in {"skipped", "skip"}:
            return "skipped"
        if normalized in {"insufficient", "insufficient_response", "blank", "empty", "idk"}:
            return "insufficient"
        return "answered"

    @field_validator("skill_area", "feedback", "improvement_tip", mode="before")
    @classmethod
    def default_strings(cls, value) -> str:
        return str(value or "").strip()

    @field_validator(
        "must_have_covered",
        "must_have_missing",
        "strengths",
        "missing_concepts",
        "evidence_found",
        "generic_answer_flags",
        mode="before",
    )
    @classmethod
    def clean_lists(cls, value) -> list[str]:
        return _clean_string_list(value)

    @field_validator("applied_score_caps", mode="before")
    @classmethod
    def clean_score_caps(cls, value) -> list[dict]:
        if not isinstance(value, list):
            return []
        cleaned = []
        for item in value:
            if isinstance(item, dict):
                cleaned.append(item)
        return cleaned


class AICompactCategoryScores(BaseModel):
    technical_accuracy: int = 0
    problem_solving: int = 0
    communication: int = 0
    code_quality: int = 0
    system_design: int = 0

    @field_validator("*", mode="before")
    @classmethod
    def clamp_scores(cls, value) -> int:
        return _clamp_score(value)


class AICompactImprovementPlanItem(BaseModel):
    day: str = "Day 1"
    focus: str = "Review weak areas"
    task: str = "Practice one similar question and compare against expected concepts."

    @field_validator("day", "focus", "task", mode="before")
    @classmethod
    def default_strings(cls, value) -> str:
        return str(value or "").strip()


class AIBatchEvaluationDraft(BaseModel):
    question_evaluations: list[AICompactQuestionEvaluation] = Field(default_factory=list)
    category_scores: AICompactCategoryScores = Field(default_factory=AICompactCategoryScores)
    overall_strengths: list[str] = Field(default_factory=list)
    overall_growth_areas: list[str] = Field(default_factory=list)
    candidate_summary: str = ""
    recruiter_summary: str = ""
    role_fit_summary: str = ""
    recommended_next_steps: list[str] = Field(default_factory=list)
    improvement_plan: list[AICompactImprovementPlanItem] = Field(default_factory=list)

    @field_validator("overall_strengths", "overall_growth_areas", "recommended_next_steps", mode="before")
    @classmethod
    def clean_lists(cls, value) -> list[str]:
        return _clean_string_list(value)

    @field_validator("candidate_summary", "recruiter_summary", "role_fit_summary", mode="before")
    @classmethod
    def default_strings(cls, value) -> str:
        return str(value or "").strip()

    @model_validator(mode="after")
    def require_some_evaluation_content(self):
        if not self.question_evaluations and not any(
            [self.candidate_summary, self.recruiter_summary, self.overall_strengths, self.overall_growth_areas]
        ):
            raise ValueError("Batch evaluation response missing usable evaluation content")
        return self


class AICoachResponseDraft(BaseModel):
    answer: str = Field(min_length=1, max_length=4000)


class ProviderMetadata(BaseModel):
    requested_provider: str | None = None
    actual_provider: str
    provider: str
    model: str
    fallback_used: bool
    fallback_chain: list[str] = Field(default_factory=list)
    warnings: list[str]
    generated_at: str
    skipped_providers: list[str] = Field(default_factory=list)
    provider_health: dict[str, str] = Field(default_factory=dict)
    cooldown_until: dict[str, str] = Field(default_factory=dict)
    latency_ms: dict[str, int] = Field(default_factory=dict)
    failure_reason: dict[str, str] = Field(default_factory=dict)
    failure_scope: dict[str, str] = Field(default_factory=dict)
    status_code: dict[str, int] = Field(default_factory=dict)
    retry_after_seconds: dict[str, int] = Field(default_factory=dict)
    sanitized_error_body: dict[str, str] = Field(default_factory=dict)
    provider_cooldown_active: bool = False
    cooldown_key: str | None = None
    fast_mode_used: bool = False
    real_provider_attempts: int = 0
    model_attempts: list[dict] = Field(default_factory=list)
    fallback_skipped: bool = False
    fallback_skipped_reason: str | None = None


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


CoachPromptType = Literal[
    "explain_weakest_question",
    "practice_questions",
    "code_quality_help",
    "study_plan",
    "rewrite_weak_answer",
    "custom",
]


class CoachReportRequest(BaseModel):
    prompt_type: CoachPromptType = "custom"
    message: str | None = Field(default=None, max_length=1200)


class CoachReportResponse(BaseModel):
    answer: str
    provider_metadata: ProviderMetadata
    cached: bool = False
