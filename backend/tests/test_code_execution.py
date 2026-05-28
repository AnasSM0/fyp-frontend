from datetime import datetime, timezone
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.assessment import AssessmentQuestion, AssessmentSession, QuestionBank
from app.models.profile import CandidateProfile


def auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def signup(client: TestClient, email: str, role: str = "candidate") -> dict:
    response = client.post(
        "/auth/signup",
        json={"email": email, "password": "password123", "role": role},
    )
    assert response.status_code == 201
    return response.json()


def create_profile(client: TestClient, token: str, name: str) -> CandidateProfile:
    response = client.put(
        "/profiles/candidate/me",
        json={
            "full_name": name,
            "university": "FAST NUCES",
            "degree": "BS Computer Science",
            "graduation_year": 2026,
            "gpa": 3.6,
            "target_role": "Full Stack Developer",
            "experience_level": "Student",
            "tech_stack": ["Python", "FastAPI"],
            "skills": ["Python", "Testing"],
            "profile_complete": True,
        },
        headers=auth_header(token),
    )
    assert response.status_code == 200
    return response.json()


def create_executable_session(
    db: Session,
    candidate_id: str,
    *,
    execution: dict | None = None,
) -> tuple[AssessmentSession, AssessmentQuestion]:
    bank = QuestionBank(
        id=f"exec-bank-{uuid4()}",
        role="full_stack",
        category="coding",
        tech_stack=["Python"],
        difficulty="intermediate",
        question_type="coding",
        question_text="Write solve(nums, target) returning indices of two numbers that add to target.",
        expected_concepts=["hash map", "single pass"],
        scoring_rubric={},
        time_limit_seconds=300,
        follow_up_templates=[],
    )
    db.add(bank)
    db.flush()
    session = AssessmentSession(
        candidate_id=candidate_id,
        status="in_progress",
        target_role="Full Stack Developer",
        experience_level="Student",
        selected_difficulty="intermediate",
        started_at=datetime.now(timezone.utc),
        current_order_index=0,
        total_questions=1,
        session_plan_metadata={"test": "code_execution"},
    )
    db.add(session)
    db.flush()
    question = AssessmentQuestion(
        session_id=session.id,
        question_bank_id=bank.id,
        order_index=0,
        question_text=bank.question_text,
        question_type="coding",
        category="coding",
        difficulty="intermediate",
        time_limit_seconds=300,
        expected_concepts=bank.expected_concepts,
        scoring_rubric={
            "execution": execution
            if execution is not None
            else {
                "execution_supported": True,
                "language": "python",
                "function_name": "solve",
                "starter_code": "def solve(nums, target):\n    pass",
                "test_cases": [
                    {"name": "Basic case", "args": [[2, 7, 11, 15], 9], "expected": [0, 1]},
                    {"name": "Middle pair", "args": [[3, 2, 4], 6], "expected": [1, 2]},
                ],
            }
        },
    )
    db.add(question)
    db.commit()
    db.refresh(session)
    db.refresh(question)
    return session, question


def candidate_with_session(client: TestClient, db: Session, email: str):
    user = signup(client, email)
    profile_payload = create_profile(client, user["access_token"], email)
    profile = db.get(CandidateProfile, profile_payload["id"])
    assert profile is not None
    session, question = create_executable_session(db, profile.id)
    return user, session, question


def test_correct_python_solution_passes_all_tests(client: TestClient, db_session: Session) -> None:
    user, session, question = candidate_with_session(client, db_session, "runner-pass@example.com")
    response = client.post(
        f"/assessments/sessions/{session.id}/questions/{question.id}/run-code",
        json={
            "language": "python",
            "code": "def solve(nums, target):\n    seen = {}\n    for i, n in enumerate(nums):\n        if target - n in seen:\n            return [seen[target - n], i]\n        seen[n] = i",
        },
        headers=auth_header(user["access_token"]),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "passed"
    assert body["passed_count"] == body["total_count"] == 2


def test_wrong_solution_fails_specific_tests(client: TestClient, db_session: Session) -> None:
    user, session, question = candidate_with_session(client, db_session, "runner-fail@example.com")
    response = client.post(
        f"/assessments/sessions/{session.id}/questions/{question.id}/run-code",
        json={"language": "python", "code": "def solve(nums, target):\n    return [0, 0]"},
        headers=auth_header(user["access_token"]),
    )
    body = response.json()
    assert response.status_code == 200
    assert body["status"] == "failed"
    assert body["failed_count"] > 0
    assert body["test_results"][0]["expected_output"]


def test_syntax_and_runtime_errors_are_reported(client: TestClient, db_session: Session) -> None:
    user, session, question = candidate_with_session(client, db_session, "runner-error@example.com")
    syntax = client.post(
        f"/assessments/sessions/{session.id}/questions/{question.id}/run-code",
        json={"language": "python", "code": "def solve(nums, target):\n    return ["},
        headers=auth_header(user["access_token"]),
    )
    assert syntax.status_code == 200
    assert syntax.json()["status"] == "error"

    runtime = client.post(
        f"/assessments/sessions/{session.id}/questions/{question.id}/run-code",
        json={"language": "python", "code": "def solve(nums, target):\n    raise RuntimeError('boom')"},
        headers=auth_header(user["access_token"]),
    )
    assert runtime.status_code == 200
    assert runtime.json()["status"] == "failed"
    assert runtime.json()["test_results"][0]["error"]


def test_infinite_loop_times_out(client: TestClient, db_session: Session) -> None:
    user, session, question = candidate_with_session(client, db_session, "runner-timeout@example.com")
    response = client.post(
        f"/assessments/sessions/{session.id}/questions/{question.id}/run-code",
        json={"language": "python", "code": "def solve(nums, target):\n    while True:\n        pass"},
        headers=auth_header(user["access_token"]),
    )
    assert response.status_code == 200
    assert response.json()["status"] == "timeout"


def test_dangerous_import_is_rejected(client: TestClient, db_session: Session) -> None:
    user, session, question = candidate_with_session(client, db_session, "runner-reject@example.com")
    response = client.post(
        f"/assessments/sessions/{session.id}/questions/{question.id}/run-code",
        json={"language": "python", "code": "import os\n\ndef solve(nums, target):\n    return []"},
        headers=auth_header(user["access_token"]),
    )
    assert response.status_code == 200
    assert response.json()["status"] == "rejected"


def test_non_owner_cannot_run_code(client: TestClient, db_session: Session) -> None:
    owner, session, question = candidate_with_session(client, db_session, "runner-owner@example.com")
    other = signup(client, "runner-other@example.com")
    create_profile(client, other["access_token"], "Other Candidate")
    assert owner["access_token"] != other["access_token"]
    response = client.post(
        f"/assessments/sessions/{session.id}/questions/{question.id}/run-code",
        json={"language": "python", "code": "def solve(nums, target):\n    return []"},
        headers=auth_header(other["access_token"]),
    )
    assert response.status_code in {403, 404}


def test_non_executable_and_missing_tests_rejected(client: TestClient, db_session: Session) -> None:
    user = signup(client, "runner-non-exec@example.com")
    profile_payload = create_profile(client, user["access_token"], "Non Exec")
    profile = db_session.get(CandidateProfile, profile_payload["id"])
    assert profile is not None

    session, question = create_executable_session(
        db_session,
        profile.id,
        execution={"execution_supported": False, "execution_reason": "evaluated_by_rubric"},
    )
    response = client.post(
        f"/assessments/sessions/{session.id}/questions/{question.id}/run-code",
        json={"language": "python", "code": "def solve(nums, target):\n    return []"},
        headers=auth_header(user["access_token"]),
    )
    assert response.status_code == 409

    session2, question2 = create_executable_session(
        db_session,
        profile.id,
        execution={
            "execution_supported": True,
            "language": "python",
            "function_name": "solve",
            "starter_code": "def solve(nums, target):\n    pass",
            "test_cases": [],
        },
    )
    response2 = client.post(
        f"/assessments/sessions/{session2.id}/questions/{question2.id}/run-code",
        json={"language": "python", "code": "def solve(nums, target):\n    return []"},
        headers=auth_header(user["access_token"]),
    )
    assert response2.status_code == 409


def test_question_response_hides_private_test_cases(client: TestClient, db_session: Session) -> None:
    user, session, _ = candidate_with_session(client, db_session, "runner-hidden@example.com")
    response = client.get(f"/assessments/sessions/{session.id}", headers=auth_header(user["access_token"]))
    assert response.status_code == 200
    question = response.json()["current_question"]
    assert question["execution_supported"] is True
    assert question["language"] == "python"
    assert "test_cases" not in question["scoring_rubric"]
    assert "execution" not in question["scoring_rubric"]
