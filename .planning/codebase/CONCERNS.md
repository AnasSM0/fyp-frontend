# CONCERNS.md — XLR8Hire Frontend Technical Concerns & Debt

> Generated: 2026-05-13 | Severity: 🔴 Critical · 🟡 High · 🟠 Medium · 🟢 Low

---

## 🔴 Critical — Blocks Production Deployment

### C1: No Authentication
**Impact:** All routes are publicly accessible. Anyone can visit `/dashboard/student` or `/dashboard/company` without logging in.
**Files affected:** All dashboard pages, `signup/page.tsx`
**Resolution:**
1. Install Clerk or NextAuth.js v5
2. Create `src/middleware.ts` with route protection
3. Wire `/signup` form submit to auth provider
4. Add role-based redirect (student → `/dashboard/student`, company → `/dashboard/company`)

---

### C2: Zero Backend Integration
**Impact:** 100% of displayed data is hardcoded mock. The platform cannot function as a real product.
**Files affected:** Every page component (data defined inline as arrays/objects)
**Resolution:**
1. Create `src/lib/api/` directory with typed fetch wrappers
2. Move mock data to `src/data/` as interim step
3. Replace inline mocks with API calls once FastAPI endpoints are ready
4. Add React Query or SWR for server state management

---

### C3: AI Interview is Static Prototype
**Impact:** The interview page (`/dashboard/student/interview`) has no live AI. The "Send" button appends to a local array — no LLM is called.
**Files affected:** `src/app/dashboard/student/interview/page.tsx`
**Resolution:**
1. Implement WebSocket client (native or `socket.io-client`)
2. Connect to FastAPI WebSocket endpoint for LLM streaming
3. Replace `INITIAL_MESSAGES` array with real session state

---

### C4: Code Execution is Simulated
**Impact:** "Run Code" button fires a fake timeout and shows hardcoded console output. No actual code runs.
**Files affected:** `src/app/dashboard/student/interview/page.tsx` — `handleRun` function
**Resolution:** Integrate Judge0 API or Piston API for sandboxed execution

---

## 🟡 High — Significantly Impacts UX or Reliability

### H1: External Image URLs (Fragile)
**Impact:** Profile photos use `lh3.googleusercontent.com` URLs. These will break in production or if the URL changes.
**Files affected:** `student/layout.tsx`, `company/layout.tsx` sidebar profile images
**Resolution:** Download images to `/public/` or configure an S3/Cloudflare R2 bucket. Use `next/image` with proper domains in `next.config.js`.

---

### H2: ESLint `@next/next/no-img-element` Suppressed
**Impact:** `<img>` tags used instead of `<Image>` from `next/image` — missing optimization (lazy loading, WebP, size hints).
**Files affected:** Both layout files (`// eslint-disable-next-line`)
**Resolution:** Replace with `<Image>` from `next/image` with configured remote patterns.

---

### H3: Zustand Store Empty
**Impact:** No global state. When auth is added, user session will have no home. Components will need major refactoring.
**Files affected:** `src/store/` (empty)
**Resolution:** Implement at minimum: `useAuthStore` (user session, role) and `useAssessmentStore` (active interview state).

---

### H4: No Error Boundaries
**Impact:** Any runtime error crashes the entire page with React's default error screen.
**Resolution:** Add `error.tsx` files in key route segments per Next.js App Router convention.

---

### H5: No Loading States
**Impact:** No `loading.tsx` files. When async data is added, pages will flash blank while fetching.
**Resolution:** Add `loading.tsx` skeleton screens per route segment before connecting backend.

---

### H6: No Form Validation
**Impact:** `/signup` form has no input validation, no error messages, no submit handler.
**Files affected:** `src/app/signup/page.tsx`
**Resolution:** Install `react-hook-form` + `zod`. Wire form to auth provider on submit.

---

## 🟠 Medium — Code Quality & Consistency

### M1: Duplicate ScoreRing Components
**Files:** `animated-score-ring.tsx` (emerald, useInView, configurable) vs `score-ring.tsx` (indigo, dark mode)
**Issue:** Two components solving the same problem. Color should be a prop, not a separate file.
**Resolution:** Merge into single `ScoreRing` with `variant="light" | "dark"` prop.

---

### M2: Dark/Light Background Inconsistency
**Issue:** Dark pages use `bg-[#09090E]` hardcoded. `--color-bg-dark: #0A0A0F` exists in CSS but is a slightly different shade and unused.
**Resolution:** Standardize on one value. Update CSS var or update all Tailwind classes.

---

### M3: No Mobile Navigation
**Issue:** Sidebar collapses to 64px icon-only on desktop. There's no hamburger menu or bottom nav for mobile viewports.
**Resolution:** Add responsive breakpoint logic to student/company layouts. Show overlay drawer on mobile.

---

### M4: Mock Data Inline in Pages
**Issue:** Mock arrays (QUESTIONS, ROLES, PERF, SKILLS, etc.) are defined at the top of page components. Hard to find, hard to replace with real API calls.
**Resolution:** Create `src/data/mock/` directory. Move all mock data there. Import into pages.

---

### M5: Company Layout Not a Client Component
**Issue:** `company/layout.tsx` is a Server Component with no sidebar toggle. `student/layout.tsx` is a Client Component with animated toggle. Inconsistent UX.
**Resolution:** Convert company layout to Client Component and add the same collapsible sidebar pattern.

---

### M6: Prep Page Has a Duplicate Navbar
**Issue:** `/interview/prep` renders its own fixed navbar inside the page component, while the parent `interview/layout.tsx` provides a full-screen wrapper with no topbar. This pattern is inconsistent.
**Resolution:** Consider extracting the prep navbar as a shared component or document the pattern clearly.

---

## 🟢 Low — Polish & Observability

### L1: No Per-Page SEO Metadata
Only root `layout.tsx` has metadata. Each page should export `generateMetadata()` or a `metadata` object.

### L2: No Accessibility Audit
No ARIA labels on icon-only buttons (collapsed sidebar), no skip-navigation links, no keyboard trap testing on modals/accordions.

### L3: No Performance Monitoring
No Vercel Analytics, Sentry, or Datadog configured.

### L4: No Dark Mode Toggle
CSS tokens exist for both modes but no `ThemeProvider` or toggle UI is implemented. The `light` class is hardcoded on `<html>` in root layout.

### L5: No `.env.local` File
No environment variable file exists. When integration begins, there's no template for required variables.
**Resolution:** Create `.env.local.example` with all required keys documented.

---

## Resolution Priority Matrix

| Concern | Effort | Impact | Do First? |
|---|---|---|---|
| C1 — Auth | High | Critical | ✅ Yes |
| C2 — Backend | High | Critical | ✅ Yes |
| H6 — Form validation | Low | High | ✅ Yes (pair with C1) |
| H4 — Error boundaries | Low | High | ✅ Yes |
| H5 — Loading states | Low | High | ✅ Yes (pair with C2) |
| H1 — Image URLs | Low | Medium | ✅ Yes |
| C3 — AI Interview | Very High | Critical | 🔶 After C1+C2 |
| C4 — Code execution | Medium | High | 🔶 After C3 |
| M4 — Mock data isolation | Low | Medium | 🔶 Alongside C2 |
| M1 — ScoreRing unification | Low | Low | 🟢 Anytime |
| M3 — Mobile nav | Medium | Medium | 🟢 Before launch |
| L1 — SEO | Low | Low | 🟢 Near end |
