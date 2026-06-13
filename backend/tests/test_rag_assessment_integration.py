from pathlib import Path
from types import SimpleNamespace

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.assessment import AssessmentAnswer, AssessmentSession, QuestionBank
from app.models.profile import CandidateProfile
from app.models.rag import AssessmentRetrieval, RagDocument
from app.schemas.rag import RagRetrievalResult, RagScoreBreakdown
from app.services.assessment_service import balanced_rag_selection, difficulty_plan_for, normalize_profile_role
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


def rag_result(document_id: str, question_type: str, category: str, difficulty: str = "intermediate") -> RagRetrievalResult:
    return RagRetrievalResult(
        document_id=document_id,
        source_type="question",
        title=f"{category} {question_type}",
        role="Full Stack Developer",
        tech_stack=["React", "FastAPI"],
        difficulty=difficulty,
        experience_level="student",
        category=category,
        question_type=question_type,
        summary="Assessment prompt",
        score=RagScoreBreakdown(
            final_score=80,
            vector_score=80,
            tech_stack_score=80,
            role_score=80,
            difficulty_score=80,
            diversity_score=80,
        ),
        fallback_used=True,
    )


def rag_document(document_id: str, question_type: str, category: str, difficulty: str = "intermediate") -> RagDocument:
    return RagDocument(
        id=document_id,
        source_type="question",
        title=f"{category} {question_type}",
        content="Assessment prompt",
        role="Full Stack Developer",
        specialization=None,
        difficulty=difficulty,
        experience_level="student",
        category=category,
        question_type=question_type,
        tech_stack=["React", "FastAPI"],
        tags=["assessment"],
        expected_concepts=["concept"],
        scoring_rubric={},
        sample_followups=[],
        metadata_json={},
        raw_json={},
        embedding_text="assessment prompt",
        embedding_json=[],
        content_hash=document_id,
        is_active=True,
    )


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
    selected_slots = {
        item["slot"]
        for item in body["session"]["session_plan_metadata"]["rag"]["slot_allocation"]
    }
    assert "react" in selected_text or "next.js" in selected_text
    assert "fastapi" in selected_text or "api" in selected_text
    assert any("database" in category for category in selected_categories)
    assert "debugging" in selected_slots
    assert "communication" in selected_categories or "supervisor" in selected_text
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


def test_difficulty_plans_for_experience_buckets() -> None:
    entry = CandidateProfile(experience_level="Entry / Fresh graduate")
    student = CandidateProfile(experience_level="Student / Early Career")
    intermediate = CandidateProfile(experience_level="Junior")
    advanced = CandidateProfile(experience_level="Senior")

    assert difficulty_plan_for(entry).count("beginner") >= 2
    assert difficulty_plan_for(student).count("advanced") == 0
    assert difficulty_plan_for(student).count("beginner") >= 2
    assert difficulty_plan_for(intermediate).count("advanced") == 1
    assert difficulty_plan_for(advanced).count("advanced") >= 3


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


def test_bucket_selection_falls_back_when_bucket_has_too_few_questions(db_session: Session) -> None:
    specs = [
        ("role-1", "conceptual", "role-specific"),
        ("role-2", "conceptual", "auth-roles"),
        ("system-1", "system_design", "system-design"),
        ("debug-1", "debugging", "debugging"),
        ("coding-1", "coding", "implementation"),
        ("extra-1", "conceptual", "data-modeling"),
    ]
    for document_id, question_type, category in specs:
        db_session.add(rag_document(document_id, question_type, category))
    db_session.commit()

    selected, slot_allocation, selection_trace = balanced_rag_selection(
        db_session,
        [rag_result(document_id, question_type, category) for document_id, question_type, category in specs],
        "Full Stack Developer",
        difficulty_plan=["intermediate"] * 6,
        selection_seed="session-seed",
    )

    selected_ids = [item.rag_document.id for item in selected]
    assert len(selected_ids) == 6
    assert len(selected_ids) == len(set(selected_ids))
    assert any(item["slot"] == "best_available" for item in slot_allocation)
    assert len(selection_trace) == 6


def test_rag_selection_avoids_answered_questions_when_alternatives_exist(db_session: Session) -> None:
    old_specs = [
        ("old-role-1", "conceptual", "role-specific"),
        ("old-role-2", "conceptual", "auth-roles"),
        ("old-system", "system_design", "system-design"),
        ("old-debug", "debugging", "debugging"),
        ("old-coding", "coding", "implementation"),
        ("old-comm", "communication", "communication"),
    ]
    fresh_specs = [
        ("fresh-role-1", "conceptual", "role-specific"),
        ("fresh-role-2", "conceptual", "auth-roles"),
        ("fresh-system", "system_design", "system-design"),
        ("fresh-debug", "debugging", "debugging"),
        ("fresh-coding", "coding", "implementation"),
        ("fresh-comm", "communication", "communication"),
    ]
    for document_id, question_type, category in [*old_specs, *fresh_specs]:
        db_session.add(rag_document(document_id, question_type, category))
    db_session.commit()

    selected, _, selection_trace = balanced_rag_selection(
        db_session,
        [
            rag_result(document_id, question_type, category)
            for document_id, question_type, category in [*old_specs, *fresh_specs]
        ],
        "Full Stack Developer",
        difficulty_plan=["intermediate"] * 6,
        avoid_document_ids={document_id for document_id, _, _ in old_specs},
        selection_seed="avoid-seed",
    )

    selected_ids = [item.rag_document.id for item in selected]
    assert len(selected_ids) == 6
    assert set(selected_ids).isdisjoint({document_id for document_id, _, _ in old_specs})
    assert all(not item["reused_question"] for item in selection_trace)


def test_same_session_refresh_is_stable_and_exposes_selection_metadata(
    client: TestClient, db_session: Session, monkeypatch
) -> None:
    monkeypatch.setattr("app.services.assessment_service.get_settings", lambda: fake_settings())
    import_rag_documents(db_session, DATASET_PATH, provider=stub_provider())
    candidate = signup(client, "rag-stable-refresh@example.com")
    create_full_stack_profile(client, candidate["access_token"])
    headers = auth_header(candidate["access_token"])

    started = client.post("/assessments/sessions", json={}, headers=headers)
    assert started.status_code == 200
    session_id = started.json()["session"]["id"]
    first_ids = [question["id"] for question in started.json()["questions"]]
    first_texts = [question["question_text"] for question in started.json()["questions"]]

    refreshed = client.get(f"/assessments/sessions/{session_id}", headers=headers)

    assert refreshed.status_code == 200
    assert [question["id"] for question in refreshed.json()["questions"]] == first_ids
    assert [question["question_text"] for question in refreshed.json()["questions"]] == first_texts
    assert all(
        question["scoring_rubric"]["selection_metadata"]["selected_from_pool"]
        for question in refreshed.json()["questions"]
    )
    metadata = refreshed.json()["questions"][0]["scoring_rubric"]["selection_metadata"]
    assert {
        "difficulty",
        "question_type",
        "matched_skills",
        "source_question_id",
        "source_rag_document_id",
        "selection_reason",
        "reused_question",
    }.issubset(metadata)
    assert metadata["source_question_id"] is None
    assert metadata["source_rag_document_id"]


def test_force_new_session_can_vary_question_set_without_duplicates(
    client: TestClient, db_session: Session, monkeypatch
) -> None:
    monkeypatch.setattr("app.services.assessment_service.get_settings", lambda: fake_settings())
    import_rag_documents(db_session, DATASET_PATH, provider=stub_provider())
    candidate = signup(client, "rag-force-new-varies@example.com")
    create_full_stack_profile(client, candidate["access_token"])
    headers = auth_header(candidate["access_token"])

    first = client.post("/assessments/sessions", json={}, headers=headers)
    second = client.post("/assessments/sessions", json={"force_new": True}, headers=headers)

    assert first.status_code == 200
    assert second.status_code == 200
    first_docs = first.json()["session"]["session_plan_metadata"]["rag"]["selected_document_ids"]
    second_docs = second.json()["session"]["session_plan_metadata"]["rag"]["selected_document_ids"]
    assert len(first_docs) == len(set(first_docs)) == 6
    assert len(second_docs) == len(set(second_docs)) == 6
    assert first_docs != second_docs


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
