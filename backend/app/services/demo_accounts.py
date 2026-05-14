from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.profile import CandidateProfile, CompanyProfile
from app.models.user import User

DEMO_PASSWORD = "demo1234"
DEMO_CANDIDATE_EMAIL = "candidate@xlr8hire.demo"
DEMO_RECRUITER_EMAIL = "recruiter@xlr8hire.demo"


def ensure_user(db: Session, email: str, role: str, password: str = DEMO_PASSWORD) -> User:
    normalized_email = email.lower()
    user = db.scalar(select(User).where(User.email == normalized_email))
    if user is None:
        user = User(
            email=normalized_email,
            role=role,
            password_hash=hash_password(password),
            is_active=True,
        )
        db.add(user)
        db.flush()
    else:
        user.role = role
        user.password_hash = hash_password(password)
        user.is_active = True
    return user


def seed_demo_accounts(db: Session) -> tuple[User, User]:
    candidate = ensure_user(db, DEMO_CANDIDATE_EMAIL, "candidate")
    recruiter = ensure_user(db, DEMO_RECRUITER_EMAIL, "recruiter")

    if candidate.candidate_profile is None:
        db.add(
            CandidateProfile(
                user_id=candidate.id,
                full_name="Alex Chen",
                university="FAST NUCES",
                degree="BS Computer Science",
                graduation_year=2026,
                gpa=3.7,
                target_role="Full Stack Developer",
                experience_level="Student / Early Career",
                tech_stack=["React", "Next.js", "TypeScript", "FastAPI"],
                skills=["React", "TypeScript", "System Design", "Python"],
                profile_visibility=False,
                availability_status="open",
                profile_complete=True,
            )
        )

    if recruiter.company_profile is None:
        db.add(
            CompanyProfile(
                user_id=recruiter.id,
                company_name="Acme Corp",
                recruiter_name="Demo Recruiter",
                website="https://acme.example",
                industry="Software",
                company_size="51-200",
                role_title="Technical Recruiter",
            )
        )

    db.commit()
    return candidate, recruiter
