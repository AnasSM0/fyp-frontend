# XLR8Hire Backend

Phase 1 FastAPI foundation for the XLR8Hire AI reverse hiring marketplace.

This backend is intentionally isolated from the existing Next.js frontend demo. It now supports auth/profile foundation, assessment sessions, AI evaluation fallback, integrity event scoring, and Phase 5 semantic candidate search with PostgreSQL + pgvector storage.

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

Edit `.env` and set a real local `JWT_SECRET_KEY`. Leave `GEMINI_API_KEY` blank for deterministic demo fallback mode.

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

## Seed Question Bank

Phase 2 adds curated assessment questions. This command is safe to rerun; seeded questions are updated by stable IDs instead of duplicated.

```powershell
python -m app.seed.question_bank
```

## AI Evaluation Fallback

Phase 3 adds evaluation report generation. If `GEMINI_API_KEY` is blank, the backend uses a deterministic stub provider so tests and demos still work. Generated reports include:

```json
"provider_metadata": {
  "provider": "gemini|stub",
  "model": "string",
  "fallback_used": true,
  "warnings": [],
  "generated_at": "ISO timestamp"
}
```

The stub is only a reliability fallback. It does not call Gemini and it does not perform embeddings, recruiter search, integrity monitoring, or invite workflows.

## Integrity Monitoring

Phase 4 adds backend support for browser-based assessment integrity events. This is not a lockdown browser. It detects suspicious behavior signals; it does not fully prevent cheating.

Supported event types:

- `TAB_HIDDEN`
- `WINDOW_BLUR`
- `WINDOW_FOCUS_LOST`
- `PASTE_ATTEMPT`
- `COPY_ATTEMPT`
- `RIGHT_CLICK`
- `FULLSCREEN_EXIT`
- `CAMERA_DENIED`
- `NO_FACE_DETECTED`
- `MULTIPLE_FACES_DETECTED`
- `FACE_AWAY`
- `EXCESSIVE_MOVEMENT`
- `LONG_INACTIVITY`
- `FAST_RESPONSE_ANOMALY`

Severity levels:

- `low`
- `medium`
- `high`

Scoring starts at `100`:

- Low events: `-1` each, capped at `-5`
- Medium events: `-4` each, capped at `-20`
- High events: `-10` each, capped at `-40`
- Repeated same-type events after 3 occurrences add a capped repeated-pattern penalty
- Long absence/focus-loss style events can add capped duration penalty

Risk levels:

- `clean`: 95-100
- `low`: 85-94
- `moderate`: 70-84
- `high`: below 70

The backend deduplicates same-type events in a short 2 second window to reduce accidental browser event spam, especially in batch submissions.

Future frontend monitoring should use browser APIs for `visibilitychange`, `blur`, `copy`, `cut`, `paste`, `contextmenu`, `fullscreenchange`, inactivity timers, and lightweight webcam face signals. Webcam monitoring should run every 1-2 seconds, store no raw video, and submit only metadata events such as no face, multiple faces, face away, or excessive movement.

Privacy limitations:

- No raw webcam video is stored.
- No biometric identity verification is performed.
- The system can detect browser and webcam signals, but cannot prevent second devices, OS-level screenshots, another browser, external monitors, or off-camera assistance.

Recommended setup order:

```powershell
alembic upgrade head
python -m app.seed.demo_accounts
python -m app.seed.question_bank
python -m app.seed.search_demo_data
```

## Semantic Matching / Vector Search

Phase 5 adds recruiter semantic candidate search. Candidate embeddings are generated from visible candidate profile data plus the latest published AI evaluation report. Search only returns candidates with:

- `evaluation_reports.published = true`
- `candidate_profiles.profile_visibility = true`
- a stored candidate embedding

The first migration already enables pgvector. Phase 5 adds the `candidate_embeddings` table with an unbounded `vector` column plus JSON fallback storage for SQLite tests.

Embedding behavior:

- Gemini embeddings use `GEMINI_API_KEY` and `GEMINI_EMBEDDING_MODEL`.
- Missing or failed Gemini calls fall back to deterministic stub embeddings.
- Stub mode is expected in local tests and demos without API keys.
- Search responses expose `fallback_mode_used`.

Generate searchable demo candidates:

```powershell
python -m app.seed.search_demo_data
```

Candidate embedding endpoints:

```text
POST /embeddings/candidates/me/rebuild
GET  /embeddings/candidates/me/status
POST /embeddings/candidates/{candidate_id}/rebuild
```

Recruiter search endpoints:

```text
POST /search/candidates
GET  /search/history
```

Match score formula:

```text
0.55 * semantic_similarity
+ 0.30 * verified_score
+ 0.10 * role_fit
+ 0.05 * availability_score
- integrity_penalty
```

This is vector-based matching for FYP/demo scale. No ANN index is added yet; the current dataset is intentionally small.

## Marketplace Lifecycle

Phase 6 adds backend support for the reverse-hiring marketplace flow:

```text
Recruiter searches candidates
-> saves candidate
-> sends invite/request
-> candidate accepts or declines
-> recruiter tracks status
-> both sides receive activity events
```

Saved candidates:

```text
POST   /saved-candidates/{candidate_id}
DELETE /saved-candidates/{candidate_id}
GET    /saved-candidates
GET    /saved-candidates/{candidate_id}/status
```

Invites:

```text
POST  /invites
GET   /invites/recruiter
GET   /invites/recruiter/{invite_id}
PATCH /invites/{invite_id}/withdraw
GET   /invites/candidate
GET   /invites/candidate/{invite_id}
PATCH /invites/{invite_id}/respond
```

Activity:

```text
GET /activity/me
```

Marketplace rules:

- Recruiters can save/invite only candidates with visible profiles and published reports.
- Duplicate saves are idempotent.
- Duplicate pending invites are blocked per recruiter, candidate, and normalized role title.
- `role_title` is preserved for display, but duplicate checks use trimmed/lowercased normalized role text.
- Only pending invites can be accepted, declined, or withdrawn.
- Accepted, declined, and withdrawn invites are immutable in Phase 6.
- Candidate/recruiter invite feeds are scoped to the current user.
- Marketplace responses return safe summaries and do not expose private report JSON.

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
| `GET` | `/assessments/question-bank/summary` | Public | Question bank counts by role/category/difficulty |
| `POST` | `/assessments/sessions` | Candidate | Start or resume assessment session |
| `GET` | `/assessments/sessions/me/latest` | Candidate | Latest candidate session |
| `GET` | `/assessments/sessions/{session_id}` | Candidate | Session detail and transcript |
| `GET` | `/assessments/sessions/{session_id}/current-question` | Candidate | Current unanswered question |
| `POST` | `/assessments/sessions/{session_id}/answers` | Candidate | Submit answer/code for current question |
| `POST` | `/assessments/sessions/{session_id}/finish` | Candidate | Finish an in-progress session |
| `POST` | `/evaluations/sessions/{session_id}/generate` | Candidate | Generate report for completed session |
| `GET` | `/evaluations/reports/me/latest` | Candidate | Latest candidate evaluation report |
| `GET` | `/evaluations/reports/session/{session_id}` | Candidate | Report for one session |
| `GET` | `/evaluations/reports/{report_id}` | Candidate | Report detail |
| `POST` | `/evaluations/reports/{report_id}/publish` | Candidate | Publish report |
| `POST` | `/integrity/events` | Candidate | Submit one integrity event for own active session |
| `POST` | `/integrity/events/batch` | Candidate | Submit multiple integrity events with duplicate suppression |
| `GET` | `/integrity/sessions/{session_id}` | Candidate | Raw integrity events for own session |
| `GET` | `/integrity/sessions/{session_id}/summary` | Candidate | Integrity score and risk summary |
| `POST` | `/embeddings/candidates/me/rebuild` | Candidate | Rebuild own embedding from visible published report |
| `GET` | `/embeddings/candidates/me/status` | Candidate | Current embedding and discoverability status |
| `POST` | `/embeddings/candidates/{candidate_id}/rebuild` | Recruiter | Demo utility to rebuild published visible candidate embedding |
| `POST` | `/search/candidates` | Recruiter | Semantic search over published visible embedded candidates |
| `GET` | `/search/history` | Recruiter | Current recruiter search history |
| `POST` | `/saved-candidates/{candidate_id}` | Recruiter | Save/shortlist published visible candidate |
| `DELETE` | `/saved-candidates/{candidate_id}` | Recruiter | Remove saved candidate |
| `GET` | `/saved-candidates` | Recruiter | List saved candidates |
| `GET` | `/saved-candidates/{candidate_id}/status` | Recruiter | Saved status for one candidate |
| `POST` | `/invites` | Recruiter | Send candidate request/invite |
| `GET` | `/invites/recruiter` | Recruiter | Sent invite tracker |
| `GET` | `/invites/recruiter/{invite_id}` | Recruiter | Sent invite detail |
| `PATCH` | `/invites/{invite_id}/withdraw` | Recruiter | Withdraw pending invite |
| `GET` | `/invites/candidate` | Candidate | Candidate request inbox |
| `GET` | `/invites/candidate/{invite_id}` | Candidate | Candidate request detail |
| `PATCH` | `/invites/{invite_id}/respond` | Candidate | Accept/decline pending invite |
| `GET` | `/activity/me` | User | Current user activity feed |

## Error Behavior

- Duplicate email: `409`
- Invalid login: `401`
- Missing token: `401`
- Invalid or expired token: `401`
- Wrong role access: `403`
- Profile not found: `404`
- Incomplete profile before assessment: `409`
- Wrong assessment session/question state: `409`
- Report generation before session completion: `409`
- Private report access by another candidate: `404`
- Integrity event submission to completed session: `409`
- Invalid request body: `422`
