# XLR8Hire Frontend — Agent Handoff Document

> Last updated: 2026-05-12 | Build status: ✅ Passing (`npm run build` — 0 errors)

---

## 1. Project Overview

**XLR8Hire** is an AI-powered **reverse recruitment platform**. Companies discover verified talent; students do NOT apply. The AI automatically assesses candidates, generates a Verified Score™, and surfaces them to recruiters.

**Two portals:**
- **Student Portal** — Profile, AI assessment flow, results, offers
- **Company Portal** — Search talent leaderboard, candidate profiles, hiring pipeline

**Key philosophy:** The AI deeply understands the candidate. No manual configuration by the student. Ever.

---

## 2. Tech Stack

| Tool | Version | Notes |
|---|---|---|
| Next.js | 16.2.6 | App Router, Turbopack |
| React | 19.2.4 | |
| TypeScript | ^5 | Strict mode |
| Tailwind CSS | ^4 | `@theme` token system (NOT v3 config) |
| Framer Motion | ^12.38.0 | Central motion system in `src/lib/motion.ts` |
| Lucide React | ^1.14.0 | **Only** icon library — no Material Symbols |
| Zustand | ^5.0.13 | State store scaffolded in `src/store/` |
| clsx + tailwind-merge | latest | Via `src/lib/utils.ts` → `cn()` |

> ⚠️ **No shadcn/ui is installed yet** — components are hand-built. Install with `npx shadcn@latest init` if needed.
> ⚠️ **No React Three Fiber** — all 3D effects are CSS/SVG/Framer Motion only.

---

## 3. Running the Project

```bash
cd "c:\Users\Anas SM\Desktop\fyp-frontend"
npm run dev        # Dev server → http://localhost:3000
npm run build      # Production build verification
```

---

## 4. Full Route Map

```
/                                   Landing page (marketing)
/signup                             Auth page (sign in / sign up with role selector)

/dashboard/student                  Student dashboard (sidebar + topbar layout)
/dashboard/student/interview/prep   AI Assessment Setup page (full-screen dark)
/dashboard/student/interview        AI Interview Workspace (split panel: chat + code editor)
/dashboard/student/results          AI Assessment Results / Evaluation Report

/dashboard/company                  Company dashboard (sidebar + topbar layout)
/dashboard/company/leaderboard      Talent Search Leaderboard (AI-powered search results)
/dashboard/company/candidate        Candidate Profile (detailed view for recruiters)
```

---

## 5. Layout Architecture

### Root Layout
`src/app/layout.tsx` — Loads Geist + Geist Mono fonts. Sets global CSS. Minimal.

### Student Portal Layout
`src/app/dashboard/student/layout.tsx`
- **Client Component** (`"use client"`) — has animated sidebar toggle state
- Sidebar collapses from **240px → 64px** (icon-only) via Framer Motion
- Toggle button uses `PanelLeftClose` / `PanelLeftOpen` lucide icons
- Topbar `left` offset and content `marginLeft` animate together

### Company Portal Layout
`src/app/dashboard/company/layout.tsx`
- Similar sidebar structure, uses lucide-react icons (no Material Symbols)

### Interview Layout (Full-screen override)
`src/app/dashboard/student/interview/layout.tsx`
- Renders `h-screen flex flex-col overflow-hidden` — no sidebar, no topbar

### Assessment Prep Layout (Full-screen dark)
`src/app/dashboard/student/interview/prep/layout.tsx`
- `min-h-screen bg-[#09090E] text-white antialiased`

---

## 6. Design System

### CSS Tokens (`src/app/globals.css`)
All tokens are in `@theme {}` — use as CSS variables.

```css
/* Colors */
--color-bg-primary: #FFFFFF
--color-bg-secondary: #FAFAFA
--color-bg-subtle: #F5F5F5
--color-bg-dark: #0A0A0F
--color-text-primary: #111827
--color-text-secondary: #4B5563
--color-text-muted: #9CA3AF
--color-accent: #4F46E5          /* Indigo — primary CTA */
--color-accent-hover: #4338CA
--color-accent-light: #EEF2FF
--color-accent-border: #C7D2FE
--color-verified: #059669        /* Emerald — verified/success states */
--color-verified-light: #ECFDF5
--color-border: #E5E7EB
--color-border-subtle: #F3F4F6

/* Shadows */
--shadow-card, --shadow-hover, --shadow-glow, --shadow-focus

/* Border radius */
--radius-sm: 8px | --radius-md: 12px | --radius-lg: 16px | --radius-xl: 20px

/* Typography scale */
--text-hero: 80px | --text-h2: 48px | --text-h3: 32px | --text-h4: 22px
--text-body-lg: 18px | --text-body: 15px | --text-label: 13px
```

### Typography Rules
- Font: **Geist** (sans) + **Geist Mono** (code/numbers)
- Headlines: `font-bold tracking-tight` with negative letter-spacing
- Overline labels: `text-[11px] font-bold uppercase tracking-widest`
- Muted meta: `text-[var(--color-text-muted)]`

### Color Usage Convention
- Light pages (student/company dashboard): white backgrounds, `var(--color-accent)` for CTAs
- Dark pages (interview/prep/results): `bg-[#09090E]`, indigo-500/violet-500 accents with opacity
- Verified/success states: emerald (`#059669`, `emerald-400`)
- Warning/pending: amber (`text-amber-400`)
- Errors: red (`text-red-400`)

---

## 7. Motion System (`src/lib/motion.ts`)

Central Framer Motion exports — **always use these, never create ad-hoc variants.**

```ts
import { fadeUp, fadeDown, fadeIn, staggerContainer, staggerItem,
         subtleFloat, cardHover, slowPulse, expandWidth, EASE, TRANSITIONS } from "@/lib/motion";

// Easing
EASE.outExpo   // [0.16, 1, 0.3, 1] — premium fast-snap, slow-settle
EASE.smooth    // [0.25, 0.1, 0.25, 1]

// Transitions
TRANSITIONS.base  // 0.6s outExpo
TRANSITIONS.fast  // 0.3s outExpo
TRANSITIONS.slow  // 0.8s outExpo
TRANSITIONS.spring // stiffness:300, damping:30

// Variants (use with initial="hidden" animate="visible")
fadeUp, fadeDown, fadeIn
staggerContainer  // stagger: 0.08s, delay: 0.1s
staggerItem       // y:16 fade-up, TRANSITIONS.fast

// Object spreads (use with ...spread)
cardHover         // whileHover + whileTap scale/y
subtleFloat       // infinite y:[0,-6,0] loop
slowPulse         // ambient background glow pulse
expandWidth       // animated progress bars (custom width target)
```

**Standard page pattern:**
```tsx
<motion.div initial="hidden" animate="visible" variants={staggerContainer}>
  <motion.div variants={staggerItem}>...</motion.div>
</motion.div>
```

---

## 8. Reusable UI Components

### `src/components/ui/animated-score-ring.tsx`
Used on: Student Dashboard, Candidate Profile, Leaderboard, Results

```tsx
<AnimatedScoreRing
  score={95}          // number displayed and animated to
  maxScore={100}      // or 1000 for XLR8 score
  size={140}          // px, default 120
  strokeWidth={9}     // SVG stroke, default 6
  label="Score"       // text below number
  scoreClassName="text-white text-[44px]"
  labelClassName="text-white/40"
/>
```
- `useInView` triggered — only animates once when scrolled into view
- Includes traveling glow stroke effect on the SVG ring
- Uses `--color-verified` (emerald) as stroke color

### `src/components/ui/score-ring.tsx`
Simpler alternative used on the Results page dark hero.
- Uses indigo/violet gradient instead of emerald
- Has rotating ambient rings built-in
- `AnimatedCounter` exported separately

---

## 9. Page-by-Page Notes

### `/` — Landing Page
`src/app/page.tsx` (43KB) — Large marketing page. Fully implemented.

### `/signup` — Auth Page
`src/app/signup/page.tsx` — Role selector (Student/Company), sign in/up forms, Google/LinkedIn/GitHub OAuth buttons with real SVG logos.

### `/dashboard/student` — Student Dashboard
Sections: Hero Score Card (`AnimatedScoreRing`), Skill Analytics (animated bars), Ranking Trajectory (sparkline), Project Highlights (card grid), Interview Requests (accept/decline), Recent Assessments (timeline), Upcoming Interviews, Active Offers (empty state).

**Data:** All mock — ready to wire to FastAPI backend.

### `/dashboard/student/interview/prep` — Assessment Setup
Full dark cinematic page. Sections: Navbar with "Start Assessment" button (→ `/dashboard/student/interview`), Two-column hero with floating analytics cards + "Start Test" primary CTA, Blueprint cards grid, Interview flow timeline, AI Interviewer intro, Scoring accordion (expandable), Integrity panel, System readiness checks (live setTimeout animations), Final CTA.

### `/dashboard/student/interview` — AI Interview Workspace
Split-panel full-screen layout:
- **Left 40%:** AI chat thread (staggered messages, inline code/bold parsing, live message input)
- **Right 60%:** Dark VS Code-style code editor (token-level syntax highlighting, animated line reveals, language selector), Run Code button (spinner state), slide-up Console (`AnimatePresence` height animation)
- **Top:** Live countdown timer (45:00 → auto red < 5min), nav tabs with `layoutId` underline, Submit Solution button

### `/dashboard/student/results` — AI Evaluation Report
Full dark analytics page. All 9 sections: animated score ring (912/1000), performance cards (6 metrics with bars), skill breakdown (8 skills), strengths/weaknesses (2-col split), role fit analysis (4 roles with bars), question accordion (3 questions with AI evaluation + improvement), recruiter preview card, recommendations timeline (4 steps), three-button CTA (Publish / Share / Retake).

### `/dashboard/company` — Company Dashboard
Hiring manager view. Sections: KPI metric cards, candidate pipeline, active searches, team activity.

### `/dashboard/company/leaderboard` — Talent Leaderboard
AI-driven search results. Top 3 as podium cards with `AnimatedScoreRing`, extended scrollable ranked list below. Includes AI fit summaries and competency tags.

### `/dashboard/company/candidate` — Candidate Profile
Premium recruiter view. Sections: Hero header (name, role, bio, location), horizontal tab nav (Framer Motion `layoutId`), Technical Expertise grid (4 cards), Experience Timeline, SVG Competency Matrix, Skill bars, sticky sidebar (education, work style, contact, Download CV, Archive).

---

## 10. Known Patterns & Conventions

### Dark Section Pattern (interview/prep/results)
```tsx
// Background
<div className="min-h-screen bg-[#09090E] text-white">
// Dot grid overlay
<div className="absolute inset-0 opacity-[0.035]"
  style={{ backgroundImage: "linear-gradient(rgba(99,102,241,0.8) 1px, transparent 1px), ..." }} />
// Ambient glow
<motion.div animate={{ opacity: [0.06, 0.14, 0.06] }} transition={{ duration: 5, repeat: Infinity }}
  className="absolute w-[400px] h-[400px] rounded-full bg-indigo-500 blur-[80px]" />
```

### Card Pattern (dark pages)
```tsx
className="bg-white/[0.03] border border-white/[0.08] hover:border-indigo-500/30 rounded-2xl p-6 transition-all duration-300"
```

### Overline + Heading Pattern
```tsx
<div className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest mb-2">Section Label</div>
<h2 className="text-[28px] font-bold tracking-tight">Section Title</h2>
```

### Inline stagger shorthand (used in dark pages)
```tsx
const s = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16,1,0.3,1] } } };
const sc = (delay = 0) => ({ hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: delay } } });
// Usage:
<motion.div initial="hidden" animate="show" variants={sc(0)}>
  <motion.div variants={s}>...</motion.div>
</motion.div>
```

---

## 11. What's NOT Done Yet (Backlog)

### High Priority
- [ ] **Backend integration** — All data is mock. FastAPI + Pinecone endpoints not wired.
- [ ] **Authentication** — No NextAuth/Clerk/custom JWT implemented. Signup form is UI-only.
- [ ] **Real AI Interview** — The interview page is a static prototype. No live WebSocket/LLM connection.
- [ ] **Real code execution** — "Run Code" button simulates output. No Judge0/Piston API connected.

### Medium Priority
- [ ] **Student profile page** — `/dashboard/student/profile` not built.
- [ ] **Company profile/settings** — Not built.
- [ ] **Messages/notifications** — Sidebar links exist but pages are `#`.
- [ ] **Mobile responsive audit** — Sidebar collapses but full mobile pass not done.
- [ ] **Dark mode** — CSS tokens exist but no theme toggle implemented.
- [ ] **Zustand stores** — `src/store/` exists but not populated with real state.

### Low Priority
- [ ] **shadcn/ui formal install** — Components are hand-built. Can formalize later.
- [ ] **React Three Fiber** — Not installed. Can add for landing page hero if needed.
- [ ] **Real project images** — External URLs used (may break). Migrate to `/public/`.

---

## 12. File Structure Reference

```
src/
├── app/
│   ├── globals.css              ← Design tokens (@theme)
│   ├── layout.tsx               ← Root layout (fonts, metadata)
│   ├── page.tsx                 ← Landing page
│   ├── signup/page.tsx          ← Auth page
│   └── dashboard/
│       ├── company/
│       │   ├── layout.tsx       ← Company sidebar layout
│       │   ├── page.tsx         ← Company dashboard
│       │   ├── candidate/page.tsx
│       │   └── leaderboard/page.tsx
│       └── student/
│           ├── layout.tsx       ← Student sidebar (collapsible, Client Component)
│           ├── page.tsx         ← Student dashboard
│           ├── results/page.tsx ← AI Evaluation Report
│           └── interview/
│               ├── layout.tsx   ← Full-screen (h-screen, no sidebar)
│               ├── page.tsx     ← Interview workspace
│               └── prep/
│                   ├── layout.tsx  ← Dark full-screen
│                   └── page.tsx    ← Assessment setup
├── components/
│   └── ui/
│       ├── animated-score-ring.tsx  ← Main score ring (emerald, useInView)
│       └── score-ring.tsx           ← Dark variant (indigo, for results hero)
├── lib/
│   ├── motion.ts                ← ALL Framer Motion variants/transitions
│   └── utils.ts                 ← cn() helper (clsx + tailwind-merge)
└── store/                       ← Zustand (scaffolded, not populated)
```

---

## 13. Critical Rules for Next Agent

1. **Never use Material Symbols** — All icons must be `lucide-react`.
2. **Always use `src/lib/motion.ts` exports** — Don't create ad-hoc animation variants.
3. **CSS variables only** — Use `var(--color-*)` on light pages, Tailwind arbitrary values (`bg-indigo-500/10`) on dark pages.
4. **Read `XLR8HIRE_CONTEXT.md`** before any UX decision — it defines the product philosophy.
5. **Run `npm run build`** after every change to catch TypeScript errors.
6. **`"use client"`** is required on any component using hooks, `useState`, `useEffect`, or Framer Motion `motion.*`.
7. **Dark pages** use `bg-[#09090E]` not `var(--color-bg-dark)` (the CSS var exists but isn't used consistently yet — harmonize when refactoring).
8. **Tailwind v4** — No `tailwind.config.js`. All customization is in `globals.css` `@theme {}`.
9. **Next.js 16 App Router** — Read `node_modules/next/dist/docs/` before using any Next.js APIs (breaking changes from v13/14 patterns).
10. **No hardcoded pixel widths on the sidebar** — The collapse toggle uses `W = open ? 240 : 64` and Framer Motion `animate={{ width: W }}`. Do not break this pattern.
