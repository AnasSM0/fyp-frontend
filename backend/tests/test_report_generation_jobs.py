from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.routes import assessments as assessment_routes
from app.models.assessment import AssessmentAnswer, AssessmentQuestion, AssessmentSession
from app.models.evaluation import EvaluationReport
from app.services.assessment_service import generate_report_for_session_job
from app.services.question_bank_seed import seed_question_bank


def auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def signup(client: TestClient, email: str) -> dict:
    response = client.post(
        "/auth/signup",
        json={"email": email, "password": "password123", "role": "candidate"},
    )
    assert response.status_code == 201
    return response.json()


def create_candidate_profile(client: TestClient, token: str) -> None:
    response = client.put(
        "/profiles/candidate/me",
        json={
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
        },
        headers=auth_header(token),
    )
    assert response.status_code == 200


def make_answered_session(client: TestClient, db_session: Session, email: str) -> tuple[dict, str]:
    seed_question_bank(db_session)
    candidate = signup(client, email)
    create_candidate_profile(client, candidate["access_token"])
    headers = auth_header(candidate["access_token"])
    session = client.post("/assessments/sessions", json={}, headers=headers).json()
    session_id = session["session"]["id"]
    current = session["current_question"]
    while current is not None:
        response = client.post(
            f"/assessments/sessions/{session_id}/answers",
            json={
                "assessment_question_id": current["id"],
                "answer_text": (
                    "I would define requirements, explain tradeoffs, cover edge cases, "
                    "and verify the implementation against the expected behavior."
                ),
                "duration_seconds": 90,
                "metadata": {"test": "report_job"},
            },
            headers=headers,
        )
        assert response.status_code == 200
        current = response.json()["next_question"]
    return candidate, session_id


def fake_report(db: Session, session: AssessmentSession, **_) -> EvaluationReport:
    report = EvaluationReport(
        session_id=session.id,
        candidate_id=session.candidate_id,
        ai_test_score=82,
        technical_score=82,
        communication_score=80,
        problem_solving_score=84,
        system_design_score=79,
        code_quality_score=81,
        project_quality_score=75,
        academic_score=88,
        integrity_score=100,
        verified_score=84,
        report_json={"question_wise_scores": [], "provider_metadata": {"actual_provider": "stub"}},
        recruiter_summary="Candidate produced evaluable answers.",
    )
    db.add(report)
    db.flush()
    return report


def test_submit_returns_generating_and_saves_answers_before_background_task(
    client: TestClient,
    db_session: Session,
    monkeypatch,
) -> None:
    calls: list[tuple[str, str | None]] = []
    monkeypatch.setattr(
        assessment_routes,
        "run_report_generation_task",
        lambda session_id, provider_name=None: calls.append((session_id, provider_name)),
    )
    candidate, session_id = make_answered_session(client, db_session, "report-job-submit@example.com")

    response = client.post(
        f"/api/v1/assessment/sessions/{session_id}/submit",
        json={},
        headers=auth_header(candidate["access_token"]),
    )

    assert response.status_code == 200
    assert response.json() == {
        "session_id": session_id,
        "status": "report_generating",
        "message": "Assessment submitted. Report generation started.",
    }
    db_session.expire_all()
    session = db_session.get(AssessmentSession, session_id)
    assert session is not None
    assert session.status == "report_generating"
    assert db_session.scalar(select(AssessmentAnswer).where(AssessmentAnswer.session_id == session_id)) is not None
    assert db_session.scalar(select(EvaluationReport).where(EvaluationReport.session_id == session_id)) is None
    assert calls == [(session_id, None)]


def test_status_endpoint_returns_report_generating(client: TestClient, db_session: Session, monkeypatch) -> None:
    monkeypatch.setattr(assessment_routes, "run_report_generation_task", lambda *_: None)
    candidate, session_id = make_answered_session(client, db_session, "report-job-status@example.com")
    headers = auth_header(candidate["access_token"])
    assert client.post(f"/api/v1/assessment/sessions/{session_id}/submit", json={}, headers=headers).status_code == 200

    status_response = client.get(f"/api/v1/assessment/sessions/{session_id}/report/status", headers=headers)

    assert status_response.status_code == 200
    body = status_response.json()
    assert body["status"] == "report_generating"
    assert body["report_id"] is None
    assert body["retryable"] is False


def test_successful_background_task_marks_report_ready(client: TestClient, db_session: Session) -> None:
    _, session_id = make_answered_session(client, db_session, "report-job-ready@example.com")
    session = db_session.get(AssessmentSession, session_id)
    assert session is not None
    session.status = "report_generating"
    db_session.commit()

    report = generate_report_for_session_job(db_session, session_id, generate_fn=fake_report)

    assert report is not None
    db_session.expire_all()
    session = db_session.get(AssessmentSession, session_id)
    assert session is not None
    assert session.status == "report_ready"
    assert db_session.scalar(select(EvaluationReport).where(EvaluationReport.session_id == session_id)) is not None


def test_failed_background_task_marks_report_failed(client: TestClient, db_session: Session) -> None:
    _, session_id = make_answered_session(client, db_session, "report-job-failed@example.com")
    session = db_session.get(AssessmentSession, session_id)
    assert session is not None
    session.status = "report_generating"
    db_session.commit()

    def fail_generation(*_, **__):
        raise RuntimeError("provider secret should not be exposed")

    report = generate_report_for_session_job(db_session, session_id, generate_fn=fail_generation)

    assert report is None
    db_session.expire_all()
    session = db_session.get(AssessmentSession, session_id)
    assert session is not None
    assert session.status == "report_failed"
    metadata = session.session_plan_metadata["report_generation"]
    assert metadata["retryable"] is True
    assert "secret" not in metadata["error"]


def test_repeated_submit_does_not_schedule_duplicate_job(client: TestClient, db_session: Session, monkeypatch) -> None:
    calls: list[str] = []
    monkeypatch.setattr(assessment_routes, "run_report_generation_task", lambda session_id, *_: calls.append(session_id))
    candidate, session_id = make_answered_session(client, db_session, "report-job-duplicate@example.com")
    headers = auth_header(candidate["access_token"])

    first = client.post(f"/api/v1/assessment/sessions/{session_id}/submit", json={}, headers=headers)
    second = client.post(f"/api/v1/assessment/sessions/{session_id}/submit", json={}, headers=headers)

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["status"] == "report_generating"
    assert second.json()["status"] == "report_generating"
    assert calls == [session_id]


def test_existing_report_reused_without_new_job(client: TestClient, db_session: Session, monkeypatch) -> None:
    calls: list[str] = []
    monkeypatch.setattr(assessment_routes, "run_report_generation_task", lambda session_id, *_: calls.append(session_id))
    candidate, session_id = make_answered_session(client, db_session, "report-job-existing@example.com")
    session = db_session.get(AssessmentSession, session_id)
    assert session is not None
    report = fake_report(db_session, session)
    db_session.commit()

    response = client.post(
        f"/api/v1/assessment/sessions/{session_id}/submit",
        json={},
        headers=auth_header(candidate["access_token"]),
    )

    assert response.status_code == 200
    assert response.json()["status"] == "report_ready"
    assert calls == []
    reports = db_session.scalars(select(EvaluationReport).where(EvaluationReport.session_id == session_id)).all()
    assert [item.id for item in reports] == [report.id]


def test_retry_uses_same_session_questions_and_answers(client: TestClient, db_session: Session, monkeypatch) -> None:
    calls: list[str] = []
    monkeypatch.setattr(assessment_routes, "run_report_generation_task", lambda session_id, *_: calls.append(session_id))
    candidate, session_id = make_answered_session(client, db_session, "report-job-retry@example.com")
    original_question_ids = [
        row.id
        for row in db_session.scalars(
            select(AssessmentQuestion).where(AssessmentQuestion.session_id == session_id).order_by(AssessmentQuestion.order_index)
        )
    ]
    original_answer_ids = [
        row.id
        for row in db_session.scalars(
            select(AssessmentAnswer).where(AssessmentAnswer.session_id == session_id).order_by(AssessmentAnswer.order_index)
        )
    ]
    session = db_session.get(AssessmentSession, session_id)
    assert session is not None
    session.status = "report_failed"
    db_session.commit()

    response = client.post(
        f"/api/v1/assessment/sessions/{session_id}/report/retry",
        json={},
        headers=auth_header(candidate["access_token"]),
    )

    assert response.status_code == 200
    assert response.json()["status"] == "report_generating"
    assert calls == [session_id]
    assert [
        row.id
        for row in db_session.scalars(
            select(AssessmentQuestion).where(AssessmentQuestion.session_id == session_id).order_by(AssessmentQuestion.order_index)
        )
    ] == original_question_ids
    assert [
        row.id
        for row in db_session.scalars(
            select(AssessmentAnswer).where(AssessmentAnswer.session_id == session_id).order_by(AssessmentAnswer.order_index)
        )
    ] == original_answer_ids
