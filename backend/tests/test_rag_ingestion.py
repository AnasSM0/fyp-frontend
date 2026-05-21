import json
from pathlib import Path

import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.assessment import AssessmentSession
from app.models.profile import CandidateProfile
from app.models.rag import AssessmentRetrieval, RagDocument
from app.models.user import User
from app.services.embedding_provider import FallbackEmbeddingProvider
from app.services.rag_dataset import RAGDatasetLoadError
from app.services.rag_ingestion_service import (
    import_rag_documents,
    rebuild_rag_embeddings,
    summarize_rag_documents,
)

DATASET_PATH = Path(__file__).resolve().parents[1] / "data" / "rag" / "full_stack_demo.json"


def stub_provider() -> FallbackEmbeddingProvider:
    return FallbackEmbeddingProvider(None, 64)


def copy_dataset(tmp_path: Path) -> Path:
    target = tmp_path / "rag"
    target.mkdir()
    data = json.loads(DATASET_PATH.read_text(encoding="utf-8"))
    (target / "full_stack_demo.json").write_text(json.dumps(data), encoding="utf-8")
    return target


def test_import_sample_dataset_into_db(db_session: Session) -> None:
    summary = import_rag_documents(db_session, DATASET_PATH, provider=stub_provider())
    rows = db_session.scalars(select(RagDocument)).all()

    assert len(rows) == 16
    assert summary.inserted == 16
    assert summary.embeddings_generated == 16
    assert summary.fallback_embeddings == 16
    assert summary.counts_by_source_type["question"] >= 7
    assert all(row.embedding_text for row in rows)
    assert all(row.embedding_json for row in rows)
    assert {row.embedding_provider for row in rows} == {"stub"}
    assert {row.embedding_dimensions for row in rows} == {64}


def test_import_is_idempotent(db_session: Session) -> None:
    first = import_rag_documents(db_session, DATASET_PATH, provider=stub_provider())
    second = import_rag_documents(db_session, DATASET_PATH, provider=stub_provider())

    assert first.inserted == 16
    assert second.inserted == 0
    assert second.updated == 0
    assert second.unchanged == 16
    assert second.embeddings_generated == 0
    assert db_session.scalar(select(func.count()).select_from(RagDocument)) == 16


def test_import_no_embeddings_can_rebuild_later(db_session: Session) -> None:
    import_summary = import_rag_documents(
        db_session,
        DATASET_PATH,
        generate_embeddings=False,
        provider=stub_provider(),
    )
    rows = db_session.scalars(select(RagDocument)).all()

    assert import_summary.embeddings_generated == 0
    assert import_summary.embeddings_skipped == 16
    assert all(row.embedding_json == [] for row in rows)
    assert all(row.embedding_provider is None for row in rows)

    rebuild_summary = rebuild_rag_embeddings(db_session, provider=stub_provider())
    rows = db_session.scalars(select(RagDocument)).all()

    assert rebuild_summary.embeddings_generated == 16
    assert all(row.embedding_json for row in rows)
    assert {row.embedding_provider for row in rows} == {"stub"}


def test_changed_content_hash_updates_record(db_session: Session, tmp_path: Path) -> None:
    dataset_dir = copy_dataset(tmp_path)
    import_rag_documents(db_session, dataset_dir, provider=stub_provider())
    document = db_session.get(RagDocument, "frontend-react-next-state-001")
    assert document is not None
    original_hash = document.content_hash

    path = dataset_dir / "full_stack_demo.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    data["records"][2]["question_text"] = data["records"][2]["question_text"] + " Include testing strategy."
    path.write_text(json.dumps(data), encoding="utf-8")

    summary = import_rag_documents(db_session, dataset_dir, provider=stub_provider())
    db_session.refresh(document)

    assert summary.updated == 1
    assert document.content_hash != original_hash
    assert document.content is not None
    assert "Include testing strategy" in document.content


def test_duplicate_ids_rejected_before_db_writes(db_session: Session, tmp_path: Path) -> None:
    dataset_dir = tmp_path / "rag"
    dataset_dir.mkdir()
    data = json.loads(DATASET_PATH.read_text(encoding="utf-8"))
    data["records"][1]["id"] = data["records"][0]["id"]
    (dataset_dir / "bad.json").write_text(json.dumps(data), encoding="utf-8")

    with pytest.raises(RAGDatasetLoadError):
        import_rag_documents(db_session, dataset_dir, provider=stub_provider())

    assert db_session.scalars(select(RagDocument)).all() == []


def test_invalid_dataset_rolls_back_cleanly(db_session: Session, tmp_path: Path) -> None:
    dataset_dir = tmp_path / "rag"
    dataset_dir.mkdir()
    data = json.loads(DATASET_PATH.read_text(encoding="utf-8"))
    data["records"][0]["source_type"] = "personality_prompt"
    (dataset_dir / "bad.json").write_text(json.dumps(data), encoding="utf-8")

    with pytest.raises(RAGDatasetLoadError):
        import_rag_documents(db_session, dataset_dir, provider=stub_provider())

    assert db_session.scalars(select(RagDocument)).all() == []


def test_summary_counts_source_types(db_session: Session) -> None:
    import_rag_documents(db_session, DATASET_PATH, provider=stub_provider())
    summary = summarize_rag_documents(db_session)

    assert summary.counts_by_source_type["question"] >= 7
    assert summary.counts_by_source_type["rubric"] == 3
    assert summary.counts_by_role["Full Stack Developer"] >= 14
    assert summary.counts_by_difficulty["intermediate"] >= 15
    assert summary.counts_by_embedding_provider["stub"] == 16


def test_assessment_retrieval_model_stores_selected_ids(db_session: Session) -> None:
    user = User(email="rag-retrieval@example.com", password_hash="hash", role="candidate")
    db_session.add(user)
    db_session.flush()
    profile = CandidateProfile(user_id=user.id, full_name="RAG Candidate")
    db_session.add(profile)
    db_session.flush()
    session = AssessmentSession(candidate_id=profile.id, status="created", selected_difficulty="intermediate")
    db_session.add(session)
    db_session.flush()

    retrieval = AssessmentRetrieval(
        session_id=session.id,
        candidate_id=profile.id,
        query_text="Full-stack React FastAPI PostgreSQL assessment",
        retrieved_document_ids=["frontend-react-next-state-001", "backend-fastapi-endpoint-001"],
        selected_question_ids=["frontend-react-next-state-001"],
        selected_rubric_ids=["rubric-frontend-react-next-001"],
        metadata_json={"strategy": "test"},
    )
    db_session.add(retrieval)
    db_session.commit()

    stored = db_session.get(AssessmentRetrieval, retrieval.id)
    assert stored is not None
    assert stored.retrieved_document_ids == [
        "frontend-react-next-state-001",
        "backend-fastapi-endpoint-001",
    ]
    assert stored.selected_rubric_ids == ["rubric-frontend-react-next-001"]
