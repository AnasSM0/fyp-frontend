# XLR8Hire Backend

Phase 1 FastAPI foundation for the XLR8Hire AI reverse hiring marketplace.

This backend is intentionally isolated from the existing Next.js frontend demo. Phase 1 adds authentication, role-based access, candidate/company profile persistence, PostgreSQL + pgvector setup, predictable demo accounts, and tests. It does not implement interviews, Gemini calls, embeddings, search, invites, or integrity monitoring yet.

## Requirements

- Python 3.12+
- Docker Desktop
- PostgreSQL is provided by `docker-compose.yml` using a pgvector-enabled image.

## Setup

From `backend/`:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `.env` and set a real local `JWT_SECRET_KEY`. Leave `GEMINI_API_KEY` blank for Phase 1.

## Start PostgreSQL + pgvector

From `backend/`:

```powershell
docker compose up -d db
```

If your Docker Desktop install uses the standalone Compose binary instead of the Docker CLI plugin, use:

```powershell
docker-compose up -d db
```

If Docker prints a config permission warning on this machine, confirm the database container still starts with:

```powershell
docker compose ps
```

or:

```powershell
docker-compose ps
```

## Run Migrations

```powershell
alembic upgrade head
```

The first migration enables the `vector` extension and creates Phase 1 auth/profile tables.

## Seed Demo Accounts

The seed command is safe to rerun. It updates or reuses existing demo users instead of duplicating them.

```powershell
python -m app.seed.demo_accounts
```

Demo credentials:

- Candidate: `candidate@xlr8hire.demo` / `demo1234`
- Recruiter: `recruiter@xlr8hire.demo` / `demo1234`

## Start API

```powershell
uvicorn app.main:app --reload
```

API docs:

```text
http://localhost:8000/docs
```

Health check:

```text
http://localhost:8000/health
```

## Run Tests

```powershell
pytest
```

Tests use an in-memory SQLite database and dependency overrides so they can run without mutating the local PostgreSQL demo database.

## Phase 1 Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/health` | Public | API and DB readiness |
| `POST` | `/auth/signup` | Public | Create candidate/recruiter user |
| `POST` | `/auth/login` | Public | Login and receive JWT |
| `POST` | `/auth/demo-login` | Public | Login as seeded demo role |
| `GET` | `/auth/me` | User | Current user |
| `GET` | `/profiles/candidate/me` | Candidate | Current candidate profile |
| `PUT` | `/profiles/candidate/me` | Candidate | Create/update candidate profile |
| `GET` | `/profiles/company/me` | Recruiter | Current company profile |
| `PUT` | `/profiles/company/me` | Recruiter | Create/update company profile |

## Error Behavior

- Duplicate email: `409`
- Invalid login: `401`
- Missing token: `401`
- Invalid or expired token: `401`
- Wrong role access: `403`
- Profile not found: `404`
- Invalid request body: `422`
