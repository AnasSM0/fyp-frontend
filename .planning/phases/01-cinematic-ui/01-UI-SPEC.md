---
phase: 1
slug: cinematic-ui
status: draft
shadcn_initialized: true
preset: premium-ai-os
created: 2026-05-13
---

# Phase 1 — UI Design Contract (HirdUp)

> Visual and interaction contract for the "AI Operating System" experience. 

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn/ui + Tailwind v4 |
| Preset | Premium AI OS (Linear/Arc inspired) |
| Component library | Radix UI |
| Icon library | Lucide React |
| Font | Geist Sans (Body), Geist Mono (AI Data) |

---

## Motion System (The "Alive" Engine)

| Logic | Timing/Easing | Behavior |
|-------|---------------|----------|
| **Page Transitions** | 0.6s `outExpo` | Subtle vertical slide + opacity fade. |
| **Section Reveal** | 0.4s `fast` | Staggered fade-up (0.08s interval). |
| **AI Processing** | Continuous `slowPulse` | Breathing radial gradients (Violet/Indigo). |
| **Hover Physics** | 0.3s `spring` | Minimal scale (1.01) + subtle shadow lift. |
| **Score Counters** | 1.5s linear/ease | Numerical tallying with fractional decimals. |

---

## Visual Language: "Calm Intelligence"

### 1. Glow & Lighting System
- **Ambient Glow:** Background radial gradients (`bg-gradient-to-tr from-indigo-950/20 via-black to-violet-950/20`).
- **Semantic Accents:** 
    - `Violet-500/20`: System active / AI thinking.
    - `Emerald-500/20`: Verified / Success states.
    - `Amber-500/20`: Critical insight / Warning.
- **Glassmorphism:** `bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl`.

### 2. Depth & Layering
- **Z-Index Strategy:**
    - `L0`: Mesh background (particles/nodes).
    - `L1`: Main content glass panels.
    - `L2`: Floating AI assistant / Tooltips.
    - `L3`: Contextual modals / Full-screen portals.

### 3. Typography Hierarchy
- **Display:** 48px/56px | Black | -0.02em tracking (Tight).
- **Heading:** 24px/32px | Medium | -0.01em tracking.
- **Body:** 16px/24px | Regular | Neutral-400.
- **Data (Mono):** 14px/20px | Medium | Mono (for scores, IDs, and reasoning).

---

## AI Activity States

| State | Visual Signal |
|-------|---------------|
| **Thinking** | Shimmering border + subtle scale pulse. |
| **Analyzing** | Scanning horizontal light-beam effect over text/cards. |
| **Validated** | Soft Emerald glow bloom + checkmark transition. |
| **Drafting** | Ghost-text (low opacity) typing animation. |

---

## Copywriting Contract

| Element | Copy Tone |
|---------|-----------|
| **Primary CTA** | Intent-focused (e.g., "Commence Interview", "Build Identity"). |
| **Empty State** | Encouraging + AI Insight (e.g., "The AI is waiting to learn about your stack..."). |
| **Onboarding** | Conversational (e.g., "Tell us about your technical trajectory"). |
| **Error State** | Systemic but helpful (e.g., "Signal loss detected. Attempting to re-establish AI bridge..."). |

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PENDING
- [ ] Dimension 2 Visuals: PENDING
- [ ] Dimension 3 Color: PENDING
- [ ] Dimension 4 Typography: PENDING
- [ ] Dimension 5 Spacing: PENDING
- [ ] Dimension 6 Registry Safety: PENDING

**Approval:** pending
