from io import BytesIO

from fastapi.testclient import TestClient
from pydantic import ValidationError
import pytest

from app.schemas.onboarding import ExtractedCandidateProfile, ResumeConfidence, ResumeParseDraft
from app.services.ai_provider import ProviderOutputError, ProviderState
from app.services.resume_onboarding_service import extract_resume_basics_deterministic


def auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def signup(client: TestClient, email: str, role: str) -> dict:
    response = client.post(
        "/auth/signup",
        json={"email": email, "password": "password123", "role": role},
    )
    assert response.status_code == 201
    return response.json()


def docx_bytes(text: str) -> bytes:
    from docx import Document

    document = Document()
    for line in text.splitlines():
        document.add_paragraph(line)
    buffer = BytesIO()
    document.save(buffer)
    return buffer.getvalue()


class FakeResumeProvider:
    def __init__(
        self,
        draft: ResumeParseDraft | None = None,
        *,
        fails: bool = False,
        expected_substring: str = "Skills",
        forbidden_substrings: list[str] | None = None,
    ):
        self.draft = draft
        self.fails = fails
        self.expected_substring = expected_substring
        self.forbidden_substrings = forbidden_substrings or []
        self.state = ProviderState(provider="stub", model="test-resume-parser", fallback_used=True)

    def parse_resume_profile(self, resume_text: str) -> ResumeParseDraft:
        if self.fails:
            raise ProviderOutputError("boom")
        assert self.expected_substring in resume_text
        for value in self.forbidden_substrings:
            assert value not in resume_text
        return self.draft or ResumeParseDraft(
            extracted_profile=ExtractedCandidateProfile(
                full_name="Aisha Khan",
                email="aisha@example.com",
                university="FAST University",
                degree="BS Computer Science",
                graduation_year=2026,
                gpa=3.7,
                target_role="Full Stack Developer",
                experience_level="student",
                skills=["React", "FastAPI"],
                tech_stack=["React", "FastAPI", "PostgreSQL"],
                github_url="https://github.com/aisha",
            ),
            confidence=ResumeConfidence(full_name=0.9, skills=0.8, tech_stack=0.8),
            warnings=[],
        )


def valid_resume_text() -> str:
    return """
Aisha Khan
aisha@example.com
+92 300 1234567
FAST University
BS Computer Science, 2026
GPA: 3.7
Full Stack Developer
Skills: React, FastAPI, PostgreSQL, TypeScript, Docker
Project: Built a hiring marketplace with Next.js and FastAPI.
GitHub: https://github.com/aisha
LinkedIn: https://linkedin.com/in/aisha
Portfolio: https://aisha.dev
""".strip()


def anas_resume_text() -> str:
    return """
ANAS SHAH MUHAMMAD
DevOps and AI Engineer
Karachi, Pakistan | 03163223935 | anasbutt20067@gmail.com | linkedin.com/in/anas-shah-muhammad-0a9426257 | github.com/AnasSM0
PROFESSIONAL SUMMARY
DevOps and AI engineer with hands-on experience in AWS, Docker, Kubernetes, CI/CD automation, FastAPI, PostgreSQL/pgvector, and LLM-based systems.
CORE SKILLS
DevOps / Cloud: AWS EC2, S3, Docker, Kubernetes
AI / Backend: FastAPI, Next.js, PostgreSQL, pgvector, RAG
RELEVANT EXPERIENCE
SEO Content Writer / Technical Documentation - iCreativez Technologies | 2022 - 2024
SELECTED PROJECTS
AI-Driven Reverse Talent Marketplace (FYP)
EDUCATION AND CERTIFICATIONS
BS Computer Science - Mohammad Ali Jinnah University | Expected 2027
Certifications: Docker Essentials - IBM
""".strip()


def test_deterministic_resume_basics_extracts_anas_resume_fields() -> None:
    basics = extract_resume_basics_deterministic(anas_resume_text())

    assert basics["full_name"] == "ANAS SHAH MUHAMMAD"
    assert basics["target_role"] == "DevOps and AI Engineer"
    assert basics["university"] == "Mohammad Ali Jinnah University"
    assert basics["degree"] == "BS Computer Science"
    assert basics["graduation_year"] == 2027
    assert basics["gpa"] is None
    assert basics["email"] == "anasbutt20067@gmail.com"
    assert basics["phone"] == "03163223935"
    assert basics["linkedin_url"] == "https://linkedin.com/in/anas-shah-muhammad-0a9426257"
    assert basics["github_url"] == "https://github.com/AnasSM0"


def test_deterministic_resume_basics_handles_normalized_pdf_text() -> None:
    normalized_pdf_text = " ".join(anas_resume_text().split())

    basics = extract_resume_basics_deterministic(normalized_pdf_text)

    assert basics["full_name"] == "ANAS SHAH MUHAMMAD"
    assert basics["target_role"] == "DevOps and AI Engineer"
    assert basics["university"] == "Mohammad Ali Jinnah University"
    assert basics["degree"] == "BS Computer Science"
    assert basics["graduation_year"] == 2027
    assert basics["gpa"] is None


def polluted_profile_dump() -> str:
    return (
        "Aisha Khan\n"
        "aisha@example.com\n"
        "+92 300 1234567\n"
        "LinkedIn: https://linkedin.com/in/aisha\n"
        "Skills: React, FastAPI"
    )


def test_resume_parse_requires_candidate_token(client: TestClient) -> None:
    response = client.post("/onboarding/resume/parse")
    assert response.status_code == 401

    recruiter = signup(client, "resume-recruiter@example.com", "recruiter")
    blocked = client.post(
        "/onboarding/resume/parse",
        files={"file": ("resume.docx", docx_bytes(valid_resume_text()), "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
        headers=auth_header(recruiter["access_token"]),
    )
    assert blocked.status_code == 403


def test_resume_parse_rejects_unsupported_file_type(client: TestClient) -> None:
    candidate = signup(client, "resume-type@example.com", "candidate")
    response = client.post(
        "/onboarding/resume/parse",
        files={"file": ("resume.txt", b"Aisha Khan " * 30, "text/plain")},
        headers=auth_header(candidate["access_token"]),
    )
    assert response.status_code == 422
    assert response.json()["detail"]["reason"] == "unsupported_resume_type"


def test_resume_parse_rejects_large_file(client: TestClient) -> None:
    candidate = signup(client, "resume-large@example.com", "candidate")
    response = client.post(
        "/onboarding/resume/parse",
        files={
            "file": (
                "resume.pdf",
                b"x" * (5 * 1024 * 1024 + 1),
                "application/pdf",
            )
        },
        headers=auth_header(candidate["access_token"]),
    )
    assert response.status_code == 413
    assert response.json()["detail"]["reason"] == "resume_file_too_large"


def test_resume_parse_rejects_unreadable_docx(client: TestClient) -> None:
    candidate = signup(client, "resume-empty@example.com", "candidate")
    response = client.post(
        "/onboarding/resume/parse",
        files={
            "file": (
                "resume.docx",
                docx_bytes("too short"),
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        },
        headers=auth_header(candidate["access_token"]),
    )
    assert response.status_code == 422
    assert response.json()["detail"]["reason"] == "resume_text_unreadable"


def test_resume_parse_docx_prefills_without_saving(client: TestClient, monkeypatch) -> None:
    monkeypatch.setattr(
        "app.services.resume_onboarding_service.build_ai_provider",
        lambda provider_name, capability: FakeResumeProvider(
            forbidden_substrings=["aisha@example.com", "+92 300 1234567", "https://github.com/aisha", "Aisha Khan"]
        ),
    )
    candidate = signup(client, "resume-docx@example.com", "candidate")
    response = client.post(
        "/onboarding/resume/parse",
        files={
            "file": (
                "resume.docx",
                docx_bytes(valid_resume_text()),
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        },
        headers=auth_header(candidate["access_token"]),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "parsed"
    assert body["extracted_profile"]["full_name"] == "Aisha Khan"
    assert body["extracted_profile"]["gpa"] == 3.7
    assert body["extracted_profile"]["skills"] == ["React", "FastAPI"]
    assert len(body["raw_text_preview"]) <= 500
    assert body["provider_metadata"]["actual_provider"] == "stub"

    profile = client.get("/profiles/candidate/me", headers=auth_header(candidate["access_token"]))
    assert profile.status_code == 404


def test_resume_parse_overrides_ai_with_deterministic_and_heuristic_anas_fields(client: TestClient, monkeypatch) -> None:
    draft = ResumeParseDraft(
        extracted_profile=ExtractedCandidateProfile(
            full_name=None,
            email=None,
            phone=None,
            university=None,
            degree=None,
            graduation_year=2022,
            gpa=3.5,
            target_role="DevOps and AI Engineer",
            experience_level="student",
            skills=["AWS", "Docker", "Kubernetes"],
            tech_stack=["AWS", "Docker", "Kubernetes", "FastAPI"],
            github_url=None,
            linkedin_url=None,
        ),
        confidence=ResumeConfidence(target_role=0.4, graduation_year=0.3, gpa=0.2),
        warnings=[],
    )
    monkeypatch.setattr(
        "app.services.resume_onboarding_service.build_ai_provider",
        lambda provider_name, capability: FakeResumeProvider(
            draft,
            expected_substring="PROFESSIONAL SUMMARY",
            forbidden_substrings=[
                "ANAS SHAH MUHAMMAD",
                "anasbutt20067@gmail.com",
                "03163223935",
                "github.com/AnasSM0",
            ],
        ),
    )
    candidate = signup(client, "resume-anas@example.com", "candidate")

    response = client.post(
        "/onboarding/resume/parse",
        files={
            "file": (
                "anas-resume.docx",
                docx_bytes(anas_resume_text()),
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        },
        headers=auth_header(candidate["access_token"]),
    )

    assert response.status_code == 200
    profile = response.json()["extracted_profile"]
    assert profile["full_name"] == "ANAS SHAH MUHAMMAD"
    assert profile["target_role"] == "DevOps and AI Engineer"
    assert profile["university"] == "Mohammad Ali Jinnah University"
    assert profile["degree"] == "BS Computer Science"
    assert profile["graduation_year"] == 2027
    assert profile["gpa"] is None
    assert profile["linkedin_url"] == "https://linkedin.com/in/anas-shah-muhammad-0a9426257"
    assert profile["github_url"] == "https://github.com/AnasSM0"
    assert profile["phone"] == "03163223935"
    assert profile["email"] == "anasbutt20067@gmail.com"
    assert "github_url/portfolio_url missing" not in response.json()["warnings"]


def test_resume_parse_adds_warnings_for_missing_fields(client: TestClient, monkeypatch) -> None:
    draft = ResumeParseDraft(
        extracted_profile=ExtractedCandidateProfile(full_name="Aisha Khan", skills=[], tech_stack=[]),
        confidence=ResumeConfidence(full_name=0.8),
        warnings=[],
    )
    monkeypatch.setattr(
        "app.services.resume_onboarding_service.build_ai_provider",
        lambda provider_name, capability: FakeResumeProvider(draft),
    )
    candidate = signup(client, "resume-warnings@example.com", "candidate")
    response = client.post(
        "/onboarding/resume/parse",
        files={
            "file": (
                "resume.docx",
                docx_bytes(valid_resume_text()),
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        },
        headers=auth_header(candidate["access_token"]),
    )

    assert response.status_code == 200
    warnings = response.json()["warnings"]
    assert "target_role missing or uncertain" in warnings
    assert "skills missing" in warnings
    assert "projects missing" in warnings


def test_resume_sanitizer_removes_polluted_scalar_fields(client: TestClient, monkeypatch) -> None:
    dump = polluted_profile_dump()
    draft = ResumeParseDraft(
        extracted_profile=ExtractedCandidateProfile(
            full_name=dump,
            email=None,
            phone=None,
            university="React, FastAPI, PostgreSQL, TypeScript",
            degree="React, FastAPI, PostgreSQL, TypeScript",
            target_role="Full Stack Developer Skills: React Projects: Marketplace",
            skills=["React, FastAPI, PostgreSQL"],
            tech_stack=["React", "https://github.com/aisha", "PostgreSQL"],
            portfolio_url="LinkedIn: https://linkedin.com/in/aisha",
            projects=[
                {"title": None, "description": None, "technologies": []},
                {"title": "Hiring Marketplace", "description": "Built a candidate onboarding flow.", "technologies": ["React, FastAPI"]},
            ],
            work_experience=[
                {"company": None, "role": None, "duration": "2024", "description": None},
                {"company": "Acme", "role": "Intern", "duration": "Summer 2024", "description": "Built APIs."},
            ],
        ),
        confidence=ResumeConfidence(full_name=0.8, university=0.8, degree=0.8),
        warnings=[],
    )
    monkeypatch.setattr(
        "app.services.resume_onboarding_service.build_ai_provider",
        lambda provider_name, capability: FakeResumeProvider(draft),
    )
    candidate = signup(client, "resume-polluted@example.com", "candidate")

    response = client.post(
        "/onboarding/resume/parse",
        files={
            "file": (
                "resume.docx",
                docx_bytes(valid_resume_text()),
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        },
        headers=auth_header(candidate["access_token"]),
    )

    assert response.status_code == 200
    body = response.json()
    profile = body["extracted_profile"]
    assert profile["full_name"] == "Aisha Khan"
    assert profile["university"] == "FAST University"
    assert profile["degree"] == "BS Computer Science"
    assert profile["target_role"] is None
    assert profile["email"] == "aisha@example.com"
    assert profile["phone"] == "+92 300 1234567"
    assert profile["github_url"] == "https://github.com/aisha"
    assert profile["linkedin_url"] == "https://linkedin.com/in/aisha"
    assert profile["portfolio_url"] == "https://aisha.dev"
    assert "https://github.com/aisha" not in profile["tech_stack"]
    assert profile["skills"] == ["React", "FastAPI", "PostgreSQL"]
    assert len(profile["projects"]) == 1
    assert len(profile["work_experience"]) == 1
    assert "Some resume fields were uncertain and were left blank for manual review." in body["warnings"]
    assert "degree missing or uncertain" not in body["warnings"]


def test_resume_sanitizer_keeps_urls_in_specific_url_fields(client: TestClient, monkeypatch) -> None:
    draft = ResumeParseDraft(
        extracted_profile=ExtractedCandidateProfile(
            full_name="Aisha Khan",
            github_url="https://linkedin.com/in/aisha",
            linkedin_url="https://github.com/aisha",
            portfolio_url="GitHub: https://github.com/aisha",
        ),
        confidence=ResumeConfidence(full_name=0.8),
        warnings=[],
    )
    monkeypatch.setattr(
        "app.services.resume_onboarding_service.build_ai_provider",
        lambda provider_name, capability: FakeResumeProvider(draft),
    )
    candidate = signup(client, "resume-url-specific@example.com", "candidate")

    response = client.post(
        "/onboarding/resume/parse",
        files={
            "file": (
                "resume.docx",
                docx_bytes(valid_resume_text()),
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        },
        headers=auth_header(candidate["access_token"]),
    )

    assert response.status_code == 200
    profile = response.json()["extracted_profile"]
    assert profile["github_url"] == "https://github.com/aisha"
    assert profile["linkedin_url"] == "https://linkedin.com/in/aisha"
    assert profile["portfolio_url"] == "https://aisha.dev"


def test_resume_parse_failure_returns_partial_profile_for_manual_review(client: TestClient, monkeypatch) -> None:
    monkeypatch.setattr(
        "app.services.resume_onboarding_service.build_ai_provider",
        lambda provider_name, capability: FakeResumeProvider(fails=True),
    )
    candidate = signup(client, "resume-fail@example.com", "candidate")
    response = client.post(
        "/onboarding/resume/parse",
        files={
            "file": (
                "resume.docx",
                docx_bytes(valid_resume_text()),
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        },
        headers=auth_header(candidate["access_token"]),
    )

    assert response.status_code == 200
    body = response.json()
    profile = body["extracted_profile"]
    assert profile["full_name"] == "Aisha Khan"
    assert profile["email"] == "aisha@example.com"
    assert profile["phone"] == "+92 300 1234567"
    assert profile["github_url"] == "https://github.com/aisha"
    assert profile["linkedin_url"] == "https://linkedin.com/in/aisha"
    assert profile["portfolio_url"] == "https://aisha.dev"
    assert profile["target_role"] is None
    assert profile["skills"] == []
    assert "Some resume information could not be extracted automatically." in body["warnings"]


def test_extracted_profile_validation_keeps_missing_fields_empty() -> None:
    profile = ExtractedCandidateProfile.model_validate({})
    assert profile.full_name is None
    assert profile.projects == []
    assert profile.work_experience == []
    assert profile.skills == []

    with pytest.raises(ValidationError):
        ExtractedCandidateProfile.model_validate({"experience_level": "senior"})
