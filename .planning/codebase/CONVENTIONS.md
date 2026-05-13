# CONVENTIONS.md — XLR8Hire Frontend Code Conventions

> Generated: 2026-05-13

---

## Component Conventions

### Server vs Client
```tsx
// Client Component — required when using:
"use client";
// - useState, useEffect, useRef, useCallback
// - Framer Motion: motion.*, AnimatePresence, useMotionValue, useInView
// - Event handlers that run in browser

// Server Component — default (no directive needed)
// - Layout files (except student/layout.tsx)
// - Pages with no interactivity
// - Static content sections
```

### Component Definition Pattern
```tsx
// Props interface at top of file (inline, not separate types file yet)
interface MyComponentProps {
  value: string;
  delay?: number;
}

// Named export (not default) for shared components
export function MyComponent({ value, delay = 0 }: MyComponentProps) { ... }

// Default export for pages and layouts
export default function PageName() { ... }
```

---

## Styling Conventions

### className Composition
```tsx
// Always use cn() from @/lib/utils — never template literals for conditional classes
import { cn } from "@/lib/utils";

className={cn(
  "base-class another-class",
  isActive && "active-class",
  className  // pass-through for component variants
)}
```

### Light Pages (Dashboard, Landing, Signup)
```tsx
// Use CSS variables via var() or Tailwind token names
className="bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"
className="border border-[var(--color-border)]"
className="text-[var(--color-accent)] bg-[var(--color-accent-light)]"

// Hover pattern
className="hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-accent)]"
```

### Dark Pages (Interview, Prep, Results)
```tsx
// Use Tailwind arbitrary values with opacity fractions
className="bg-[#09090E]"                    // page background
className="bg-white/[0.03]"                 // card background
className="border border-white/[0.08]"      // card border
className="hover:border-indigo-500/30"      // hover border
className="text-white/40"                   // muted text
className="text-indigo-400"                 // accent label
className="bg-indigo-500/10"                // tinted background
```

### Standard Card (Dark)
```tsx
className="bg-white/[0.03] border border-white/[0.08] hover:border-indigo-500/30 rounded-2xl p-6 transition-all duration-300"
```

### Overline + Section Heading Pattern
```tsx
<div className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest mb-2">
  Section Label
</div>
<h2 className="text-[28px] font-bold tracking-tight">Section Title</h2>
<p className="text-white/40 text-[14px] mt-2 leading-[1.7]">Supporting copy.</p>
```

---

## Animation Conventions

### Rule: Import from motion.ts — Never Create Ad-hoc
```tsx
// ✅ Correct
import { fadeUp, staggerContainer, EASE, cardHover } from "@/lib/motion";

// ❌ Wrong — don't define variants inline in pages
const myVariant = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
```

### Standard Scroll Reveal
```tsx
<motion.div
  initial="hidden"
  whileInView="show"
  viewport={{ once: true }}
  variants={staggerContainer}
>
  <motion.div variants={staggerItem}>Content</motion.div>
</motion.div>
```

### Dark Page Inline Shorthand (Accepted Exception)
Used in dark pages for brevity — defined at top of component file:
```tsx
const s = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16,1,0.3,1] as const } } };
const sc = (delay = 0) => ({ hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: delay } } });
```

### Card Hover
```tsx
// Use the spread from motion.ts
<motion.div {...cardHover}>...</motion.div>

// Or inline for simple cases
whileHover={{ y: -4 }} whileTap={{ scale: 0.97 }}
```

### AnimatePresence — Always wrap conditional renders
```tsx
<AnimatePresence>
  {isOpen && (
    <motion.div
      key="unique-key"   // ← required for AnimatePresence
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
    >
      Content
    </motion.div>
  )}
</AnimatePresence>
```

---

## Icon Conventions

```tsx
// ✅ Only lucide-react
import { Brain, Shield, CheckCircle2, ArrowRight } from "lucide-react";

// Standard sizes
className="w-4 h-4"   // inline / dense UI
className="w-5 h-5"   // standard nav/card icons
className="w-6 h-6"   // prominent icons

// Standard stroke widths
strokeWidth={1.5}      // subtle, decorative
strokeWidth={2}        // default
strokeWidth={2.5}      // emphasis (CTA icons)
```

---

## TypeScript Conventions

```tsx
// Easing arrays — always "as const"
const ease = [0.16, 1, 0.3, 1] as const;

// Optional props with defaults in destructuring
function Component({ size = 120, delay = 0 }: { size?: number; delay?: number }) {}

// Avoid `any` — use proper types or `unknown`
```

---

## File & Import Conventions

```tsx
// Path alias — always use @/ not relative paths
import { cn } from "@/lib/utils";
import { AnimatedScoreRing } from "@/components/ui/animated-score-ring";

// Import order (not enforced by linter yet — follow manually):
// 1. React/Next.js
// 2. Third-party libraries (framer-motion, lucide-react)
// 3. Internal @/ imports
// 4. Types
```

---

## Do Not Rules

| Rule | Why |
|---|---|
| Never use `<img>` without eslint-disable comment | Use `next/image` for optimization (or add comment when external URL needed) |
| Never hardcode colors outside globals.css or Tailwind classes | Use CSS vars or Tailwind utilities |
| Never create motion Variants outside `motion.ts` | Centralized consistency |
| Never use Material Symbols or other icon libraries | `lucide-react` only |
| Never use `tailwind.config.js` | Tailwind v4 uses `@theme{}` |
| Never add `pages/` directory | App Router only |
