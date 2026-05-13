# XLR8Hire — AI-Powered Reverse Recruitment Platform

> **Core Value:** XLR8Hire flips the hiring power dynamic by replacing resumes with AI-verified competency, allowing companies to discover "ready-to-hire" talent through semantic intelligence.

## Context
Traditional hiring is broken: students spam applications, and recruiters rely on keyword-stuffed resumes. XLR8Hire automates the verification process through cinematic AI interviews, creating a verified talent marketplace where discovery is based on objective performance metrics rather than self-reported experience.

## FYP Milestone: The "Verified Talent" Demo
**Deadline:** July 13, 2026
**Goal:** A high-fidelity, end-to-end demonstration of a student completing an AI interview and a recruiter discovering their verified profile.

## Requirements

### Validated
- ✓ **UI-LAND**: Premium landing page with marketing copy.
- ✓ **UI-AUTH**: Auth UI with role selection (Student/Company).
- ✓ **UI-COMP-DASH**: Company portal dashboard structure.
- ✓ **UI-LEADER**: Talent leaderboard UI with AI relevance scores.
- ✓ **UI-CAND-PROF**: Recruiter-view candidate profile UI.
- ✓ **UI-STUD-DASH**: Student dashboard with score visualization.
- ✓ **UI-INT-WORK**: AI Interview workspace (Chat + Editor prototype).

### Active (July 13 Milestone)
- [ ] **FE-PREP**: Cinematic Assessment Setup page (AI-generated blueprint).
- [ ] **FE-RESULTS**: AI Evaluation Report / Results page (Investor-demo quality).
- [ ] **FE-SEARCH**: Recruiter Semantic Search results view.
- [ ] **FE-ONBOARD**: Student Profile Edit / Onboarding flow.
- [ ] **FLOW-END2END**: Cohesive interview-to-results state flow.
- [ ] **BE-CORE**: FastAPI architecture + PostgreSQL integration.
- [ ] **BE-AUTH**: Lightweight JWT authentication system.
- [ ] **AI-INTEL**: Semantic matching logic + AI evaluation scoring logic.

### Out of Scope
- **ENT-AUTH**: Enterprise-grade SSO/MFA (using lightweight JWT instead).
- **SCALE**: High-concurrency production scaling (optimized for single-user demo).
- **REAL-TIME**: Real-time WebSocket streaming for LLM (unless time permits; simulated stream for demo impact).

## Key Decisions
| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js 16 + Tailwind v4 | Modern, fast, and uses the latest `@theme` system for clean tokens. | — Active |
| Vertical MVP Strategy | Focus on a complete end-to-end "Interview Flow" rather than horizontal layers. | — Active |
| JWT Auth | Speed and simplicity for demo stability. | — Active |

## Evolution
This document evolves at phase transitions.
1. Requirements invalidated? → Move to Out of Scope with reason.
2. Requirements validated? → Move to Validated with phase reference.
3. New requirements emerged? → Add to Active.

---
*Last updated: 2026-05-13 after initialization*
