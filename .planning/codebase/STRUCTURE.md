# STRUCTURE.md - HirdUp Frontend Directory Structure

> Generated: 2026-05-13 | Project: fyp-frontend | Scope: full repo

---

## Top-Level Layout

| Path | Purpose |
|---|---|
| `src/` | Application source |
| `src/app/` | Next.js App Router routes, layouts, global CSS, favicon |
| `src/components/` | Shared and provider components |
| `src/lib/` | Utility functions, animation constants, demo data |
| `src/store/` | Zustand stores for mock dashboard state |
| `public/` | Static public assets and `sw.js` |
| `.planning/` | GSD planning and codebase documentation |
| `.stitch/` | Stitch-related project artifacts |
| `node_modules/` | Installed dependencies |

## Root Files

- `package.json` defines runtime scripts and dependencies.
- `package-lock.json` locks npm dependency versions.
- `next.config.ts` is currently a minimal typed Next config.
- `tsconfig.json` configures strict TypeScript and the `@/*` alias.
- `eslint.config.mjs` configures ESLint 9 with Next core web vitals and TypeScript rules.
- `postcss.config.mjs` configures Tailwind v4 PostCSS integration.
- `AGENTS.md` contains the important Next.js version warning.
- `README.md` is still the default create-next-app README.
- `handoff.md`, `HIRDUP_CONTEXT.md`, `GEMINI.md`, and `CLAUDE.md` are project/context handoff files.
- `convertToReact.js`, `convertStudentDashboard.js`, and `updateTheme.js` are root utility/conversion scripts.
- `leaderboard.html` and `leaderboard2.html` appear to be prototype/source HTML artifacts.

## App Router Tree

```text
src/app/
  globals.css
  layout.tsx
  page.tsx
  login/page.tsx
  signup/page.tsx
  onboarding/page.tsx
  dashboard/
    student/
      layout.tsx
      page.tsx
      interview/
        layout.tsx
        page.tsx
        prep/layout.tsx
        prep/page.tsx
      results/
        page.tsx
        post-mortem/page.tsx
    company/
      layout.tsx
      page.tsx
      candidate/page.tsx
      leaderboard/page.tsx
      search/page.tsx
```

## Route Groups By Product Area

### Public And Onboarding

- `src/app/page.tsx` is the landing page and contains navbar, hero, feature, social proof, and CTA sections.
- `src/app/login/page.tsx` is a login UI with navigation links but no real auth integration.
- `src/app/signup/page.tsx` is a signup UI with navigation links but no real account creation.
- `src/app/onboarding/page.tsx` is a multi-step onboarding-style UI and links into the student dashboard.

### Student Portal

- `src/app/dashboard/student/layout.tsx` implements a collapsible sidebar, topbar, profile area, and search input.
- `src/app/dashboard/student/page.tsx` is the student dashboard overview.
- `src/app/dashboard/student/interview/prep/page.tsx` is the interview preparation screen.
- `src/app/dashboard/student/interview/page.tsx` is the interview/assessment flow.
- `src/app/dashboard/student/results/page.tsx` is the results dashboard driven by demo presets.
- `src/app/dashboard/student/results/post-mortem/page.tsx` is the detailed post-mortem view.

### Company Portal

- `src/app/dashboard/company/layout.tsx` implements the company sidebar and topbar.
- `src/app/dashboard/company/page.tsx` is the company dashboard overview.
- `src/app/dashboard/company/search/page.tsx` is candidate discovery/search UI.
- `src/app/dashboard/company/leaderboard/page.tsx` is leaderboard UI.
- `src/app/dashboard/company/candidate/page.tsx` is a candidate detail/profile UI.

## Shared Components

```text
src/components/
  onboarding/ai-assistant.tsx
  providers/
    demo-control.tsx
    demo-provider.tsx
    theme-provider.tsx
  ui/
    animated-counter.tsx
    animated-score-ring.tsx
    mesh-background.tsx
    page-transition.tsx
    score-ring.tsx
    theme-toggle.tsx
```

- `src/components/providers/` contains global wrappers and demo controls.
- `src/components/ui/` contains small reusable visual primitives.
- `src/components/onboarding/ai-assistant.tsx` is currently scoped to onboarding.

## Libraries And Stores

```text
src/lib/
  demo-data.ts
  motion.ts
  utils.ts

src/store/
  useCompanyStore.ts
  useLeaderboardStore.ts
```

- `src/lib/utils.ts` exports `cn()` using `clsx` and `tailwind-merge`.
- `src/lib/motion.ts` centralizes animation variants and transitions.
- `src/lib/demo-data.ts` centralizes student result preset data.
- `src/store/useCompanyStore.ts` owns mock company candidate/search state.
- `src/store/useLeaderboardStore.ts` owns mock leaderboard state.

## Naming Conventions

- Route files follow Next App Router names: `page.tsx` and `layout.tsx`.
- Shared components use kebab-case filenames, for example `theme-toggle.tsx` and `animated-score-ring.tsx`.
- Zustand store files are named by hook, for example `useCompanyStore.ts`.
- Component functions use PascalCase.
- Hook/store exports use camelCase names beginning with `use`.

## Files To Treat Carefully

- `src/app/globals.css` is the design-token source for the app.
- `src/app/layout.tsx` wires global providers and page transitions.
- `src/components/providers/demo-provider.tsx` affects all demo results.
- `src/lib/demo-data.ts` controls results-page scenario content.
- `src/app/dashboard/student/layout.tsx` and `src/app/dashboard/company/layout.tsx` own portal chrome.
