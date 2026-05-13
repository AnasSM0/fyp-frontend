# ARCHITECTURE.md — XLR8Hire Frontend Architecture

> Generated: 2026-05-13

---

## Application Type

**Pure Frontend SPA/SSG** — No server-side data fetching. No database. No server actions. All routes are statically generated at build time.

```
Build output (npm run build):
○ /                                  Static
○ /signup                            Static
○ /dashboard/student                 Static
○ /dashboard/student/interview       Static
○ /dashboard/student/interview/prep  Static
○ /dashboard/student/results         Static
○ /dashboard/company                 Static
○ /dashboard/company/leaderboard     Static
○ /dashboard/company/candidate       Static
```

---

## Layout Hierarchy

```
RootLayout (src/app/layout.tsx)
├── Server Component
├── Loads Geist + Geist Mono fonts
├── Sets: lang="en", antialiased, scroll-smooth
└── Renders {children} in styled body

    ├── LandingPage (/) — Server Component, no layout wrapper
    ├── SignupPage (/signup) — Server Component
    │
    ├── CompanyLayout (/dashboard/company/*)
    │   ├── Server Component (NOT client — no toggle state)
    │   ├── Fixed sidebar: 240px, company nav links
    │   └── Fixed topbar: search, notifications, profile
    │       └── CompanyPage, CandidatePage, LeaderboardPage
    │
    └── StudentLayout (/dashboard/student/*)
        ├── CLIENT Component ("use client")
        ├── Animated collapsible sidebar: 240px ↔ 64px (Framer Motion)
        ├── Toggle button: PanelLeftClose/PanelLeftOpen icons
        └── Topbar animates left offset with sidebar width
            ├── StudentDashboardPage
            ├── ResultsPage (/results)
            └── InterviewLayout (/interview/*)
                ├── Full-screen override: h-screen, no sidebar, no topbar
                ├── InterviewPage (/interview)
                └── PrepLayout (/interview/prep/*)
                    ├── Dark full-screen: bg-[#09090E]
                    └── PrepPage (/interview/prep)
```

---

## Rendering Strategy

| Route | Strategy | Reason |
|---|---|---|
| `/` | Static | Marketing page, no user data |
| `/signup` | Static | Form UI, no server data |
| `/dashboard/*` | Static | All data is mock/client-side |

**No `use server`, no `getServerSideProps`, no `generateStaticParams`** — everything is client-rendered after hydration.

When backend is connected, the pattern should shift to:
- Dashboard routes → `async` Server Components fetching from FastAPI
- Interview page → Client Component with WebSocket

---

## Component Architecture

### Server vs Client Split

```
Server Components (default):
- All layout.tsx files (except student/layout.tsx)
- page.tsx files that don't use hooks
- Static content sections

Client Components ("use client"):
- src/app/dashboard/student/layout.tsx (useState for sidebar toggle)
- src/app/dashboard/student/interview/prep/page.tsx (useState, useEffect, AnimatePresence)
- src/app/dashboard/student/interview/page.tsx (timer, message state)
- src/app/dashboard/student/results/page.tsx (accordion state)
- src/components/ui/animated-score-ring.tsx (useInView, useMotionValue)
- src/components/ui/score-ring.tsx (useEffect, animation)
```

### Component Granularity
Currently **coarse-grained** — most pages define all their sub-components in the same file (helper functions like `PerfCard`, `Bar`, `Check`). Very few shared components exist yet.

**Shared components:** Only 2 — `AnimatedScoreRing`, `ScoreRing` (both in `src/components/ui/`)

---

## State Management Architecture

```
Local State (useState):        99% of state
Global State (Zustand):        0% — store scaffolded but empty
Server State (React Query):    0% — not installed
URL State (searchParams):      0% — not used yet
```

**When backend connects:** Recommend Zustand for auth user session + React Query for server state.

---

## Data Flow (Current)

```
Mock data (inline arrays/objects)
    → Component renders directly
    → Framer Motion animates on mount/scroll
    → User interactions update local useState
    → No side effects, no API calls
```

---

## Animation Architecture

All animation logic is centralized:

```
src/lib/motion.ts
├── EASE object (easing curves)
├── TRANSITIONS object (duration + ease presets)
├── Variants: fadeUp, fadeDown, fadeIn
├── Variants: staggerContainer, staggerItem
└── Spread objects: cardHover, subtleFloat, slowPulse, expandWidth
```

**Pattern:** Pages import from `motion.ts` — never define standalone Variants inline.

**Exception:** Dark pages use an inline shorthand `s` / `sc` pattern for brevity (documented in CONVENTIONS.md).

---

## Dual Design Mode

The platform has two visual modes coexisting:

| Mode | Pages | Background | Accent |
|---|---|---|---|
| **Light/Dashboard** | `/`, `/signup`, `/dashboard/student`, `/dashboard/company` | `#FFFFFF` / `#FAFAFA` | `#4F46E5` (indigo via CSS var) |
| **Dark/Cinematic** | `/interview`, `/interview/prep`, `/results` | `#09090E` | `indigo-500/violet-500` (Tailwind opacity) |

No theme toggle exists — the mode is determined by the layout/page file itself.
