from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.assessment import AssessmentSession
from app.models.evaluation import EvaluationReport
from app.models.profile import CandidateProfile
from app.models.semantic import CandidateEmbedding, RecruiterSearch
from app.services.candidate_embedding_service import build_embedding_text, rebuild_candidate_embedding
from app.services.candidate_search_service import final_match_score
from app.services.embedding_provider import FallbackEmbeddingProvider
from app.services.search_demo_seed import seed_search_demo_data


def auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def signup(client: TestClient, email: str, role: str) -> dict:
    response = client.post(
        "/auth/signup",
        json={"email": email, "password": "password123", "role": role},
    )
    assert response.status_code == 201
    return response.json()


def create_candidate_profile(client: TestClient, token: str, **overrides) -> dict:
    payload = {
        "full_name": "Alex Chen",
        "university": "FAST NUCES",
        "degree": "BS Computer Science",
        "graduation_year": 2026,
        "gpa": 3.7,
        "target_role": "Frontend Engineer",
        "experience_level": "Student / Early Career",
        "tech_stack": ["React", "Next.js", "TypeScript"],
        "skills": ["React", "TypeScript", "Accessibility"],
        "portfolio_url": "https://alex.example",
        "linkedin_url": "https://linkedin.example/alex",
        "resume_url": "https://resume.example/alex.pdf",
        "profile_visibility": True,
        "availability_status": "open",
        "profile_complete": True,
    }
    payload.update(overrides)
    response = client.put("/profiles/candidate/me", json=payload, headers=auth_header(token))
    assert response.status_code == 200
    return response.json()


def create_report(
    db: Session,
    profile_id: str,
    *,
    published: bool = True,
    verified_score: float = 88,
    risk_level: str = "clean",
) -> EvaluationReport:
    profile = db.get(CandidateProfile, profile_id)
    assert profile is not None
    session = AssessmentSession(
        candidate_id=profile.id,
        status="completed",
        target_role=profile.target_role,
        experience_level=profile.experience_level,
        selected_difficulty="intermediate",
        current_order_index=1,
        total_questions=1,
        session_plan_metadata={"test": True},
    )
    db.add(session)
    db.flush()
    report = EvaluationReport(
        session_id=session.id,
        candidate_id=profile.id,
        ai_test_score=84,
        technical_score=84,
        communication_score=86,
        problem_solving_score=83,
        system_design_score=82,
        code_quality_score=80,
        project_quality_score=79,
        academic_score=90,
        integrity_score=100 if risk_level == "clean" else 72,
        verified_score=verified_score,
        recruiter_summary=f"{profile.full_name} is strong for {profile.target_role}.",
        report_json={
            "strengths": profile.skills[:2],
            "weaknesses": ["Needs more deployment evidence."],
            "role_fit": [{"role": profile.target_role, "score": 87, "reason": "Strong fit."}],
            "integrity_summary": {
                "risk_level": risk_level,
                "integrity_score": 100 if risk_level == "clean" else 72,
                "summary": "Test integrity summary.",
            },
            "project_quality": {"summary": "Project metadata supports target role."},
        },
        published=published,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


def stub_provider() -> FallbackEmbeddingProvider:
    return FallbackEmbeddingProvider(None, 64)


def create_searchable_candidate(
    client: TestClient,
    db: Session,
    email: str,
    **profile_overrides,
) -> tuple[dict, CandidateProfile, EvaluationReport]:
    verified_score = profile_overrides.pop("verified_score", 88)
    candidate = signup(client, email, "candidate")
    profile = create_candidate_profile(client, candidate["access_token"], **profile_overrides)
    profile_row = db.get(CandidateProfile, profile["id"])
    assert profile_row is not None
    report = create_report(db, profile_row.id, verified_score=verified_score)
    rebuild_candidate_embedding(db, profile_row, report=report, provider=stub_provider())
    return candidate, profile_row, report


def test_stub_embedding_and_embedding_text(client: TestClient, db_session: Session) -> None:
    _, profile, report = create_searchable_candidate(client, db_session, "semantic-text@example.com")
    text = build_embedding_text(profile, report)
    assert "React" in text
    assert "Verified score" in text
    embedding = db_session.scalar(select(CandidateEmbedding).where(CandidateEmbedding.candidate_id == profile.id))
    assert embedding is not None
    assert embedding.embedding_provider == "stub"
    assert embedding.embedding_dimensions == 64


def test_candidate_rebuild_status_and_visibility_gate(client: TestClient, db_session: Session) -> None:
    candidate = signup(client, "rebuild@example.com", "candidate")
    profile = create_candidate_profile(
        client,
        candidate["access_token"],
        profile_visibility=False,
    )
    create_report(db_session, profile["id"], published=True)
    headers = auth_header(candidate["access_token"])

    blocked = client.post("/embeddings/candidates/me/rebuild", headers=headers)
    assert blocked.status_code == 409

    profile_row = db_session.get(CandidateProfile, profile["id"])
    assert profile_row is not None
    profile_row.profile_visibility = True
    db_session.commit()

    rebuilt = client.post("/embeddings/candidates/me/rebuild", headers=headers)
    status = client.get("/embeddings/candidates/me/status", headers=headers)
    assert rebuilt.status_code == 200
    assert rebuilt.json()["provider_metadata"]["provider"] == "stub"
    assert status.status_code == 200
    assert status.json()["has_embedding"] is True


def test_unpublished_invisible_and_missing_embedding_excluded(
    client: TestClient, db_session: Session
) -> None:
    create_searchable_candidate(client, db_session, "visible-search@example.com")
    hidden_user = signup(client, "hidden-search@example.com", "candidate")
    hidden_profile = create_candidate_profile(
        client,
        hidden_user["access_token"],
        full_name="Hidden Candidate",
        profile_visibility=False,
    )
    create_report(db_session, hidden_profile["id"], published=True)
    unpublished_user = signup(client, "unpublished-search@example.com", "candidate")
    unpublished_profile = create_candidate_profile(client, unpublished_user["access_token"])
    create_report(db_session, unpublished_profile["id"], published=False)
    no_embedding_user = signup(client, "no-embedding-search@example.com", "candidate")
    no_embedding_profile = create_candidate_profile(client, no_embedding_user["access_token"])
    create_report(db_session, no_embedding_profile["id"], published=True)

    recruiter = signup(client, "semantic-recruiter@example.com", "recruiter")
    response = client.post(
        "/search/candidates",
        json={"query": "React TypeScript frontend engineer", "limit": 10},
        headers=auth_header(recruiter["access_token"]),
    )
    assert response.status_code == 200
    names = [item["profile"]["full_name"] for item in response.json()["results"]]
    assert "Alex Chen" in names
    assert "Hidden Candidate" not in names
    assert len(names) == 1


def test_recruiter_search_filters_history_and_candidate_blocked(
    client: TestClient, db_session: Session
) -> None:
    create_searchable_candidate(client, db_session, "react-filter@example.com")
    create_searchable_candidate(
        client,
        db_session,
        "backend-filter@example.com",
        full_name="Backend Candidate",
        target_role="Backend Engineer",
        tech_stack=["FastAPI", "PostgreSQL"],
        skills=["FastAPI", "PostgreSQL", "API Design"],
        verified_score=80,
    )
    recruiter = signup(client, "filter-recruiter@example.com", "recruiter")
    candidate = signup(client, "blocked-search-candidate@example.com", "candidate")
    blocked = client.post(
        "/search/candidates",
        json={"query": "React engineer"},
        headers=auth_header(candidate["access_token"]),
    )
    response = client.post(
        "/search/candidates",
        json={
            "query": "React TypeScript frontend engineer",
            "filters": {"skills": ["React"], "minimum_verified_score": 85},
            "limit": 5,
        },
        headers=auth_header(recruiter["access_token"]),
    )
    history = client.get("/search/history", headers=auth_header(recruiter["access_token"]))

    assert blocked.status_code == 403
    assert response.status_code == 200
    body = response.json()
    assert body["result_count"] == 1
    assert body["results"][0]["matched_skills"]
    assert "Verified score" in body["results"][0]["match_explanation"] or "verified score" in body["results"][0]["match_explanation"]
    assert history.status_code == 200
    assert history.json()[0]["query"] == "React TypeScript frontend engineer"
    assert db_session.scalar(select(RecruiterSearch)) is not None


def test_text_fallback_and_score_formula(client: TestClient, db_session: Session) -> None:
    _, profile, report = create_searchable_candidate(client, db_session, "fallback-search@example.com")
    embedding = db_session.scalar(select(CandidateEmbedding).where(CandidateEmbedding.candidate_id == profile.id))
    assert embedding is not None
    embedding.embedding_dimensions = 32
    embedding.embedding_json = [0.1 for _ in range(32)]
    db_session.commit()
    recruiter = signup(client, "fallback-recruiter@example.com", "recruiter")
    response = client.post(
        "/search/candidates",
        json={"query": "React frontend accessibility", "limit": 5},
        headers=auth_header(recruiter["access_token"]),
    )
    assert response.status_code == 200
    assert response.json()["fallback_mode_used"] is True
    assert response.json()["results"][0]["candidate_id"] == profile.id
    clean = final_match_score(80, 90, 90, 100, "clean")
    high_risk = final_match_score(80, 90, 90, 100, "high")
    lower_verified = final_match_score(80, 60, 90, 100, "clean")
    assert clean > high_risk
    assert clean > lower_verified


def test_publish_report_sets_visibility_and_embedding(
    client: TestClient, db_session: Session, monkeypatch
) -> None:
    monkeypatch.setattr(
        "app.services.candidate_embedding_service.build_embedding_provider",
        lambda: stub_provider(),
    )
    candidate = signup(client, "publish-embedding@example.com", "candidate")
    profile = create_candidate_profile(
        client,
        candidate["access_token"],
        profile_visibility=False,
    )
    report = create_report(db_session, profile["id"], published=False)
    response = client.post(
        f"/evaluations/reports/{report.id}/publish",
        headers=auth_header(candidate["access_token"]),
    )
    profile_row = db_session.get(CandidateProfile, profile["id"])
    embedding = db_session.scalar(select(CandidateEmbedding).where(CandidateEmbedding.candidate_id == profile["id"]))
    assert response.status_code == 200
    assert response.json()["report"]["published"] is True
    assert profile_row is not None
    assert profile_row.profile_visibility is True
    assert embedding is not None


def test_search_demo_seed_is_idempotent_and_searchable(client: TestClient, db_session: Session) -> None:
    seed_search_demo_data(db_session)
    seed_search_demo_data(db_session)
    embeddings = db_session.scalars(select(CandidateEmbedding)).all()
    assert len(embeddings) == 5
    recruiter = signup(client, "seed-search-recruiter@example.com", "recruiter")
    response = client.post(
        "/search/candidates",
        json={"query": "FastAPI PostgreSQL backend APIs", "limit": 5},
        headers=auth_header(recruiter["access_token"]),
    )
    assert response.status_code == 200
    assert response.json()["result_count"] >= 1
