import sys
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.rag import RagDocument
from app.schemas.rag import RagRetrievalRequest
from app.services.embedding_provider import FallbackEmbeddingProvider
from app.services.rag_ingestion_service import import_rag_documents
from app.services.rag_retrieval_service import (
    retrieve_for_assessment,
    retrieve_rag_documents,
    retrieve_rubrics,
)

DATASET_PATH = Path(__file__).resolve().parents[1] / "data" / "rag" / "full_stack_demo.json"


def stub_provider() -> FallbackEmbeddingProvider:
    return FallbackEmbeddingProvider(None, 64)


def seed_rag_docs(db_session: Session) -> None:
    import_rag_documents(db_session, DATASET_PATH, provider=stub_provider())


def result_ids(response) -> list[str]:
    return [item.document_id for item in response.results]


def test_full_stack_retrieval_returns_relevant_documents(db_session: Session) -> None:
    seed_rag_docs(db_session)

    response = retrieve_for_assessment(
        db_session,
        target_role="Full Stack Developer",
        tech_stack=["React", "Next.js", "FastAPI", "PostgreSQL"],
        skills=["TypeScript", "API Design", "Database Design"],
        experience_level="student",
        provider=stub_provider(),
    )
    ids = result_ids(response)

    assert response.result_count == 8
    assert any("frontend" in item.category for item in response.results)
    assert any("backend" in item.category or "api" in item.category for item in response.results)
    assert any("database" in item.category for item in response.results)
    assert any("debugging" in item.category for item in response.results)
    assert any("fastapi" in " ".join(item.tech_stack).lower() for item in response.results)
    assert "fullstack-coding-requests-filter-001" in ids
    assert all(item.why_matched for item in response.results)


def test_frontend_query_does_not_rank_irrelevant_ml_document(db_session: Session) -> None:
    seed_rag_docs(db_session)
    db_session.add(
        RagDocument(
            id="ml-random-001",
            source_type="question",
            title="Random ML question",
            content="Explain how random forests select split points for tabular classification.",
            role="AI/ML Engineer",
            specialization="Machine learning",
            difficulty="intermediate",
            experience_level="student",
            category="ml-fundamentals",
            question_type="conceptual",
            tech_stack=["Python", "scikit-learn"],
            tags=["machine-learning", "random-forest"],
            expected_concepts=["decision trees", "classification"],
            scoring_rubric={"technical_accuracy": 100},
            sample_followups=[],
            metadata_json={},
            raw_json={},
            embedding_text="AI ML machine learning random forest scikit-learn classification",
            embedding_json=[],
            embedding_provider=None,
            embedding_model=None,
            embedding_dimensions=None,
            fallback_used=False,
            content_hash="ml-random",
            is_active=True,
        )
    )
    db_session.commit()

    response = retrieve_rag_documents(
        db_session,
        RagRetrievalRequest(
            query_text="React Next.js TypeScript frontend component state and API fetching",
            source_types=["question"],
            target_role="Frontend Developer",
            tech_stack=["React", "Next.js", "TypeScript"],
            top_k=5,
        ),
        provider=stub_provider(),
    )

    assert "ml-random-001" not in result_ids(response)


def test_source_type_filtering_returns_only_rubrics(db_session: Session) -> None:
    seed_rag_docs(db_session)

    response = retrieve_rubrics(
        db_session,
        query_text="FastAPI PostgreSQL API database rubric",
        target_role="Full Stack Developer",
        tech_stack=["FastAPI", "PostgreSQL"],
        provider=stub_provider(),
    )

    assert response.result_count == 3
    assert {item.source_type for item in response.results} == {"rubric"}
    assert all(item.score.final_score >= 0 for item in response.results)


def test_inactive_documents_are_excluded(db_session: Session) -> None:
    seed_rag_docs(db_session)
    document = db_session.get(RagDocument, "frontend-react-next-state-001")
    assert document is not None
    document.is_active = False
    db_session.commit()

    response = retrieve_rag_documents(
        db_session,
        RagRetrievalRequest(
            query_text="React Next.js state management",
            source_types=["question"],
            target_role="Frontend Developer",
            tech_stack=["React", "Next.js"],
            top_k=10,
        ),
        provider=stub_provider(),
    )

    assert "frontend-react-next-state-001" not in result_ids(response)


def test_missing_embeddings_use_text_similarity_fallback(db_session: Session) -> None:
    import_rag_documents(db_session, DATASET_PATH, generate_embeddings=False, provider=stub_provider())

    response = retrieve_rag_documents(
        db_session,
        RagRetrievalRequest(
            query_text="FastAPI endpoint JWT role based API answer submission",
            source_types=["question"],
            target_role="Backend Developer",
            tech_stack=["FastAPI", "PostgreSQL"],
            top_k=4,
            debug=True,
        ),
        provider=stub_provider(),
    )

    assert response.result_count == 4
    assert response.fallback_used is True
    assert all(item.fallback_used for item in response.results)
    assert any("text fallback" in (item.why_matched or "") for item in response.results)


def test_vector_dimension_mismatch_falls_back_safely(db_session: Session) -> None:
    seed_rag_docs(db_session)
    document = db_session.get(RagDocument, "backend-fastapi-endpoint-001")
    assert document is not None
    document.embedding_dimensions = 3
    db_session.commit()

    response = retrieve_rag_documents(
        db_session,
        RagRetrievalRequest(
            query_text="FastAPI endpoint JWT assessment answer submission",
            source_types=["question"],
            target_role="Backend Developer",
            tech_stack=["FastAPI"],
            top_k=8,
            debug=True,
        ),
        provider=stub_provider(),
    )

    mismatched = next(item for item in response.results if item.document_id == "backend-fastapi-endpoint-001")
    assert mismatched.fallback_used is True
    assert "dimension mismatched" in (mismatched.why_matched or "")


def test_retrieval_returns_empty_response_when_no_docs_exist(db_session: Session) -> None:
    response = retrieve_rag_documents(
        db_session,
        RagRetrievalRequest(query_text="React FastAPI", source_types=["question"]),
        provider=stub_provider(),
    )

    assert response.result_count == 0
    assert response.results == []


def test_diversity_limits_category_overload(db_session: Session) -> None:
    seed_rag_docs(db_session)

    response = retrieve_rag_documents(
        db_session,
        RagRetrievalRequest(
            query_text="Full stack React Next.js FastAPI PostgreSQL assessment questions",
            source_types=["question", "coding_task"],
            target_role="Full Stack Developer",
            tech_stack=["React", "Next.js", "FastAPI", "PostgreSQL"],
            top_k=8,
            diversity_enabled=True,
        ),
        provider=stub_provider(),
    )
    category_counts: dict[str, int] = {}
    for item in response.results:
        category_counts[item.category] = category_counts.get(item.category, 0) + 1

    assert max(category_counts.values()) <= 2


def test_cli_retrieve_command_outputs_ranked_docs(db_session: Session, monkeypatch, capsys) -> None:
    seed_rag_docs(db_session)

    class TestSessionLocal:
        def __enter__(self):
            return db_session

        def __exit__(self, exc_type, exc, traceback):
            return False

    monkeypatch.setattr("app.seed.rag_documents.SessionLocal", lambda: TestSessionLocal())
    monkeypatch.setattr("app.services.rag_retrieval_service.build_rag_embedding_provider", stub_provider)
    monkeypatch.setattr(
        sys,
        "argv",
        [
            "rag_documents",
            "retrieve",
            "--role",
            "Full Stack Developer",
            "--stack",
            "React,Next.js,FastAPI,PostgreSQL",
            "--source-types",
            "question,coding_task",
            "--top-k",
            "3",
        ],
    )

    from app.seed.rag_documents import main

    main()
    output = capsys.readouterr().out

    assert "RAG retrieve complete" in output
    assert "score=" in output
    assert "why:" in output
