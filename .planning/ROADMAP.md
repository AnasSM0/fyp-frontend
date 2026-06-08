# ROADMAP.md — HirdUp Execution Roadmap

> Project: HirdUp | Mode: Vertical MVP | Deadline: July 13, 2026

---

### [x] Phase 1: Cinematic UI & Interactive Prototypes (COMPLETED)
**Goal:** Complete all high-end frontend flows with full motion and mock state.
**Mode:** mvp
**Requirements:** FE-PREP, FE-RESULTS, FE-SEARCH, FE-ONBOARD, UI-INT-WORK
**Success Criteria**:
1. Assessment Setup page is interactive and passes proctoring checks.
2. AI Evaluation Report page displays complex mock analytics with high polish.
3. Student Onboarding flow captures role/skill profile data in local state.
4. Recruiter search results render with "Fit Reasoning" UI.
**UI hint**: yes

---

### Phase 2: Backend Foundation & Identity
**Goal:** Deploy FastAPI core and secure the portal with JWT.
**Mode:** mvp
**Requirements:** BE-CORE, BE-AUTH, AUTH-01
**Success Criteria**:
1. FastAPI server is running with PostgreSQL/pgvector integration.
2. Student and Company can sign up/log in with role-based routing.
3. Protected routes correctly verify JWT tokens.
**UI hint**: no

---

### Phase 3: AI Interview & Evaluation Engine
**Goal:** Wire the Interview Workspace to a live LLM via WebSockets.
**Mode:** mvp
**Requirements:** INT-01, INT-02, EVAL-01, EVAL-03
**Success Criteria**:
1. Real-time streaming chat works between student and AI interviewer.
2. Interview code snippets are successfully sent to backend for evaluation.
3. AI generates a multi-dimensional Verified Score™ after the session.
**UI hint**: yes

---

### Phase 4: Semantic Discovery & Final Demo Polish
**Goal:** Connect recruiter search to the vector DB and stabilize the demo flow.
**Mode:** mvp
**Requirements:** SEARCH-01, SEARCH-02, LEAD-01, FLOW-END2END
**Success Criteria**:
1. Recruiter can search for "Python Dev" and see ranked results from pgvector.
2. Candidate profiles show real data from the assessment database.
3. End-to-end "Interview-to-Profile" flow is stable and demo-ready.
**UI hint**: yes

---
## Traceability Matrix
| Req ID | Phase |
|---|---|
| AUTH-01 | Phase 2 |
| PROF-01 | Phase 1 |
| PREP-01 | Phase 1 |
| INT-01 | Phase 3 |
| EVAL-02 | Phase 1 |
| SEARCH-01 | Phase 4 |
