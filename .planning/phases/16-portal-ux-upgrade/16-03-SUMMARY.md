---
phase: 16-portal-ux-upgrade
plan: "03"
subsystem: portal/appointments
tags: [kanban, appointments, portal, ux]
dependency_graph:
  requires: [16-01]
  provides: [kanban-board-appointments]
  affects: [app/(portal)/appointments/page.tsx]
tech_stack:
  added: []
  patterns: [kanban-column-layout, inline-notes-editor, alert-dialog-confirm]
key_files:
  created:
    - components/portal/KanbanBoard.tsx
    - components/portal/KanbanCard.tsx
    - components/portal/KanbanColumn.tsx
  modified:
    - app/(portal)/appointments/page.tsx
    - app/globals.css
decisions:
  - AlertDialogTrigger uses base-ui (not radix), no asChild prop — used inline span instead of Button wrapper
metrics:
  duration: 15
  completed_date: "2026-06-18"
  tasks: 2
  files: 5
---

# Phase 16 Plan 03: Kanban Board for Appointments Summary

**One-liner:** 4-column kanban board replacing tabbed table — advance/cancel actions, inline notes, scroll-hint animation using existing server actions.

## What Was Built

Replaced the tabbed table appointment view with a 4-column kanban board (Pending, Contacted, Confirmed, Cancelled). Each card shows patient name, phone as a `tel:` link, preferred date, doctor, a status badge, an inline notes editor (blur/Enter saves), an advance button, and a cancel dialog for non-terminal statuses.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create KanbanCard and KanbanColumn | 6409c73 | KanbanCard.tsx, KanbanColumn.tsx |
| 2 | Create KanbanBoard and wire into page | cab42b5 | KanbanBoard.tsx, page.tsx, globals.css |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] AlertDialogTrigger has no asChild prop (base-ui, not radix)**
- **Found during:** Task 1 TypeScript check
- **Issue:** Plan specified `asChild` on AlertDialogTrigger, but project uses `@base-ui/react/alert-dialog` which does not expose that prop
- **Fix:** Replaced `<Button asChild>` trigger with an inline `<span>` styled to match button appearance
- **Files modified:** components/portal/KanbanCard.tsx
- **Commit:** 6409c73

## Known Stubs

None. All columns are wired to real appointment data passed from the server component.

## Threat Flags

No new trust boundaries introduced. KanbanCard calls `updateAppointmentStatusAction` and `updateAppointmentNotesAction` — both already enforce `requireAppointmentRole()` per T-16-05 and T-16-06.

## Self-Check: PASSED

- components/portal/KanbanBoard.tsx — EXISTS
- components/portal/KanbanCard.tsx — EXISTS
- components/portal/KanbanColumn.tsx — EXISTS
- app/(portal)/appointments/page.tsx — UPDATED (imports KanbanBoard)
- app/globals.css — UPDATED (kanban-scroll-hint keyframe added)
- Commits 6409c73 and cab42b5 — EXIST
- `npx tsc --noEmit` — PASSED
- `npx next build` — PASSED
