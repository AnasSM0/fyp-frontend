# INTEGRATIONS.md — XLR8Hire Frontend External Integrations

> Generated: 2026-05-13 | Status: Pre-integration (all data is mock)

---

## Current State: Zero Live Integrations

The frontend is **entirely disconnected** from any external service. All data is hardcoded mock data defined inline within page components.

---

## Active Integrations

| Integration | Status | Notes |
|---|---|---|
| Google Fonts (Geist) | ✅ Active | Via `next/font/google` — zero-layout-shift loading |
| Vercel (deployment) | 🔶 Assumed | Standard Next.js deployment target |

---

## Pending Integrations (Priority Order)

### 🔴 P0 — Blocking All Real Functionality

#### 1. Authentication
- **Recommended:** Clerk or NextAuth.js v5
- **What's needed:** JWT session management, role-based routing guards (`student` vs `company`), protected route middleware in `middleware.ts`
- **Current state:** `/signup` is a fully-built UI with no submit logic. All dashboard routes are publicly accessible.
- **Integration point:** `src/middleware.ts` (does not exist yet)

#### 2. FastAPI Backend
- **What's needed:** REST API client (Axios or native fetch with typed wrappers)
- **Endpoints to connect:** Student profile, assessment data, interview sessions, company search/leaderboard, candidate lists
- **Current state:** All page data is hardcoded arrays/objects inside page components
- **Recommended:** Create `src/lib/api/` directory with typed fetch wrappers per domain

#### 3. AI Interview Engine
- **What's needed:** WebSocket connection for real-time AI chat in `/dashboard/student/interview`
- **Current state:** Static message array `INITIAL_MESSAGES` — no live AI
- **Integration point:** `src/app/dashboard/student/interview/page.tsx` — the chat input `handleSend` function

#### 4. Code Execution Engine
- **Options:** Judge0 API, Piston API, or custom sandbox
- **Current state:** "Run Code" button fires a `setRunning(true)` → `setTimeout` → shows fake console output
- **Integration point:** `src/app/dashboard/student/interview/page.tsx` — the `handleRun` function

---

### 🟡 P1 — Important for Production Quality

#### 5. Vector Search / AI Matching (Pinecone or similar)
- **Purpose:** Powers the talent leaderboard — semantic search of candidates by role/skills
- **Current state:** Leaderboard has hardcoded candidate list with mock relevance scores
- **Integration point:** `src/app/dashboard/company/leaderboard/page.tsx`

#### 6. File Storage (Cloudflare R2 / AWS S3)
- **Purpose:** CV uploads, portfolio files, profile photos
- **Current state:** Profile images use external `googleusercontent.com` URLs (fragile)
- **Integration point:** All profile image `<img>` tags across sidebar and candidate profile pages

#### 7. Email / Notification Service
- **Options:** Resend, SendGrid, or similar
- **Purpose:** Interview invitations, assessment completion, offer notifications

---

### 🟢 P2 — Quality & Observability

#### 8. Error Monitoring (Sentry)
- **Purpose:** Catch runtime errors in production
- **Integration:** `next.config.js` + Sentry SDK

#### 9. Analytics (Vercel Analytics or PostHog)
- **Purpose:** Track user flows, assessment funnel, drop-off points
- **Integration:** Root layout or middleware

#### 10. Feature Flags (LaunchDarkly or Growthbook)
- **Purpose:** Staged rollout of AI features

---

## Data Flow Map (Current vs Target)

```
CURRENT (Mock):
Page Component → Hardcoded Array → UI

TARGET (Integrated):
Page Component → src/lib/api/{domain}.ts → FastAPI → DB/AI → UI
                     ↑
              Auth token from Clerk/NextAuth
```

---

## Environment Variables Needed

```env
# Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Backend
NEXT_PUBLIC_API_URL=http://localhost:8000

# AI
OPENAI_API_KEY=           # or Anthropic/Gemini
PINECONE_API_KEY=

# Code execution
JUDGE0_API_KEY=

# Storage
AWS_S3_BUCKET=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

# Monitoring
SENTRY_DSN=
```

> No `.env.local` file currently exists in the project.
