# STRUCTURE.md — XLR8Hire Frontend File Structure

> Generated: 2026-05-13

---

## Directory Tree (Annotated)

```
fyp-frontend/
├── .planning/                        ← GSD planning system
│   └── codebase/                     ← This codebase map
├── handoff.md                        ← Agent handoff document (comprehensive)
├── XLR8HIRE_CONTEXT.md               ← Product context, philosophy, branding
├── package.json
├── tsconfig.json
├── postcss.config.mjs
│
├── public/                           ← Static assets (currently empty/minimal)
│
└── src/
    ├── app/                          ← Next.js App Router root
    │   ├── globals.css               ← Tailwind v4 @theme{} + keyframes
    │   ├── layout.tsx                ← Root layout (fonts, metadata)
    │   ├── page.tsx                  ← Landing page (43KB — marketing)
    │   │
    │   ├── signup/
    │   │   └── page.tsx              ← Auth page (role selector + OAuth)
    │   │
    │   └── dashboard/
    │       ├── company/
    │       │   ├── layout.tsx        ← Company sidebar (Server Component)
    │       │   ├── page.tsx          ← Company dashboard
    │       │   ├── candidate/
    │       │   │   └── page.tsx      ← Candidate profile (recruiter view)
    │       │   └── leaderboard/
    │       │       └── page.tsx      ← Talent search leaderboard
    │       │
    │       └── student/
    │           ├── layout.tsx        ← Student sidebar (Client, animated collapse)
    │           ├── page.tsx          ← Student dashboard
    │           ├── results/
    │           │   └── page.tsx      ← AI Evaluation Report
    │           └── interview/
    │               ├── layout.tsx    ← Full-screen override (h-screen)
    │               ├── page.tsx      ← AI Interview Workspace
    │               └── prep/
    │                   ├── layout.tsx  ← Dark bg-[#09090E] wrapper
    │                   └── page.tsx    ← Assessment Setup page
    │
    ├── components/
    │   └── ui/
    │       ├── animated-score-ring.tsx  ← Emerald SVG ring (useInView triggered)
    │       └── score-ring.tsx           ← Indigo variant (for dark results hero)
    │
    ├── lib/
    │   ├── motion.ts                 ← ALL Framer Motion variants & transitions
    │   └── utils.ts                  ← cn() = clsx + twMerge
    │
    └── store/                        ← Zustand (directory only, no stores yet)
```

---

## Route → File Mapping

| URL | File | Layout Chain |
|---|---|---|
| `/` | `app/page.tsx` | root layout only |
| `/signup` | `app/signup/page.tsx` | root layout only |
| `/dashboard/student` | `app/dashboard/student/page.tsx` | root → student layout |
| `/dashboard/student/results` | `app/dashboard/student/results/page.tsx` | root → student layout |
| `/dashboard/student/interview` | `app/dashboard/student/interview/page.tsx` | root → interview layout |
| `/dashboard/student/interview/prep` | `app/dashboard/student/interview/prep/page.tsx` | root → interview layout → prep layout |
| `/dashboard/company` | `app/dashboard/company/page.tsx` | root → company layout |
| `/dashboard/company/leaderboard` | `app/dashboard/company/leaderboard/page.tsx` | root → company layout |
| `/dashboard/company/candidate` | `app/dashboard/company/candidate/page.tsx` | root → company layout |

---

## File Size Reference

| File | Size | Notes |
|---|---|---|
| `app/page.tsx` | 43KB | Largest file — full landing page |
| `app/dashboard/student/page.tsx` | ~17KB | Student dashboard |
| `app/dashboard/student/interview/prep/page.tsx` | ~14KB | Assessment setup |
| `app/dashboard/student/results/page.tsx` | ~13KB | Evaluation report |
| `app/dashboard/student/interview/page.tsx` | ~12KB | Interview workspace |
| `app/dashboard/company/page.tsx` | ~18KB | Company dashboard |
| `components/ui/animated-score-ring.tsx` | ~5KB | Reusable component |
| `lib/motion.ts` | ~2.4KB | Motion system |
| `app/globals.css` | ~2.7KB | Design tokens |

---

## Naming Conventions

| Item | Convention | Example |
|---|---|---|
| Page files | Always `page.tsx` | `results/page.tsx` |
| Layout files | Always `layout.tsx` | `interview/layout.tsx` |
| Component files | kebab-case | `animated-score-ring.tsx` |
| Component exports | PascalCase | `AnimatedScoreRing` |
| Utility exports | camelCase | `cn`, `fadeUp`, `EASE` |
| Constants | UPPER_SNAKE | `EASE`, `TRANSITIONS` |

---

## Missing Directories (Should Be Created)

```
src/
├── api/                    ← Typed API client functions (when backend connects)
├── data/                   ← Mock data files (currently inline in pages)
├── hooks/                  ← Custom React hooks
├── types/                  ← Shared TypeScript interfaces
├── middleware.ts            ← Auth route protection (when auth is added)
└── components/
    ├── layout/             ← Shared layout parts (Navbar, Footer, etc.)
    └── shared/             ← Cross-portal shared components
```
