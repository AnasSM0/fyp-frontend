from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.assessment import AssessmentAnswer, AssessmentSession, QuestionBank
from app.models.profile import CandidateProfile
from app.services.assessment_service import build_curated_session_plan, difficulty_plan_for, objective_option_order
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


def seed_objective_questions(db_session: Session, count: int = 6) -> list[str]:
    ids = []
    for index in range(count):
        question_id = f"objective-test-{index}"
        ids.append(question_id)
        db_session.add(
            QuestionBank(
                id=question_id,
                role="full_stack",
                category="technical_fundamentals",
                tech_stack=["APIs", "React", "FastAPI"],
                difficulty="intermediate",
                question_type="mcq",
                question_text=f"Objective test question {index}: which answer is correct?",
                expected_concepts=["objective scoring"],
                scoring_rubric={
                    "mcq": {
                        "correct_option_id": "a",
                        "options": [
                            {"id": "a", "text": "Correct option"},
                            {"id": "b", "text": "Wrong option B"},
                            {"id": "c", "text": "Wrong option C"},
                            {"id": "d", "text": "Wrong option D"},
                        ],
                    }
                },
                time_limit_seconds=120,
                follow_up_templates=[],
            )
        )
    db_session.commit()
    return ids


def add_question(
    db_session: Session,
    question_id: str,
    *,
    category: str,
    question_type: str,
    difficulty: str,
    role: str = "full_stack",
) -> None:
    db_session.add(
        QuestionBank(
            id=question_id,
            role=role,
            category=category,
            tech_stack=["React", "FastAPI", "PostgreSQL"],
            difficulty=difficulty,
            question_type=question_type,
            question_text=f"{question_id}: Explain the {category} {question_type} prompt.",
            expected_concepts=["concept"],
            scoring_rubric={"excellent": "Clear answer."},
            time_limit_seconds=300,
            follow_up_templates=[],
        )
    )


def test_seed_question_bank_and_summary(client: TestClient, db_session: Session) -> None:
    seed_questions(db_session)
    seed_questions(db_session)

    questions = db_session.scalars(select(QuestionBank)).all()
    assert len(questions) == 38

    summary = client.get("/assessments/question-bank/summary")
    assert summary.status_code == 200
    body = summary.json()
    assert body["total_questions"] == 38
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
    assert any(term in selected_text for term in ["React", "Next.js", "TypeScript", "FastAPI"])
    metadata = body["questions"][0]["scoring_rubric"]["selection_metadata"]
    assert {
        "difficulty",
        "question_type",
        "matched_skills",
        "source_question_id",
        "source_rag_document_id",
        "selection_reason",
        "reused_question",
    }.issubset(metadata)
    assert metadata["source_question_id"] == body["questions"][0]["question_bank_id"]
    assert metadata["source_rag_document_id"] is None


def test_mcq_option_order_stable_and_answer_key_hidden(client: TestClient, db_session: Session) -> None:
    seed_objective_questions(db_session)
    candidate = signup(client, "mcq-options@example.com", "candidate")
    create_candidate_profile(client, candidate["access_token"])
    headers = auth_header(candidate["access_token"])

    started = client.post("/assessments/sessions", json={}, headers=headers)
    assert started.status_code == 200
    session_id = started.json()["session"]["id"]
    first_question = started.json()["questions"][0]

    assert first_question["objective_question"] is True
    assert len(first_question["objective_options"]) == 4
    assert all("is_correct" not in option for option in first_question["objective_options"])
    assert "mcq" not in first_question["scoring_rubric"]
    assert "objective" not in first_question["scoring_rubric"]

    refreshed = client.get(f"/assessments/sessions/{session_id}", headers=headers)
    assert refreshed.status_code == 200
    assert refreshed.json()["questions"][0]["objective_options"] == first_question["objective_options"]


def test_mcq_option_order_can_differ_across_sessions() -> None:
    options = [{"id": "a"}, {"id": "b"}, {"id": "c"}, {"id": "d"}]
    first = objective_option_order(options, "session-one", "question-one")
    second = objective_option_order(options, "session-two", "question-one")
    assert first != second


def test_mcq_correct_and_wrong_answers_are_scored(client: TestClient, db_session: Session) -> None:
    seed_objective_questions(db_session)
    candidate = signup(client, "mcq-score@example.com", "candidate")
    create_candidate_profile(client, candidate["access_token"])
    headers = auth_header(candidate["access_token"])

    started = client.post("/assessments/sessions", json={}, headers=headers).json()
    session_id = started["session"]["id"]
    question_id = started["current_question"]["id"]

    correct = client.post(
        f"/assessments/sessions/{session_id}/answers",
        json={
            "assessment_question_id": question_id,
            "selected_option_id": "a",
            "duration_seconds": 20,
            "metadata": {},
        },
        headers=headers,
    )
    assert correct.status_code == 200
    assert correct.json()["answer"]["selected_option_id"] == "a"
    persisted = db_session.scalars(select(AssessmentAnswer)).first()
    assert persisted is not None
    assert persisted.ai_evaluation["objective_result"]["is_correct"] is True
    assert persisted.ai_evaluation["objective_result"]["score"] == 100

    second = client.post("/assessments/sessions", json={"force_new": True}, headers=headers).json()
    wrong_question_id = second["current_question"]["id"]
    wrong = client.post(
        f"/assessments/sessions/{second['session']['id']}/answers",
        json={
            "assessment_question_id": wrong_question_id,
            "selected_option_id": "b",
            "duration_seconds": 20,
            "metadata": {},
        },
        headers=headers,
    )
    assert wrong.status_code == 200
    wrong_answer = db_session.scalars(
        select(AssessmentAnswer).where(AssessmentAnswer.assessment_question_id == wrong_question_id)
    ).first()
    assert wrong_answer is not None
    assert wrong_answer.ai_evaluation["objective_result"]["is_correct"] is False
    assert wrong_answer.ai_evaluation["objective_result"]["score"] == 0


def test_new_session_avoids_previously_answered_questions_when_possible(
    client: TestClient, db_session: Session
) -> None:
    seed_objective_questions(db_session, count=12)
    candidate = signup(client, "no-repeat@example.com", "candidate")
    create_candidate_profile(client, candidate["access_token"])
    headers = auth_header(candidate["access_token"])

    first = client.post("/assessments/sessions", json={}, headers=headers).json()
    first_bank_ids = [question["question_bank_id"] for question in first["questions"]]
    current = first["current_question"]
    while current is not None:
        submit = client.post(
            f"/assessments/sessions/{first['session']['id']}/answers",
            json={
                "assessment_question_id": current["id"],
                "selected_option_id": "a",
                "duration_seconds": 10,
                "metadata": {},
            },
            headers=headers,
        )
        assert submit.status_code == 200
        current = submit.json()["next_question"]

    second = client.post("/assessments/sessions", json={"force_new": True}, headers=headers).json()
    second_bank_ids = [question["question_bank_id"] for question in second["questions"]]

    assert len(first_bank_ids) == len(set(first_bank_ids)) == 6
    assert len(second_bank_ids) == len(set(second_bank_ids)) == 6
    assert set(first_bank_ids).isdisjoint(second_bank_ids)
    assert all(
        not question["scoring_rubric"]["selection_metadata"].get("reused_question")
        for question in second["questions"]
    )


def test_student_profile_uses_entry_difficulty_plan() -> None:
    student = CandidateProfile(experience_level="Student / Early Career")
    fresh = CandidateProfile(experience_level="Fresh graduate")
    junior = CandidateProfile(experience_level="Junior")

    assert difficulty_plan_for(student).count("advanced") == 0
    assert difficulty_plan_for(student).count("beginner") >= 2
    assert difficulty_plan_for(fresh).count("advanced") == 0
    assert difficulty_plan_for(junior).count("advanced") == 1


def test_curated_selection_uses_nearest_difficulty_when_exact_bucket_missing(db_session: Session) -> None:
    for question_id, category, question_type in [
        ("concept-1", "role_specific", "text"),
        ("concept-2", "technical_fundamentals", "text"),
        ("system-1", "system_design", "system_design"),
        ("debug-1", "debugging", "debugging"),
        ("coding-1", "technical_fundamentals", "coding"),
        ("comm-1", "communication", "communication"),
    ]:
        add_question(
            db_session,
            question_id,
            category=category,
            question_type=question_type,
            difficulty="intermediate",
        )
        add_question(
            db_session,
            f"{question_id}-hard",
            category=category,
            question_type=question_type,
            difficulty="advanced",
        )
    db_session.commit()
    profile = CandidateProfile(
        id="nearest-difficulty-profile",
        target_role="Full Stack Developer",
        experience_level="student",
        skills=["React", "FastAPI"],
        tech_stack=["React", "FastAPI"],
    )

    selected, metadata = build_curated_session_plan(db_session, profile, session_seed="nearest-seed")

    assert len(selected) == 6
    assert len({question.id for question in selected}) == 6
    assert all(question.difficulty == "intermediate" for question in selected)
    assert all(item["difficulty"] == "intermediate" for item in metadata["selection_trace"])


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

    foreign = client.post(
        f"/assessments/sessions/{session_id}/answers",
        json={
            "assessment_question_id": "not-from-this-session",
            "answer_text": "This should not be accepted.",
            "duration_seconds": 30,
            "metadata": {},
        },
        headers=headers,
    )
    assert foreign.status_code == 400

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


def test_session_question_list_stays_frozen_after_refresh(
    client: TestClient, db_session: Session
) -> None:
    seed_questions(db_session)
    candidate = signup(client, "stable-refresh@example.com", "candidate")
    create_candidate_profile(client, candidate["access_token"])
    headers = auth_header(candidate["access_token"])

    started = client.post("/assessments/sessions", json={}, headers=headers)
    assert started.status_code == 200
    session_id = started.json()["session"]["id"]
    first_questions = [
        (question["id"], question["order_index"], question["question_text"])
        for question in started.json()["questions"]
    ]

    refreshed = client.get(f"/assessments/sessions/{session_id}", headers=headers)
    current = client.get(f"/assessments/sessions/{session_id}/current-question", headers=headers)

    assert refreshed.status_code == 200
    assert current.status_code == 200
    assert [
        (question["id"], question["order_index"], question["question_text"])
        for question in refreshed.json()["questions"]
    ] == first_questions
    assert current.json()["current_question"]["id"] == first_questions[0][0]


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
