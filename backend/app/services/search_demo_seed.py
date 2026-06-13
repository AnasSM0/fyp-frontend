from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.assessment import AssessmentSession
from app.models.evaluation import EvaluationReport
from app.models.profile import CandidateProfile
from app.services.candidate_embedding_service import rebuild_candidate_embedding
from app.services.demo_accounts import DEMO_PASSWORD, ensure_user
from app.services.embedding_provider import FallbackEmbeddingProvider


DEMO_SEARCH_CANDIDATES = [
    {
        "slug": "react-next-frontend",
        "email": "demo.react@xlr8hire.demo",
        "full_name": "Maya Iqbal",
        "target_role": "Frontend Engineer",
        "tech_stack": ["React", "Next.js", "TypeScript", "Tailwind CSS"],
        "skills": ["React", "Next.js", "TypeScript", "Accessibility", "Debugging"],
        "verified_score": 91,
        "ai_test_score": 89,
        "project_quality_score": 86,
        "communication_score": 88,
        "role_fit": 93,
        "summary": "Strong React and Next.js candidate with polished UI engineering evidence.",
    },
    {
        "slug": "fastapi-postgres-backend",
        "email": "demo.backend@xlr8hire.demo",
        "full_name": "Hamza Khan",
        "target_role": "Backend Engineer",
        "tech_stack": ["FastAPI", "PostgreSQL", "SQLAlchemy", "Redis"],
        "skills": ["FastAPI", "PostgreSQL", "API Design", "Authentication", "Testing"],
        "verified_score": 88,
        "ai_test_score": 87,
        "project_quality_score": 84,
        "communication_score": 82,
        "role_fit": 90,
        "summary": "Backend-focused candidate with API, database, and auth implementation depth.",
    },
    {
        "slug": "fullstack-typescript",
        "email": "demo.fullstack@xlr8hire.demo",
        "full_name": "Sara Ahmed",
        "target_role": "Full Stack Developer",
        "tech_stack": ["TypeScript", "React", "Node.js", "PostgreSQL"],
        "skills": ["TypeScript", "Full Stack Architecture", "React", "APIs", "System Design"],
        "verified_score": 86,
        "ai_test_score": 85,
        "project_quality_score": 83,
        "communication_score": 90,
        "role_fit": 88,
        "summary": "Full-stack candidate who connects frontend architecture with API and data modeling.",
    },
    {
        "slug": "ai-ml-engineer",
        "email": "demo.aiml@xlr8hire.demo",
        "full_name": "Bilal Raza",
        "target_role": "AI/ML Engineer",
        "tech_stack": ["Python", "FastAPI", "RAG", "PostgreSQL", "pgvector"],
        "skills": ["Machine Learning", "Embeddings", "Vector Search", "Python", "RAG"],
        "verified_score": 84,
        "ai_test_score": 83,
        "project_quality_score": 81,
        "communication_score": 78,
        "role_fit": 89,
        "summary": "AI/ML candidate with FastAPI RAG, embedding search, LLM orchestration, and Python evidence.",
    },
    {
        "slug": "devops-backend",
        "email": "demo.systems@xlr8hire.demo",
        "full_name": "Ayesha Malik",
        "target_role": "DevOps Backend Engineer",
        "tech_stack": ["Docker", "FastAPI", "PostgreSQL", "CI/CD", "Observability"],
        "skills": ["Debugging", "Performance", "Databases", "DevOps", "Testing"],
        "verified_score": 82,
        "ai_test_score": 81,
        "project_quality_score": 78,
        "communication_score": 85,
        "role_fit": 86,
        "summary": "DevOps/backend candidate with Docker, FastAPI, database reasoning, and production failure analysis.",
    },
]


def find_seed_session(db: Session, profile: CandidateProfile, slug: str) -> AssessmentSession | None:
    sessions = db.scalars(select(AssessmentSession).where(AssessmentSession.candidate_id == profile.id)).all()
    return next(
        (
            session
            for session in sessions
            if (session.session_plan_metadata or {}).get("seed_slug") == slug
        ),
        None,
    )


def seed_search_demo_data(db: Session) -> int:
    settings = get_settings()
    provider = FallbackEmbeddingProvider(None, settings.stub_embedding_dimensions)
    count = 0
    for item in DEMO_SEARCH_CANDIDATES:
        user = ensure_user(db, item["email"], "candidate", DEMO_PASSWORD)
        profile = user.candidate_profile
        if profile is None:
            profile = CandidateProfile(user_id=user.id)
            db.add(profile)
            db.flush()
        profile.full_name = item["full_name"]
        profile.university = "FAST NUCES"
        profile.degree = "BS Computer Science"
        profile.graduation_year = 2026
        profile.gpa = 3.6
        profile.target_role = item["target_role"]
        profile.experience_level = "Student / Early Career"
        profile.tech_stack = item["tech_stack"]
        profile.skills = item["skills"]
        profile.portfolio_url = f"https://xlr8hire.demo/{item['slug']}"
        profile.linkedin_url = f"https://linkedin.example/{item['slug']}"
        profile.resume_url = f"https://resume.example/{item['slug']}.pdf"
        profile.profile_visibility = True
        profile.availability_status = "open"
        profile.profile_complete = True
        session = find_seed_session(db, profile, item["slug"])
        if session is None:
            session = AssessmentSession(
                candidate_id=profile.id,
                status="completed",
                target_role=profile.target_role,
                experience_level=profile.experience_level,
                selected_difficulty="intermediate",
                current_order_index=1,
                total_questions=1,
                session_plan_metadata={"seed_slug": item["slug"], "source": "phase5_search_seed"},
            )
            db.add(session)
            db.flush()
        report = db.scalar(select(EvaluationReport).where(EvaluationReport.session_id == session.id))
        report_json = {
            "seed_slug": item["slug"],
            "strengths": item["skills"][:3],
            "weaknesses": ["Needs more production internship evidence."],
            "recommended_improvements": ["Add measured project outcomes."],
            "role_fit": [
                {
                    "role": item["target_role"],
                    "score": item["role_fit"],
                    "reason": item["summary"],
                }
            ],
            "recruiter_summary": item["summary"],
            "integrity_summary": {
                "integrity_score": 100,
                "risk_level": "clean",
                "summary": "No seeded integrity concerns.",
            },
            "project_quality": {
                "summary": "Seeded project metadata shows role-relevant implementation depth.",
            },
        }
        if report is None:
            report = EvaluationReport(session_id=session.id, candidate_id=profile.id)
            db.add(report)
        report.ai_test_score = item["ai_test_score"]
        report.technical_score = item["ai_test_score"]
        report.communication_score = item["communication_score"]
        report.problem_solving_score = item["ai_test_score"]
        report.system_design_score = item["role_fit"]
        report.code_quality_score = item["ai_test_score"] - 2
        report.project_quality_score = item["project_quality_score"]
        report.academic_score = 90
        report.integrity_score = 100
        report.verified_score = item["verified_score"]
        report.report_json = report_json
        report.recruiter_summary = item["summary"]
        report.published = True
        db.flush()
        rebuild_candidate_embedding(db, profile, report=report, provider=provider, commit=False)
        count += 1
    db.commit()
    return count
