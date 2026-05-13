# TESTING.md — XLR8Hire Frontend Testing State

> Generated: 2026-05-13

---

## Current State: No Tests Exist

```
Test files:        0
Test frameworks:   0 installed
Test scripts:      0 in package.json
Coverage:          0%
CI pipeline:       Not configured
```

No Jest, Vitest, Playwright, Cypress, or Testing Library is installed.

---

## What Should Be Tested (Priority Order)

### Unit Tests (Vitest + Testing Library)

| Component/Function | Test Cases |
|---|---|
| `AnimatedScoreRing` | Renders with correct score, handles maxScore=0, useInView triggers animation |
| `cn()` utility | Merges classes correctly, handles conditionals, resolves conflicts |
| Motion variants in `motion.ts` | Correct shape of variants/transitions objects |
| Sidebar toggle logic | Opens/closes, persists state, correct width values |
| `ProcessingSteps` in prep page | Steps advance on interval, completes at final step |
| `Check` in prep/results page | Status transitions from checking→ok after delay |
| `ScoreRing` | SVG renders, strokeDashoffset calculated correctly from score/max |

### Integration Tests (Vitest + Testing Library)

| Page | Key Scenarios |
|---|---|
| `/signup` | Role selector switches Student/Company, form fields render correctly |
| `/dashboard/student` | Sidebar collapses/expands, nav links present |
| `/dashboard/student/interview/prep` | System checks complete, Start Test button links to /interview |
| `/dashboard/student/results` | Accordion opens/closes, all 9 sections render |
| `/dashboard/company/leaderboard` | Candidate cards render, search input exists |

### E2E Tests (Playwright)

| Flow | Steps |
|---|---|
| Student assessment flow | `/signup` → `/dashboard/student` → `/interview/prep` → `/interview` → `/results` |
| Company talent search | `/signup` (company) → `/dashboard/company` → `/leaderboard` → `/candidate` |
| Sidebar toggle | Dashboard opens, click collapse, verify icon-only mode, click expand |

---

## Recommended Setup

### Step 1: Install Vitest + Testing Library
```bash
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

### Step 2: vitest.config.ts
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

### Step 3: package.json scripts
```json
"scripts": {
  "test": "vitest",
  "test:ui": "vitest --ui",
  "test:coverage": "vitest run --coverage"
}
```

### Step 4: Install Playwright for E2E
```bash
npx playwright install
```

---

## Notes on Testability

### Challenges
- **Framer Motion:** Requires mocking in tests — use `vi.mock("framer-motion")` pattern
- **next/navigation:** Router hooks need wrapping in test providers
- **`useInView`:** jsdom doesn't support IntersectionObserver — mock it

### Mock Pattern for Framer Motion
```ts
vi.mock("framer-motion", async () => {
  const actual = await vi.importActual("framer-motion");
  return {
    ...actual,
    motion: {
      div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
      // ...etc
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});
```
