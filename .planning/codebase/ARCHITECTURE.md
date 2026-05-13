# ARCHITECTURE.md - XLR8Hire Frontend Architecture

> Generated: 2026-05-13 | Project: fyp-frontend | Scope: full repo

---

## System Shape

This repository is a single Next.js App Router frontend for XLR8Hire, an AI-powered reverse hiring demo. The current implementation is a client-heavy UI prototype with static/mock data and no production backend boundary yet.

The architecture is best understood as:

- Route components in `src/app/**`.
- Shared UI primitives in `src/components/ui/`.
- Global providers in `src/components/providers/`.
- Demo and mock data in `src/lib/` and `src/store/`.
- Global design tokens in `src/app/globals.css`.

## Entry Points

- `src/app/layout.tsx` is the root HTML/body shell.
- `src/app/globals.css` defines Tailwind import, theme tokens, dark-mode tokens, and keyframes.
- `src/app/page.tsx` is the marketing/home route and contains many local section components.
- `src/app/dashboard/student/layout.tsx` provides the student portal sidebar/topbar frame.
- `src/app/dashboard/company/layout.tsx` provides the company portal sidebar/topbar frame.
- `src/components/providers/theme-provider.tsx` wraps `next-themes`.
- `src/components/providers/demo-provider.tsx` wraps app content with demo scenario state.

## Routing Model

The app uses file-system routing:

- `/` -> `src/app/page.tsx`
- `/login` -> `src/app/login/page.tsx`
- `/signup` -> `src/app/signup/page.tsx`
- `/onboarding` -> `src/app/onboarding/page.tsx`
- `/dashboard/student` -> `src/app/dashboard/student/page.tsx`
- `/dashboard/student/interview/prep` -> `src/app/dashboard/student/interview/prep/page.tsx`
- `/dashboard/student/interview` -> `src/app/dashboard/student/interview/page.tsx`
- `/dashboard/student/results` -> `src/app/dashboard/student/results/page.tsx`
- `/dashboard/student/results/post-mortem` -> `src/app/dashboard/student/results/post-mortem/page.tsx`
- `/dashboard/company` -> `src/app/dashboard/company/page.tsx`
- `/dashboard/company/search` -> `src/app/dashboard/company/search/page.tsx`
- `/dashboard/company/leaderboard` -> `src/app/dashboard/company/leaderboard/page.tsx`
- `/dashboard/company/candidate` -> `src/app/dashboard/company/candidate/page.tsx`

## Provider Stack

`src/app/layout.tsx` wraps all pages with:

- `ThemeProvider` from `src/components/providers/theme-provider.tsx`.
- `DemoProvider` from `src/components/providers/demo-provider.tsx`.
- `PageTransition` from `src/components/ui/page-transition.tsx`.
- `DemoControl` from `src/components/providers/demo-control.tsx`.

This means theme and demo state are globally available to client components beneath the root layout.

## Client Component Pattern

Most route pages are client components using `"use client"`.

Common reasons:

- Framer Motion animations.
- `useState` for forms, sidebars, steps, timers, and UI selections.
- `useEffect` for browser-only behavior.
- `useRouter` and `usePathname` from `next/navigation`.
- Demo state and Zustand store hooks.

There is currently no clear server/client boundary beyond the root layout metadata export.

## Data Flow

### Demo Results Flow

1. `src/components/providers/demo-provider.tsx` stores the active `performance` value.
2. `src/components/providers/demo-control.tsx` allows changing it via hidden control panel.
3. `src/app/dashboard/student/results/page.tsx` reads `useDemoState()`.
4. The page selects `DEMO_PRESETS[performance]` from `src/lib/demo-data.ts`.
5. UI renders score, fit, skills, transcript, strengths, weaknesses, and role fit from the preset.

### Company Search Flow

1. `src/store/useCompanyStore.ts` owns candidate data, stats, and `searchQuery`.
2. `filteredCandidates()` derives candidates from query text and candidate fields.
3. Company-facing pages can consume this store for discovery/search behaviors.

### Leaderboard Flow

1. `src/store/useLeaderboardStore.ts` owns candidate rows and `activeFilter`.
2. `filteredCandidates()` maps UI filters to specialization sets.
3. Leaderboard pages render filtered rows/cards and link to candidate details.

## UI Composition

- Large pages often define section-local components in the same file, especially `src/app/page.tsx`.
- Shared generic UI is limited and located under `src/components/ui/`.
- There is no formal component library or design-system package yet.
- Repeated dashboard shell code is split by user type into separate layouts rather than a shared layout abstraction.

## Styling Architecture

- The project relies on Tailwind utility classes and CSS variables.
- Semantic color tokens live in `src/app/globals.css`.
- Components frequently use arbitrary values such as `text-[14px]`, `rounded-[12px]`, and `bg-[var(--color-accent)]`.
- Dark mode is token-driven via `.dark`, not by separate component branches.

## Current Architectural Boundaries

| Boundary | Status |
|---|---|
| Routes vs shared components | Present but loose; many pages are large and self-contained |
| UI vs data | Partial; demo data and stores exist, but many arrays remain inline |
| Frontend vs backend | Not implemented |
| Auth boundary | Not implemented |
| Test boundary | Not implemented |
| Domain model boundary | Emerging through TypeScript interfaces in stores and demo data |

## Primary Architectural Risks

- Large client route files will become difficult to maintain as real backend flows arrive.
- Mock data is distributed across pages, stores, and `src/lib/demo-data.ts`.
- The absence of an API/service layer means backend wiring may create inconsistent data access patterns unless introduced deliberately.
- Dashboard access is route-only; there is no auth/session architecture yet.
- Component reuse is still early, so visual consistency depends on manual class reuse and globals.
