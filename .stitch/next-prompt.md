---
page: leaderboard
---
A Talent Leaderboard page for HirdUp, featuring a side navigation bar and a main content area where companies can view the top-ranked verified talent globally or filtered by specific specializations.

**DESIGN SYSTEM (REQUIRED):**
# HirdUp — Design System v2.0
> Premium AI-powered reverse hiring platform

## Design Philosophy
> "Calm intelligence. Every screen earns its content."
Whitespaces, thin borders (`1px solid #E5E7EB`), soft shadows. Minimal color, indigo primary (`#4f46e5`), emerald verified (`#10B981`). Geist font. No neon gradients, glassmorphism, or complex mega-menus.

## Dashboard Layout
Root: full-height flex row
├─ Sidebar: fixed, 240px width (collapsed: 64px), bg --bg-secondary, border-right
│   ├─ Logo (top, 60px height)
│   ├─ Nav items (icon + label, 44px row height, 8px padding-x)
│   │   Discover (Search), Saved (Bookmark), Offers (Work), Analytics (BarChart)
│   ├─ Spacer
│   └─ Company profile + Settings (bottom)
│
└─ Main: flex-col, width: calc(100% - 240px)
    ├─ Topbar: 60px height, border-bottom, bg --bg-primary
    │   ├─ Page title (left)
    │   └─ Notifications + Avatar (right)
    │
    └─ Content: scrollable, padding 32px, max-width 1200px, centered

## Talent Leaderboard Elements

### Search & Filter
Filters to toggle between global rankings or specific skills (e.g., "Frontend", "Backend", "AI/ML").

### Table Specs
Header: 13px/600, --text-muted, uppercase, letter-spacing 0.06em
Row height: 64px
Row hover: bg --bg-subtle, transition 100ms
Dividers: 1px solid --border-soft (horizontal only)
Columns:
  Rank:         48px width, font-mono, 15px/700, --text-muted (gray for 4+), gold/silver/bronze for top 3
  Student:      avatar 36px + name 15px/500 + university 12px/--text-muted
  Score:        pill badge, --accent-verified colors, font-mono
  Specialization: 14px, --text-secondary
  Projects:     count + icon, 14px
  Availability: status pill — "Open", "Interviewing", "Placed"

### Top 3 Treatment
Rank #1: subtle gold left border (3px, #F59E0B), row bg #FFFBEB
Rank #2: silver left border (3px, #94A3B8), row bg --bg-primary
Rank #3: bronze left border (3px, #D97706), row bg --bg-primary

**Page Structure:**
1. Sidebar Navigation
2. Main Header ("Global Leaderboard")
3. Filter row for specializations
4. Leaderboard Table (showing top 5-10 candidates)
