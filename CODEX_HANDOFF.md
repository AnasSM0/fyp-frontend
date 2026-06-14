# HirdUp Codex Handoff

Last updated: 2026-06-14

This file is for resuming work from another Codex account without losing context. The project is due tomorrow, so treat this as the source of truth before making more changes.

## Project Context

HirdUp is an AI-driven reverse talent marketplace for a Final Year Project.

Core flow:

1. Candidate completes onboarding/profile.
2. Candidate takes backend-powered AI technical assessment.
3. AI generates a verified evaluation report and verified score.
4. Candidate publishes verified profile.
5. Recruiters discover published candidates through semantic search.
6. Recruiters save/shortlist candidates and send interview requests.
7. Candidates accept/decline recruiter requests.

Tech stack:

- Frontend: Next.js App Router, React, TypeScript, Tailwind CSS, Zustand/localStorage fallback.
- Backend: FastAPI under `backend`.
- DB: PostgreSQL + pgvector through Docker Compose.
- ORM/migrations: SQLAlchemy 2.x + Alembic.
- AI providers: NVIDIA/Nemotron primary, Gemini alternative, Stub fallback.
- Vector search: PostgreSQL + pgvector.

Important rules from `AGENTS.md`:

- Do not touch assessment, report, recruiter, resume parser, or scoring logic unless explicitly working on that slice.
- Keep frontend API calls centralized under `src/lib/api`.
- Do not silently fallback for validation/auth/role errors: `401`, `403`, `409`, `422`.
- Demo fallback is acceptable for backend unavailable/network/timeout/5xx/demo mode.
- Never expose API keys.
- Never auto-save AI or resume parser output.
- Candidate must review/edit before saving.
- Before frontend edits, read relevant Next docs in `node_modules/next/dist/docs`.
- Prefer minimal diffs and do not revert unrelated dirty work.

## Current Git State

At handoff time, `git status --short` showed:

```text
 M backend/app/api/routes/onboarding.py
 M backend/app/services/ai_provider.py
 M backend/app/services/resume_onboarding_service.py
 M backend/tests/test_resume_onboarding.py
 M src/app/onboarding/page.tsx
?? "hirdup logo white text.png"
```

The tracked modified files are from the latest resume onboarding reliability/demo-safe work. The untracked `hirdup logo white text.png` was already present in the workspace and was not touched by Codex in this slice.

## Work Completed In This Thread

### 1. Resume-assisted onboarding baseline

Goal implemented earlier:

- Candidates can choose resume upload or manual onboarding.
- Resume output is shown for review/edit before save.
- Manual onboarding remains available.
- Parser output is not auto-saved.

Relevant current files:

- `backend/app/api/routes/onboarding.py`
- `backend/app/schemas/onboarding.py`
- `backend/app/services/resume_onboarding_service.py`
- `backend/tests/test_resume_onboarding.py`
- `src/app/onboarding/page.tsx`
- `src/lib/api/onboarding-ai-service.ts`
- `src/lib/api/types.ts`

### 2. Resume parser reliability and demo-safe behavior

Latest completed slice.

Implemented in:

- `backend/app/services/resume_onboarding_service.py`
- `backend/app/services/ai_provider.py`
- `backend/app/api/routes/onboarding.py`
- `backend/tests/test_resume_onboarding.py`
- `src/app/onboarding/page.tsx`

Backend behavior:

- Resume parsing is now a 3-stage pipeline:
  - Stage 1 deterministic extraction:
    - `email`
    - `phone`
    - `github_url`
    - `linkedin_url`
    - `portfolio_url`
  - Stage 2 heuristic extraction:
    - `full_name`
    - `university`
    - `degree`
    - also `graduation_year` and `gpa` when explicitly present
  - Stage 3 AI enrichment only:
    - `target_role`
    - `experience_level`
    - `skills`
    - `tech_stack`
    - `projects`
    - `work_experience`

Merge strategy:

- deterministic > heuristic > AI
- AI is not allowed to overwrite deterministic/heuristic fields.
- AI input redacts already-detected deterministic/heuristic values where possible.
- AI failure no longer returns onboarding failure.
- If AI fails/times out/provider unavailable, backend returns partial deterministic/heuristic profile plus warning:
  - `Some resume information could not be extracted automatically.`

Hard errors still occur only for:

- unsupported file type
- file too large
- unreadable/no useful extracted text
- auth/role errors

Logging added:

- resume uploaded
- extracted text length
- deterministic fields found
- heuristic fields found
- AI validation result
- parser fallback used
- fields extracted
- warnings generated

Frontend behavior:

- Signup/onboarding shows:
  - Upload Resume
  - Enter Details Manually
- Manual flow still works.
- Resume parse success displays:
  - `Resume imported successfully. Please review and complete any missing information before continuing.`
- Extracted Information section shows present/missing fields with check/warning icons.
- Low-confidence/warning badges show beside fields:
  - `Imported`
  - `Low confidence`
  - `Review suggested`
  - `Could not verify`
- Candidate can edit every field.
- Resume parsing never auto-saves the profile.
- Save flow remains:
  - Upload Resume
  - Extract available data
  - Prefill form
  - Candidate reviews
  - Candidate edits
  - Save Profile

Tests run after this slice:

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest tests/test_resume_onboarding.py
.\.venv\Scripts\python.exe -m compileall app tests alembic
```

Results:

- `tests/test_resume_onboarding.py`: `13 passed`
- compileall: passed

Full verification also run:

```powershell
cd backend
$tmp = Join-Path (Get-Location) ".pytest-tmp"
New-Item -ItemType Directory -Force -Path $tmp | Out-Null
$env:TMP=$tmp
$env:TEMP=$tmp
.\.venv\Scripts\python.exe -m pytest
```

Result:

- `230 passed`

Frontend verification:

```powershell
npx tsc --noEmit
npm run lint
npm run build
```

Results:

- Typecheck: passed
- Build: passed
- Lint: passed with existing unrelated warnings:
  - unused imports in company leaderboard/page/root/signup/onboarding assistant/demo-control/score-ring
  - hook dependency warning in `src/components/ui/score-ring.tsx`

### 3. Background report generation UX

Implemented earlier in this thread.

Goal:

- Assessment submit returns quickly.
- Report generation runs in background.
- Results page polls status.
- Slow AI generation no longer triggers frontend fallback.

Key backend behavior:

- `POST /api/v1/assessment/sessions/{session_id}/submit`
  - saves/uses answers
  - marks session `report_generating`
  - commits before AI call
  - schedules background generation with FastAPI `BackgroundTasks`
  - reuses existing report if present
  - avoids duplicate jobs on repeated submit
- `GET /api/v1/assessment/sessions/{session_id}/report/status`
  - returns:
    - `submitted`
    - `report_queued`
    - `report_generating`
    - `report_ready`
    - `report_failed`
- `POST /api/v1/assessment/sessions/{session_id}/report/retry`
  - retries failed/submitted-without-report session
  - uses same frozen questions and saved answers
  - does not create a new assessment session

Important note:

- Existing report/scoring path still goes through `generate_evaluation_report`.
- Question selection, provider routing, recruiter pages, resume parser, and verified score formula were not touched for this slice.

Files involved in that completed slice:

- `backend/app/api/routes/assessments.py`
- `backend/app/main.py`
- `backend/app/schemas/assessment.py`
- `backend/app/services/assessment_service.py`
- `backend/app/services/evaluation_service.py`
- `backend/tests/test_report_generation_jobs.py`
- `src/lib/api/types.ts`
- `src/lib/api/assessment-service.ts`
- `src/app/dashboard/student/interview/page.tsx`
- `src/app/dashboard/student/results/page.tsx`

Verification at that time:

- Backend full pytest: `230 passed`
- Backend compileall: passed
- Frontend typecheck: passed
- Frontend build: passed
- Frontend lint: passed with existing warnings

Manual flow:

1. Candidate completes all assessment questions.
2. Clicks Finish Assessment.
3. Frontend navigates to `/dashboard/student/results?sessionId=...`.
4. Results page shows generating screen:
   - `Assessment submitted successfully.`
   - `Generating your verified AI evaluation report...`
   - `This may take up to a minute. You can keep this page open.`
5. Page polls backend until ready.
6. `report_failed` shows retry button.

### 4. Controlled randomized assessment question selection

Implemented earlier in the thread.

Goal:

- New sessions do not always show same fixed questions.
- Created sessions remain frozen/stable.
- Selection is deterministic per `session_id`.
- Role-relevant, skill-aware, difficulty-aware.

Key behavior:

- Uses candidate profile fields:
  - `target_role`
  - `skills`
  - `tech_stack`
  - `experience_level`
- Does not hardcode question IDs.
- Does not use demo/static questions.
- Uses existing question/RAG dataset.
- Persists selected session-owned questions.
- Frontend/report read frozen session questions.
- Avoids duplicate question IDs in one session.
- Avoids previously answered questions when alternatives exist.
- Marks reused questions in internal metadata.

Difficulty mapping:

- student/fresh/entry: mostly easy/beginner + medium/intermediate
- junior/intermediate: mostly medium + one hard if available
- advanced: medium + hard
- nearest difficulty fallback is logged.

Balanced 6-question target:

- conceptual/interview
- conceptual/interview
- system/design
- debugging/scenario
- coding task
- communication/tradeoff

Important file:

- `backend/app/services/assessment_service.py`

Related tests were added/updated in:

- `backend/tests/test_assessments.py`
- `backend/tests/test_rag_assessment_integration.py`

### 5. Recruiter reverse-marketplace flow

Work was done earlier to make recruiter marketplace more production-like/demo-ready. Be careful: depending on the current branch/worktree, these files may or may not still be present as dirty/untracked.

Files seen earlier in the thread:

- `backend/app/api/routes/recruiter_marketplace.py`
- `backend/app/schemas/recruiter_marketplace.py`
- `backend/app/services/recruiter_marketplace_service.py`
- `backend/scripts/seed_recruiter_demo.py`
- `backend/tests/test_recruiter_marketplace.py`
- `src/lib/api/recruiter-marketplace-service.ts`
- recruiter dashboard/search/saved/candidate/offers pages
- candidate requests page

Important warning:

- When running `python scripts/seed_recruiter_demo.py`, it previously tried downloading a large Hugging Face/Nari model because imports resolved to the wrong external `app` package before backend root was inserted into `sys.path`.
- The script was patched earlier to insert backend root into `sys.path` before importing `app.*`.
- If the script still downloads a huge model, stop it and inspect imports before continuing.

## Current Latest Slice Details: Resume Onboarding

### Backend extraction contract

`parse_resume_upload(file, provider_name)`:

- validates file type/size
- extracts PDF/DOCX text
- rejects only unreadable/no-text files
- logs upload and text length
- runs deterministic + heuristic extraction before AI
- redacts already-found fields from AI input
- attempts AI enrichment
- if AI fails or returns invalid shape:
  - returns partial deterministic/heuristic data
  - does not throw 503
  - adds warning

### Frontend contract

`src/app/onboarding/page.tsx`:

- `ChoiceScreen` already provides Upload Resume / Enter Details Manually.
- `ResumeUploadScreen` handles file upload.
- On successful parse:
  - form is prefilled from available data
  - parse response is stored in `resumeParseResult`
  - review banner appears
  - Extracted Information summary appears
  - warning badges appear beside affected fields
  - onboarding switches to normal editable manual builder
- On hard parser errors:
  - user sees error but can choose manual onboarding

## Known Existing Warnings / Issues

Frontend lint warnings are not from this latest slice:

- `src/app/dashboard/company/leaderboard/page.tsx`: unused imports
- `src/app/page.tsx`: unused `AnimatePresence`, `router`
- `src/app/signup/page.tsx`: unused `subtleFloat`
- `src/components/onboarding/ai-assistant.tsx`: unused imports/prop
- `src/components/providers/demo-control.tsx`: unused `Settings`
- `src/components/ui/score-ring.tsx`: unused `AnimatePresence`, hook dependency warning

Do not spend time on these unless explicitly asked; project is due soon.

## Recommended Next Steps

Priority for tomorrow/demo:

1. Run the app end-to-end locally.
2. Test signup -> onboarding manual.
3. Test signup -> onboarding resume upload with:
   - Anas resume PDF/DOCX
   - a minimal resume with just contact fields
   - a resume with only skills/stack
4. Save candidate profile.
5. Start assessment from prep.
6. Complete assessment.
7. Confirm report generating screen appears and eventually report renders.
8. Publish profile.
9. Recruiter login -> search candidates -> save/shortlist -> send request.
10. Candidate login -> requests -> accept/decline.

Use demo accounts:

- Candidate: `candidate@xlr8hire.demo` / `demo1234`
- Recruiter: `recruiter@xlr8hire.demo` / `demo1234`

Useful commands:

```powershell
cd C:\Users\Anas SM\Desktop\fyp-frontend\backend
docker compose up -d db
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m app.seed.demo_accounts
.\.venv\Scripts\python.exe -m app.seed.question_bank
.\.venv\Scripts\python.exe -m app.seed.search_demo_data
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

Frontend:

```powershell
cd C:\Users\Anas SM\Desktop\fyp-frontend
npm run dev
```

Verification:

```powershell
cd C:\Users\Anas SM\Desktop\fyp-frontend\backend
.\.venv\Scripts\python.exe -m pytest tests/test_resume_onboarding.py
.\.venv\Scripts\python.exe -m pytest tests/test_report_generation_jobs.py
.\.venv\Scripts\python.exe -m compileall app tests alembic
```

```powershell
cd C:\Users\Anas SM\Desktop\fyp-frontend
npx tsc --noEmit
npm run build
```

If full backend pytest fails with Windows temp permission:

```powershell
cd C:\Users\Anas SM\Desktop\fyp-frontend\backend
$tmp = Join-Path (Get-Location) ".pytest-tmp"
New-Item -ItemType Directory -Force -Path $tmp | Out-Null
$env:TMP=$tmp
$env:TEMP=$tmp
.\.venv\Scripts\python.exe -m pytest
Remove-Item -LiteralPath $tmp -Recurse -Force
```

## Do Not Break These

- Manual onboarding must keep working.
- Resume parsing must never auto-save.
- AI failures in resume parsing must not block onboarding.
- Assessment question selection must stay frozen per session.
- Report generation must stay background/polling.
- Report scoring/verified score formula must not be changed.
- AI provider routing must keep NVIDIA/Gemini/Stub support.
- Recruiter pages should not be touched unless explicitly working that slice.

## Quick Manual Demo Script

Candidate:

1. Open frontend at `http://localhost:3000`.
2. Sign up or log in as candidate.
3. Onboarding:
   - choose Upload Resume
   - upload PDF/DOCX
   - verify Extracted Information shows checks/warnings
   - edit missing fields
   - save profile
4. Go to Interview Prep.
5. Start assessment.
6. Answer all questions.
7. Finish assessment.
8. Results page should show report generation progress.
9. Wait for report, then publish profile.

Recruiter:

1. Log in recruiter.
2. Search candidates.
3. Open candidate.
4. Save/shortlist.
5. Send interview request.

Candidate:

1. Open requests page.
2. Accept/decline request.

## Final Note For Next Codex

Start by reading:

- `AGENTS.md`
- this `CODEX_HANDOFF.md`
- `git status --short`

Do not assume the worktree is clean. Do not revert unrelated changes. The latest verified state passed tests/builds after the resume onboarding slice.
