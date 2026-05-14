from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User
from app.services.demo_accounts import (
    DEMO_CANDIDATE_EMAIL,
    DEMO_PASSWORD,
    DEMO_RECRUITER_EMAIL,
    seed_demo_accounts,
)


def auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def signup(client: TestClient, email: str, role: str) -> dict:
    response = client.post(
        "/auth/signup",
        json={"email": email, "password": "password123", "role": role},
    )
    assert response.status_code == 201
    return response.json()


def test_health(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "ok"}


def test_candidate_and_recruiter_signup(client: TestClient) -> None:
    candidate = signup(client, "student@example.com", "candidate")
    recruiter = signup(client, "recruiter@example.com", "recruiter")
    assert candidate["user"]["role"] == "candidate"
    assert recruiter["user"]["role"] == "recruiter"
    assert candidate["access_token"]
    assert recruiter["access_token"]


def test_duplicate_email_rejected(client: TestClient) -> None:
    signup(client, "dupe@example.com", "candidate")
    response = client.post(
        "/auth/signup",
        json={"email": "dupe@example.com", "password": "password123", "role": "candidate"},
    )
    assert response.status_code == 409
    assert response.json()["detail"] == "Email is already registered"


def test_valid_and_invalid_login(client: TestClient) -> None:
    signup(client, "login@example.com", "candidate")
    valid = client.post(
        "/auth/login",
        json={"email": "login@example.com", "password": "password123"},
    )
    invalid = client.post(
        "/auth/login",
        json={"email": "login@example.com", "password": "wrong"},
    )
    assert valid.status_code == 200
    assert valid.json()["access_token"]
    assert invalid.status_code == 401


def test_missing_and_invalid_token_rejected(client: TestClient) -> None:
    missing = client.get("/auth/me")
    invalid = client.get("/auth/me", headers=auth_header("not-a-real-token"))
    assert missing.status_code == 401
    assert invalid.status_code == 401
    assert invalid.json()["detail"] == "Invalid or expired token"


def test_auth_me(client: TestClient) -> None:
    created = signup(client, "me@example.com", "candidate")
    response = client.get("/auth/me", headers=auth_header(created["access_token"]))
    assert response.status_code == 200
    assert response.json()["email"] == "me@example.com"


def test_candidate_profile_not_found_then_upsert_and_get(client: TestClient) -> None:
    created = signup(client, "candidate-profile@example.com", "candidate")
    headers = auth_header(created["access_token"])

    missing = client.get("/profiles/candidate/me", headers=headers)
    assert missing.status_code == 404
    assert missing.json()["detail"] == "Candidate profile not found"

    payload = {
        "full_name": "Alex Chen",
        "university": "FAST NUCES",
        "degree": "BS Computer Science",
        "graduation_year": 2026,
        "gpa": 3.7,
        "target_role": "Full Stack Developer",
        "experience_level": "Student",
        "tech_stack": ["React", "FastAPI"],
        "skills": ["React", "Python"],
        "portfolio_url": "https://alex.example",
        "linkedin_url": "https://linkedin.example/alex",
        "resume_url": "https://resume.example/alex.pdf",
        "profile_visibility": True,
        "availability_status": "open",
        "profile_complete": True,
    }
    upsert = client.put("/profiles/candidate/me", json=payload, headers=headers)
    assert upsert.status_code == 200
    assert upsert.json()["target_role"] == "Full Stack Developer"

    get_response = client.get("/profiles/candidate/me", headers=headers)
    assert get_response.status_code == 200
    assert get_response.json()["skills"] == ["React", "Python"]


def test_company_profile_not_found_then_upsert_and_get(client: TestClient) -> None:
    created = signup(client, "company-profile@example.com", "recruiter")
    headers = auth_header(created["access_token"])

    missing = client.get("/profiles/company/me", headers=headers)
    assert missing.status_code == 404
    assert missing.json()["detail"] == "Company profile not found"

    payload = {
        "company_name": "Acme Corp",
        "recruiter_name": "Demo Recruiter",
        "website": "https://acme.example",
        "industry": "Software",
        "company_size": "51-200",
        "role_title": "Technical Recruiter",
    }
    upsert = client.put("/profiles/company/me", json=payload, headers=headers)
    assert upsert.status_code == 200
    assert upsert.json()["company_name"] == "Acme Corp"

    get_response = client.get("/profiles/company/me", headers=headers)
    assert get_response.status_code == 200
    assert get_response.json()["role_title"] == "Technical Recruiter"


def test_wrong_role_access_blocked(client: TestClient) -> None:
    candidate = signup(client, "blocked-candidate@example.com", "candidate")
    recruiter = signup(client, "blocked-recruiter@example.com", "recruiter")

    candidate_to_company = client.get(
        "/profiles/company/me", headers=auth_header(candidate["access_token"])
    )
    recruiter_to_candidate = client.get(
        "/profiles/candidate/me", headers=auth_header(recruiter["access_token"])
    )

    assert candidate_to_company.status_code == 403
    assert recruiter_to_candidate.status_code == 403


def test_demo_login_for_candidate_and_recruiter(client: TestClient) -> None:
    candidate = client.post("/auth/demo-login", json={"role": "candidate"})
    recruiter = client.post("/auth/demo-login", json={"role": "recruiter"})
    assert candidate.status_code == 200
    assert candidate.json()["user"]["email"] == DEMO_CANDIDATE_EMAIL
    assert recruiter.status_code == 200
    assert recruiter.json()["user"]["email"] == DEMO_RECRUITER_EMAIL


def test_seed_demo_accounts_is_idempotent(db_session: Session) -> None:
    seed_demo_accounts(db_session)
    seed_demo_accounts(db_session)
    users = db_session.scalars(select(User)).all()
    candidate_count = sum(user.email == DEMO_CANDIDATE_EMAIL for user in users)
    recruiter_count = sum(user.email == DEMO_RECRUITER_EMAIL for user in users)
    assert candidate_count == 1
    assert recruiter_count == 1
    assert all(user.password_hash != DEMO_PASSWORD for user in users)
