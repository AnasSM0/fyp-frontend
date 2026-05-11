---
name: XLR8Hire Design System v2.0
colors:
  surface: '#fcf8ff'
  surface-dim: '#dcd8e5'
  surface-bright: '#fcf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f2ff'
  surface-container: '#f0ecf9'
  surface-container-high: '#eae6f4'
  surface-container-highest: '#e4e1ee'
  on-surface: '#1b1b24'
  on-surface-variant: '#464555'
  inverse-surface: '#302f39'
  inverse-on-surface: '#f3effc'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#006c4a'
  on-secondary: '#ffffff'
  secondary-container: '#82f5c1'
  on-secondary-container: '#00714e'
  tertiary: '#7e3000'
  on-tertiary: '#ffffff'
  tertiary-container: '#a44100'
  on-tertiary-container: '#ffd2be'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#85f8c4'
  secondary-fixed-dim: '#68dba9'
  on-secondary-fixed: '#002114'
  on-secondary-fixed-variant: '#005137'
  tertiary-fixed: '#ffdbcc'
  tertiary-fixed-dim: '#ffb695'
  on-tertiary-fixed: '#351000'
  on-tertiary-fixed-variant: '#7b2f00'
  background: '#fcf8ff'
  on-background: '#1b1b24'
  surface-variant: '#e4e1ee'
  bg-primary: '#FFFFFF'
  bg-secondary: '#FAFAFA'
  bg-subtle: '#F5F5F5'
  text-primary: '#111827'
  text-secondary: '#4B5563'
  text-muted: '#9CA3AF'
  accent-primary-hover: '#4338CA'
  accent-primary-light: '#EEF2FF'
  accent-primary-border: '#C7D2FE'
  accent-verified-light: '#ECFDF5'
  accent-verified-border: '#A7F3D0'
  border-default: '#E5E7EB'
  border-soft: '#F3F4F6'
  status-success: '#10B981'
  status-warning: '#F59E0B'
  status-error: '#EF4444'
  status-info: '#3B82F6'
typography:
  text-hero:
    fontFamily: Geist
    fontSize: 64px
    fontWeight: '800'
    lineHeight: '1.05'
    letterSpacing: -0.03em
  text-display:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  text-h1:
    fontFamily: Geist
    fontSize: 36px
    fontWeight: '700'
    lineHeight: '1.15'
    letterSpacing: -0.02em
  text-h2:
    fontFamily: Geist
    fontSize: 28px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.015em
  text-h3:
    fontFamily: Geist
    fontSize: 22px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  text-body:
    fontFamily: Geist
    fontSize: 15px
    fontWeight: '400'
    lineHeight: '1.6'
  text-label:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '500'
    lineHeight: '1.4'
  text-mono:
    fontFamily: jetbrainsMono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.5'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  micro: 4px
  small: 8px
  base: 12px
  default: 16px
  medium: 20px
  comfortable: 24px
  relaxed: 32px
  section: 48px
  page: 64px
  page-xl: 96px
---

# XLR8Hire — Design System v2.0
> Premium AI-powered reverse hiring platform

---

## Product Vision

XLR8Hire is a modern AI-powered reverse hiring platform where companies discover and compete for verified student talent based on real skills — not resumes.

The platform combines:
- AI skill verification
- Intelligent talent ranking
- Semantic candidate matching
- AI-powered interviews
- Reverse recruitment workflows

The experience should feel: **modern · trustworthy · minimal · calm · intelligent · startup-grade**

It should resemble a polished SaaS platform used by real companies — not a university project.

**Reference platforms:** Upwork, Linear, Vercel, Stripe Dashboard, Notion, Levels.fyi

---

## Design Philosophy

### Core Principle
> "Calm intelligence. Every screen earns its content."

Whitespace is a design element, not empty space. The UI communicates competence through restraint — not features. Every component should have a clear purpose, and if it doesn't, it shouldn't exist.

### What This Platform Is
- A premium productivity SaaS
- An elite talent marketplace
- A trusted professional platform

### What This Platform Is Not
- A flashy AI demo
- A university project
- A dark-mode cyberpunk dashboard
- A "look how much AI we have" product

---

## Strict Design Rules

### Never Use
- Neon gradients or glowing elements
- Glassmorphism (frosted glass backgrounds)
- Oversized drop shadows (more than 12px blur)
- Cluttered dashboards with 10+ widgets
- Colorful charts or multi-color data visualization
- Complex mega-menus or nested navigation
- Dense tables without breathing room
- Flashy entrance animations or scroll-jacking
- Gradient text effects
- Floating action buttons on desktop
- Background illustrations or decorative blobs

### Always Use
- Generous whitespace (never compress sections)
- Thin borders (`1px solid #E5E7EB`)
- Soft, subtle shadows (`0 1px 3px rgba(0,0,0,0.06)`)
- Minimal color — accent used sparingly, purposefully
- Clean typography with strong hierarchy
- Subtle hover interactions (no dramatic transforms)
- Consistent 8px spacing grid
- Simple, predictable navigation patterns
- Monochrome or near-monochrome data visualization

---

## Color System

### CSS Design Tokens

```css
/* Backgrounds */
--bg-primary:    #FFFFFF;
--bg-secondary:  #FAFAFA;
--bg-subtle:     #F5F5F5;
--bg-overlay:    rgba(0, 0, 0, 0.40);

/* Text */
--text-primary:   #111827;
--text-secondary: #4B5563;
--text-muted:     #9CA3AF;
--text-disabled:  #D1D5DB;
--text-inverse:   #FFFFFF;

/* Accent — Primary (Trust / Action) */
--accent-primary:      #4F46E5;   /* Indigo — CTAs, active states, links */
--accent-primary-hover: #4338CA;
--accent-primary-light: #EEF2FF;  /* Tinted bg for badges, highlights */
--accent-primary-border: #C7D2FE;

/* Accent — Secondary (Verified / Success) */
--accent-verified:      #059669;  /* Emerald — verified badges, scores, success */
--accent-verified-hover: #047857;
--accent-verified-light: #ECFDF5;
--accent-verified-border: #A7F3D0;

/* Borders */
--border-default: #E5E7EB;
--border-soft:    #F3F4F6;
--border-focus:   #4F46E5;

/* Status */
--status-success: #10B981;
--status-warning: #F59E0B;
--status-error:   #EF4444;
--status-info:    #3B82F6;

/* Status Light Backgrounds */
--status-success-bg: #ECFDF5;
--status-warning-bg: #FFFBEB;
--status-error-bg:   #FEF2F2;
--status-info-bg:    #EFF6FF;
```

### Color Usage Rules
- **Indigo (`--accent-primary`)** — Primary CTAs, active nav items, links, focus rings, primary buttons
- **Emerald (`--accent-verified`)** — Verified score badges, "Hired", "Available", success states
- **Status colors** — Only for status pills, toast notifications, and inline alerts
- **Never mix accent colors** in the same component
- **Text on white** — always `--text-primary` or `--text-secondary`, never muted for body copy
- **Background hierarchy** — `#FFFFFF` → `#FAFAFA` → `#F5F5F5` for layered surfaces

---

## Typography System

### Font Stack
```css
--font-sans: 'Geist', 'Inter', system-ui, -apple-system, sans-serif;
--font-mono: 'Geist Mono', 'JetBrains Mono', monospace; /* Code editor, scores */
```

> **Note:** Geist is preferred for its modern, technical feel that aligns with the platform's AI-forward positioning without feeling generic.

### Type Scale

| Token | Size | Weight | Line Height | Letter Spacing | Use Case |
|---|---|---|---|---|---|
| `--text-hero` | 64px / 72px | 800 | 1.05 | -0.03em | Landing hero H1 |
| `--text-display` | 48px | 700 | 1.1 | -0.02em | Page heroes |
| `--text-h1` | 36px | 700 | 1.15 | -0.02em | Page titles |
| `--text-h2` | 28px | 600 | 1.2 | -0.015em | Section headings |
| `--text-h3` | 22px | 600 | 1.3 | -0.01em | Card titles |
| `--text-h4` | 18px | 600 | 1.35 | 0 | Subsection titles |
| `--text-body-lg` | 17px | 400 | 1.65 | 0 | Marketing copy |
| `--text-body` | 15px | 400 | 1.6 | 0 | UI body text |
| `--text-body-sm` | 14px | 400 | 1.55 | 0 | Secondary text |
| `--text-label` | 13px | 500 | 1.4 | 0.01em | Labels, captions |
| `--text-caption` | 12px | 500 | 1.4 | 0.02em | Metadata, timestamps |
| `--text-overline` | 11px | 600 | 1.4 | 0.08em | Section labels (uppercase) |

### Typography Rules
- Hero headlines: tight letter-spacing, heavy weight — no gradients
- Body text: relaxed line-height for readability, never compressed
- Labels: medium weight, muted color, uppercase sparingly (overlines only)
- Monospace: reserved exclusively for scores, code, and technical values

---

## Spacing System

### Base Unit: 4px

```
4px   — micro spacing (icon gaps, tight labels)
8px   — small (compact elements, badge padding)
12px  — base (input padding-y, small card gaps)
16px  — default (input padding-x, component gaps)
20px  — medium (button padding, list item gaps)
24px  — comfortable (card padding, section inner)
32px  — relaxed (section sub-gaps)
48px  — section (between major page sections)
64px  — page (large section separators)
96px  — page-xl (hero section padding)
128px — hero (full-width hero vertical padding)
```

### Spacing Rules
- Never use arbitrary values — always multiples of 4px
- Cards: `24px` padding minimum, `32px` on desktop
- Sections: minimum `64px` vertical padding
- Hero sections: `96px–128px` vertical padding

---

## Grid System

### Breakpoints

```css
--bp-sm:  640px;   /* Mobile landscape */
--bp-md:  768px;   /* Tablet */
--bp-lg:  1024px;  /* Small desktop */
--bp-xl:  1280px;  /* Desktop */
--bp-2xl: 1536px;  /* Large desktop */
```

### Column System

| Breakpoint | Columns | Gutter |
|---|---|---|
| Mobile (`< 768px`) | 4 | 16px |
| Tablet (`768–1023px`) | 8 | 24px |
| Desktop (`1024px+`) | 12 | 32px |

### Container Widths

```css
--container-sm:   640px;
--container-md:   768px;
--container-lg:   1024px;
--container-xl:   1280px;
--container-2xl:  1440px;  /* Max content width */
```

### Layout Dimensions

```css
/* Dashboard Layout */
--sidebar-width:          240px;
--sidebar-collapsed:      64px;
--navbar-height:          60px;
--content-max-width:      1200px;

/* Page Layout */
--page-padding-x:         48px;   /* Desktop */
--page-padding-x-mobile:  16px;
```

---

## Border Radius

```css
--radius-sm:   6px;   /* Badges, pills, small tags */
--radius-md:   10px;  /* Inputs, small buttons */
--radius-lg:   12px;  /* Standard buttons, dropdowns */
--radius-xl:   16px;  /* Cards */
--radius-2xl:  20px;  /* Modals, panels */
--radius-3xl:  24px;  /* Large containers */
--radius-full: 9999px; /* Avatar, toggle, pill badges */
```

---

## Shadow System

```css
--shadow-xs:  0 1px 2px rgba(0, 0, 0, 0.04);
--shadow-sm:  0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
--shadow-md:  0 4px 8px rgba(0, 0, 0, 0.06), 0 2px 4px rgba(0, 0, 0, 0.04);
--shadow-lg:  0 8px 16px rgba(0, 0, 0, 0.06), 0 4px 8px rgba(0, 0, 0, 0.04);
--shadow-focus: 0 0 0 3px rgba(79, 70, 229, 0.15); /* Focus ring */
```

### Shadow Rules
- Default card state: `--shadow-sm`
- Hover card state: `--shadow-md`
- Modal/dropdown: `--shadow-lg`
- No shadows exceeding 16px blur radius
- Never stack multiple box-shadows for decorative depth

---

## Z-Index Scale

```css
--z-base:     0;
--z-raised:   10;    /* Cards on hover */
--z-dropdown: 100;   /* Dropdowns, tooltips */
--z-sticky:   200;   /* Sticky headers, sidebars */
--z-overlay:  300;   /* Overlay backdrops */
--z-modal:    400;   /* Modals, drawers */
--z-toast:    500;   /* Toast notifications */
```

---

## Icon System

### Library: Lucide Icons (v0.400+)
```
Stroke width: 1.5px  (default — never 2px, too heavy)
Sizes:
  --icon-xs:  14px  (inline text icons)
  --icon-sm:  16px  (button icons, compact UI)
  --icon-md:  20px  (nav icons, card icons) ← default
  --icon-lg:  24px  (hero icons, empty states)
  --icon-xl:  32px  (feature section icons)
```

### Icon Rules
- Sidebar navigation: 20px, `--text-secondary` color
- Active nav item: 20px, `--accent-primary` color
- Button icons: 16px, always left of label
- Never use filled icons — stroke only
- Icon-only buttons must have `aria-label` and tooltip

---

## Component Specifications

### Buttons

#### Sizes
| Size | Height | Padding X | Font | Use Case |
|---|---|---|---|---|
| `sm` | 32px | 12px | 13px/500 | Dense UI, table rows |
| `md` | 40px | 16px | 14px/500 | Default |
| `lg` | 48px | 24px | 15px/600 | Hero CTAs, form submit |

#### Variants
```
primary   — bg: --accent-primary,  text: white, hover: --accent-primary-hover
secondary — bg: --bg-subtle,       text: --text-primary, hover: --bg-secondary (darken)
outline   — bg: transparent,       border: --border-default, hover: --bg-subtle
ghost     — bg: transparent,       text: --text-secondary, hover: --bg-subtle
danger    — bg: --status-error,    text: white
```

#### States
- `hover`: subtle background shift + `--shadow-xs` on outline/ghost
- `focus`: `--shadow-focus` ring, no outline
- `active`: 1px translate-y down, slight darken
- `disabled`: 40% opacity, `cursor: not-allowed`
- `loading`: spinner replaces icon, label unchanged

### Input Fields

| Property | Value |
|---|---|
| Height | 40px (md), 48px (lg) |
| Padding | 12px 16px |
| Border | `1px solid --border-default` |
| Border Radius | `--radius-md` (10px) |
| Font | 14px / 400 / `--text-primary` |
| Placeholder | `--text-muted` |
| Focus border | `--accent-primary` |
| Focus ring | `--shadow-focus` |
| Error border | `--status-error` |
| Background | `--bg-primary` |

### Cards

```
border:          1px solid var(--border-default)
border-radius:   var(--radius-xl) — 16px
padding:         24px (default), 32px (feature cards)
background:      var(--bg-primary)
shadow:          var(--shadow-sm)
hover shadow:    var(--shadow-md)
hover transition: shadow 150ms ease, transform 150ms ease
hover transform: translateY(-1px)
```

### Badges / Pills

| Type | Background | Text | Border |
|---|---|---|---|
| Default | `--bg-subtle` | `--text-secondary` | `--border-default` |
| Primary | `--accent-primary-light` | `--accent-primary` | `--accent-primary-border` |
| Verified | `--accent-verified-light` | `--accent-verified` | `--accent-verified-border` |
| Warning | `--status-warning-bg` | `#92400E` | `#FDE68A` |
| Error | `--status-error-bg` | `--status-error` | `#FECACA` |

Badge specs: `height: 22px`, `padding: 3px 8px`, `font: 12px/600`, `border-radius: --radius-full`

### Avatars

```
xs:  24px  — table rows, compact mentions
sm:  32px  — nav, compact cards
md:  40px  — standard card headers
lg:  56px  — profile headers, leaderboard
xl:  80px  — profile page hero
2xl: 120px — full profile view
```

All avatars: `border-radius: 50%`, thin border `1px solid --border-soft`

### Score Ring (Verified Talent Score)

The score ring is the visual centerpiece of the platform.

```
Outer ring:     thin stroke, --border-default
Progress ring:  stroke, --accent-verified (emerald), animated on load
Score number:   font-mono, 36px–48px, font-weight 700, --text-primary
Percentile:     13px, --text-muted, below score
Animation:      stroke-dashoffset, 800ms ease-out, on page load only
```

---

## Motion & Animation

### Timing Tokens
```css
--duration-instant:  80ms;
--duration-fast:     150ms;   /* Hover states */
--duration-normal:   250ms;   /* Component transitions */
--duration-slow:     400ms;   /* Page transitions, modals */
--duration-slower:   600ms;   /* Score ring, hero elements */

--ease-default:  cubic-bezier(0.16, 1, 0.3, 1);  /* Snappy ease-out */
--ease-in:       cubic-bezier(0.4, 0, 1, 1);
--ease-out:      cubic-bezier(0, 0, 0.2, 1);
--ease-bounce:   cubic-bezier(0.34, 1.56, 0.64, 1);  /* Score reveals only */
```

### Permitted Animations
- **Hover:** background color, border color, shadow, `translateY(-1px)` — all `150ms ease`
- **Page load:** fade-in + `translateY(8px → 0)` for hero content, staggered `250ms`
- **Modals:** fade-in backdrop `200ms`, slide-up panel `250ms ease-out`
- **Toasts:** slide-in from right `300ms`, auto-dismiss after 4s
- **Score ring:** stroke-dashoffset draw on load, `800ms ease-out`, once
- **Skeleton:** shimmer `1.5s linear infinite`
- **Tab switches:** fade `150ms`

### Never Animate
- Layout shifts (no animating `width`, `height`, `padding`)
- Scroll-jacking or parallax effects
- Looping decorative animations
- Bouncing or elastic effects (except score ring reveal — once)

---

## Loading & Empty States

### Skeleton Loaders
Every data-driven component has a skeleton:
```
Skeleton color:     #F3F4F6
Shimmer highlight:  #E5E7EB → #F9FAFB → #E5E7EB
Animation:          left-to-right shimmer, 1.5s linear infinite
Border radius:      match actual component
```

### Empty States
Structure: `icon (40px) + heading (16px/600) + body (14px/muted) + optional CTA`

Examples:
- No assessments taken → "Start your first assessment" + primary CTA
- No offers received → "Companies will reach out after ranking" + ghost CTA
- No search results → "No candidates match your search" + clear filters link

### Error States
- Inline field errors: `--status-error` text below input, 12px, `AlertCircle` icon 14px
- Page errors: centered card with icon, heading, body, retry button
- Toast errors: red tinted, `XCircle` icon, 4s auto-dismiss

---

## Layout Architecture

### Landing Page Layout

```
Navbar: sticky, 60px height, border-bottom on scroll
  └─ Logo (left) + Nav links (center) + Auth CTAs (right)

Hero: full-width, min-height 90vh, 2-column split
  ├─ Left (55%): headline + subtext + CTAs
  └─ Right (45%): UI preview mockup (realistic, not illustration)

Features: 3-column card grid, 96px section padding
How it Works: numbered steps, alternating layout
Social Proof: logo strip (company logos), muted background
CTA Banner: full-width, indigo background, centered
Footer: 4-column links + copyright
```

### Dashboard Layout

```
Root: full-height flex row
├─ Sidebar: fixed, 240px width (collapsed: 64px), bg --bg-secondary, border-right
│   ├─ Logo (top, 60px height)
│   ├─ Nav items (icon + label, 44px row height, 8px padding-x)
│   ├─ Spacer
│   └─ User profile + Settings (bottom)
│
└─ Main: flex-col, width: calc(100% - 240px)
    ├─ Topbar: 60px height, border-bottom, bg --bg-primary
    │   ├─ Page title (left)
    │   └─ Search + Notifications + Avatar (right)
    │
    └─ Content: scrollable, padding 32px, max-width 1200px, centered
```

---

## Navigation — Sidebar

### Student Nav Items
```
Dashboard        — LayoutDashboard icon
Assessments      — ClipboardCheck icon
Rankings         — Trophy icon
Projects         — FolderGit2 icon
Offers           — Briefcase icon
Messages         — MessageSquare icon
── separator ──
Settings         — Settings icon
```

### Company Nav Items
```
Dashboard        — LayoutDashboard icon
Candidates       — Users icon
Saved            — Bookmark icon
Interviews       — Calendar icon
Messages         — MessageSquare icon
── separator ──
Settings         — Settings icon
```

### Sidebar Styles
```
Nav item:           height 40px, border-radius 8px, padding 0 12px
Nav item default:   bg transparent, icon --text-muted, label --text-secondary
Nav item hover:     bg --bg-subtle, icon --text-primary
Nav item active:    bg --accent-primary-light, icon --accent-primary, label --accent-primary, font-weight 500
Section separator:  1px solid --border-soft, margin 8px 0
Sidebar bg:         --bg-secondary (#FAFAFA)
Sidebar border:     1px solid --border-default (right)
```

---

## Page Specifications

### Landing Page

#### Navbar
- `height: 60px`
- Background: white, `border-bottom: 1px solid transparent`
- On scroll: `border-bottom: 1px solid --border-default`, `backdrop-filter: none`
- Logo: wordmark + icon, left-aligned
- Links: `--text-secondary`, hover `--text-primary`, 14px/500
- CTAs: "Log In" (ghost) + "Get Started" (primary, md size)

#### Hero
- Split layout: 58% text / 42% preview
- H1: "Stop applying.\nGet discovered." — `--text-hero`, `--text-primary`
- Subtext: 17px, `--text-secondary`, max-width 480px
- Primary CTA: "Get Ranked" — primary button, lg size
- Secondary CTA: "Hire Talent" — outline button, lg size, 12px gap
- UI Preview: realistic card mockup (score ring + mini leaderboard), subtle shadow, slight rotation (`rotate(-1deg)`) for depth

#### Feature Cards
- 3-column grid, gap 24px
- Card: white bg, `--border-default` border, 32px padding, `--radius-xl`
- Icon: 20px, `--accent-primary`, in a `40x40` `--accent-primary-light` rounded container
- Title: `--text-h4` (18px/600)
- Body: 14px/400, `--text-secondary`

---

### Student Dashboard

#### Verified Talent Score Card
```
Width: span 4 cols (of 12)
Height: min 200px
Content: score ring (center) + percentile + rank + AI blurb
Ring: 120px diameter, 6px stroke width
Score: font-mono, 48px, weight 700
Percentile: "Top 8%" — 14px/600, --accent-verified
Rank: "#47 globally" — 13px, --text-muted
AI blurb: 2 lines max, 13px, --text-secondary, italic
```

#### Skill Analytics Card
```
Width: span 4 cols
Charts: horizontal progress bars ONLY (no pie charts)
Bar: height 6px, bg --bg-subtle, fill --accent-primary, border-radius 999px
Labels: 13px, --text-secondary, left-aligned
Values: 13px/600, --text-primary, right-aligned
Max 6 skills shown, "View all" link at bottom
```

#### Offer Cards
```
Width: span 4 cols (stack vertically)
Each card: company logo (32px) + company name + role title + salary range + stage badge
Stage badge: pill, variants — "Interview Sent", "Shortlisted", "Offer Extended"
CTA: "View Offer" ghost button, right-aligned
Hover: --shadow-md, translateY(-1px)
```

---

### AI Interview Page

#### Layout
```
Full viewport, no sidebar
├─ Top bar: 60px, logo + session timer + progress steps + end button
│
└─ Body: 2 columns, height: calc(100vh - 60px)
    ├─ Left panel (45%): conversation + AI prompts
    │   ├─ AI message bubbles: bg --bg-subtle, rounded 16px, max-width 80%
    │   ├─ User message bubbles: bg --accent-primary-light, rounded 16px
    │   └─ Input area: bottom, textarea + send button
    │
    └─ Right panel (55%): functional workspace
        ├─ Code editor: dark theme (--bg: #0F172A), Monaco editor
        ├─ Toolbar: language selector + run button + timer
        └─ Output console: below editor, bg #0F172A, monospace
```

---

### Company Dashboard

#### Candidate Search
```
Search bar: full-width, height 52px, border-radius --radius-lg, --shadow-sm
Placeholder: "Search by skills, stack, or describe what you need..."
Icon: Search (20px, --text-muted) left-padded
CTA: "Search" button inside right edge of input
On focus: --shadow-focus, border --accent-primary
```

#### Filters
```
Layout: horizontal chip row below search
Filter chips: height 34px, padding 6px 14px, border-radius --radius-full
Chip default: bg --bg-subtle, border --border-default, text --text-secondary
Chip active: bg --accent-primary-light, border --accent-primary-border, text --accent-primary
More filters: "Filters" button with SlidersHorizontal icon, right-aligned
```

#### Candidate Card Grid
```
Grid: 3 columns, gap 20px
Each card:
  ├─ Header: avatar (48px) + name + title + verified badge
  ├─ Score: emerald score ring (64px) + number + percentile — right-aligned
  ├─ Skills: up to 4 skill pills + "+N more"
  ├─ AI summary: 2-line clamp, 13px, --text-secondary
  └─ Footer: GitHub activity sparkline (muted) + "Invite to Interview" button
```

---

### Talent Leaderboard

#### Table Specs
```
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
```

#### Top 3 Treatment
```
Rank #1: subtle gold left border (3px, #F59E0B), row bg #FFFBEB
Rank #2: silver left border (3px, #94A3B8), row bg --bg-primary
Rank #3: bronze left border (3px, #D97706), row bg --bg-primary
```

---

### Candidate Profile Page

#### Header
```
Layout: horizontal, 2-column (content left, CTA sticky right)
Avatar: 80px, circular
Name: --text-h1 (36px/700)
Title: 18px, --text-secondary
Score ring: 72px, right of name cluster
Skills: horizontal pill row, --radius-full badges
Availability: status pill, prominent
Sticky CTA (right): "Invite to Interview" primary lg button, always visible on scroll
```

#### Sections
Each section card follows:
```
border: 1px solid --border-default
border-radius: --radius-xl
padding: 32px
margin-bottom: 24px
background: --bg-primary
```

---

## Authentication Pages

### Layout
```
Full viewport centered (flexbox)
├─ Logo (top, 32px above card)
└─ Auth Card:
    width: 440px
    padding: 40px
    border: 1px solid --border-default
    border-radius: --radius-2xl (20px)
    shadow: --shadow-md

OAuth buttons:
  height: 44px
  border: 1px solid --border-default
  border-radius: --radius-lg
  icon: 20px (Google SVG / GitHub icon)
  label: 14px/500, --text-primary
  gap between buttons: 12px

Divider: "or continue with email" — 1px --border-soft lines, 13px --text-muted centered

Email/Password inputs: standard input spec (above)
Submit button: primary, lg, full-width
Footer: "Already have an account? Log in" — 14px, --text-muted
```

---

## Responsive Behavior

### Sidebar (Dashboard)
- Desktop (`1024px+`): fixed sidebar, 240px
- Tablet (`768–1023px`): collapsed sidebar (64px, icon only), hover to expand
- Mobile (`< 768px`): hidden sidebar, bottom navigation bar (5 items max)

### Landing Page
- Desktop: 2-column hero, 3-column features
- Tablet: 2-column hero (stacked), 2-column features
- Mobile: single column throughout, hero UI preview hidden

### Dashboard Grid
- Desktop (1280px+): 12-column, candidates in 3-col grid
- Tablet (768–1023px): 8-column, candidates in 2-col grid
- Mobile: single column, cards full-width

---

## Recommended Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14+ (App Router) |
| Styling | Tailwind CSS v3 |
| Components | shadcn/ui (customized to this system) |
| Animations | Framer Motion |
| Icons | Lucide React |
| Charts | Recharts (minimal config) |
| Code Editor | Monaco Editor |
| State | Zustand |
| Font | Geist (via `next/font`) |

---

## Design QA Checklist

Before shipping any screen, verify:

- [ ] No component uses color outside the defined token system
- [ ] All text meets WCAG AA contrast ratio minimum
- [ ] Interactive elements have visible focus states
- [ ] Loading states covered by skeleton loaders
- [ ] Empty states defined for all data-driven components
- [ ] Error states handled inline (not just toast)
- [ ] Hover transitions do not exceed 200ms
- [ ] No shadows exceed 16px blur
- [ ] No layout breaks at 375px, 768px, 1024px, 1440px
- [ ] Score ring animation runs once, not on loop
- [ ] Sidebar collapses gracefully at 1024px breakpoint
- [ ] All icons use 1.5px stroke width

---

*XLR8Hire Design System v2.0 — Designed for Google Stitch + Next.js implementation*
