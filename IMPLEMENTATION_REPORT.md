# HirdUp Implementation Report

Generated from the current repository state on 2026-06-03.

This report documents what is implemented in the HirdUp codebase today. It is intentionally evidence-based: claims are tied to current files, routes, models, services, tests, and frontend pages. It does not treat older project instructions as authoritative when they conflict with source code.

Status labels:

- **Complete**: Implemented and wired with clear source evidence.
- **Partially Complete**: Meaningful implementation exists, but it is limited, incomplete, or not consistently wired end to end.
- **Placeholder**: UI/code exists mainly as mock, demo, localStorage, or static state.
- **Planned**: Product direction exists, but implementation is not present in inspected code.
- **Broken/Needs Fix**: Implemented path has a known correctness, reliability, or consistency risk.

## Executive Summary

HirdUp is implemented as a Next.js App Router frontend with a FastAPI backend for an AI-driven reverse talent marketplace Final Year Project.

The candidate-side loop is the strongest and most complete part of the product:

1. Candidate authentication.
2. Candidate profile/onboarding.
3. Backend-powered assessment session creation.
4. Adaptive interview page for written and coding questions.
5. Python-only MVP code execution for supported coding tasks.
6. Batched AI evaluation/report generation.
7. Results/report display, weak-area improvement plan, publish flow, embedding status, requests, and activity.

The backend recruiter marketplace lifecycle is also implemented: semantic search, saved candidates, invites, invite responses, and activity events. The recruiter frontend, however, is still heavily mock-backed in multiple pages.

Current strongest demo path:

```text
candidate login/signup
-> onboarding/profile save
-> assessment prep
-> start backend assessment session
-> answer written/coding questions
-> finish assessment
-> generate batched AI report
-> view results
-> publish verified profile
-> candidate embedding/status
-> backend recruiter search/save/invite flow
```

Main risks:

- Real evaluation depends on free-tier AI provider availability.
- Current backend default AI provider is `gemini`, while older project instructions mention NVIDIA.
- Live evaluation is configured to fail closed when real AI is unavailable and Stub reports are disabled.
- Recruiter frontend pages still use mock marketplace data.
- Code execution is subprocess-based MVP runner, not production sandboxing.
- Some public/docs copy still references demo/mock behavior.

## Tech Stack

### Frontend

Status: **Complete**

- Next.js App Router under `src/app`.
- React + TypeScript.
- Tailwind CSS and CSS theme variables.
- Zustand/localStorage demo store remains available.
- Framer Motion and lucide-react are used for animations/icons.
- Agentation is installed and rendered in development through `src/app/layout.tsx`.

Evidence:

- `package.json`
- `src/app/layout.tsx`
- `src/app/globals.css`
- `src/store/useMarketplaceStore.ts`

### Backend

Status: **Complete**

- FastAPI app under `backend/app`.
- SQLAlchemy ORM models.
- Alembic migrations.
- PostgreSQL + pgvector via backend Docker Compose.
- Pydantic schemas.
- Pytest suite.

Evidence:

- `backend/app/main.py`
- `backend/app/models/*.py`
- `backend/alembic/versions/*.py`
- `backend/pyproject.toml`
- `backend/docker-compose.yml`

## Backend API Surface

The FastAPI app registers these routers:

- `health`
- `auth`
- `ai`
- `profiles`
- `assessments`
- `evaluations`
- `integrity`
- `embeddings`
- `search`
- `saved_candidates`
- `invites`
- `activity`

Evidence: `backend/app/main.py`

### Health

Status: **Complete**

- `GET /health`

Evidence:

- `backend/app/api/routes/health.py`

### Auth

Status: **Complete**

Endpoints:

- `POST /auth/signup`
- `POST /auth/login`
- `POST /auth/demo-login`
- `GET /auth/me`

Behavior:

- Supports candidate and recruiter roles.
- Duplicate email returns `409`.
- Invalid credentials return `401`.
- Demo login endpoint exists for seeded demo accounts.

Evidence:

- `backend/app/api/routes/auth.py`
- `backend/app/core/security.py`
- `backend/tests/test_phase1.py`

### Profiles

Status: **Complete**

Endpoints:

- `GET /profiles/candidate/me`
- `PUT /profiles/candidate/me`
- `GET /profiles/company/me`
- `PUT /profiles/company/me`

Behavior:

- Candidate and recruiter profile access is role-gated.
- Candidate profile contains identity, education, GPA, target role, experience level, skills, tech stack, portfolio links, visibility, and completion state.
- Company profile stores recruiter/company metadata.

Evidence:

- `backend/app/api/routes/profiles.py`
- `backend/app/models/profile.py`
- `backend/app/schemas/profile.py`

### Onboarding AI

Status: **Complete for Secondary Copilot Use**

Endpoint:

- `POST /ai/onboarding/chat`

Behavior:

- Uses backend AI provider pipeline.
- Frontend onboarding is form-first; AI is used as a helper, not the primary flow.
- Fast onboarding mode and Stub fallback are supported for demo reliability.

Evidence:

- `backend/app/api/routes/ai.py`
- `backend/app/services/ai_provider_factory.py`
- `src/app/onboarding/page.tsx`
- `src/lib/api/onboarding-ai-service.ts`

### Assessment Sessions

Status: **Complete**

Endpoints:

- `GET /assessments/question-bank/summary`
- `POST /assessments/sessions`
- `GET /assessments/sessions/me/latest`
- `GET /assessments/sessions/{session_id}`
- `GET /assessments/sessions/{session_id}/current-question`
- `POST /assessments/sessions/{session_id}/answers`
- `POST /assessments/sessions/{session_id}/questions/{question_id}/run-code`
- `POST /assessments/sessions/{session_id}/finish`

Behavior:

- Candidate-only.
- Requires a complete candidate profile before starting.
- Reuses in-progress session unless `force_new` is requested.
- Builds a 6-question plan.
- Uses RAG assessment selection when enabled.
- Falls back to curated question bank when RAG fails and fallback is enabled.
- Answers must target the current question.
- Session can be finished after at least one answer.

Evidence:

- `backend/app/api/routes/assessments.py`
- `backend/app/services/assessment_service.py`
- `backend/app/models/assessment.py`
- `backend/app/schemas/assessment.py`
- `backend/tests/test_assessments.py`
- `backend/tests/test_rag_assessment_integration.py`

### Code Execution

Status: **Partially Complete**

Endpoint:

- `POST /assessments/sessions/{session_id}/questions/{question_id}/run-code`

Implemented:

- Python 3 only.
- Executes only when the copied assessment question has execution support.
- Test cases are backend-side in scoring rubric execution metadata.
- Public question response exposes safe execution metadata:
  - `execution_supported`
  - `execution_reason`
  - `language`
  - `function_name`
  - `starter_code`
- Uses subprocess, temporary files, timeout, code size limit, stdout/stderr capture.
- Blocks dangerous imports/calls by AST inspection.

Limitations:

- Not production sandboxing.
- No Docker, Firecracker, seccomp, network namespace isolation, or Judge0-style runner.
- Python function-call test format only.

Evidence:

- `backend/app/services/code_execution_service.py`
- `backend/app/api/routes/assessments.py`
- `backend/data/rag/xlr8hire_core_rag_dataset.json`
- `backend/tests/test_code_execution.py`

### Evaluation Reports

Status: **Complete for MVP / Free-Tier Mode**

Endpoints:

- `POST /evaluations/sessions/{session_id}/generate`
- `GET /evaluations/reports/me/latest`
- `GET /evaluations/reports/session/{session_id}`
- `GET /evaluations/reports/{report_id}`
- `POST /evaluations/reports/{report_id}/coach`
- `POST /evaluations/reports/{report_id}/publish`

Behavior:

- Requires completed assessment session.
- Existing report is returned unless `force_regenerate=true`.
- In-memory report generation lock prevents duplicate provider calls in the single-process demo backend.
- Batch evaluation mode evaluates a full report with one provider operation.
- All session questions are represented in report output, including skipped/blank/idk answers.
- Weak answers are classified and scored low.
- Provider metadata and AI call audit summary are stored in `report_json`.
- Stub cannot create live reports when `AI_REQUIRED_FOR_EVALUATION=true` and `ALLOW_STUB_EVALUATION=false`.
- AI provider 429/503 failures return retryable error payloads rather than fake reports.

Limitations:

- Lock is in-memory, not multi-worker safe.
- Real report generation fails closed when the real provider fails and Stub evaluation is disabled.
- Quality and availability depend on external free-tier provider behavior.

Evidence:

- `backend/app/api/routes/evaluations.py`
- `backend/app/services/evaluation_service.py`
- `backend/app/services/ai_call_audit.py`
- `backend/app/models/evaluation.py`
- `backend/tests/test_evaluations.py`

### Integrity Monitoring

Status: **Complete for Metadata MVP**

Endpoints:

- `POST /integrity/events`
- `POST /integrity/events/batch`
- `GET /integrity/sessions/{session_id}`
- `GET /integrity/sessions/{session_id}/summary`

Behavior:

- Candidate-only event submission.
- Accepts events only for in-progress sessions.
- Deduplicates repeated event types within a short window.
- Computes risk level and integrity score.
- Stores timestamped metadata only; no raw webcam/video storage.

Evidence:

- `backend/app/api/routes/integrity.py`
- `backend/app/services/integrity_service.py`
- `backend/app/models/integrity.py`
- `backend/tests/test_integrity.py`

### Candidate Embeddings

Status: **Complete for MVP**

Endpoints:

- `POST /embeddings/candidates/me/rebuild`
- `GET /embeddings/candidates/me/status`
- `POST /embeddings/candidates/{candidate_id}/rebuild`

Behavior:

- Candidate embedding text is built from visible profile and latest published report.
- Candidate must be visible/published to be embedded.
- Embeddings support vector and JSON fallback storage.
- Live Gemini embedding calls are disabled by default.
- Stub embedding provider is available.

Evidence:

- `backend/app/api/routes/embeddings.py`
- `backend/app/services/candidate_embedding_service.py`
- `backend/app/services/embedding_provider.py`
- `backend/app/models/semantic.py`
- `backend/tests/test_semantic.py`

### Recruiter Semantic Search

Status: **Complete on Backend / Partially Complete on Frontend**

Endpoints:

- `POST /search/candidates`
- `GET /search/history`

Behavior:

- Recruiter-only.
- Searches visible, published candidates with embeddings.
- Match score combines semantic similarity, verified score, role fit, availability, and integrity penalty.
- Search history is persisted.
- Private report JSON is not exposed through search results.

Evidence:

- `backend/app/api/routes/search.py`
- `backend/app/services/candidate_search_service.py`
- `backend/app/models/semantic.py`
- `backend/tests/test_semantic.py`

Frontend caveat:

- `src/app/dashboard/company/search/page.tsx` still imports `MARKETPLACE_CANDIDATES` from `src/lib/mock-marketplace.ts`.

### Saved Candidates, Invites, Activity

Status: **Complete on Backend / Mixed Frontend Wiring**

Endpoints:

- `POST /saved-candidates/{candidate_id}`
- `DELETE /saved-candidates/{candidate_id}`
- `GET /saved-candidates`
- `GET /saved-candidates/{candidate_id}/status`
- `POST /invites`
- `GET /invites/recruiter`
- `GET /invites/recruiter/{invite_id}`
- `PATCH /invites/{invite_id}/withdraw`
- `GET /invites/candidate`
- `GET /invites/candidate/{invite_id}`
- `PATCH /invites/{invite_id}/respond`
- `GET /activity/me`

Behavior:

- Recruiters can save/invite discoverable candidates.
- Duplicate save is idempotent.
- Duplicate pending invite for normalized role is blocked.
- Candidates can accept/decline pending invites.
- Recruiters can withdraw pending invites.
- Activity events are emitted for marketplace actions.

Evidence:

- `backend/app/api/routes/saved_candidates.py`
- `backend/app/api/routes/invites.py`
- `backend/app/api/routes/activity.py`
- `backend/app/services/marketplace_service.py`
- `backend/app/services/activity_service.py`
- `backend/app/models/marketplace.py`
- `backend/tests/test_marketplace.py`

Frontend caveat:

- Candidate requests/activity pages are backend-wired.
- Recruiter saved/search/candidate/offers pages still rely heavily on Zustand/mock marketplace state.

## Database Models and Migrations

Status: **Complete for MVP Schema**

Alembic migrations:

- `0001_phase1_foundation.py`
- `0002_assessment_core.py`
- `0003_evaluation_core.py`
- `0004_integrity_monitoring.py`
- `0005_semantic_matching.py`
- `0006_marketplace_lifecycle.py`
- `0007_rag_documents.py`

Model groups:

- `User`
- `CandidateProfile`
- `CompanyProfile`
- `QuestionBank`
- `AssessmentSession`
- `AssessmentQuestion`
- `AssessmentAnswer`
- `EvaluationReport`
- `IntegrityEvent`
- `CandidateEmbedding`
- `RecruiterSearch`
- `SavedCandidate`
- `Invite`
- `ActivityEvent`
- `RagDocument`
- `AssessmentRetrieval`

Important constraints and behavior:

- One evaluation report per assessment session.
- One answer per copied assessment question.
- Saved candidates are unique per recruiter/candidate.
- Candidate embedding uniqueness includes candidate/report/source type.

Evidence:

- `backend/app/models/*.py`
- `backend/alembic/versions/*.py`

## RAG Dataset and Retrieval

Status: **Complete for Curated MVP**

Dataset file:

- `backend/data/rag/xlr8hire_core_rag_dataset.json`

Current dataset counts:

```text
Total records: 105

By source_type:
- coding_task: 16
- follow_up_template: 14
- onboarding_prompt: 12
- question: 30
- role_discovery_question: 12
- rubric: 21

By difficulty:
- advanced: 8
- beginner: 38
- intermediate: 59

By role:
- AI/ML Engineer: 16
- Backend Developer: 17
- Database Engineer: 14
- Frontend Developer: 16
- Full Stack Developer: 21
- General Software Candidate: 21
```

Retrieval behavior:

- RAG documents are represented by `RagDocument`.
- Assessment retrieval uses `question` and `coding_task` source types.
- Retrieval scoring uses text/vector style scoring plus stack, role, difficulty, and diversity signals.
- Assessment plan attempts balanced slots across frontend, backend, database, full-stack, debugging, and communication areas.
- Evaluation rubric context is compressed before prompt construction.
- In free-tier evaluation mode, local rubric matching can avoid external embedding calls.
- Generic rubric fallback exists when no specific rubric is found.

Evidence:

- `backend/data/rag/xlr8hire_core_rag_dataset.json`
- `backend/app/models/rag.py`
- `backend/app/services/rag_dataset.py`
- `backend/app/services/rag_ingestion_service.py`
- `backend/app/services/rag_retrieval_service.py`
- `backend/app/services/assessment_service.py`
- `backend/app/services/evaluation_service.py`
- `backend/tests/test_rag_dataset.py`
- `backend/tests/test_rag_retrieval.py`
- `backend/tests/test_rag_ingestion.py`
- `backend/tests/test_rag_assessment_integration.py`
- `backend/tests/test_rag_evaluation_integration.py`

## AI Provider Pipeline

Status: **Partially Complete / Provider-Dependent**

Supported provider names:

- `openrouter`
- `nvidia`
- `gemini`
- `stub`

Current backend default:

- `default_ai_provider = "gemini"` in `backend/app/core/config.py`.

This conflicts with older AGENTS/project text that says NVIDIA is the default. Current source code is authoritative for this report.

Important current settings:

```text
AI_FREE_TIER_MODE=true
BATCH_EVALUATION_ENABLED=true
EVALUATION_MAX_AI_CALLS_PER_REPORT=1
EVALUATION_DISABLE_PROVIDER_FALLBACK=true
OPENROUTER_SINGLE_MODEL_MODE=true
AI_REQUIRED_FOR_EVALUATION=true
ALLOW_STUB_EVALUATION=false
ENABLE_NVIDIA_FALLBACK=false
ENABLE_GEMINI_FALLBACK=false
REPORT_GENERATION_LOCK_ENABLED=true
RAG_EVALUATION_EMBEDDING_MODE=local
ENABLE_LIVE_EMBEDDING_CALLS=false
```

Provider behavior:

- `X-AI-Provider` is validated against allowed providers.
- Invalid provider returns `422`.
- Onboarding has fast-mode fallback behavior.
- Evaluation in current free-tier mode uses one selected provider and disables provider fallback.
- Stub remains supported, but cannot create live verified reports when real AI is required and Stub evaluation is disabled.
- Provider metadata includes requested provider, actual provider, model, warnings, fallback chain, cooldown/health, failures, latency, model attempts, and fallback-skipped state.
- OpenRouter, Gemini, NVIDIA, and Stub provider implementations exist.

Evidence:

- `backend/app/core/config.py`
- `backend/app/services/ai_provider.py`
- `backend/app/services/ai_provider_factory.py`
- `backend/app/services/ai_provider_health.py`
- `backend/app/services/openrouter_provider.py`
- `backend/app/services/gemini_provider.py`
- `backend/app/services/nvidia_provider.py`
- `backend/app/services/ai_call_audit.py`
- `backend/tests/test_openrouter_provider.py`
- `backend/tests/test_gemini_provider.py`
- `backend/tests/test_evaluations.py`

Known risks:

- Free-tier providers can return 429s or malformed JSON.
- Current live evaluation fails closed if the real provider is unavailable.
- Provider defaults and demo setup must be documented carefully before presentation.

## Evaluation and Scoring

Status: **Complete for MVP**

Implemented:

- Batched evaluation path for one provider operation per report attempt.
- Compact batch response schema.
- Local JSON extraction/repair in provider parsing.
- Score clamping.
- Missing optional field defaults.
- Missing question evaluations backfilled with conservative low entries.
- Blank/idk/skipped answers included and scored low.
- Report JSON includes score components, provider metadata, question-wise scores, RAG summary, integrity summary, and AI call summary.
- Verified score is calculated by `scoring_service`.

Score inputs include:

- AI test score.
- Technical score.
- Communication score.
- Problem-solving score.
- System design score.
- Code quality score.
- Project/profile quality score.
- Academic score from GPA.
- Integrity score and penalty.

Evidence:

- `backend/app/services/evaluation_service.py`
- `backend/app/services/scoring_service.py`
- `backend/app/schemas/evaluation.py`
- `backend/tests/test_evaluations.py`

## Frontend Implementation

### Public and Auth Pages

Status: **Complete for MVP**

Pages:

- `/`
- `/login`
- `/signup`
- `/forgot-password`
- `/privacy`
- `/terms`

Evidence:

- `src/app/page.tsx`
- `src/app/login/page.tsx`
- `src/app/signup/page.tsx`
- `src/app/forgot-password/page.tsx`
- `src/app/privacy/page.tsx`
- `src/app/terms/page.tsx`
- `src/lib/api/auth-service.ts`

Known issue:

- `privacy` and `terms` pages still contain demo/mock wording and should be updated for current backend-powered behavior.

### Candidate Onboarding

Status: **Complete**

Page:

- `/onboarding`

Behavior:

- Multi-step Talent Profile Builder.
- Saves backend candidate profile.
- Uses AI copilot only as a secondary helper.
- Keeps local/demo fallback where allowed.
- Still uses Zustand demo store for some local presentation continuity.

Evidence:

- `src/app/onboarding/page.tsx`
- `src/lib/api/profile-service.ts`
- `src/lib/api/onboarding-ai-service.ts`
- `src/store/useMarketplaceStore.ts`

### Candidate Dashboard

Status: **Partially Complete**

Page:

- `/dashboard/student`

Behavior:

- Loads candidate profile, latest evaluation report, candidate invites, and activity through backend API helpers.
- Avoids static score as primary source when backend report exists.
- Retains local/demo fallback paths when allowed.
- Still imports/use Zustand marketplace store.

Evidence:

- `src/app/dashboard/student/page.tsx`
- `src/lib/api/profile-service.ts`
- `src/lib/api/evaluation-service.ts`
- `src/lib/api/invite-service.ts`
- `src/lib/api/activity-service.ts`
- `src/store/useMarketplaceStore.ts`

### Assessment Prep Page

Status: **Complete**

Page:

- `/dashboard/student/interview/prep`

Behavior:

- Loads candidate profile and latest session.
- Distinguishes profile missing, profile incomplete, active session, ready state, expired auth, and backend failures.
- Starts or continues backend assessment session.
- CTA is placed near the top and theme-aware.

Evidence:

- `src/app/dashboard/student/interview/prep/page.tsx`
- `src/lib/api/profile-service.ts`
- `src/lib/api/assessment-service.ts`

### Active Assessment Page

Status: **Complete for MVP**

Page:

- `/dashboard/student/interview`

Behavior:

- Loads latest backend assessment session.
- Adaptive non-coding versus coding layout.
- Written questions use textarea answer flow.
- Coding questions can run backend code execution when supported.
- Submit answer, finish session, timer/progress, and integrity tracking are wired.
- Demo fallback question remains for backend-unavailable/demo states.

Evidence:

- `src/app/dashboard/student/interview/page.tsx`
- `src/lib/api/assessment-service.ts`
- `src/lib/api/integrity-service.ts`
- `src/lib/use-integrity-events.ts`

### Results Page

Status: **Complete**

Page:

- `/dashboard/student/results`

Behavior:

- Gets report by session first.
- Generates report once if missing.
- Handles `202 generation_in_progress`, `429`, and `503` states.
- Does not auto-retry provider-unavailable states.
- Displays backend report data when available.
- Hides provider/debug metadata unless `localStorage.xlr8_show_debug_metadata === "true"`.
- Can publish report and refresh embedding status.

Evidence:

- `src/app/dashboard/student/results/page.tsx`
- `src/lib/api/evaluation-service.ts`
- `src/lib/report-display-adapter.ts`
- `src/components/debug/rag-debug-panel.tsx`
- `src/lib/debug-metadata.ts`

### Improvement Plan / Weak Areas

Status: **Complete for MVP**

Page:

- `/dashboard/student/results/post-mortem`

Behavior:

- Structured improvement plan page rather than chat-first post-mortem.
- Loads latest backend report.
- Uses existing report data first.
- Optional AI coach is invoked on demand through backend coach endpoint.
- Session-level prompt caching is implemented in page state.

Evidence:

- `src/app/dashboard/student/results/post-mortem/page.tsx`
- `src/lib/api/evaluation-service.ts`

### Candidate Visibility

Status: **Partially Complete**

Page:

- `/dashboard/student/visibility`

Behavior:

- Loads latest backend report, candidate invites, and embedding status.
- Can publish report through backend.
- Shows discoverability/embedding readiness.
- Still retains fallback/local state paths.

Evidence:

- `src/app/dashboard/student/visibility/page.tsx`
- `src/lib/api/evaluation-service.ts`
- `src/lib/api/embedding-service.ts`
- `src/lib/api/invite-service.ts`
- `src/store/useMarketplaceStore.ts`

### Candidate Requests and Activity

Status: **Complete for MVP**

Pages:

- `/dashboard/student/requests`
- `/dashboard/student/activity`

Behavior:

- Candidate requests load backend invites and can respond.
- Activity page loads backend activity feed.
- Both keep local fallback paths when allowed.

Evidence:

- `src/app/dashboard/student/requests/page.tsx`
- `src/app/dashboard/student/activity/page.tsx`
- `src/lib/api/invite-service.ts`
- `src/lib/api/activity-service.ts`

### Candidate Projects, Messages, Settings

Status: **Placeholder / Partially Complete**

Pages:

- `/dashboard/student/projects`
- `/dashboard/student/messages`
- `/dashboard/student/settings`

Notes:

- Pages exist, but the inspected backend does not provide full projects/messages APIs.
- Settings uses local/Zustand style state.
- Treat these as supporting UI, not core verified marketplace flow.

### Recruiter Dashboard and Marketplace Pages

Status: **Backend Complete / Frontend Placeholder or Partially Complete**

Pages:

- `/dashboard/company`
- `/dashboard/company/search`
- `/dashboard/company/saved`
- `/dashboard/company/candidate`
- `/dashboard/company/analytics`
- `/dashboard/company/leaderboard`
- `/dashboard/company/messages`
- `/dashboard/company/offers`
- `/dashboard/company/settings`

Backend:

- Company profile, search, saved candidates, invites, activity are implemented.

Frontend:

- Several company pages still import `MARKETPLACE_CANDIDATES`, `getCandidateById`, or `useMarketplaceStore`.
- No `src/lib/api/company-service.ts` exists.
- Recruiter frontend is not fully backend-integrated.

Evidence:

- `src/app/dashboard/company/page.tsx`
- `src/app/dashboard/company/search/page.tsx`
- `src/app/dashboard/company/saved/page.tsx`
- `src/app/dashboard/company/candidate/page.tsx`
- `src/app/dashboard/company/offers/page.tsx`
- `src/lib/mock-marketplace.ts`
- `src/store/useMarketplaceStore.ts`
- `backend/app/api/routes/search.py`
- `backend/app/api/routes/saved_candidates.py`
- `backend/app/api/routes/invites.py`

## Frontend API Layer

Status: **Partially Complete**

Implemented helpers:

- `auth-service.ts`
- `auth.ts`
- `client.ts`
- `errors.ts`
- `fallback.ts`
- `profile-service.ts`
- `onboarding-ai-service.ts`
- `assessment-service.ts`
- `evaluation-service.ts`
- `embedding-service.ts`
- `invite-service.ts`
- `integrity-service.ts`
- `activity-service.ts`
- `types.ts`

Important behavior:

- API calls are centralized under `src/lib/api`.
- `X-AI-Provider` is sent only when dev provider selection is explicitly enabled.
- Backend default provider is respected when no explicit frontend provider is selected.
- Demo fallback helpers are centralized.

Missing:

- No `company-service.ts`.
- No consistent recruiter frontend service layer for backend search/saved/invites.

Evidence:

- `src/lib/api/*.ts`
- `src/lib/api/client.ts`

## Configuration

Status: **Complete but Requires Demo Discipline**

Backend source defaults:

- Database: local PostgreSQL URL.
- JWT: local demo secret unless overridden.
- Default AI provider: `gemini`.
- Free-tier mode: enabled.
- Batch evaluation: enabled.
- Max AI calls per report: `1`.
- Provider fallback during evaluation: disabled.
- Stub evaluation for live reports: disabled.
- RAG assessment/evaluation: enabled.
- Evaluation rubric embedding mode: local.
- Live embedding calls: disabled.
- Code runner: enabled, 3 second timeout, 12000 character max code.

Frontend:

- API base URL and demo fallback are configured in `src/lib/config.ts`.
- API client handles auth token and optional explicit provider header.

Evidence:

- `backend/app/core/config.py`
- `src/lib/config.ts`
- `src/lib/api/client.ts`

Known mismatch:

- AGENTS/project text says NVIDIA is the default backend provider.
- Current source sets the default provider to Gemini.

## Tests and Verification

Status: **Complete test/build verification in current session**

Last verified command results in this thread:

Backend:

```text
.\.venv\Scripts\python.exe -m pytest --basetemp C:\tmp\xlr8hire-pytest
165 passed, 1 pytest cache warning

.\.venv\Scripts\python.exe -m compileall app tests alembic
passed
```

Frontend:

```text
npm run lint
passed with 14 warnings

npx tsc --noEmit
passed

npm run build
passed
```

The lint warnings are existing unused-import/hook warnings in unrelated frontend files, not fatal errors.

Test areas present:

- Assessment flow.
- Code execution.
- Evaluation/report generation.
- Gemini provider.
- OpenRouter provider.
- Onboarding AI.
- RAG dataset/ingestion/retrieval/assessment/evaluation.
- Integrity.
- Marketplace.
- Semantic search.

Evidence:

- `backend/tests/*.py`
- Verification command output from the current thread.

## Known Issues and Gaps

### 1. Recruiter Frontend Is Not Backend-Wired End to End

Status: **Partially Complete / Needs Fix**

Backend recruiter marketplace APIs exist, but company dashboard/search/saved/candidate pages still use mock marketplace data and Zustand local state. This is the largest gap in the reverse marketplace loop.

### 2. Provider Availability Is Free-Tier Bound

Status: **Needs Monitoring**

The backend now avoids provider call explosion with batch mode, local rubric mode, and no evaluation fallback. However, live report generation still requires a real provider. If Gemini/OpenRouter/NVIDIA fails, the system returns a retryable error instead of creating a fake verified report.

### 3. Default Provider Documentation Is Inconsistent

Status: **Needs Fix**

Current code defaults to Gemini, while older project instructions mention NVIDIA. Demo setup should explicitly document the intended provider and environment variables.

### 4. Code Runner Is MVP Only

Status: **Known Limitation**

The Python runner is useful for FYP credibility but is not production-grade sandboxing. A production version should use isolated execution infrastructure.

### 5. Demo/Mock Copy Still Exists

Status: **Needs Cleanup**

`privacy` and `terms` pages still mention local mock/demo behavior. Some pages still rely on local fallback. This is acceptable for demo reliability but should be clearly documented.

### 6. Messaging, Offers, Analytics, Leaderboard Are Not Backend Product Flows

Status: **Placeholder**

Frontend pages/routes exist, especially in recruiter dashboard, but inspected backend does not provide full messaging/offers/analytics/leaderboard APIs.

### 7. Report Generation Lock Is Single-Process Only

Status: **MVP Limitation**

The in-memory lock prevents duplicate AI calls in the local process. Multi-worker deployment should use database/advisory locking or a queue.

## Remaining Work Priority

1. Backend-wire recruiter frontend search, saved candidates, candidate detail, and invite actions.
2. Add a recruiter API service layer under `src/lib/api`.
3. Update stale provider/default documentation.
4. Clean public privacy/terms copy to match current backend-powered behavior.
5. Decide final demo provider configuration and document it.
6. Replace or clearly label remaining demo/mock candidate/recruiter UI.
7. Add production-safe report generation locking for multi-worker deployments.
8. Replace MVP subprocess runner with production sandboxing if code execution becomes live product functionality.
9. Either implement backend APIs for messages/offers/analytics/leaderboard or mark/remove those pages from final demo scope.

## Feature Status Matrix

| Area | Status | Evidence |
|---|---|---|
| Auth and roles | Complete | `auth.py`, `auth-service.ts` |
| Candidate profile | Complete | `profiles.py`, `profile-service.ts`, onboarding page |
| Company profile backend | Complete | `profiles.py`, `CompanyProfile` |
| Company profile frontend | Partially Complete | company settings page exists, no company API helper |
| Candidate onboarding | Complete | `src/app/onboarding/page.tsx` |
| Onboarding AI copilot | Complete for secondary use | `ai.py`, `onboarding-ai-service.ts` |
| Assessment prep | Complete | `interview/prep/page.tsx` |
| Assessment session backend | Complete | `assessment_service.py`, `assessments.py` |
| Adaptive assessment UI | Complete for MVP | `interview/page.tsx` |
| Python code runner | Partially Complete | `code_execution_service.py`, tests |
| Integrity monitoring | Complete for metadata MVP | `integrity_service.py`, `use-integrity-events.ts` |
| Batched AI evaluation | Complete for MVP | `evaluation_service.py`, tests |
| Results page | Complete | `results/page.tsx`, report adapter |
| Improvement plan | Complete for MVP | `post-mortem/page.tsx` |
| Report publish | Complete | `evaluations.py`, `publishEvaluationReport` |
| Candidate embedding status/rebuild | Complete | `embeddings.py`, `embedding-service.ts` |
| Recruiter semantic search backend | Complete | `search.py`, `candidate_search_service.py` |
| Recruiter search frontend | Placeholder/Partially Complete | mock imports in company search page |
| Saved candidates backend | Complete | `saved_candidates.py`, `marketplace_service.py` |
| Saved candidates frontend | Placeholder/Partially Complete | mock imports in company saved page |
| Invites backend | Complete | `invites.py`, `marketplace_service.py` |
| Candidate request inbox | Complete for MVP | `student/requests/page.tsx`, `invite-service.ts` |
| Recruiter invite frontend | Partially Complete | company pages exist but are store/mock-heavy |
| Activity feed backend | Complete | `activity.py`, `activity_service.py` |
| Candidate activity page | Complete for MVP | `student/activity/page.tsx` |
| RAG dataset | Complete for MVP | 105 curated records |
| RAG assessment retrieval | Complete | `rag_retrieval_service.py`, `assessment_service.py` |
| RAG evaluation rubrics | Complete for MVP | compact/local rubric path in `evaluation_service.py` |
| External embeddings during evaluation | Complete safeguard | local evaluation mode and live embedding block |
| Messaging/offers/analytics/leaderboard | Placeholder | frontend routes exist, no inspected backend API equivalents |

## Bottom Line

HirdUp is credible as a candidate-side FYP demo with real backend assessment sessions, curated RAG question selection, adaptive written/coding assessment UI, Python MVP code execution, batched AI evaluation, verified report generation, publishing, embedding status, candidate requests, and activity.

It is not yet fully credible as an end-to-end reverse talent marketplace from the recruiter frontend perspective because several recruiter pages still rely on mock data instead of backend search/saved/invite APIs. The next highest-value implementation slice is recruiter frontend backend integration.
