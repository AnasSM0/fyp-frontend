from __future__ import annotations

import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.db.session import SessionLocal
from app.models.profile import CompanyProfile
from app.services.demo_accounts import DEMO_PASSWORD, ensure_user
from app.services.search_demo_seed import seed_search_demo_data


def seed_recruiter_demo() -> None:
    with SessionLocal() as db:
        recruiter = ensure_user(db, "recruiter@xlr8hire.demo", "recruiter", DEMO_PASSWORD)
        company = recruiter.company_profile
        if company is None:
            company = CompanyProfile(user_id=recruiter.id)
            db.add(company)
            db.flush()
        company.company_name = "XLR8Hire Demo Recruiting"
        company.recruiter_name = "Demo Recruiter"
        company.website = "https://xlr8hire.demo"
        company.industry = "Software"
        company.company_size = "11-50"
        company.role_title = "Technical Recruiter"
        candidate_count = seed_search_demo_data(db)
        db.commit()
    print(f"Seeded recruiter demo account and {candidate_count} published candidates.")


if __name__ == "__main__":
    seed_recruiter_demo()
