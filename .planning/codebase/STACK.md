# STACK.md — XLR8Hire Frontend Technology Stack

> Generated: 2026-05-13 | Project: fyp-frontend

---

## Core Framework

| Layer | Technology | Version | Role |
|---|---|---|---|
| Framework | Next.js | 16.2.6 | App Router, SSG/SSR, file-based routing |
| Runtime | React | 19.2.4 | UI rendering (RC channel) |
| DOM | react-dom | 19.2.4 | Browser rendering |
| Language | TypeScript | ^5 | Strict typing throughout |
| Bundler | Turbopack | (built-in) | Dev server only (`next dev`) |

### Next.js Configuration
- **Router:** App Router exclusively — no `pages/` directory
- **Rendering:** All current routes are **Static** (`○`) — no `use server`, no `getServerSideProps`
- **Build:** `next build` with Turbopack — consistently passes in ~4s
- **Version note:** Next.js 16 has breaking changes from v13/14. Always read `node_modules/next/dist/docs/` before using new APIs.

---

## Styling

| Tool | Version | Role |
|---|---|---|
| Tailwind CSS | ^4 | Utility-first CSS |
| @tailwindcss/postcss | ^4 | PostCSS integration |

### Tailwind v4 Configuration
- **No `tailwind.config.js`** — All customization in `src/app/globals.css` via `@theme {}`
- Design tokens defined as CSS custom properties:
  ```css
  --color-accent: #4F46E5
  --color-verified: #059669
  --font-sans: "Geist", "Inter", system-ui, sans-serif
  --radius-md: 12px
  --shadow-glow: 0 0 48px rgba(79,70,229,0.12)
  ```
- Arbitrary values used extensively on dark pages: `bg-white/[0.03]`, `text-white/40`

---

## Animation

| Tool | Version | Role |
|---|---|---|
| Framer Motion | ^12.38.0 | All UI animations |

### Motion Architecture
- **Central system:** `src/lib/motion.ts` — all variants, easings, and transitions defined here
- **Never create ad-hoc variants** outside this file
- Primary easing: `[0.16, 1, 0.3, 1]` (outExpo — fast snap, slow settle)
- Key exports: `EASE`, `TRANSITIONS`, `fadeUp`, `fadeDown`, `fadeIn`, `staggerContainer`, `staggerItem`, `cardHover`, `subtleFloat`, `slowPulse`, `expandWidth`
- Patterns: `whileInView + viewport={{ once: true }}` for scroll reveals, `AnimatePresence` for mount/unmount, `layoutId` for shared element transitions

---

## State Management

| Tool | Version | Role |
|---|---|---|
| Zustand | ^5.0.13 | Global state (scaffolded only) |

- `src/store/` directory exists but is **empty** — no stores implemented yet
- All current state is **local** via `useState`/`useReducer` inside page components
- No React Context used anywhere

---

## Icons & Fonts

| Tool | Version | Role |
|---|---|---|
| lucide-react | ^1.14.0 | All icons — sole icon library |
| Geist Sans | (next/font) | Primary typeface |
| Geist Mono | (next/font) | Code/numbers/mono contexts |

> ⚠️ **Rule:** Never use Material Symbols, Heroicons, or any other icon library. `lucide-react` only.

---

## Utilities

| Tool | Version | Role |
|---|---|---|
| clsx | ^2.1.1 | Conditional className logic |
| tailwind-merge | ^3.6.0 | Merge conflicting Tailwind classes |

- Combined in `src/lib/utils.ts` as `cn()` — use everywhere for className composition

---

## Dev Tooling

| Tool | Version | Role |
|---|---|---|
| ESLint | ^9 | Linting |
| eslint-config-next | 16.2.6 | Next.js lint rules |

- `@types/node ^20`, `@types/react ^19`, `@types/react-dom ^19` installed
- TypeScript strict mode active

---

## What Is NOT Installed

| Category | Status |
|---|---|
| shadcn/ui | ❌ Not installed — components are hand-built |
| React Three Fiber / Three.js | ❌ Not installed — all 3D effects are CSS/SVG |
| React Query / SWR / Axios | ❌ Not installed — no API layer |
| NextAuth / Clerk / Auth.js | ❌ Not installed — no auth |
| Jest / Vitest / Playwright | ❌ Not installed — no tests |
| Prisma / Drizzle | ❌ Not applicable (frontend only) |
| Vercel Analytics / Sentry | ❌ Not installed |
| Zod / react-hook-form | ❌ Not installed — no form validation |
