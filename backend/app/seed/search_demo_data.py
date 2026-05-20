from app.db.session import SessionLocal
from app.services.search_demo_seed import seed_search_demo_data


def main() -> None:
    with SessionLocal() as db:
        count = seed_search_demo_data(db)
    print(f"Seeded {count} semantic search demo candidates.")


if __name__ == "__main__":
    main()
