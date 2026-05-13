# CONVENTIONS.md - XLR8Hire Frontend Conventions

> Generated: 2026-05-13 | Project: fyp-frontend | Scope: full repo

---

## TypeScript Conventions

- Source files use TypeScript and TSX under `src/`.
- `tsconfig.json` has `strict: true`, so new code should avoid implicit `any` and weakly typed props.
- Shared aliases use `@/*`, for example `@/components/ui/theme-toggle` and `@/lib/demo-data`.
- Domain shapes are currently defined near their state owners:
  - `Candidate` and `DashboardStats` in `src/store/useCompanyStore.ts`.
  - `LeaderboardCandidate` in `src/store/useLeaderboardStore.ts`.
  - `DemoPreset` in `src/lib/demo-data.ts`.
- Props are often typed inline for simple components, for example `({ children }: { children: React.ReactNode })`.

## React And Next Conventions

- Most interactive routes start with `"use client"`.
- Navigation uses `next/link` for links and `useRouter` / `usePathname` from `next/navigation` for imperative navigation or active route state.
- Root metadata is exported from `src/app/layout.tsx`.
- App shell providers are composed in `src/app/layout.tsx`.
- Dashboard areas use route layouts:
  - Student chrome: `src/app/dashboard/student/layout.tsx`.
  - Company chrome: `src/app/dashboard/company/layout.tsx`.
- Pages currently favor colocating route-specific section components and arrays inside `page.tsx` files.

## Styling Conventions

- Tailwind classes are the dominant styling method.
- Semantic colors and design values are referenced through CSS variables, for example `bg-[var(--color-bg-primary)]` and `text-[var(--color-accent)]`.
- Theme tokens live in `src/app/globals.css`.
- Dark mode is token-based under `.dark`.
- Utility classes often use explicit pixel values, such as `h-[64px]`, `px-[48px]`, `rounded-[12px]`, and `text-[14px]`.
- Shared class merging should use `cn()` from `src/lib/utils.ts`.

## Animation Conventions

- Use Framer Motion for interactive animation.
- Prefer shared variants from `src/lib/motion.ts` when a pattern already exists.
- Existing exports include `fadeUp`, `fadeDown`, `fadeIn`, `staggerContainer`, `staggerItem`, `cardHover`, `subtleFloat`, `slowPulse`, and `expandWidth`.
- Page-level animation often uses `motion.div`, `AnimatePresence`, and transition constants.
- Route transition wrapping is centralized in `src/components/ui/page-transition.tsx`.

## State Conventions

- Global demo state uses React Context in `src/components/providers/demo-provider.tsx`.
- Small domain stores use Zustand:
  - `src/store/useCompanyStore.ts`
  - `src/store/useLeaderboardStore.ts`
- Derived filtering logic is implemented as store methods such as `filteredCandidates()`.
- Page-only state remains local with `useState`.
- Browser persistence currently appears only in the demo provider through `localStorage`.

## UI Component Conventions

- Shared UI primitives are placed under `src/components/ui/`.
- Provider components are placed under `src/components/providers/`.
- Icons come from `lucide-react`.
- Raw `<img>` is used in several places with `eslint-disable-next-line @next/next/no-img-element`.
- Buttons and cards generally use Tailwind directly rather than a shared button/card component abstraction.
- Large pages contain repeated layout patterns that may later be candidates for extraction.

## Data Conventions

- Demo results data is centralized in `src/lib/demo-data.ts`.
- Company and leaderboard mock candidate data are centralized in Zustand stores.
- Other route-specific content is frequently inline in page files.
- Mock data includes user names, companies, scores, skills, questions, profile data, and remote image URLs.
- There is no central API model or schema validation layer yet.

## Error Handling Conventions

- There is no app-wide error boundary observed beyond Next defaults.
- No `error.tsx` or `not-found.tsx` files were observed in `src/app/`.
- `useDemoState()` throws if used outside `DemoProvider`, which is the clearest explicit runtime guard.
- Form pages currently appear UI-first and do not have backend validation/error states.

## Linting And Formatting

- ESLint is configured through `eslint.config.mjs`.
- The config extends `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`.
- Default ignores include `.next/**`, `out/**`, `build/**`, and `next-env.d.ts`.
- No Prettier configuration was observed.
- No lint-staged, Husky, or CI quality gate was observed.

## Practical Guidance For New Code

- Before changing Next-specific APIs, follow `AGENTS.md` and read relevant docs under `node_modules/next/dist/docs/`.
- Keep new shared UI in `src/components/ui/` only when it is reusable across pages.
- Keep route-specific content close to the route until a second use case appears.
- Add typed service functions before introducing backend calls directly inside large page components.
- Prefer tokenized colors from `src/app/globals.css` over ad hoc one-off colors.
