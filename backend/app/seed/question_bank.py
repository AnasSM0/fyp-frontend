from app.db.session import SessionLocal
from app.services.question_bank_seed import seed_question_bank


def main() -> None:
    db = SessionLocal()
    try:
        count = seed_question_bank(db)
    finally:
        db.close()

    print(f"Seeded {count} XLR8Hire assessment questions.")


if __name__ == "__main__":
    main()
