# CONCERNS.md - XLR8Hire Frontend Concerns

> Generated: 2026-05-13 | Project: fyp-frontend | Scope: full repo

---

## Executive Summary

The frontend is visually broad and route-complete for a demo, but it is still a mock-driven prototype. The main risks are missing backend/auth integration, no automated tests, large client route files, scattered mock data, and production readiness gaps around remote assets and placeholder navigation.

## High Priority Concerns

### No Real Backend Integration

- No API calls were found in `src/`.
- No route handlers exist under `src/app/api/`.
- `.planning/STATE.md` says FastAPI, PostgreSQL, and pgvector were chosen, but this frontend has no service layer for them yet.
- Mock data is spread across `src/lib/demo-data.ts`, `src/store/useCompanyStore.ts`, `src/store/useLeaderboardStore.ts`, and page-local arrays.

Impact: replacing mocks with real data will touch many UI files unless an API/data boundary is introduced first.

### No Authentication Or Route Protection

- `src/app/login/page.tsx` and `src/app/signup/page.tsx` are UI-only.
- No auth SDK or session logic exists in `package.json` or `src/`.
- No `middleware.ts` exists to protect dashboard routes.
- Dashboard URLs can be accessed directly.

Impact: user-specific student/company workflows cannot be considered production-safe yet.

### No Automated Tests

- No test files were found under `src/`.
- No test script or test dependencies exist in `package.json`.
- Only lint/build scripts are configured.

Impact: large UI flows can regress silently, especially demo-state changes, navigation, and dashboard filtering.

## Medium Priority Concerns

### Large Client Pages

- `src/app/page.tsx` is a large landing page with many local section components.
- Dashboard route files are also sizable and combine content, layout, state, animation, and presentation.
- Most routes use `"use client"`.

Impact: future backend wiring and testing will be harder unless domain/data logic is extracted.

### Distributed Mock Data

- Results data is in `src/lib/demo-data.ts`.
- Company candidates are in `src/store/useCompanyStore.ts`.
- Leaderboard candidates are in `src/store/useLeaderboardStore.ts`.
- Many page files contain inline static arrays and hardcoded profile details.

Impact: the same candidate or score concepts may diverge between student and company views.

### Remote Images And Raw `<img>`

- Many components use remote `lh3.googleusercontent.com` image URLs.
- Several raw `<img>` usages suppress `@next/next/no-img-element`.
- `next.config.ts` has no image remote configuration.

Impact: production visuals depend on third-party URLs and bypass Next image optimization.

### Placeholder Links

- Some navigation entries use `href="#"`, such as dashboard Projects, Messages, Saved, Offers, Analytics, and login recovery links.
- Footer/legal links reference `/terms` and `/privacy`, but corresponding routes were not found.

Impact: demos can hit dead ends and production users will encounter incomplete navigation.

## Product/Domain Concerns

- AI assessment, recruiter discovery, skill verification, and interview readiness are represented as copy and static data, not verified workflows.
- The hidden demo panel can switch candidate performance, which is useful for demoing but inappropriate for a real user environment.
- Company candidate detail pages appear to be static rather than driven by candidate IDs.
- Student results and company leaderboard likely need a shared candidate/assessment domain model.

## Technical Debt

- Root scripts `convertToReact.js`, `convertStudentDashboard.js`, and `updateTheme.js` suggest migration/prototype work remains in the repo.
- Prototype HTML files `leaderboard.html` and `leaderboard2.html` remain at root.
- `README.md` has not been updated for the actual XLR8Hire project.
- `allowJs: true` in `tsconfig.json` may be intentional for scripts, but it broadens the compilation surface.
- No Prettier or formatting automation is configured.
- No CI workflow was observed.

## Security Concerns

- No secrets were found during source scan, but there is no environment variable pattern yet.
- Auth is absent, so dashboard data is not protected.
- No CSRF/session strategy exists because there is no backend integration yet.
- User input fields are UI-only, but future submission handlers will need validation and error handling.
- Demo localStorage state is benign, but do not store sensitive assessment or auth data there.

## Performance Concerns

- Heavy use of client components and Framer Motion can increase JavaScript payload.
- Large route files may ship more code than needed per route if not split carefully.
- Remote raw images may load without optimization.
- The landing page includes continuous animation and parallax effects that should be checked on low-end devices.

## Accessibility Concerns

- Many custom buttons and animated controls exist; keyboard and screen-reader behavior has not been tested.
- Raw icons are frequently used; ensure icon-only controls have accessible labels.
- Some placeholder links may be announced as actionable but do nothing useful.
- Color contrast should be verified in both light and dark themes, especially muted text over dark panels.

## Recommended Remediation Order

1. Add a typed API/service boundary before wiring FastAPI.
2. Implement auth/session routing and protect dashboard routes.
3. Add tests for demo provider, stores, and one student/company smoke flow.
4. Centralize domain mock data into typed fixtures or API-shaped adapters.
5. Replace raw remote images with stable assets or configured `next/image`.
6. Remove or route placeholder links before production demos.
7. Update `README.md` with project-specific setup, scripts, and demo controls.
