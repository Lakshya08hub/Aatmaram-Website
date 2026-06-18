# Phase 16: Portal UX Upgrade - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-18
**Phase:** 16-portal-ux-upgrade
**Areas discussed:** Chart library, Kanban interaction model, Inline editing scope, Dark mode depth, Responsiveness

---

## Chart Library

| Option | Description | Selected |
|--------|-------------|----------|
| shadcn/ui Charts | Built on Recharts, styled to match existing shadcn components. Zero visual friction. | ✓ |
| Recharts directly | More control, larger API surface. | |
| Tremor | Dashboard-first library, heavier, brings its own design system. | |

**User's choice:** shadcn/ui Charts (Recommended)

---

## Dashboard Data — Payroll Card

| Option | Description | Selected |
|--------|-------------|----------|
| Placeholder for payroll | Show ₹0 (Payroll tracker coming soon). Phase 9 wires it for real. | ✓ |
| Skip the payroll card entirely | Add in Phase 9 only. | |

**User's choice:** Placeholder for payroll

---

## Dashboard Time Range

| Option | Description | Selected |
|--------|-------------|----------|
| Last 30 days | Standard operational dashboard. No date picker needed. | ✓ |
| Last 7 days | More immediate. May show empty charts. | |
| Current month with month picker | Monthly reporting UX. More complex. | |

**User's choice:** Last 30 days

---

## Dashboard Role Visibility

| Option | Description | Selected |
|--------|-------------|----------|
| Same dashboard for all roles | All staff see the same 4 metric cards. | ✓ |
| Role-gated views | Doctors see patient count only, receptionists see appointments only. | |

**User's choice:** Same dashboard for all roles

---

## Kanban Interaction Model

| Option | Description | Selected |
|--------|-------------|----------|
| Visual columns + drag-and-drop (dnd-kit) | Drag cards between columns. Requires dnd-kit library. | |
| Visual columns + click-to-advance buttons | → and × buttons on each card. No drag library. | ✓ |
| Keep table + quick-action buttons | Upgrade existing tabbed table. Less visual change. | |

**User's choice:** Visual columns + click-to-advance buttons (Recommended)

---

## Kanban Card Content

| Option | Description | Selected |
|--------|-------------|----------|
| Compact: name, phone, date, doctor | Enough to act without crowding the column. | ✓ |
| Full: name, phone, date, doctor, reason, notes | All fields visible. Columns get tall. | |
| Name + phone + buttons only | Minimal. Click to expand. | |

**User's choice:** Compact card

---

## Kanban vs. Existing Table

| Option | Description | Selected |
|--------|-------------|----------|
| Replace tabbed table with kanban | One clean view. AppointmentsClient.tsx replaced by KanbanBoard.tsx. | ✓ |
| Add view toggle: Table \| Kanban | Staff switch between views. More to maintain. | |

**User's choice:** Replace (Recommended)

---

## Inline Editing — Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Content tables (departments, doctors, testimonials) | name, featured toggle, sort_order | ✓ |
| Staff table | name, role, active status | ✓ |
| Appointments (notes field) | Quick note-taking on kanban card | ✓ |
| Patient records | name, contact, notes | ✓ |

**User's choice:** All four sections selected

---

## Inline Editing — Interaction Pattern

| Option | Description | Selected |
|--------|-------------|----------|
| Click-to-edit, auto-save on blur/Enter | No save button. Notion/Airtable feel. | ✓ |
| Row-level edit mode with Save button | Explicit Save/Cancel. Slower workflow. | |
| Inline for toggles/selects, Dialog for text | Hybrid approach. | |

**User's choice:** Click-to-edit with auto-save (Recommended)

---

## Dark Mode Depth

| Option | Description | Selected |
|--------|-------------|----------|
| Full portal audit — all sections | Systematically replace hardcoded colors with dark: variants everywhere. | ✓ |
| Layout + navigation only | Sidebar and header only. Inner content stays light. | |

**User's choice:** Full portal audit (Recommended)

---

## Empty State Coverage

| Option | Description | Selected |
|--------|-------------|----------|
| Apply to all portal tables and list views | Every section that can be empty gets the shared component. | ✓ |
| Apply only to main sections | Appointments, patients, staff. Content tables excluded. | |

**User's choice:** All portal tables and list views

---

## Responsiveness Target

| Option | Description | Selected |
|--------|-------------|----------|
| Tablet-first: sidebar collapses, tables scroll | Works on iPad. No full phone UX needed. | ✓ |
| Full mobile-responsive | Phone-optimized layout. Significantly more work. | |
| Desktop-only, skip responsiveness | Portal stays desktop-only. | |

**User's choice:** Tablet-first (Recommended)

---

## Sidebar on Tablet

| Option | Description | Selected |
|--------|-------------|----------|
| Icon-only collapsed rail on tablet | 48px rail with icons. Hover/click expands. Common admin pattern. | ✓ |
| Hidden sidebar with hamburger | Slides in as overlay. More mobile-like. | |

**User's choice:** Icon-only collapsed rail (Recommended)

---

## Kanban on Tablet — Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Horizontal scroll on tablet/mobile | Fixed 280px columns, container scrolls. Simple. | ✓ |
| Stack columns vertically on small screens | Each column full-width. Loses workflow feel. | |

**User's choice:** Horizontal scroll (Recommended)

---

## Kanban Mobile Hint Animation

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-scroll once on load, stop on touch | CSS one-shot animation hints at more columns. prefers-reduced-motion respected. | ✓ |
| Gradient fade-right + arrow indicator | Static scroll hint. No animation. | |
| No hint | Trust user to swipe. | |

**User's choice:** Auto-scroll once on load (Recommended)
**Notes:** User specifically requested "decent speed marquee of the horizontal slides, they slide automatically" — confirmed as one-shot CSS animation (not looping), stops on interaction.

---

## Claude's Discretion

- Chart types per metric: bar for appointments-over-time and admissions-trend, stat card for staff-on-duty and payroll placeholder
- Empty-state copy tone: professional portal tone matching existing portal language
- Dark mode token strategy: prefer shadcn semantic tokens (`bg-background`, `text-foreground`) over explicit `dark:` classes where possible

## Deferred Ideas

- Full mobile phone-optimized layout — deferred, tablet-first sufficient
- Date picker / time range filter on dashboard — deferred to Phase 10
- Drag-and-drop kanban (dnd-kit) — deferred; click-to-advance sufficient
- Real payroll data in dashboard — deferred until Phase 9
- Role-based dashboard views — deferred; same dashboard for all roles
