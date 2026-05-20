import json

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.assessment import AssessmentSession
from app.models.evaluation import EvaluationReport
from app.models.marketplace import ActivityEvent, Invite, SavedCandidate
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
        session_plan_metadata={"test": "marketplace"},
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
        integrity_score=100,
        verified_score=verified_score,
        recruiter_summary=f"{profile.full_name} is a strong verified candidate.",
        report_json={"private": "do-not-leak", "role_fit": [{"role": profile.target_role, "score": 87}]},
        published=published,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


def create_discoverable_candidate(
    client: TestClient,
    db: Session,
    email: str = "market-candidate@example.com",
    **profile_overrides,
) -> tuple[dict, dict]:
    user = signup(client, email, "candidate")
    profile = create_candidate_profile(client, user["access_token"], **profile_overrides)
    create_report(db, profile["id"], published=True)
    return user, profile


def invite_payload(candidate_id: str, role_title: str = "Frontend Engineer") -> dict:
    return {
        "candidate_id": candidate_id,
        "role_title": role_title,
        "message": "We want to interview you based on verified assessment results.",
        "salary_range": "PKR 180k-250k",
        "opportunity_type": "internship-to-full-time",
        "interview_window": "Next week",
        "note": "Bring project walkthrough.",
    }


def test_recruiter_save_list_status_delete_and_duplicate_idempotent(
    client: TestClient, db_session: Session
) -> None:
    _, profile = create_discoverable_candidate(client, db_session)
    recruiter = signup(client, "save-recruiter@example.com", "recruiter")
    headers = auth_header(recruiter["access_token"])

    first = client.post(f"/saved-candidates/{profile['id']}", headers=headers)
    second = client.post(f"/saved-candidates/{profile['id']}", headers=headers)
    status_response = client.get(f"/saved-candidates/{profile['id']}/status", headers=headers)
    listed = client.get("/saved-candidates", headers=headers)
    deleted = client.delete(f"/saved-candidates/{profile['id']}", headers=headers)
    deleted_again = client.delete(f"/saved-candidates/{profile['id']}", headers=headers)

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["id"] == second.json()["id"]
    assert status_response.json()["saved"] is True
    assert listed.json()["items"][0]["candidate"]["verified_score"] == 88
    assert "report_json" not in json.dumps(listed.json())
    assert deleted.status_code == 204
    assert deleted_again.status_code == 204
    assert db_session.scalars(select(SavedCandidate)).all() == []


def test_save_blocks_unpublished_invisible_and_candidate_role(
    client: TestClient, db_session: Session
) -> None:
    hidden_user = signup(client, "hidden-save@example.com", "candidate")
    hidden_profile = create_candidate_profile(
        client,
        hidden_user["access_token"],
        profile_visibility=False,
    )
    create_report(db_session, hidden_profile["id"], published=True)
    unpublished_user = signup(client, "unpublished-save@example.com", "candidate")
    unpublished_profile = create_candidate_profile(client, unpublished_user["access_token"])
    create_report(db_session, unpublished_profile["id"], published=False)
    recruiter = signup(client, "save-block-recruiter@example.com", "recruiter")

    hidden = client.post(
        f"/saved-candidates/{hidden_profile['id']}",
        headers=auth_header(recruiter["access_token"]),
    )
    unpublished = client.post(
        f"/saved-candidates/{unpublished_profile['id']}",
        headers=auth_header(recruiter["access_token"]),
    )
    candidate_blocked = client.post(
        f"/saved-candidates/{unpublished_profile['id']}",
        headers=auth_header(unpublished_user["access_token"]),
    )

    assert hidden.status_code == 404
    assert unpublished.status_code == 404
    assert candidate_blocked.status_code == 403


def test_recruiter_invite_duplicate_normalized_and_candidate_inbox(
    client: TestClient, db_session: Session
) -> None:
    candidate, profile = create_discoverable_candidate(client, db_session, "invite-candidate@example.com")
    recruiter = signup(client, "invite-recruiter@example.com", "recruiter")
    create_company_profile(client, recruiter["access_token"])
    headers = auth_header(recruiter["access_token"])

    created = client.post("/invites", json=invite_payload(profile["id"], " Frontend Engineer "), headers=headers)
    duplicate = client.post("/invites", json=invite_payload(profile["id"], "frontend engineer"), headers=headers)
    recruiter_list = client.get("/invites/recruiter", headers=headers)
    candidate_list = client.get("/invites/candidate", headers=auth_header(candidate["access_token"]))
    candidate_detail = client.get(
        f"/invites/candidate/{created.json()['id']}",
        headers=auth_header(candidate["access_token"]),
    )

    assert created.status_code == 200
    assert created.json()["role_title"] == "Frontend Engineer"
    assert duplicate.status_code == 409
    assert recruiter_list.json()["items"][0]["status"] == "pending"
    assert candidate_list.json()["items"][0]["company"]["company_name"] == "Acme Talent"
    assert candidate_detail.status_code == 200
    assert "do-not-leak" not in json.dumps(created.json())


def test_invite_blocks_unpublished_invisible_and_recruiter_withdraw_rules(
    client: TestClient, db_session: Session
) -> None:
    hidden_user = signup(client, "hidden-invite@example.com", "candidate")
    hidden_profile = create_candidate_profile(client, hidden_user["access_token"], profile_visibility=False)
    create_report(db_session, hidden_profile["id"], published=True)
    candidate, profile = create_discoverable_candidate(client, db_session, "withdraw-candidate@example.com")
    recruiter = signup(client, "withdraw-recruiter@example.com", "recruiter")
    headers = auth_header(recruiter["access_token"])

    hidden = client.post("/invites", json=invite_payload(hidden_profile["id"]), headers=headers)
    created = client.post("/invites", json=invite_payload(profile["id"]), headers=headers)
    accepted = client.patch(
        f"/invites/{created.json()['id']}/respond",
        json={"status": "accepted", "response_message": "Interested."},
        headers=auth_header(candidate["access_token"]),
    )
    withdraw_accepted = client.patch(f"/invites/{created.json()['id']}/withdraw", headers=headers)
    second = client.post("/invites", json=invite_payload(profile["id"], "Backend Engineer"), headers=headers)
    withdrawn = client.patch(f"/invites/{second.json()['id']}/withdraw", headers=headers)

    assert hidden.status_code == 404
    assert accepted.status_code == 200
    assert withdraw_accepted.status_code == 409
    assert withdrawn.status_code == 200
    assert withdrawn.json()["status"] == "withdrawn"


def test_candidate_decline_access_control_and_recruiter_tracker_updates(
    client: TestClient, db_session: Session
) -> None:
    owner, profile = create_discoverable_candidate(client, db_session, "owner-invite@example.com")
    other, _ = create_discoverable_candidate(client, db_session, "other-invite@example.com")
    recruiter = signup(client, "tracker-recruiter@example.com", "recruiter")
    created = client.post(
        "/invites",
        json=invite_payload(profile["id"], "Product Engineer"),
        headers=auth_header(recruiter["access_token"]),
    )
    invite_id = created.json()["id"]

    other_blocked = client.patch(
        f"/invites/{invite_id}/respond",
        json={"status": "declined", "response_message": "Wrong candidate."},
        headers=auth_header(other["access_token"]),
    )
    recruiter_blocked = client.patch(
        f"/invites/{invite_id}/respond",
        json={"status": "accepted"},
        headers=auth_header(recruiter["access_token"]),
    )
    declined = client.patch(
        f"/invites/{invite_id}/respond",
        json={"status": "declined", "response_message": "Not available."},
        headers=auth_header(owner["access_token"]),
    )
    tracker_detail = client.get(
        f"/invites/recruiter/{invite_id}",
        headers=auth_header(recruiter["access_token"]),
    )
    second_response = client.patch(
        f"/invites/{invite_id}/respond",
        json={"status": "accepted"},
        headers=auth_header(owner["access_token"]),
    )

    assert other_blocked.status_code == 404
    assert recruiter_blocked.status_code == 403
    assert declined.status_code == 200
    assert tracker_detail.json()["status"] == "declined"
    assert tracker_detail.json()["response_message"] == "Not available."
    assert second_response.status_code == 409


def test_activity_events_scoped_to_current_user(client: TestClient, db_session: Session) -> None:
    candidate, profile = create_discoverable_candidate(client, db_session, "activity-candidate@example.com")
    recruiter = signup(client, "activity-recruiter@example.com", "recruiter")
    other_recruiter = signup(client, "activity-other@example.com", "recruiter")
    recruiter_headers = auth_header(recruiter["access_token"])

    client.post(f"/saved-candidates/{profile['id']}", headers=recruiter_headers)
    created = client.post("/invites", json=invite_payload(profile["id"]), headers=recruiter_headers)
    client.patch(
        f"/invites/{created.json()['id']}/respond",
        json={"status": "accepted", "response_message": "Let's talk."},
        headers=auth_header(candidate["access_token"]),
    )

    recruiter_feed = client.get("/activity/me", headers=recruiter_headers)
    candidate_feed = client.get("/activity/me", headers=auth_header(candidate["access_token"]))
    other_feed = client.get("/activity/me", headers=auth_header(other_recruiter["access_token"]))
    event_types = {event.event_type for event in db_session.scalars(select(ActivityEvent)).all()}

    assert recruiter_feed.status_code == 200
    assert candidate_feed.status_code == 200
    assert other_feed.status_code == 200
    assert other_feed.json()["items"] == []
    assert {"candidate_saved", "invite_sent", "invite_accepted"}.issubset(event_types)
    assert all(item["entity_type"] in {"candidate", "invite"} for item in recruiter_feed.json()["items"])
    assert any(item["event_type"] == "invite_sent" for item in candidate_feed.json()["items"])
    assert db_session.scalar(select(Invite)) is not None
