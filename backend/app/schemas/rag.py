from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator, model_validator

from app.schemas.semantic import EmbeddingProviderMetadata

RAGSourceType = Literal[
    "onboarding_prompt",
    "role_discovery_question",
    "question",
    "coding_task",
    "rubric",
    "follow_up_template",
]

RAGDifficulty = Literal["beginner", "intermediate", "advanced"]

RAGQuestionType = Literal[
    "onboarding",
    "conceptual",
    "scenario",
    "coding",
    "debugging",
    "system_design",
    "communication",
    "rubric",
    "follow_up",
]


def _clean_string(value: Any) -> Any:
    if isinstance(value, str):
        cleaned = " ".join(value.strip().split())
        return cleaned or None
    return value


def _clean_list(values: Any) -> list[str]:
    if values is None:
        return []
    if not isinstance(values, list):
        raise TypeError("Expected a list")
    cleaned: list[str] = []
    seen: set[str] = set()
    for value in values:
        if not isinstance(value, str):
            raise TypeError("Expected list items to be strings")
        item = " ".join(value.strip().split())
        if item and item.lower() not in seen:
            cleaned.append(item)
            seen.add(item.lower())
    return cleaned


def generate_rag_embedding_text(record: "RAGDatasetRecord") -> str:
    content = record.question_text or record.task_description or record.content or ""
    parts = [
        f"Source type: {record.source_type}.",
        f"Title: {record.title}.",
        f"Role: {record.role}.",
        f"Specialization: {record.specialization or 'general'}.",
        f"Experience level: {record.experience_level}.",
        f"Difficulty: {record.difficulty}.",
        f"Category: {record.category}.",
        f"Question type: {record.question_type}.",
        f"Tech stack: {', '.join(record.tech_stack)}.",
        f"Content: {content}",
        f"Expected concepts: {', '.join(record.expected_concepts)}.",
        f"Follow ups: {' | '.join(record.sample_followups)}.",
        f"Tags: {', '.join(record.tags)}.",
    ]
    return "\n".join(part for part in parts if part and not part.endswith(": ."))


class RAGDatasetRecord(BaseModel):
    id: str = Field(min_length=3, max_length=120, pattern=r"^[a-z0-9][a-z0-9_.:-]*$")
    source_type: RAGSourceType
    title: str = Field(min_length=3, max_length=200)
    content: str | None = Field(default=None, max_length=4000)
    role: str = Field(min_length=2, max_length=120)
    specialization: str | None = Field(default=None, max_length=120)
    tech_stack: list[str] = Field(default_factory=list)
    difficulty: RAGDifficulty = "intermediate"
    experience_level: str = Field(default="student", min_length=2, max_length=80)
    category: str = Field(min_length=2, max_length=120)
    question_type: RAGQuestionType
    question_text: str | None = Field(default=None, max_length=4000)
    task_description: str | None = Field(default=None, max_length=6000)
    expected_concepts: list[str] = Field(default_factory=list)
    scoring_rubric: dict[str, float] = Field(default_factory=dict)
    sample_followups: list[str] = Field(default_factory=list)
    tags: list[str] = Field(min_length=1)
    metadata: dict[str, Any] = Field(default_factory=dict)
    embedding_text: str | None = Field(default=None, max_length=8000)

    @field_validator(
        "id",
        "title",
        "content",
        "role",
        "specialization",
        "experience_level",
        "category",
        "question_text",
        "task_description",
        "embedding_text",
        mode="before",
    )
    @classmethod
    def strip_strings(cls, value: Any) -> Any:
        return _clean_string(value)

    @field_validator("tech_stack", "expected_concepts", "sample_followups", "tags", mode="before")
    @classmethod
    def strip_lists(cls, value: Any) -> list[str]:
        return _clean_list(value)

    @field_validator("scoring_rubric")
    @classmethod
    def validate_scoring_rubric(cls, rubric: dict[str, float]) -> dict[str, float]:
        for key, value in rubric.items():
            if not key.strip():
                raise ValueError("Scoring rubric keys cannot be empty")
            if value < 0 or value > 100:
                raise ValueError("Scoring rubric values must be between 0 and 100")
        return rubric

    @model_validator(mode="after")
    def validate_record_shape(self) -> "RAGDatasetRecord":
        if self.source_type in {"question", "role_discovery_question"}:
            if not self.question_text:
                raise ValueError(f"{self.source_type} records require question_text")
            if not self.expected_concepts:
                raise ValueError(f"{self.source_type} records require expected_concepts")
        if self.source_type == "coding_task":
            if not self.task_description:
                raise ValueError("coding_task records require task_description")
            if not self.expected_concepts:
                raise ValueError("coding_task records require expected_concepts")
        if self.source_type == "rubric" and not self.scoring_rubric:
            raise ValueError("rubric records require scoring_rubric")
        if self.source_type == "follow_up_template" and not self.sample_followups:
            raise ValueError("follow_up_template records require sample_followups")
        if self.source_type == "onboarding_prompt" and not (self.content or self.question_text):
            raise ValueError("onboarding_prompt records require content or question_text")
        if not self.embedding_text:
            self.embedding_text = generate_rag_embedding_text(self)
        return self


class RAGDataset(BaseModel):
    dataset_version: str = Field(min_length=1, max_length=40)
    records: list[RAGDatasetRecord] = Field(min_length=1)

    @field_validator("dataset_version", mode="before")
    @classmethod
    def strip_version(cls, value: Any) -> Any:
        return _clean_string(value)

    @model_validator(mode="after")
    def validate_unique_ids(self) -> "RAGDataset":
        ids = [record.id for record in self.records]
        duplicates = sorted({record_id for record_id in ids if ids.count(record_id) > 1})
        if duplicates:
            raise ValueError(f"Duplicate RAG record ids: {', '.join(duplicates)}")
        return self


class RagRetrievalRequest(BaseModel):
    query_text: str = Field(min_length=1, max_length=4000)
    source_types: list[RAGSourceType] = Field(default_factory=list)
    target_role: str | None = Field(default=None, max_length=160)
    tech_stack: list[str] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)
    experience_level: str | None = Field(default=None, max_length=80)
    difficulty: RAGDifficulty | None = None
    categories: list[str] = Field(default_factory=list)
    question_types: list[RAGQuestionType] = Field(default_factory=list)
    top_k: int = Field(default=8, ge=1, le=50)
    min_similarity: float = Field(default=0, ge=0, le=100)
    diversity_enabled: bool = True
    debug: bool = False

    @field_validator("query_text", "target_role", "experience_level", mode="before")
    @classmethod
    def strip_optional_strings(cls, value: Any) -> Any:
        return _clean_string(value)

    @field_validator("tech_stack", "skills", "categories", mode="before")
    @classmethod
    def strip_retrieval_lists(cls, value: Any) -> list[str]:
        return _clean_list(value)


class RagScoreBreakdown(BaseModel):
    final_score: float
    vector_score: float
    tech_stack_score: float
    role_score: float
    difficulty_score: float
    diversity_score: float


class RagRetrievalResult(BaseModel):
    document_id: str
    source_type: str
    title: str
    role: str
    tech_stack: list[str]
    difficulty: str
    experience_level: str
    category: str
    question_type: str
    summary: str | None
    score: RagScoreBreakdown
    fallback_used: bool
    metadata: dict[str, Any] = Field(default_factory=dict)
    why_matched: str | None = None


class RagRetrievalResponse(BaseModel):
    query_text: str
    result_count: int
    fallback_used: bool
    provider_metadata: EmbeddingProviderMetadata
    results: list[RagRetrievalResult]
