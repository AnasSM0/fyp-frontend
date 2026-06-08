from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.assessment import AssessmentAnswer, AssessmentSession, QuestionBank
from app.services.question_bank_seed import seed_question_bank


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
        "target_role": "Full Stack Developer",
        "experience_level": "Student / Early Career",
        "tech_stack": ["React", "Next.js", "TypeScript", "FastAPI"],
        "skills": ["React", "TypeScript", "System Design", "Python"],
        "portfolio_url": "https://alex.example",
        "linkedin_url": "https://linkedin.example/alex",
        "resume_url": "https://resume.example/alex.pdf",
        "profile_visibility": False,
        "availability_status": "open",
        "profile_complete": True,
    }
    payload.update(overrides)
    response = client.put("/profiles/candidate/me", json=payload, headers=auth_header(token))
    assert response.status_code == 200
    return response.json()


def seed_questions(db_session: Session) -> None:
    seed_question_bank(db_session)


def test_seed_question_bank_and_summary(client: TestClient, db_session: Session) -> None:
    seed_questions(db_session)
    seed_questions(db_session)

    questions = db_session.scalars(select(QuestionBank)).all()
    assert len(questions) == 35

    summary = client.get("/assessments/question-bank/summary")
    assert summary.status_code == 200
    body = summary.json()
    assert body["total_questions"] == 35
    assert body["count_by_role"]["frontend"] == 6
    assert body["count_by_role"]["backend"] == 6
    assert body["count_by_role"]["full_stack"] == 6
    assert body["count_by_difficulty"]["intermediate"] >= 10
    assert body["count_by_category"]["debugging"] >= 3


def test_candidate_can_start_profile_aware_session(client: TestClient, db_session: Session) -> None:
    seed_questions(db_session)
    candidate = signup(client, "assessment-candidate@example.com", "candidate")
    create_candidate_profile(client, candidate["access_token"])

    response = client.post(
        "/assessments/sessions",
        json={},
        headers=auth_header(candidate["access_token"]),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["session"]["status"] == "in_progress"
    assert body["session"]["total_questions"] == 6
    assert body["session"]["target_role"] == "Full Stack Developer"
    assert body["session"]["session_plan_metadata"]["normalized_role"] == "full_stack"
    assert body["current_question"] is not None
    assert len(body["questions"]) == 6
    selected_text = " ".join(question["question_text"] for question in body["questions"])
    assert "React" in selected_text or "Next.js" in selected_text


def test_recruiter_cannot_start_session(client: TestClient, db_session: Session) -> None:
    seed_questions(db_session)
    recruiter = signup(client, "assessment-recruiter@example.com", "recruiter")
    response = client.post(
        "/assessments/sessions",
        json={},
        headers=auth_header(recruiter["access_token"]),
    )
    assert response.status_code == 403


def test_missing_and_incomplete_profile_handled(client: TestClient, db_session: Session) -> None:
    seed_questions(db_session)
    missing_profile_candidate = signup(client, "missing-profile@example.com", "candidate")
    missing = client.post(
        "/assessments/sessions",
        json={},
        headers=auth_header(missing_profile_candidate["access_token"]),
    )
    assert missing.status_code == 404

    incomplete_candidate = signup(client, "incomplete-profile@example.com", "candidate")
    create_candidate_profile(
        client,
        incomplete_candidate["access_token"],
        profile_complete=False,
        target_role=None,
        tech_stack=[],
        skills=[],
    )
    incomplete = client.post(
        "/assessments/sessions",
        json={},
        headers=auth_header(incomplete_candidate["access_token"]),
    )
    assert incomplete.status_code == 409


def test_current_question_and_answer_submission_progression(
    client: TestClient, db_session: Session
) -> None:
    seed_questions(db_session)
    candidate = signup(client, "answer-flow@example.com", "candidate")
    create_candidate_profile(client, candidate["access_token"])
    headers = auth_header(candidate["access_token"])
    session = client.post("/assessments/sessions", json={}, headers=headers).json()
    session_id = session["session"]["id"]
    first_question_id = session["current_question"]["id"]

    current = client.get(f"/assessments/sessions/{session_id}/current-question", headers=headers)
    assert current.status_code == 200
    assert current.json()["current_question"]["id"] == first_question_id

    answer_payload = {
        "assessment_question_id": first_question_id,
        "answer_text": "I would start by clarifying requirements and then propose component boundaries.",
        "code_text": "type Candidate = { id: string; skills: string[] }",
        "duration_seconds": 180,
        "metadata": {"source": "pytest"},
    }
    submitted = client.post(
        f"/assessments/sessions/{session_id}/answers",
        json=answer_payload,
        headers=headers,
    )
    assert submitted.status_code == 200
    body = submitted.json()
    assert body["answer"]["code_text"].startswith("type Candidate")
    assert body["answer"]["metadata"] == {"source": "pytest"}
    assert body["progress"]["answered"] == 1
    assert body["next_question"]["id"] != first_question_id

    persisted = db_session.scalars(select(AssessmentAnswer)).all()
    assert len(persisted) == 1
    assert persisted[0].duration_seconds == 180


def test_duplicate_and_wrong_question_submission_rejected(
    client: TestClient, db_session: Session
) -> None:
    seed_questions(db_session)
    candidate = signup(client, "wrong-question@example.com", "candidate")
    create_candidate_profile(client, candidate["access_token"])
    headers = auth_header(candidate["access_token"])
    session = client.post("/assessments/sessions", json={}, headers=headers).json()
    session_id = session["session"]["id"]
    first_question_id = session["questions"][0]["id"]
    second_question_id = session["questions"][1]["id"]

    wrong = client.post(
        f"/assessments/sessions/{session_id}/answers",
        json={
            "assessment_question_id": second_question_id,
            "answer_text": "Answering out of order.",
            "duration_seconds": 30,
            "metadata": {},
        },
        headers=headers,
    )
    assert wrong.status_code == 409

    valid_payload = {
        "assessment_question_id": first_question_id,
        "answer_text": "First answer.",
        "duration_seconds": 30,
        "metadata": {},
    }
    valid = client.post(
        f"/assessments/sessions/{session_id}/answers", json=valid_payload, headers=headers
    )
    duplicate = client.post(
        f"/assessments/sessions/{session_id}/answers", json=valid_payload, headers=headers
    )
    assert valid.status_code == 200
    assert duplicate.status_code == 409


def test_finish_session_and_block_late_answers(client: TestClient, db_session: Session) -> None:
    seed_questions(db_session)
    candidate = signup(client, "finish-session@example.com", "candidate")
    create_candidate_profile(client, candidate["access_token"])
    headers = auth_header(candidate["access_token"])
    session = client.post("/assessments/sessions", json={}, headers=headers).json()
    session_id = session["session"]["id"]
    first_question_id = session["current_question"]["id"]

    empty_finish = client.post(f"/assessments/sessions/{session_id}/finish", json={}, headers=headers)
    assert empty_finish.status_code == 409

    client.post(
        f"/assessments/sessions/{session_id}/answers",
        json={
            "assessment_question_id": first_question_id,
            "answer_text": "Enough to finish for Phase 2.",
            "duration_seconds": 90,
            "metadata": {},
        },
        headers=headers,
    )
    finished = client.post(f"/assessments/sessions/{session_id}/finish", json={}, headers=headers)
    assert finished.status_code == 200
    assert finished.json()["session"]["status"] == "completed"

    session_row = db_session.get(AssessmentSession, session_id)
    assert session_row is not None
    assert session_row.status == "completed"

    next_question = finished.json()["questions"][1]["id"]
    late_answer = client.post(
        f"/assessments/sessions/{session_id}/answers",
        json={
            "assessment_question_id": next_question,
            "answer_text": "Late answer.",
            "duration_seconds": 20,
            "metadata": {},
        },
        headers=headers,
    )
    assert late_answer.status_code == 409


def test_latest_session_and_force_new_abandons_previous(
    client: TestClient, db_session: Session
) -> None:
    seed_questions(db_session)
    candidate = signup(client, "latest-session@example.com", "candidate")
    create_candidate_profile(client, candidate["access_token"])
    headers = auth_header(candidate["access_token"])

    first = client.post("/assessments/sessions", json={}, headers=headers).json()
    latest = client.get("/assessments/sessions/me/latest", headers=headers)
    assert latest.status_code == 200
    assert latest.json()["session"]["id"] == first["session"]["id"]

    reused = client.post("/assessments/sessions", json={}, headers=headers).json()
    assert reused["session"]["id"] == first["session"]["id"]

    second = client.post(
        "/assessments/sessions", json={"force_new": True}, headers=headers
    ).json()
    assert second["session"]["id"] != first["session"]["id"]
    old_session = db_session.get(AssessmentSession, first["session"]["id"])
    assert old_session is not None
    assert old_session.status == "abandoned"


def test_candidate_cannot_access_other_candidate_session(
    client: TestClient, db_session: Session
) -> None:
    seed_questions(db_session)
    owner = signup(client, "owner@example.com", "candidate")
    intruder = signup(client, "intruder@example.com", "candidate")
    create_candidate_profile(client, owner["access_token"])
    create_candidate_profile(client, intruder["access_token"])

    owner_session = client.post(
        "/assessments/sessions", json={}, headers=auth_header(owner["access_token"])
    ).json()
    response = client.get(
        f"/assessments/sessions/{owner_session['session']['id']}",
        headers=auth_header(intruder["access_token"]),
    )
    assert response.status_code == 404
