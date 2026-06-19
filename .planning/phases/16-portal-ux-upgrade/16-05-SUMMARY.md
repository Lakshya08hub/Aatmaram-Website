---
phase: 16-portal-ux-upgrade
plan: "05"
subsystem: portal
tags: [sidebar, dark-mode, empty-state, responsive, ux]
dependency_graph:
  requires: [16-01, 16-02, 16-03, 16-04]
  provides: [PORTUI-04]
  affects: [components/portal/Sidebar.tsx, components/portal/PatientClient.tsx, app/(portal)/content/departments/DepartmentsClient.tsx, app/(portal)/content/testimonials/TestimonialsClient.tsx, app/(portal)/content/doctors/DoctorsClient.tsx, app/(portal)/staff/StaffClient.tsx]
tech_stack:
  added: []
  patterns: [collapsible-sidebar, semantic-color-tokens, empty-state-pattern, overflow-x-auto-table-wrapper]
key_files:
  created: []
  modified:
    - components/portal/Sidebar.tsx
    - app/(portal)/content/departments/DepartmentsClient.tsx
    - app/(portal)/content/testimonials/TestimonialsClient.tsx
    - app/(portal)/content/doctors/DoctorsClient.tsx
    - app/(portal)/staff/StaffClient.tsx
    - components/portal/PatientClient.tsx
decisions:
  - "D-15: Sidebar collapsed state is session-only component state (no localStorage) per plan decision"
  - "Used base-ui TooltipTrigger render prop instead of asChild (base-ui API does not support asChild)"
metrics:
  duration: "25 min"
  completed: "2026-06-19"
  tasks: 2
  files: 6
---

# Phase 16 Plan 05: Sidebar Collapse, Dark Mode Audit, EmptyState Summary

**One-liner:** Collapsible sidebar with icon-rail + Tooltip, plus systematic replacement of all hardcoded light-only color tokens with semantic design tokens and EmptyState across all portal data views.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Make Sidebar collapsible with icon-only rail on tablet | b3da602 |
| 2 | Dark mode audit, EmptyState, and table scroll wrappers across all portal sections | cca875d |

## What Was Built

**Task 1 — Collapsible Sidebar**
- Converted `PortalSidebar` from Server Component to Client Component with `'use client'`
- Added `collapsed` state (boolean, default false, session-only per D-15)
- Sidebar collapses to `w-12` (icon-only rail) or expands to `w-56` via toggle button
- Each nav item shows icon + label when expanded; icon-only when collapsed
- `TooltipProvider` wraps nav; each item has a `Tooltip` with `side="right"` that shows the label when collapsed
- Toggle button at bottom uses ChevronLeft / ChevronRight icons
- Branding area shows abbreviated "A" when collapsed, full "Atmaram / Staff Portal" when expanded
- Theme toggle and sign-out only visible when expanded (collapsed state saves vertical space)

**Task 2 — Dark Mode + EmptyState + Table Scroll**
- Replaced all `bg-white` with `bg-card`, `border-slate-*` with `border-border`, `text-slate-800/900` with `text-foreground`, `text-slate-400-700` with `text-muted-foreground` across 5 files
- Error banners replaced from `bg-red-50 border-red-200 text-red-700` to `bg-destructive/10 border-destructive text-destructive`
- `bg-slate-50` replaced with `bg-muted/50`, `bg-slate-100` with `bg-muted`
- `bg-slate-100 text-slate-500` (inactive badge) replaced with `bg-muted text-muted-foreground`
- File input `file:bg-slate-100 file:text-slate-700` replaced with `file:bg-muted file:text-foreground`
- EmptyState component applied to: departments (LayoutGrid icon), testimonials (MessageSquareQuote), doctors (Stethoscope), staff (Users), patients (UserPlus)
- `overflow-x-auto` wrapper added inside each table container div
- EmptyState and Users/UserPlus icons imported where previously missing

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] base-ui Tooltip does not support `asChild` prop**
- **Found during:** Task 1
- **Issue:** `TooltipTrigger` from `@base-ui/react/tooltip` does not accept `asChild` prop (unlike Radix UI) — TypeScript error TS2322 was thrown
- **Fix:** Used `render` prop instead: `<TooltipTrigger render={<Link ...>...</Link>} />` which is the base-ui equivalent
- **Files modified:** components/portal/Sidebar.tsx
- **Commit:** b3da602

## Known Stubs

None — all EmptyState components render meaningful copy and icons.

## Threat Flags

None — changes are purely visual (color tokens, layout), no new network endpoints or auth paths introduced.

## Self-Check

- [x] components/portal/Sidebar.tsx — modified with collapsible logic
- [x] app/(portal)/content/departments/DepartmentsClient.tsx — dark mode + EmptyState + overflow-x-auto
- [x] app/(portal)/content/testimonials/TestimonialsClient.tsx — dark mode + EmptyState + overflow-x-auto
- [x] app/(portal)/content/doctors/DoctorsClient.tsx — dark mode + EmptyState + overflow-x-auto
- [x] app/(portal)/staff/StaffClient.tsx — dark mode + EmptyState + overflow-x-auto
- [x] components/portal/PatientClient.tsx — dark mode + EmptyState + overflow-x-auto
- [x] `npx tsc --noEmit` passes (zero errors)
- [x] `grep -r "bg-white|text-slate-|border-slate-" app/(portal)/ components/portal/` returns zero matches in modified files
- [x] Commit b3da602 exists
- [x] Commit cca875d exists

## Self-Check: PASSED
