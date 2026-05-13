# Implementation Plan - Phase 2: Full-Flow Connectivity

Wire up every button, link, and call-to-action across the platform to ensure a seamless, non-glitchy end-to-end experience.

## User Review Required

> [!IMPORTANT]
> **Authentication Flow**: Since the FastAPI backend is not yet implemented, I will use mock routing for "Log In" and "Sign Up" that leads directly to the respective dashboards or onboarding flows to maintain the demo's momentum.

## Proposed Changes

### [Landing Page]

#### [MODIFY] [page.tsx](file:///c:/Users/Anas%20SM/Desktop/fyp-frontend/src/app/page.tsx)
- Connect "Get Started Free" and "Get Ranked Free" to `/onboarding`.
- Connect "Log In" to `/dashboard/student`.
- Connect "Features", "Rankings", "For Companies" nav links to their respective page sections via ID scrolling or sub-routes.
- Connect "View live rankings →" to `/dashboard/company/leaderboard`.
- Connect Footer links to valid internal routes.

### [Student Portal]

#### [MODIFY] [Student Dashboard](file:///c:/Users/Anas%20SM/Desktop/fyp-frontend/src/app/dashboard/student/page.tsx)
- Connect "Detailed Report" to `/dashboard/student/results`.
- Connect "Accept" buttons in interview requests to a mock "Meeting Scheduled" state or a placeholder success modal.
- Connect Project Cards to placeholder detail views.

#### [MODIFY] [Student Sidebar/Navbar]
- Ensure the sidebar links (Home, Assessments, Results, Profile) point to correctly implemented routes.

### [Company Portal]

#### [MODIFY] [Company Dashboard](file:///c:/Users/Anas%20SM/Desktop/fyp-frontend/src/app/dashboard/company/page.tsx)
- Connect "Discover" button to the newly built `/dashboard/company/search` page.
- Connect "View Full Profile" on candidate cards to a placeholder profile page `/dashboard/company/candidate`.
- Connect "Leaderboard" nav link to `/dashboard/company/leaderboard`.

### [Global Interactions]

#### [NEW] [Transition Component]
- Implement a subtle page transition or loading state using Framer Motion's `AnimatePresence` in `layout.tsx` to prevent "glitchy" jumps between views.

## Verification Plan

### Manual Verification
- Click every button on the Landing Page and verify destination.
- Click every link in the Student Sidebar and verify navigation.
- Perform a "Search" in the Company Portal and navigate to a candidate profile.
- Verify that clicking "Detailed Report" in the student view shows the AI Results page.
