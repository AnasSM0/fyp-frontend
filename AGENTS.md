# HirdUp Codex Project Instructions

## Product Context

HirdUp is an AI-driven reverse talent marketplace for a Final Year Project.

Core product loop:

1. Candidate completes onboarding/profile.
2. Candidate takes a backend-powered AI technical assessment.
3. AI generates a verified evaluation report and verified score.
4. Candidate publishes the verified profile.
5. Recruiters discover published candidates through semantic search.
6. Recruiters save/shortlist candidates and send interview requests.
7. Candidates accept/decline recruiter requests.

The app must feel like a connected reverse-hiring marketplace, not separate demo pages. Prioritize discoverable end-to-end flows and technical credibility over decorative polish.

## Tech Stack

- Frontend: Next.js App Router, React, TypeScript, Tailwind CSS, Zustand/localStorage fallback.
- Backend: FastAPI in `/backend`.
- Database: PostgreSQL with pgvector through Docker Compose.
- ORM/migrations: SQLAlchemy 2.x and Alembic.
- AI providers: NVIDIA Nemotron primary, Gemini alternative, Stub final fallback.
- Vector search: PostgreSQL + pgvector for MVP.

## Next.js Rule

This is not assumed-standard Next.js. Before changing frontend code, read the relevant guide in `node_modules/next/dist/docs/`, especially for App Router, fetching, routing, and build behavior. Heed deprecation notices.

## AI Provider Rules

- Keep NVIDIA, Gemini, and Stub all supported.
- Default backend provider is NVIDIA via `DEFAULT_AI_PROVIDER=nvidia`.
- Provider priority:
  1. `X-AI-Provider` header when valid: `nvidia`, `gemini`, or `stub`.
  2. `DEFAULT_AI_PROVIDER`.
  3. Other configured real provider.
  4. Stub.
- Never remove Gemini support.
- Never hardcode or expose API keys in frontend, logs, docs, or code.
- Frontend may send provider preference only; backend owns all AI calls.
- AI responses/reports should preserve provider metadata:
  - `requested_provider`
  - `actual_provider`
  - `provider`
  - `model`
  - `fallback_used`
  - `fallback_chain`
  - `warnings`
  - `generated_at`
- UI/provider wording must use `actual_provider` when available. Do not assume fallback means Gemini failed.

## NVIDIA/Nemotron Usage

Use NVIDIA/Nemotron for reasoning and generation tasks:

- AI evaluation.
- Onboarding chatbot.
- Profile suggestions.
- Match explanations.
- Interview follow-ups.
- Recommendations.

Do not use Nemotron chat models for embeddings unless a proper NVIDIA embedding model/endpoint is configured. Embeddings must use a real embedding provider or deterministic stub fallback.

## Frontend Integration Rules

- Do not visually redesign unless explicitly asked.
- Preserve existing premium UI, animations, layout, and navigation.
- Wire backend in vertical slices, not one large patch.
- Do not remove Zustand/localStorage demo fallback.
- Backend data is primary only when backend is reachable and request succeeds.
- Do not silently fallback for validation/auth/role errors:
  - `401`
  - `403`
  - `409`
  - `422`
- Fallback may be used for:
  - backend unavailable
  - network failure
  - timeout
  - `5xx`
  - demo mode when `NEXT_PUBLIC_DEMO_FALLBACK=true`
- Keep API calls centralized under `src/lib/api`.
- Prefer typed service helpers and adapters over page-local fetch logic.
- Do not wire pages in service-layer-only slices.

## Static Content Rule

When backend is available, candidate-facing pages must not use static/mock data as the primary source.

Static/demo data is allowed only when:

- backend is unavailable.
- network fails.
- demo fallback is enabled.

If a page still uses static content, classify it as:

- must replace now
- acceptable temporary fallback
- future polish

## Backend Rules

- Keep backend isolated inside `/backend`.
- Use FastAPI routers, Pydantic schemas, SQLAlchemy models, services, and Alembic migrations.
- Keep `/docs` clean and usable.
- Use role-based access control:
  - candidate-only endpoints for candidate profile, assessment, reports, candidate inbox, integrity events.
  - recruiter-only endpoints for search, saved candidates, recruiter invites.
- Return clear errors:
  - duplicate email: `409`
  - invalid login/token: `401`
  - wrong role: `403`
  - missing resource/profile: `404`
  - invalid body: `422`
- Do not expose private `report_json` through marketplace/search endpoints unless explicitly required.
- Do not store raw webcam/video. Integrity monitoring stores timestamped metadata only.
- Be honest: browser integrity monitoring detects suspicious behavior; it is not a lockdown browser.

## Fallback And Demo Reliability

- Stub AI and local demo data exist for presentation reliability, not as the primary backend path.
- Missing NVIDIA/Gemini keys must not crash the demo; backend should fall back and record metadata.
- Frontend should continue working in demo fallback when backend is down.
- During real-backend testing, do not let fallback hide backend failures.
- Clearly classify static/mock areas as:
  - acceptable for current demo
  - should fix
  - must fix

## Scope Discipline

- Follow the current approved slice only.
- Do not add unrelated features.
- Do not implement recruiter-side work during candidate-only slices.
- Do not implement frontend wiring during backend-only slices.
- Do not implement backend changes during frontend service-only slices.
- Do not build full code execution yet; MVP stores code and uses LLM reasoning/evaluation.
- Do not add Pinecone unless pgvector is a blocker.
- Do not implement webcam frontend or raw video storage unless explicitly approved.
- Prefer small, testable vertical slices.

## Codex Work Style

- Before editing, list the exact files you plan to change.
- If more than 8 files are needed, explain why before editing.
- Prefer minimal diffs over broad refactors.
- Do not rescan the full codebase unless blocked.
- Inspect only files relevant to the current slice.
- After implementation, summarize:
  - files changed
  - behavior added
  - tests run
  - known issues
  - next recommended step

## Planning vs Implementation

- If the user asks for a plan, do not implement.
- If the user approves implementation, implement only the approved slice.
- Do not continue into the next slice without explicit approval.

## Current Active Slice

Current active work should focus on candidate-side frontend backend integration.

Priority order:

1. Candidate API service layer.
2. Onboarding AI wiring.
3. Candidate dashboard backend data.
4. Assessment/interview backend flow.
5. AI results/report rendering.
6. Publish/profile visibility.
7. Candidate requests/activity.

Do not start recruiter frontend integration until candidate-side backend flow is stable.

## Test Commands

Frontend:

```powershell
npm run lint
npx tsc --noEmit
npm run build
```

If `npm` is not on PATH in the sandbox, use local binaries with bundled Node:

```powershell
$env:PATH='C:\Users\Anas SM\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;' + $env:PATH
.\node_modules\.bin\eslint.cmd
.\node_modules\.bin\tsc.cmd --noEmit
.\node_modules\.bin\next.cmd build
```

Backend:

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest
.\.venv\Scripts\python.exe -m compileall app tests alembic
```

Backend setup:

```powershell
cd backend
docker compose up -d db
alembic upgrade head
python -m app.seed.demo_accounts
python -m app.seed.question_bank
python -m app.seed.search_demo_data
uvicorn app.main:app --reload
```

Useful local URLs:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- FastAPI docs: `http://localhost:8000/docs`
- Health: `http://localhost:8000/health`

## Demo Accounts

Candidate:

- Email: `candidate@xlr8hire.demo`
- Password: `demo1234`

Recruiter:

- Email: `recruiter@xlr8hire.demo`
- Password: `demo1234`

## Current Implementation Priorities

Candidate-side real backend flow is the main priority:

1. Onboarding AI and backend profile save.
2. Student dashboard backed by profile/session/report/invites/activity.
3. Backend assessment session and answer submission.
4. AI report generation with NVIDIA/Gemini/Stub metadata.
5. Report publish and embedding/search readiness.
6. Candidate recruiter requests and activity feed.

For FYP credibility, always distinguish:

- real backend-powered behavior
- AI-provider fallback behavior
- local/static demo behavior
