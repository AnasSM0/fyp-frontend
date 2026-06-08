# INTEGRATIONS.md - HirdUp Frontend Integrations

> Generated: 2026-05-13 | Project: fyp-frontend | Scope: full repo

---

## Current Integration Posture

The frontend currently has no real backend, database, authentication provider, analytics provider, payment provider, or AI service integration in the checked source. It is a demo-first UI shell driven by static data, local component state, React Context, Zustand stores, and hardcoded navigation.

## Backend APIs

- No `fetch(` calls were found in `src/`.
- No `axios` dependency exists in `package.json`.
- No Next route handlers were found under `src/app/api/`.
- No server actions were observed.
- No generated API client or service layer exists under `src/lib/` or `src/services/`.
- `src/app/dashboard/student/page.tsx` has a comment indicating mock data is ready for backend wiring.

## Authentication

- `src/app/login/page.tsx` and `src/app/signup/page.tsx` implement UI flows only.
- No auth SDK dependency exists in `package.json`.
- No Next middleware file was found.
- No session, cookie, JWT, OAuth, or credentials handling code was found.
- Dashboard routes are navigable as ordinary pages and are not protected by middleware or server-side checks.

## Data Sources

| Source | Files | Current Role |
|---|---|---|
| Demo presets | `src/lib/demo-data.ts` | Drives student results pages for high/mid/low performance states |
| Demo context | `src/components/providers/demo-provider.tsx` | Stores selected demo performance preset |
| Company store | `src/store/useCompanyStore.ts` | Mock company candidates, stats, and search filtering |
| Leaderboard store | `src/store/useLeaderboardStore.ts` | Mock leaderboard candidates and category filters |
| Inline page arrays | Multiple `src/app/**/page.tsx` files | Route-specific cards, metrics, questions, timeline items, and profile details |

## Browser Storage

- `src/components/providers/demo-provider.tsx` reads and writes `localStorage`.
- Key: `xlr8_demo_performance`.
- The provider guards this with `useEffect`, so access happens client-side after mount.
- No other persistence layer was observed.

## Remote Media

- Multiple pages and stores use direct remote image URLs from `lh3.googleusercontent.com`.
- Examples include `src/store/useCompanyStore.ts`, `src/store/useLeaderboardStore.ts`, `src/app/dashboard/student/layout.tsx`, and `src/app/dashboard/company/layout.tsx`.
- These are often rendered with raw `<img>` elements and local `eslint-disable-next-line @next/next/no-img-element` comments.
- `next.config.ts` does not configure remote image domains because `next/image` is not currently used for these URLs.

## Service Worker

- `public/sw.js` exists.
- No registration code was found in `src/`.
- Treat the service worker as present but not currently integrated until registration is confirmed.

## Navigation Integrations

- Internal routing uses `next/link` and `next/navigation`.
- `src/app/page.tsx`, `src/app/login/page.tsx`, `src/app/signup/page.tsx`, `src/app/onboarding/page.tsx`, and interview pages import `useRouter`.
- Layout active states use `usePathname` in `src/app/dashboard/student/layout.tsx`, `src/app/dashboard/company/layout.tsx`, and `src/components/ui/page-transition.tsx`.
- Several placeholder links use `href="#"`, including navigation entries for features not implemented yet.

## External Product Integrations Not Yet Implemented

Planned or implied integrations from product context are not in code yet:

- FastAPI backend selected in `.planning/STATE.md`, but no frontend API wiring exists.
- PostgreSQL and pgvector are noted in `.planning/STATE.md`, but no frontend-facing data access exists.
- AI interview assessment is represented in UI copy and demo data, not connected to an AI service.
- Recruiter/company workflows are UI-only and do not persist offers, saved candidates, or messages.
- Authentication and authorization are absent.

## Integration Risks

- The app has many mock data shapes embedded in pages and stores; backend integration will require extracting typed API contracts rather than swapping one file.
- Authentication should be introduced before treating dashboard pages as real user areas.
- Remote image usage should be normalized before production to avoid brittle third-party asset dependencies.
- The hidden demo panel is useful for demonstrations, but should be gated or removed in production builds.
