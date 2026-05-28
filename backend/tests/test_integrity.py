from datetime import datetime, timezone
from types import SimpleNamespace

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.services.question_bank_seed import seed_question_bank


def eval_settings(**overrides):
    values = {
        "batch_evaluation_enabled": False,
        "ai_required_for_evaluation": False,
        "allow_stub_evaluation": True,
        "enable_rag_evaluation": True,
        "enable_rag_evaluation_fallback": True,
        "rag_rubric_top_k": 5,
    }
    values.update(overrides)
    return SimpleNamespace(**values)


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


def start_session(client: TestClient, db_session: Session, email: str = "integrity@example.com"):
    seed_question_bank(db_session)
    candidate = signup(client, email, "candidate")
    create_candidate_profile(client, candidate["access_token"])
    headers = auth_header(candidate["access_token"])
    session = client.post("/assessments/sessions", json={}, headers=headers).json()
    return candidate, session["session"]["id"], session["current_question"]["id"]


def answer_and_finish(client: TestClient, token: str, session_id: str, question_id: str) -> None:
    headers = auth_header(token)
    answer = client.post(
        f"/assessments/sessions/{session_id}/answers",
        json={
            "assessment_question_id": question_id,
            "answer_text": "I would reason through the API contract and validate the edge cases.",
            "code_text": "def solve(): return True",
            "duration_seconds": 100,
            "metadata": {},
        },
        headers=headers,
    )
    assert answer.status_code == 200
    finish = client.post(f"/assessments/sessions/{session_id}/finish", json={}, headers=headers)
    assert finish.status_code == 200


def test_candidate_submits_integrity_event_for_own_active_session(
    client: TestClient, db_session: Session
) -> None:
    candidate, session_id, _ = start_session(client, db_session, "own-event@example.com")
    response = client.post(
        "/integrity/events",
        json={
            "session_id": session_id,
            "event_type": "PASTE_ATTEMPT",
            "details_json": {"field": "editor"},
            "duration_ms": 0,
        },
        headers=auth_header(candidate["access_token"]),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["event_type"] == "PASTE_ATTEMPT"
    assert body["severity"] == "medium"


def test_recruiter_and_other_candidate_blocked(client: TestClient, db_session: Session) -> None:
    owner, session_id, _ = start_session(client, db_session, "integrity-owner@example.com")
    recruiter = signup(client, "integrity-recruiter@example.com", "recruiter")
    intruder = signup(client, "integrity-intruder@example.com", "candidate")
    create_candidate_profile(client, intruder["access_token"])
    payload = {"session_id": session_id, "event_type": "TAB_HIDDEN"}

    recruiter_response = client.post(
        "/integrity/events", json=payload, headers=auth_header(recruiter["access_token"])
    )
    intruder_response = client.post(
        "/integrity/events", json=payload, headers=auth_header(intruder["access_token"])
    )
    owner_list = client.get(
        f"/integrity/sessions/{session_id}", headers=auth_header(owner["access_token"])
    )
    assert recruiter_response.status_code == 403
    assert intruder_response.status_code == 404
    assert owner_list.status_code == 200


def test_batch_submission_dedupes_short_window_duplicates(
    client: TestClient, db_session: Session
) -> None:
    candidate, session_id, _ = start_session(client, db_session, "batch-dedupe@example.com")
    occurred_at = datetime.now(timezone.utc).isoformat()
    response = client.post(
        "/integrity/events/batch",
        json={
            "events": [
                {
                    "session_id": session_id,
                    "event_type": "WINDOW_BLUR",
                    "duration_ms": 1000,
                    "occurred_at": occurred_at,
                },
                {
                    "session_id": session_id,
                    "event_type": "WINDOW_BLUR",
                    "duration_ms": 1000,
                    "occurred_at": occurred_at,
                },
                {
                    "session_id": session_id,
                    "event_type": "PASTE_ATTEMPT",
                    "duration_ms": 0,
                    "occurred_at": occurred_at,
                },
            ]
        },
        headers=auth_header(candidate["access_token"]),
    )
    assert response.status_code == 200
    body = response.json()
    assert len(body["events"]) == 2
    assert body["ignored_duplicates"] == 1


def test_invalid_event_and_severity_validation(client: TestClient, db_session: Session) -> None:
    candidate, session_id, _ = start_session(client, db_session, "invalid-event@example.com")
    invalid_type = client.post(
        "/integrity/events",
        json={"session_id": session_id, "event_type": "OPENED_NOTEPAD"},
        headers=auth_header(candidate["access_token"]),
    )
    invalid_severity = client.post(
        "/integrity/events",
        json={"session_id": session_id, "event_type": "TAB_HIDDEN", "severity": "critical"},
        headers=auth_header(candidate["access_token"]),
    )
    assert invalid_type.status_code == 422
    assert invalid_severity.status_code == 422


def test_completed_session_rejects_new_events(client: TestClient, db_session: Session) -> None:
    candidate, session_id, question_id = start_session(client, db_session, "completed-event@example.com")
    answer_and_finish(client, candidate["access_token"], session_id, question_id)
    response = client.post(
        "/integrity/events",
        json={"session_id": session_id, "event_type": "TAB_HIDDEN"},
        headers=auth_header(candidate["access_token"]),
    )
    assert response.status_code == 409


def test_no_events_summary_is_clean(client: TestClient, db_session: Session) -> None:
    candidate, session_id, _ = start_session(client, db_session, "clean-summary@example.com")
    response = client.get(
        f"/integrity/sessions/{session_id}/summary",
        headers=auth_header(candidate["access_token"]),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["integrity_score"] == 100
    assert body["risk_level"] == "clean"


def test_repeated_high_and_duration_events_reduce_score(
    client: TestClient, db_session: Session
) -> None:
    candidate, session_id, _ = start_session(client, db_session, "risk-summary@example.com")
    headers = auth_header(candidate["access_token"])
    events = [
        {"session_id": session_id, "event_type": "CAMERA_DENIED", "duration_ms": 0},
        {"session_id": session_id, "event_type": "MULTIPLE_FACES_DETECTED", "duration_ms": 0},
    ]
    for index in range(5):
        events.append(
            {
                "session_id": session_id,
                "event_type": "NO_FACE_DETECTED",
                "duration_ms": 70_000,
                "occurred_at": datetime.fromtimestamp(1_700_000_000 + index * 3, timezone.utc).isoformat(),
            }
        )
    response = client.post("/integrity/events/batch", json={"events": events}, headers=headers)
    summary = client.get(f"/integrity/sessions/{session_id}/summary", headers=headers)
    assert response.status_code == 200
    assert summary.status_code == 200
    body = summary.json()
    assert body["integrity_score"] < 70
    assert body["risk_level"] == "high"
    flag_types = {flag["event_type"] for flag in body["strongest_flags"]}
    assert "CAMERA_DENIED" in flag_types
    assert body["penalty_breakdown"]["duration"] > 0
    assert body["penalty_breakdown"]["repeated"] > 0


def test_evaluation_report_uses_real_integrity_score(
    client: TestClient, db_session: Session, monkeypatch
) -> None:
    monkeypatch.setattr("app.services.evaluation_service.get_settings", lambda: eval_settings())
    monkeypatch.setattr(
        "app.services.evaluation_service.build_ai_provider",
        lambda _: __import__("app.services.gemini_provider", fromlist=["FallbackAIProvider"]).FallbackAIProvider(None),
    )
    candidate, session_id, question_id = start_session(client, db_session, "report-integrity@example.com")
    headers = auth_header(candidate["access_token"])
    client.post(
        "/integrity/events",
        json={"session_id": session_id, "event_type": "CAMERA_DENIED"},
        headers=headers,
    )
    answer_and_finish(client, candidate["access_token"], session_id, question_id)
    report = client.post(f"/evaluations/sessions/{session_id}/generate", json={}, headers=headers)
    assert report.status_code == 200
    body = report.json()
    assert body["integrity_score"] < 100
    assert body["report_json"]["integrity_summary"]["risk_level"] in {"low", "moderate", "high"}
    assert "integrity_summary" in body["report_json"]
