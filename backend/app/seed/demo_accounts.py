from app.db.session import SessionLocal
from app.services.demo_accounts import (
    DEMO_CANDIDATE_EMAIL,
    DEMO_PASSWORD,
    DEMO_RECRUITER_EMAIL,
    seed_demo_accounts,
)


def main() -> None:
    db = SessionLocal()
    try:
        seed_demo_accounts(db)
    finally:
        db.close()

    print("Seeded XLR8Hire demo accounts:")
    print(f"  Candidate: {DEMO_CANDIDATE_EMAIL} / {DEMO_PASSWORD}")
    print(f"  Recruiter: {DEMO_RECRUITER_EMAIL} / {DEMO_PASSWORD}")


if __name__ == "__main__":
    main()
