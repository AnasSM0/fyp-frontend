from pathlib import Path
from types import SimpleNamespace

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.assessment import AssessmentAnswer, AssessmentSession, QuestionBank
from app.models.profile import CandidateProfile
from app.models.rag import AssessmentRetrieval
from app.services.assessment_service import normalize_profile_role
from app.services.embedding_provider import FallbackEmbeddingProvider
from app.services.question_bank_seed import seed_question_bank
from app.services.rag_ingestion_service import import_rag_documents

DATASET_PATH = Path(__file__).resolve().parents[1] / "data" / "rag" / "full_stack_demo.json"


def auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def signup(client: TestClient, email: str, role: str = "candidate") -> dict:
    response = client.post(
        "/auth/signup",
        json={"email": email, "password": "password123", "role": role},
    )
    assert response.status_code == 201
    return response.json()


def create_full_stack_profile(client: TestClient, token: str) -> dict:
    response = client.put(
        "/profiles/candidate/me",
        json={
            "full_name": "RAG Candidate",
            "university": "FAST NUCES",
            "degree": "BS Computer Science",
            "graduation_year": 2026,
            "gpa": 3.7,
            "target_role": "Full Stack Developer",
            "experience_level": "student",
            "tech_stack": ["React", "Next.js", "FastAPI", "PostgreSQL"],
            "skills": ["React", "TypeScript", "API Design", "Database Design"],
            "portfolio_url": "https://candidate.example",
            "linkedin_url": "https://linkedin.example/candidate",
            "resume_url": "https://resume.example/candidate.pdf",
            "profile_visibility": False,
            "availability_status": "open",
            "profile_complete": True,
        },
        headers=auth_header(token),
    )
    assert response.status_code == 200
    return response.json()


def create_ai_ml_profile(client: TestClient, token: str) -> dict:
    response = client.put(
        "/profiles/candidate/me",
        json={
            "full_name": "AI Candidate",
            "university": "FAST NUCES",
            "degree": "BS Computer Science",
            "graduation_year": 2026,
            "gpa": 3.7,
            "target_role": "AI/ML Engineer",
            "experience_level": "student",
            "tech_stack": ["React", "Next.js", "Python", "Machine Learning", "Pandas"],
            "skills": ["React", "Python", "Model Evaluation", "Data Preprocessing"],
            "portfolio_url": "https://candidate.example",
            "linkedin_url": "https://linkedin.example/candidate",
            "resume_url": "https://resume.example/candidate.pdf",
            "profile_visibility": False,
            "availability_status": "open",
            "profile_complete": True,
        },
        headers=auth_header(token),
    )
    assert response.status_code == 200
    return response.json()


def stub_provider() -> FallbackEmbeddingProvider:
    return FallbackEmbeddingProvider(None, 64)


def fake_settings(**overrides):
    values = {
        "enable_rag_assessment": True,
        "enable_rag_curated_fallback": True,
        "rag_top_k": 8,
        "rag_min_similarity": 0,
        "rag_default_difficulty": "intermediate",
    }
    values.update(overrides)
    return SimpleNamespace(**values)


def test_full_stack_candidate_gets_rag_selected_questions(
    client: TestClient, db_session: Session, monkeypatch
) -> None:
    monkeypatch.setattr("app.services.assessment_service.get_settings", lambda: fake_settings())
    import_rag_documents(db_session, DATASET_PATH, provider=stub_provider())
    candidate = signup(client, "rag-fullstack@example.com")
    create_full_stack_profile(client, candidate["access_token"])

    response = client.post(
        "/assessments/sessions",
        json={},
        headers=auth_header(candidate["access_token"]),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["session"]["total_questions"] == 6
    assert body["session"]["session_plan_metadata"]["question_source"] == "rag"
    selected_text = " ".join(question["question_text"] for question in body["questions"]).lower()
    selected_categories = {question["category"] for question in body["questions"]}
    assert "react" in selected_text or "next.js" in selected_text
    assert "fastapi" in selected_text or "api" in selected_text
    assert any("database" in category for category in selected_categories)
    assert "debug" in selected_text or "unavailable" in selected_text
    assert "communication" in selected_text or "supervisor" in selected_text
    assert {question["question_bank_id"] for question in body["questions"]} == {"rag_generated"}
    sentinel = db_session.get(QuestionBank, "rag_generated")
    assert sentinel is not None
    assert sentinel.question_text.startswith("[internal]")


def test_explicit_target_role_wins_over_mixed_tech_stack() -> None:
    profile = CandidateProfile(
        target_role="AI/ML Engineer",
        experience_level="student",
        tech_stack=["React", "Next.js", "TypeScript", "Python"],
        skills=["Machine Learning", "Model Evaluation"],
    )

    assert normalize_profile_role(profile) == "ai_ml"


def test_high_rag_threshold_retries_lower_and_selects_coding_question(
    client: TestClient, db_session: Session, monkeypatch
) -> None:
    monkeypatch.setattr(
        "app.services.assessment_service.get_settings",
        lambda: fake_settings(rag_min_similarity=0.95),
    )
    import_rag_documents(db_session, DATASET_PATH, provider=stub_provider())
    candidate = signup(client, "rag-coding-retry@example.com")
    create_ai_ml_profile(client, candidate["access_token"])

    response = client.post(
        "/assessments/sessions",
        json={},
        headers=auth_header(candidate["access_token"]),
    )

    assert response.status_code == 200
    body = response.json()
    metadata = body["session"]["session_plan_metadata"]
    assert metadata["question_source"] == "rag"
    assert metadata["rag"]["configured_min_similarity"] == 95
    assert metadata["rag"]["min_similarity_used"] < metadata["rag"]["configured_min_similarity"]
    assert any(question["question_type"] == "coding" for question in body["questions"])
    assert body["session"]["total_questions"] == 6


def test_assessment_retrieval_metadata_created(
    client: TestClient, db_session: Session, monkeypatch
) -> None:
    monkeypatch.setattr("app.services.assessment_service.get_settings", lambda: fake_settings())
    import_rag_documents(db_session, DATASET_PATH, provider=stub_provider())
    candidate = signup(client, "rag-metadata@example.com")
    create_full_stack_profile(client, candidate["access_token"])

    response = client.post(
        "/assessments/sessions",
        json={},
        headers=auth_header(candidate["access_token"]),
    )

    assert response.status_code == 200
    retrieval = db_session.scalar(select(AssessmentRetrieval))
    assert retrieval is not None
    assert len(retrieval.retrieved_document_ids) >= 6
    assert len(retrieval.selected_question_ids) == 6
    assert retrieval.selected_rubric_ids == []
    assert retrieval.metadata_json["selected_scores"]
    assert retrieval.metadata_json["why_matched"]
    assert retrieval.metadata_json["slot_allocation"]


def test_rag_session_current_question_answer_and_finish_still_work(
    client: TestClient, db_session: Session, monkeypatch
) -> None:
    monkeypatch.setattr("app.services.assessment_service.get_settings", lambda: fake_settings())
    import_rag_documents(db_session, DATASET_PATH, provider=stub_provider())
    candidate = signup(client, "rag-flow@example.com")
    create_full_stack_profile(client, candidate["access_token"])
    headers = auth_header(candidate["access_token"])
    session = client.post("/assessments/sessions", json={}, headers=headers).json()
    session_id = session["session"]["id"]
    first_question_id = session["current_question"]["id"]

    current = client.get(f"/assessments/sessions/{session_id}/current-question", headers=headers)
    assert current.status_code == 200
    assert current.json()["current_question"]["id"] == first_question_id

    answer = client.post(
        f"/assessments/sessions/{session_id}/answers",
        json={
            "assessment_question_id": first_question_id,
            "answer_text": "I would connect the React UI to a typed FastAPI endpoint and persist data in PostgreSQL.",
            "duration_seconds": 120,
            "metadata": {"source": "rag-test"},
        },
        headers=headers,
    )
    assert answer.status_code == 200
    assert answer.json()["progress"]["answered"] == 1
    assert db_session.scalars(select(AssessmentAnswer)).first() is not None

    finish = client.post(f"/assessments/sessions/{session_id}/finish", json={}, headers=headers)
    assert finish.status_code == 200
    assert finish.json()["session"]["status"] == "completed"


def test_rag_disabled_uses_question_bank(
    client: TestClient, db_session: Session, monkeypatch
) -> None:
    monkeypatch.setattr(
        "app.services.assessment_service.get_settings",
        lambda: fake_settings(enable_rag_assessment=False),
    )
    seed_question_bank(db_session)
    import_rag_documents(db_session, DATASET_PATH, provider=stub_provider())
    candidate = signup(client, "rag-disabled@example.com")
    create_full_stack_profile(client, candidate["access_token"])

    response = client.post(
        "/assessments/sessions",
        json={},
        headers=auth_header(candidate["access_token"]),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["session"]["session_plan_metadata"]["question_source"] == "question_bank"
    assert db_session.scalar(select(AssessmentRetrieval)) is None
    assert "rag_generated" not in {question["question_bank_id"] for question in body["questions"]}


def test_no_rag_docs_falls_back_to_question_bank(
    client: TestClient, db_session: Session, monkeypatch
) -> None:
    monkeypatch.setattr("app.services.assessment_service.get_settings", lambda: fake_settings())
    seed_question_bank(db_session)
    candidate = signup(client, "rag-no-docs@example.com")
    create_full_stack_profile(client, candidate["access_token"])

    response = client.post(
        "/assessments/sessions",
        json={},
        headers=auth_header(candidate["access_token"]),
    )

    assert response.status_code == 200
    metadata = response.json()["session"]["session_plan_metadata"]
    assert metadata["question_source"] == "question_bank"
    assert "RAG returned insufficient usable assessment documents" in metadata["rag_fallback_reason"]


def test_rag_failure_fallback_and_fallback_disabled(
    client: TestClient, db_session: Session, monkeypatch
) -> None:
    def fail_rag(*args, **kwargs):
        raise RuntimeError("forced RAG failure")

    monkeypatch.setattr("app.services.assessment_service.build_rag_session_plan", fail_rag)
    seed_question_bank(db_session)
    candidate = signup(client, "rag-failure@example.com")
    create_full_stack_profile(client, candidate["access_token"])
    headers = auth_header(candidate["access_token"])

    monkeypatch.setattr("app.services.assessment_service.get_settings", lambda: fake_settings())
    fallback = client.post("/assessments/sessions", json={}, headers=headers)
    assert fallback.status_code == 200
    assert fallback.json()["session"]["session_plan_metadata"]["question_source"] == "question_bank"

    session = db_session.scalar(select(AssessmentSession))
    assert session is not None
    session.status = "abandoned"
    db_session.commit()

    monkeypatch.setattr(
        "app.services.assessment_service.get_settings",
        lambda: fake_settings(enable_rag_curated_fallback=False),
    )
    blocked = client.post(
        "/assessments/sessions",
        json={"force_new": True},
        headers=headers,
    )
    assert blocked.status_code == 409
    assert "RAG assessment unavailable" in blocked.json()["detail"]
