from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.assessment import AssessmentSession
from app.models.evaluation import EvaluationReport
from app.models.marketplace import Invite, SavedCandidate
from app.models.profile import CandidateProfile


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
        "target_role": "Backend Engineer",
        "experience_level": "Student / Early Career",
        "tech_stack": ["FastAPI", "PostgreSQL", "RAG"],
        "skills": ["FastAPI", "API Design", "Vector Search"],
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


def create_company_profile(client: TestClient, token: str) -> dict:
    response = client.put(
        "/profiles/company/me",
        json={
            "company_name": "Acme Talent",
            "recruiter_name": "Riya Recruiter",
            "website": "https://acme.example",
            "industry": "Software",
            "company_size": "51-200",
            "role_title": "Technical Recruiter",
        },
        headers=auth_header(token),
    )
    assert response.status_code == 200
    return response.json()


def create_report(
    db: Session,
    profile_id: str,
    *,
    published: bool = True,
    verified_score: float = 88,
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
        session_plan_metadata={"test": "recruiter_marketplace"},
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
        integrity_score=96,
        verified_score=verified_score,
        recruiter_summary=f"{profile.full_name} is strong for {profile.target_role}.",
        report_json={
            "strengths": ["API design", "Database reasoning"],
            "growth_areas": ["Add more production monitoring evidence."],
            "role_fit": [{"role": profile.target_role, "score": 91, "reason": "Strong role fit."}],
            "question_wise_scores": [{"question_id": "q1", "score": 82, "feedback": "Good reasoning."}],
            "private": "do-not-leak",
        },
        published=published,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


def create_published_candidate(
    client: TestClient,
    db: Session,
    email: str,
    **profile_overrides,
) -> tuple[dict, dict]:
    verified_score = profile_overrides.pop("verified_score", 88)
    user = signup(client, email, "candidate")
    profile = create_candidate_profile(client, user["access_token"], **profile_overrides)
    create_report(db, profile["id"], published=True, verified_score=verified_score)
    return user, profile


def test_recruiter_dashboard_summary_returns_real_counts(client: TestClient, db_session: Session) -> None:
    candidate, profile = create_published_candidate(client, db_session, "summary-candidate@example.com")
    recruiter = signup(client, "summary-recruiter@example.com", "recruiter")
    create_company_profile(client, recruiter["access_token"])
    headers = auth_header(recruiter["access_token"])

    client.post(f"/api/v1/recruiter/shortlist/{profile['id']}", headers=headers)
    client.post(
        "/api/v1/recruiter/invites",
        json={"candidate_id": profile["id"], "proposed_role": "Backend Engineer"},
        headers=headers,
    )

    summary = client.get("/api/v1/recruiter/dashboard/summary", headers=headers)

    assert summary.status_code == 200
    body = summary.json()
    assert body["verified_pool_count"] == 1
    assert body["shortlisted_count"] == 1
    assert body["pending_requests_count"] == 1
    assert body["accepted_requests_count"] == 0
    assert body["recent_activity"]
    assert candidate["user"]["role"] == "candidate"


def test_search_returns_only_published_visible_and_ranks_relevant_skills(
    client: TestClient, db_session: Session
) -> None:
    _, backend = create_published_candidate(client, db_session, "search-backend@example.com")
    create_published_candidate(
        client,
        db_session,
        "search-react@example.com",
        full_name="React Candidate",
        target_role="Frontend Engineer",
        tech_stack=["React", "TypeScript"],
        skills=["React", "Accessibility"],
        verified_score=91,
    )
    hidden_user = signup(client, "hidden-recruiter-search@example.com", "candidate")
    hidden = create_candidate_profile(client, hidden_user["access_token"], profile_visibility=False, full_name="Hidden Candidate")
    create_report(db_session, hidden["id"], published=True)
    unpublished_user = signup(client, "unpublished-recruiter-search@example.com", "candidate")
    unpublished = create_candidate_profile(client, unpublished_user["access_token"], full_name="Unpublished Candidate")
    create_report(db_session, unpublished["id"], published=False)
    recruiter = signup(client, "search-v1-recruiter@example.com", "recruiter")

    response = client.get(
        "/api/v1/recruiter/candidates/search?q=AI ML FastAPI RAG&skills=FastAPI,RAG&sort=match",
        headers=auth_header(recruiter["access_token"]),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["matching_mode"] == "keyword_fallback"
    assert body["total"] == 1
    assert body["items"][0]["candidate_id"] == backend["id"]
    assert body["items"][0]["semantic_match_percent"] > 0
    assert "Hidden Candidate" not in str(body)
    assert "Unpublished Candidate" not in str(body)


def test_recruiter_can_open_published_profile_but_not_unpublished(
    client: TestClient, db_session: Session
) -> None:
    _, profile = create_published_candidate(client, db_session, "profile-open@example.com")
    hidden_user = signup(client, "profile-hidden@example.com", "candidate")
    hidden = create_candidate_profile(client, hidden_user["access_token"], profile_visibility=False)
    create_report(db_session, hidden["id"], published=True)
    recruiter = signup(client, "profile-recruiter@example.com", "recruiter")
    headers = auth_header(recruiter["access_token"])

    opened = client.get(f"/api/v1/recruiter/candidates/{profile['id']}", headers=headers)
    hidden_response = client.get(f"/api/v1/recruiter/candidates/{hidden['id']}", headers=headers)

    assert opened.status_code == 200
    body = opened.json()
    assert body["latest_report"]["overall_score"] == 88
    assert body["latest_report"]["question_feedback_preview"]
    assert "do-not-leak" not in str(body)
    assert hidden_response.status_code == 404


def test_shortlist_is_recruiter_specific_and_duplicate_safe(client: TestClient, db_session: Session) -> None:
    _, profile = create_published_candidate(client, db_session, "shortlist-candidate@example.com")
    recruiter = signup(client, "shortlist-recruiter@example.com", "recruiter")
    other = signup(client, "shortlist-other@example.com", "recruiter")
    headers = auth_header(recruiter["access_token"])

    first = client.post(f"/api/v1/recruiter/shortlist/{profile['id']}", headers=headers)
    second = client.post(f"/api/v1/recruiter/shortlist/{profile['id']}", headers=headers)
    other_list = client.get("/api/v1/recruiter/shortlist", headers=auth_header(other["access_token"]))
    listed = client.get("/api/v1/recruiter/shortlist", headers=headers)

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["is_shortlisted"] is True
    assert db_session.scalars(select(SavedCandidate)).all()
    assert len(db_session.scalars(select(SavedCandidate)).all()) == 1
    assert other_list.json()["items"] == []
    assert listed.json()["total"] == 1
    deleted = client.delete(f"/api/v1/recruiter/shortlist/{profile['id']}", headers=headers)
    assert deleted.status_code == 204
    assert db_session.scalars(select(SavedCandidate)).all() == []


def test_invite_duplicate_active_and_candidate_requests(client: TestClient, db_session: Session) -> None:
    candidate, profile = create_published_candidate(client, db_session, "request-candidate@example.com")
    recruiter = signup(client, "request-recruiter@example.com", "recruiter")
    create_company_profile(client, recruiter["access_token"])
    headers = auth_header(recruiter["access_token"])

    created = client.post(
        "/api/v1/recruiter/invites",
        json={
            "candidate_id": profile["id"],
            "message": "Please interview with us.",
            "proposed_role": "Backend Engineer",
            "interview_mode": "online",
        },
        headers=headers,
    )
    duplicate = client.post(
        "/api/v1/recruiter/invites",
        json={"candidate_id": profile["id"], "proposed_role": "Another Role"},
        headers=headers,
    )
    recruiter_list = client.get("/api/v1/recruiter/invites", headers=headers)
    candidate_list = client.get("/api/v1/candidate/requests", headers=auth_header(candidate["access_token"]))
    candidate_blocked = client.get("/api/v1/recruiter/invites", headers=auth_header(candidate["access_token"]))
    recruiter_blocked = client.get("/api/v1/candidate/requests", headers=headers)

    assert created.status_code == 200
    assert duplicate.status_code == 409
    assert recruiter_list.json()["items"][0]["status"] == "pending"
    assert candidate_list.json()["items"][0]["company"]["company_name"] == "Acme Talent"
    assert candidate_list.json()["items"][0]["role_title"] == "Backend Engineer"
    assert candidate_blocked.status_code == 403
    assert recruiter_blocked.status_code == 403
    assert db_session.scalar(select(Invite)) is not None
