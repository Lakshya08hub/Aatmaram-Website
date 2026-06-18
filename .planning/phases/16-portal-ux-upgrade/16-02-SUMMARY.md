---
phase: 16-portal-ux-upgrade
plan: "02"
subsystem: portal
tags: [dashboard, charts, recharts, server-component, supabase]
dependency_graph:
  requires:
    - Plan 01 (components/ui/chart.tsx — ChartContainer primitives)
  provides:
    - app/(portal)/dashboard/page.tsx (RSC with 3 aggregation queries)
    - components/portal/DashboardCharts.tsx (client chart component with 4 metric cards)
  affects:
    - Portal dashboard route /dashboard
tech_stack:
  added: []
  patterns:
    - RSC → Client Component data handoff (same pattern as appointments/page.tsx)
    - groupByDay utility for YYYY-MM-DD aggregation
    - ChartContainer + BarChart + CartesianGrid + XAxis from recharts/shadcn
key_files:
  created:
    - components/portal/DashboardCharts.tsx
  modified:
    - app/(portal)/dashboard/page.tsx
decisions:
  - Pre-existing KanbanCard.tsx TypeScript error (from plan 16-03 commit) logged as deferred — not caused by this plan
  - Empty-state text used instead of chart when groupByDay returns [] — per spec
metrics:
  duration: ~10 min
  completed: 2026-06-18
  tasks: 2
  files: 2
---

# Phase 16 Plan 02: Dashboard Charts — Live Metric Cards Summary

**One-liner:** Replaced bare dashboard placeholder with a 4-card live metric dashboard (appointments bar chart, patient admissions bar chart, staff on duty count, payroll placeholder) sourced from Supabase via server-side RSC queries.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Replace dashboard/page.tsx with RSC aggregation queries | 47181e0 | app/(portal)/dashboard/page.tsx |
| 2 | Build DashboardCharts client component with 4 metric cards | 0e79ed2 | components/portal/DashboardCharts.tsx |

## Deviations from Plan

### Pre-existing build error (out of scope)

**components/portal/KanbanCard.tsx** has a TypeScript error (`asChild` prop not assignable) introduced by commit `6409c73` (plan 16-03 work committed ahead of this plan). This prevents `npx next build` from completing. This is not caused by plan 16-02 changes — `npx tsc --noEmit` with KanbanCard errors filtered shows zero errors in files modified by this plan.

Logged to deferred-items.md. Fix belongs to plan 16-03 scope.

### Auto-fixed Issues

None — plan executed exactly as written.

## Threat Surface Scan

T-16-03: Dashboard queries run server-side (RSC). No client secret exposure.
T-16-04: DashboardCharts is read-only display — no mutations, no user input.

No new threat surface beyond what the plan's threat model covers.

## Known Stubs

- Card D (Payroll) intentionally shows ₹0 with "Payroll tracker coming soon" — this is the specified placeholder, not an unintentional stub. Future payroll plan will wire real data.

## Self-Check: PASSED

- app/(portal)/dashboard/page.tsx: exists, contains 3 Supabase queries + DashboardCharts render
- components/portal/DashboardCharts.tsx: exists, 'use client', 4 cards, groupByDay utility
- No hardcoded bg-white / text-slate-* / text-gray-* in either file
- Commits 47181e0, 0e79ed2: present in git log
- TypeScript errors in plan-scope files: 0 (KanbanCard error is pre-existing/out-of-scope)
