from pathlib import Path

import pytest
from pydantic import ValidationError

from app.schemas.rag import RAGDataset, RAGDatasetRecord, generate_rag_embedding_text
from app.services.rag_dataset import load_rag_dataset_file, records_by_source_type

DATASET_PATH = Path(__file__).resolve().parents[1] / "data" / "rag" / "full_stack_demo.json"


def test_full_stack_demo_dataset_loads_and_validates() -> None:
    dataset = load_rag_dataset_file(DATASET_PATH)

    assert dataset.dataset_version == "2026.05-demo-v1"
    assert len(dataset.records) >= 16


def test_full_stack_demo_record_ids_are_unique() -> None:
    dataset = load_rag_dataset_file(DATASET_PATH)
    ids = [record.id for record in dataset.records]

    assert len(ids) == len(set(ids))


def test_full_stack_demo_has_required_source_types() -> None:
    dataset = load_rag_dataset_file(DATASET_PATH)
    counts = records_by_source_type(dataset.records)

    assert counts["onboarding_prompt"] >= 1
    assert counts["role_discovery_question"] >= 1
    assert counts["question"] >= 6
    assert counts["coding_task"] >= 1
    assert counts["rubric"] >= 3
    assert counts["follow_up_template"] >= 1


def test_full_stack_demo_represents_target_stack() -> None:
    dataset = load_rag_dataset_file(DATASET_PATH)
    stack_terms = {
        value.lower()
        for record in dataset.records
        for value in [*record.tech_stack, *record.tags, record.embedding_text or ""]
    }
    joined = " ".join(stack_terms)

    for expected in ["react", "next.js", "typescript", "fastapi", "postgresql"]:
        assert expected in joined


def test_embedding_text_is_generated_for_every_record() -> None:
    dataset = load_rag_dataset_file(DATASET_PATH)

    for record in dataset.records:
        assert record.embedding_text
        assert record.role in record.embedding_text
        assert record.category in record.embedding_text


def test_generate_embedding_text_includes_role_stack_category_and_concepts() -> None:
    record = RAGDatasetRecord(
        id="test-fullstack-question-001",
        source_type="question",
        title="Test React API question",
        role="Full Stack Developer",
        tech_stack=["React", "FastAPI"],
        category="api-integration",
        question_type="scenario",
        question_text="How should the React UI call a FastAPI endpoint?",
        expected_concepts=["typed API client", "loading state"],
        tags=["react", "fastapi"],
    )

    text = generate_rag_embedding_text(record)

    assert "Full Stack Developer" in text
    assert "React" in text
    assert "FastAPI" in text
    assert "api-integration" in text
    assert "typed API client" in text


def test_invalid_source_type_is_rejected() -> None:
    with pytest.raises(ValidationError):
        RAGDatasetRecord.model_validate(
            {
                "id": "bad-source-001",
                "source_type": "personality_prompt",
                "title": "Bad source",
                "role": "Full Stack Developer",
                "category": "bad",
                "question_type": "conceptual",
                "question_text": "Bad question?",
                "expected_concepts": ["validation"],
                "tags": ["bad"],
            }
        )


def test_question_without_text_is_rejected() -> None:
    with pytest.raises(ValidationError):
        RAGDatasetRecord(
            id="empty-question-001",
            source_type="question",
            title="Empty question",
            role="Full Stack Developer",
            category="frontend",
            question_type="scenario",
            expected_concepts=["React"],
            tags=["react"],
        )


def test_coding_task_without_expected_concepts_is_rejected() -> None:
    with pytest.raises(ValidationError):
        RAGDatasetRecord(
            id="empty-task-001",
            source_type="coding_task",
            title="Empty task",
            role="Full Stack Developer",
            category="coding",
            question_type="coding",
            task_description="Build a small feature.",
            tags=["coding"],
        )


def test_rubric_without_scoring_rubric_is_rejected() -> None:
    with pytest.raises(ValidationError):
        RAGDatasetRecord(
            id="empty-rubric-001",
            source_type="rubric",
            title="Empty rubric",
            content="Evaluate API design.",
            role="Full Stack Developer",
            category="rubric",
            question_type="rubric",
            tags=["rubric"],
        )


def test_scoring_rubric_values_must_be_between_zero_and_hundred() -> None:
    with pytest.raises(ValidationError):
        RAGDatasetRecord(
            id="bad-rubric-001",
            source_type="rubric",
            title="Bad rubric",
            content="Invalid score.",
            role="Full Stack Developer",
            category="rubric",
            question_type="rubric",
            scoring_rubric={"technical_accuracy": 140},
            tags=["rubric"],
        )


def test_duplicate_dataset_ids_are_rejected() -> None:
    record = {
        "id": "duplicate-rag-001",
        "source_type": "question",
        "title": "Duplicate",
        "role": "Full Stack Developer",
        "category": "frontend",
        "question_type": "scenario",
        "question_text": "How do you fetch backend data?",
        "expected_concepts": ["API client"],
        "tags": ["frontend"],
    }

    with pytest.raises(ValidationError):
        RAGDataset.model_validate({"dataset_version": "test", "records": [record, record]})
