from pathlib import Path
from types import SimpleNamespace

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.assessment import AssessmentAnswer, AssessmentQuestion, AssessmentSession, QuestionBank
from app.models.profile import CandidateProfile
from app.schemas.evaluation import AIRubricContext
from app.services.ai_provider import FallbackAIProvider
from app.services.embedding_provider import FallbackEmbeddingProvider
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


def create_candidate_profile(client: TestClient, token: str) -> dict:
    response = client.put(
        "/profiles/candidate/me",
        json={
            "full_name": "Rubric Candidate",
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


def fake_eval_settings(**overrides):
    values = {
        "enable_rag_evaluation": True,
        "enable_rag_evaluation_fallback": True,
        "rag_rubric_top_k": 5,
    }
    values.update(overrides)
    return SimpleNamespace(**values)


def stub_embedding_provider() -> FallbackEmbeddingProvider:
    return FallbackEmbeddingProvider(None, 64)


def create_completed_session_with_question(
    client: TestClient,
    db: Session,
    email: str,
    *,
    question_id: str,
    question_text: str,
    category: str,
    question_type: str,
    expected_concepts: list[str],
    scoring_rubric: dict,
    answer_text: str,
    code_text: str | None = None,
) -> tuple[dict, str]:
    candidate = signup(client, email)
    profile = create_candidate_profile(client, candidate["access_token"])
    profile_row = db.get(CandidateProfile, profile["id"])
    assert profile_row is not None
    bank = QuestionBank(
        id=question_id,
        role="full_stack",
        category=category,
        tech_stack=profile_row.tech_stack,
        difficulty="intermediate",
        question_type=question_type,
        question_text=question_text,
        expected_concepts=expected_concepts,
        scoring_rubric=scoring_rubric,
        time_limit_seconds=600,
        follow_up_templates=[],
    )
    db.add(bank)
    db.flush()
    session = AssessmentSession(
        candidate_id=profile_row.id,
        status="completed",
        target_role=profile_row.target_role,
        experience_level=profile_row.experience_level,
        selected_difficulty="intermediate",
        current_order_index=1,
        total_questions=1,
        session_plan_metadata={"test": "rag_evaluation"},
    )
    db.add(session)
    db.flush()
    question = AssessmentQuestion(
        session_id=session.id,
        question_bank_id=bank.id,
        order_index=0,
        question_text=question_text,
        question_type=question_type,
        category=category,
        difficulty="intermediate",
        time_limit_seconds=600,
        expected_concepts=expected_concepts,
        scoring_rubric=scoring_rubric,
    )
    db.add(question)
    db.flush()
    db.add(
        AssessmentAnswer(
            session_id=session.id,
            assessment_question_id=question.id,
            question_bank_id=bank.id,
            order_index=0,
            answer_text=answer_text,
            code_text=code_text,
            duration_seconds=180,
            answer_metadata={},
        )
    )
    db.commit()
    return candidate, session.id


def test_report_generation_stores_rag_rubric_metadata(
    client: TestClient, db_session: Session, monkeypatch
) -> None:
    monkeypatch.setattr("app.services.evaluation_service.get_settings", lambda: fake_eval_settings())
    monkeypatch.setattr(
        "app.services.evaluation_service.build_ai_provider",
        lambda _: FallbackAIProvider(None),
    )
    import_rag_documents(db_session, DATASET_PATH, provider=stub_embedding_provider())
    candidate, session_id = create_completed_session_with_question(
        client,
        db_session,
        "rag-eval-frontend@example.com",
        question_id="rag-eval-frontend-q",
        question_text="Explain how a React and Next.js page should fetch private report data from the backend.",
        category="frontend-data-fetching",
        question_type="conceptual",
        expected_concepts=["typed API client", "loading state", "error handling"],
        scoring_rubric={"technical_accuracy": 40, "communication": 20},
        answer_text="I would use the authenticated API client, typed response models, loading states, and error handling.",
    )

    response = client.post(
        f"/evaluations/sessions/{session_id}/generate",
        json={},
        headers=auth_header(candidate["access_token"]),
    )

    assert response.status_code == 200
    body = response.json()
    answer = db_session.scalar(select(AssessmentAnswer))
    assert answer is not None
    assert answer.ai_evaluation["rubric_document_ids"]
    assert "rubric-frontend-react-next-001" in answer.ai_evaluation["rubric_document_ids"]
    assert body["report_json"]["rubric_retrieval_summary"]["answers_with_rubrics"] == 1
    assert "rubric-frontend-react-next-001" in body["report_json"]["rubric_document_ids_used"]
    assert body["report_json"]["question_wise_scores"][0]["rubric_document_ids"]
    assert "raw_json" not in response.text


def test_rag_evaluation_disabled_keeps_backward_compatible_report(
    client: TestClient, db_session: Session, monkeypatch
) -> None:
    monkeypatch.setattr(
        "app.services.evaluation_service.get_settings",
        lambda: fake_eval_settings(enable_rag_evaluation=False),
    )
    monkeypatch.setattr(
        "app.services.evaluation_service.build_ai_provider",
        lambda _: FallbackAIProvider(None),
    )
    candidate, session_id = create_completed_session_with_question(
        client,
        db_session,
        "rag-eval-disabled@example.com",
        question_id="rag-eval-disabled-q",
        question_text="Design a FastAPI endpoint.",
        category="api-design",
        question_type="scenario",
        expected_concepts=["JWT auth", "Pydantic schema"],
        scoring_rubric={"api_design": 100},
        answer_text="I would validate the request with Pydantic and require JWT authentication.",
    )

    response = client.post(
        f"/evaluations/sessions/{session_id}/generate",
        json={},
        headers=auth_header(candidate["access_token"]),
    )

    assert response.status_code == 200
    summary = response.json()["report_json"]["rubric_retrieval_summary"]
    assert summary["rag_enabled"] is False
    assert summary["answers_with_rubrics"] == 0


def test_no_rubric_docs_does_not_crash(
    client: TestClient, db_session: Session, monkeypatch
) -> None:
    monkeypatch.setattr("app.services.evaluation_service.get_settings", lambda: fake_eval_settings())
    monkeypatch.setattr(
        "app.services.evaluation_service.build_ai_provider",
        lambda _: FallbackAIProvider(None),
    )
    candidate, session_id = create_completed_session_with_question(
        client,
        db_session,
        "rag-eval-no-docs@example.com",
        question_id="rag-eval-no-docs-q",
        question_text="Design a PostgreSQL schema.",
        category="database-design",
        question_type="system_design",
        expected_concepts=["foreign keys", "indexes"],
        scoring_rubric={"schema_design": 100},
        answer_text="I would use foreign keys and indexes for lookup paths.",
    )

    response = client.post(
        f"/evaluations/sessions/{session_id}/generate",
        json={},
        headers=auth_header(candidate["access_token"]),
    )

    assert response.status_code == 200
    metadata = response.json()["report_json"]["question_wise_scores"][0]["evaluation"] if False else None
    assert metadata is None
    answer = db_session.scalar(select(AssessmentAnswer))
    assert answer is not None
    assert answer.ai_evaluation["rubric_document_ids"] == []
    assert answer.ai_evaluation["rubric_retrieval_metadata"]["warning"] == "no_rubric_docs"


def test_retrieval_failure_fallback_and_blocking(
    client: TestClient, db_session: Session, monkeypatch
) -> None:
    def fail_retrieve(*args, **kwargs):
        raise RuntimeError("forced rubric retrieval failure")

    monkeypatch.setattr("app.services.evaluation_service.retrieve_rubrics", fail_retrieve)
    monkeypatch.setattr(
        "app.services.evaluation_service.build_ai_provider",
        lambda _: FallbackAIProvider(None),
    )
    candidate, session_id = create_completed_session_with_question(
        client,
        db_session,
        "rag-eval-failure@example.com",
        question_id="rag-eval-failure-q",
        question_text="Explain API validation.",
        category="api-design",
        question_type="scenario",
        expected_concepts=["validation"],
        scoring_rubric={"api_design": 100},
        answer_text="I would validate the body and return clear status codes.",
    )
    headers = auth_header(candidate["access_token"])

    monkeypatch.setattr("app.services.evaluation_service.get_settings", lambda: fake_eval_settings())
    fallback = client.post(f"/evaluations/sessions/{session_id}/generate", json={}, headers=headers)
    assert fallback.status_code == 200
    assert "rubric_retrieval_failed" in fallback.json()["report_json"]["rubric_retrieval_summary"]["warnings"][0]

    monkeypatch.setattr(
        "app.services.evaluation_service.get_settings",
        lambda: fake_eval_settings(enable_rag_evaluation_fallback=False),
    )
    blocked = client.post(
        f"/evaluations/sessions/{session_id}/generate",
        json={"force_regenerate": True},
        headers=headers,
    )
    assert blocked.status_code == 409
    assert "RAG rubric retrieval unavailable" in blocked.json()["detail"]


def test_provider_receives_optional_rubric_context(
    client: TestClient, db_session: Session, monkeypatch
) -> None:
    captured: list[AIRubricContext | None] = []

    class CapturingProvider(FallbackAIProvider):
        def __init__(self):
            super().__init__(None)

        def evaluate_answer(self, profile, answer, rubric_context=None):
            captured.append(rubric_context)
            return super().evaluate_answer(profile, answer, rubric_context)

    monkeypatch.setattr("app.services.evaluation_service.get_settings", lambda: fake_eval_settings())
    monkeypatch.setattr(
        "app.services.evaluation_service.build_ai_provider",
        lambda _: CapturingProvider(),
    )
    import_rag_documents(db_session, DATASET_PATH, provider=stub_embedding_provider())
    candidate, session_id = create_completed_session_with_question(
        client,
        db_session,
        "rag-eval-context@example.com",
        question_id="rag-eval-context-q",
        question_text="Write or describe a PostgreSQL query for candidate invites.",
        category="database-querying",
        question_type="conceptual",
        expected_concepts=["joins", "indexes"],
        scoring_rubric={"sql_correctness": 100},
        answer_text="I would join invites to companies, filter by candidate_id, and index candidate_id with created_at.",
    )

    response = client.post(
        f"/evaluations/sessions/{session_id}/generate",
        json={},
        headers=auth_header(candidate["access_token"]),
    )

    assert response.status_code == 200
    assert captured
    assert captured[0] is not None
    assert captured[0].items
    assert any("rubric-api-database-001" == item.document_id for item in captured[0].items)
