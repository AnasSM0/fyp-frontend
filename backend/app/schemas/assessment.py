from typing import Literal

from pydantic import BaseModel, Field

AssessmentStatus = Literal["created", "in_progress", "completed", "abandoned"]


class StartAssessmentRequest(BaseModel):
    force_new: bool = False


class FinishAssessmentRequest(BaseModel):
    metadata: dict = Field(default_factory=dict)


class SubmitAnswerRequest(BaseModel):
    assessment_question_id: str
    answer_text: str | None = Field(default=None, max_length=12000)
    code_text: str | None = Field(default=None, max_length=20000)
    selected_option_id: str | None = Field(default=None, max_length=80)
    duration_seconds: int = Field(ge=0, le=7200)
    metadata: dict = Field(default_factory=dict)


class QuestionBankRead(BaseModel):
    id: str
    role: str
    category: str
    tech_stack: list[str]
    difficulty: str
    question_type: str
    question_text: str
    expected_concepts: list[str]
    scoring_rubric: dict
    time_limit_seconds: int
    follow_up_templates: list[str]

    model_config = {"from_attributes": True}


class ObjectiveOptionRead(BaseModel):
    id: str
    text: str


class AssessmentQuestionRead(BaseModel):
    id: str
    question_bank_id: str
    order_index: int
    question_text: str
    question_type: str
    category: str
    difficulty: str
    time_limit_seconds: int
    expected_concepts: list[str]
    scoring_rubric: dict
    execution_supported: bool = False
    execution_reason: str | None = None
    language: str | None = None
    function_name: str | None = None
    starter_code: str | None = None
    objective_question: bool = False
    objective_options: list[ObjectiveOptionRead] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class AssessmentAnswerRead(BaseModel):
    id: str
    assessment_question_id: str
    question_bank_id: str
    order_index: int
    answer_text: str | None
    code_text: str | None
    duration_seconds: int
    metadata: dict
    selected_option_id: str | None = None


class AssessmentProgress(BaseModel):
    answered: int
    total: int
    current_order_index: int
    is_complete: bool


class AssessmentSessionRead(BaseModel):
    id: str
    candidate_id: str
    status: AssessmentStatus
    target_role: str | None
    experience_level: str | None
    selected_difficulty: str
    current_order_index: int
    total_questions: int
    session_plan_metadata: dict

    model_config = {"from_attributes": True}


class AssessmentSessionDetail(BaseModel):
    session: AssessmentSessionRead
    questions: list[AssessmentQuestionRead]
    answers: list[AssessmentAnswerRead]
    current_question: AssessmentQuestionRead | None
    progress: AssessmentProgress


class CurrentQuestionResponse(BaseModel):
    session_id: str
    current_question: AssessmentQuestionRead | None
    progress: AssessmentProgress


class SubmitAnswerResponse(BaseModel):
    answer: AssessmentAnswerRead
    next_question: AssessmentQuestionRead | None
    session: AssessmentSessionRead
    progress: AssessmentProgress


class QuestionBankSummary(BaseModel):
    total_questions: int
    count_by_role: dict[str, int]
    count_by_category: dict[str, int]
    count_by_difficulty: dict[str, int]


class RunCodeRequest(BaseModel):
    language: str = Field(default="python", pattern=r"^python$")
    code: str = Field(min_length=1, max_length=12000)


class CodeTestResult(BaseModel):
    name: str
    passed: bool
    expected_output: str | None = None
    actual_output: str | None = None
    error: str | None = None


class RunCodeResponse(BaseModel):
    status: str
    passed_count: int
    failed_count: int
    total_count: int
    runtime_ms: int
    memory_mb: float | None = None
    test_results: list[CodeTestResult]
    stdout: str
    stderr: str
    message: str
