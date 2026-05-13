# Phase 1 Context: Cinematic UI & Interactive Prototypes

> **Domain:** Premium Student/Company UI flows and "AI Operating System" interactivity.

## 🎯 Phase Goal
Complete the primary frontend pages (Onboarding, Assessment Setup, Results, Search) with an immersive, cinematic design that feels like an intelligent AI OS rather than a static dashboard. Establish a persistent "Demo State" for end-to-end realism.

## 🔒 Decisions Locked

### 🖥️ UI/UX: The "AI Operating System"
- **Aesthetic:** Clean, minimal, "Calm Intelligence" (Linear/Vercel inspired).
- **Interactivity:** Every page must feel "alive" with hover physics, animated counters, and real-time AI activity indicators.
- **Motion:** Strictly use `src/lib/motion.ts` for consistent physics-based transitions.
- **Components:**
    - **`FE-PREP`**: Single cinematic "AI Assessment Portal". Hero layout with scanning/loading effects and real-time blueprint generation.
    - **`FE-RESULTS`**: High-fidelity AI Talent Intelligence report. Clickable transcripts, reasoning panels, and radar visualizations.
    - **`FE-ONBOARD`**: Linear-style vertical progression questionnaire. Sticky AI panel, progressive reveal sections.

### 💾 State & Logic: Demo Control System
- **Persistence:** Use `localStorage` to bridge the gap between pages until the backend is wired.
- **Demo Presets:** Implement a hidden "Demo Control" system (keyboard shortcut or subtle panel) to toggle between **High / Medium / Low** performance outcomes.
- **Flow Logic:** Interview completion must automatically update the `localStorage` state to trigger specific analytics on the Results page.

## 🛠️ Code Context
- **Reusable Assets:**
    - `src/lib/motion.ts`: All animation variants.
    - `ScoreRing`: Use for performance analytics.
    - `sidebar`: Collapsible state logic.
- **Patterns:**
    - Vertical Linear scroll reveals for onboarding.
    - Floating cards and glassmorphism layers for cinematic depth.

## 📂 Canonical Refs
- [PROJECT.md](file:///c:/Users/Anas%20SM/Desktop/fyp-frontend/.planning/PROJECT.md)
- [REQUIREMENTS.md](file:///c:/Users/Anas%20SM/Desktop/fyp-frontend/.planning/REQUIREMENTS.md)
- [motion.ts](file:///c:/Users/Anas%20SM/Desktop/fyp-frontend/src/lib/motion.ts)
- [globals.css](file:///c:/Users/Anas%20SM/Desktop/fyp-frontend/src/app/globals.css) (for Tailwind v4 tokens)

---
*Last updated: 2026-05-13*
