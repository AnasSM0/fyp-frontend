# Phase 1 Plan: Cinematic UI & Interactive Prototypes

> **Goal:** Complete the student and recruiter UI flows with an "AI OS" aesthetic and persistent demo state.

---

## 🏗️ Technical Context
- **Framework:** Next.js 16 (App Router)
- **State:** `localStorage` + React Context for demo-state persistence.
- **Motion:** Framer Motion (using `src/lib/motion.ts`).
- **Icons:** Lucide React.

---

## 📝 Implementation Tasks

### 1. Core Demo Infrastructure
- [ ] **Task 1.1**: Create `useDemoState` hook and `DemoProvider` to manage `High/Mid/Low` performance presets in `localStorage`.
- [ ] **Task 1.2**: Implement the "Demo Control" shortcut (e.g., `Ctrl+Shift+D`) to toggle the hidden performance panel.

### 2. Cinematic Onboarding (`FE-ONBOARD`)
- [ ] **Task 2.1**: Implement the `VerticalOnboarding` container with scroll-reveal triggers.
- [ ] **Task 2.2**: Build the `StickyAIAssistant` side-panel that reacts to questionnaire progress.
- [ ] **Task 2.3**: Add "Talent Identity" completion animations and semantic score previews.

### 3. Assessment Portal (`FE-PREP`)
- [ ] **Task 3.1**: Redesign `/dashboard/student/interview/prep` as a single-page cinematic portal.
- [ ] **Task 3.2**: Implement "Scanning" and "Blueprint Generation" animations with glowing mesh backgrounds.
- [ ] **Task 3.3**: Add system readiness checks (Mic/Cam) with cinematic "System Validated" states.

### 4. AI Talent Intelligence (`FE-RESULTS`)
- [ ] **Task 4.1**: Build the interactive `EvaluationReport` with staggered card reveals.
- [ ] **Task 4.2**: Implement `ClickableTranscript` component with skill highlighting.
- [ ] **Task 4.3**: Integrate `RadarGraph` and animated score counters tied to the `DemoState`.

### 5. Recruiter Discovery (`FE-SEARCH`)
- [ ] **Task 5.1**: Implement `SemanticSearchResults` view with "Fit Reasoning" side-panels.
- [ ] **Task 5.2**: Build the `TalentLeaderboard` with ranked animations based on verified scores.

---

## 🛡️ Verification Plan

### Automated Checks
- [ ] `npm run build` to ensure no routing or type errors.
- [ ] `npm run lint` for styling consistency.

### Manual UAT
- [ ] **Demo Path:** Start Onboarding -> Set Demo State to 'High' -> Complete Interview -> Verify Results page shows 'Expert' metrics.
- [ ] **Visual Audit:** Confirm "Calm Intelligence" aesthetic (minimalist, 1px borders, subtle glow) across all new pages.
- [ ] **Motion Audit:** Confirm all transitions use the `outExpo` curve from `motion.ts`.

---
*Phase: 01-cinematic-ui | Plan version: 1.0*
