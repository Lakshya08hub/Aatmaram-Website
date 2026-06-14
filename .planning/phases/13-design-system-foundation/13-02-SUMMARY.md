# Plan 13-02 Summary — Shared EmptyState component

**Status:** Complete
**Requirements:** UI-04
**Executed:** 2026-06-14 (inline, sequential)

## What was built

`components/ui/empty-state.tsx` — a shared presentational `<EmptyState>` following the shadcn
base-nova convention.

- Plain exported function (no `forwardRef`, no `'use client'`, no cva — no variants needed).
- Props: `{ icon: LucideIcon; title: string; description?: string; action?: ReactNode; className?: string }`.
- Root `div` with `data-slot="empty-state"` and `cn('flex flex-col items-center gap-3 py-16 text-center', className)`.
- Renders lucide icon (`h-10 w-10 text-muted-foreground`, `aria-hidden`), `h2` title
  (`text-base font-semibold text-foreground`), optional `p` description (`text-sm text-muted-foreground max-w-sm`),
  optional `action` node.
- Token utility classes ONLY (`text-foreground`, `text-muted-foreground`) — no `slate-*`/`white`
  literals, so it is dark-mode-correct in the portal by construction.

## Files
- `components/ui/empty-state.tsx` (new)

## Verification
- `npm run build` exits 0 ✓
- `export function EmptyState` present ✓
- `data-slot="empty-state"` + `cn(...)` on root ✓
- No `slate-`/`bg-white`/`text-white` literals ✓
- Icon has `aria-hidden` ✓

## Carry-forward
Adoption in the 3 portal CRUD clients happens in Wave 2 (13-05).
