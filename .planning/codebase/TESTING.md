# TESTING.md - HirdUp Frontend Testing State

> Generated: 2026-05-13 | Project: fyp-frontend | Scope: full repo

---

## Current Test Coverage

No first-party test files were found under `src/`.

Observed checks:

- `npm run lint` is available through `package.json`.
- Type checking is implicitly part of `next build`.
- There are no configured unit, component, integration, or end-to-end test scripts in `package.json`.
- There is no observed `.github/` workflow or other CI configuration in the project root.

## Test Dependencies

No first-party test framework dependencies are present in `package.json`.

Missing common tools:

- No Jest.
- No Vitest.
- No React Testing Library.
- No Playwright.
- No Cypress.
- No MSW.
- No Storybook.

## Existing Quality Gates

| Gate | Command | Status |
|---|---|---|
| Lint | `npm run lint` | Configured |
| Build/type check | `npm run build` | Configured through Next |
| Unit tests | None | Not configured |
| Component tests | None | Not configured |
| E2E tests | None | Not configured |
| CI | None observed | Not configured |

## Files That Need Coverage First

Highest-value coverage targets based on current behavior:

- `src/components/providers/demo-provider.tsx`
  - Validates localStorage initialization.
  - Persists `performance` changes.
  - Toggles demo panel with `Ctrl + Shift + D`.
  - Throws when `useDemoState()` is used outside provider.
- `src/lib/demo-data.ts`
  - Confirms high/mid/low presets satisfy expected results-page shape.
- `src/store/useCompanyStore.ts`
  - Covers search by name, role, id, and skills.
  - Covers empty search returning all candidates.
- `src/store/useLeaderboardStore.ts`
  - Covers specialization filter mappings.
  - Covers `All` returning all candidates.
- `src/lib/utils.ts`
  - Covers `cn()` class merge behavior if a test runner is introduced.

## Candidate E2E Flows

Critical flows for future Playwright coverage:

- Landing page loads and links to `/signup`, `/login`, and company dashboard CTA.
- Signup flow reaches onboarding or intended next step.
- Login flow reaches the correct dashboard for demo credentials or selected role.
- Onboarding flow can complete and enter `/dashboard/student`.
- Student can navigate dashboard -> interview prep -> interview -> results -> post-mortem.
- Demo control changes results preset and results page updates.
- Company can navigate dashboard -> search -> candidate details.
- Company leaderboard renders and links to candidate detail.
- Theme toggle persists visually across main surfaces.

## Manual Verification Notes

Until automated tests exist, manually verify:

- Responsive layouts for large route files such as `src/app/page.tsx`, `src/app/signup/page.tsx`, and dashboard pages.
- Sidebar collapse behavior in `src/app/dashboard/student/layout.tsx`.
- Active navigation states in student and company layouts.
- Demo preset switching from `src/components/providers/demo-control.tsx`.
- Results page data selection from `src/lib/demo-data.ts`.
- Candidate filtering behavior in company search and leaderboard views.

## Testing Risks

- Large client route components make focused component tests harder because route UI, state, and content are colocated.
- No backend service layer exists yet, so future API integration tests may be difficult if calls are introduced directly inside pages.
- Demo behavior depends on `localStorage` and keyboard events, which need browser-like test support.
- Raw remote images may make visual/E2E checks flaky unless mocked or replaced with local stable assets.
- Without CI, regressions can land even if local lint/build commands are available.

## Recommended Next Testing Setup

1. Add Vitest plus React Testing Library for unit/component coverage of providers, stores, and utilities.
2. Add Playwright for the core demo journeys and responsive checks.
3. Add a `typecheck` script if Next build becomes too heavy for quick validation.
4. Add CI to run lint, type/build, unit tests, and a focused E2E smoke suite.
5. Keep fixtures near tests and avoid reusing production mock objects when the test should assert contract behavior.
