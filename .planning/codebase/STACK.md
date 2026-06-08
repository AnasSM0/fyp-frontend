# STACK.md - HirdUp Frontend Technology Stack

> Generated: 2026-05-13 | Project: fyp-frontend | Scope: full repo

---

## Core Stack

| Layer | Technology | Version / Source | Role |
|---|---|---|---|
| Framework | Next.js | `16.2.6` in `package.json` | App Router application shell, routing, build/dev server |
| UI Runtime | React | `19.2.4` in `package.json` | Client component rendering and local interaction state |
| DOM Runtime | react-dom | `19.2.4` in `package.json` | Browser rendering target |
| Language | TypeScript | `^5` in `package.json` | Strictly typed TS/TSX source |
| Styling | Tailwind CSS | `^4` plus `@tailwindcss/postcss` | Utility-first styling with CSS-defined theme tokens |
| Animation | framer-motion | `^12.38.0` | Page transitions, reveal animations, animated dashboards |
| Icons | lucide-react | `^1.14.0` | Single icon set across navigation, controls, cards |
| Theme | next-themes | `^0.4.6` | Light/dark class switching |
| State | zustand | `^5.0.13` | Small client stores for company and leaderboard views |

## Runtime And Scripts

- Package manager state is npm-based: `package-lock.json` exists and dependencies are installed under `node_modules/`.
- `npm run dev` runs `next dev`.
- `npm run build` runs `next build`.
- `npm run start` runs `next start`.
- `npm run lint` runs `eslint`.
- `next.config.ts` currently exports an empty typed `NextConfig` object.
- `README.md` is still the default create-next-app README and does not document HirdUp-specific setup yet.

## Next.js Structure

- The app uses the `src/app` App Router layout.
- Global root shell is `src/app/layout.tsx`.
- The home route is `src/app/page.tsx`.
- Auth-adjacent screens are `src/app/login/page.tsx` and `src/app/signup/page.tsx`.
- Student dashboard routes live under `src/app/dashboard/student/`.
- Company dashboard routes live under `src/app/dashboard/company/`.
- There is no `pages/` directory and no API route implementation in the current source tree.
- There are no observed server actions, route handlers, middleware, or backend data loaders.

## TypeScript Configuration

- `tsconfig.json` enables `strict: true`, `isolatedModules: true`, `noEmit: true`, and `moduleResolution: "bundler"`.
- `allowJs: true` is enabled, which allows root utility scripts such as `convertToReact.js`, `convertStudentDashboard.js`, and `updateTheme.js`.
- Path aliases are configured as `@/* -> ./src/*`.
- Next plugin support is configured in `tsconfig.json`.

## Styling System

- Tailwind v4 is imported from `src/app/globals.css` using `@import "tailwindcss";`.
- Design tokens are declared in `src/app/globals.css` inside `@theme`.
- CSS custom properties define core colors, typography, radius, shadows, spacing, and dark-mode overrides.
- The dominant application token names are `--color-bg-primary`, `--color-text-primary`, `--color-accent`, `--color-border`, and related variants.
- Dark mode is implemented by overriding tokens under `.dark`.
- The root layout applies Geist and Geist Mono from `next/font/google` in `src/app/layout.tsx`.

## Animation System

- Shared animation constants live in `src/lib/motion.ts`.
- Exported patterns include `fadeUp`, `fadeDown`, `fadeIn`, `staggerContainer`, `staggerItem`, `cardHover`, `subtleFloat`, `slowPulse`, and `expandWidth`.
- Many large route components also define local `motion` patterns inline.
- `src/components/ui/page-transition.tsx` wraps route children from `src/app/layout.tsx`.

## State And Data

- `src/components/providers/demo-provider.tsx` provides demo performance state through React Context.
- Demo performance state is persisted in `localStorage` using the `xlr8_demo_performance` key.
- `src/components/providers/demo-control.tsx` exposes the hidden demo panel controlled by `Ctrl + Shift + D`.
- `src/lib/demo-data.ts` contains the high/mid/low results presets used by `src/app/dashboard/student/results/page.tsx`.
- `src/store/useCompanyStore.ts` contains mock company candidate and dashboard state.
- `src/store/useLeaderboardStore.ts` contains mock leaderboard candidates and filter logic.

## Build-Time And Public Assets

- Static public assets are under `public/`, including `public/sw.js` and default SVG files from the starter.
- The project currently uses remote image URLs directly in JSX, often through raw `<img>` tags.
- There is no observed image domain configuration in `next.config.ts`.
- The application favors client-side rendering for most pages via `"use client"` directives.

## Important Version Note

- `AGENTS.md` explicitly warns that this is a changed Next.js version and that Next docs under `node_modules/next/dist/docs/` should be read before writing code that depends on Next APIs.
- For future code changes involving Next.js APIs, validate against local `node_modules/next/dist/docs/` rather than assuming older Next 13/14 conventions.
