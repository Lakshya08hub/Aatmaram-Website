# Plan 13-04 Summary — Portal-only dark mode

**Status:** Complete
**Requirements:** UI-02
**Executed:** 2026-06-14 (inline, sequential)

## What was built

Portal-only dark mode wired through next-themes, mounted entirely within the portal layout so the
public site can never go dark.

- **`components/portal/theme-provider.tsx`** (new) — thin `'use client'` pass-through wrapper around
  `next-themes` `ThemeProvider`.
- **`components/portal/theme-toggle.tsx`** (new) — SSR-safe sidebar toggle. `useTheme`, mounted guard
  to avoid hydration mismatch, `aria-label="Toggle theme"`, ≥44px hit area, Sun/Moon icons.
- **`app/(portal)/layout.tsx`** (modified) — `<html suppressHydrationWarning>`; body content wrapped in
  `<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>`;
  `<main>` migrated `bg-slate-50` → `bg-background text-foreground`.
- **`components/portal/Sidebar.tsx`** (modified) — `ThemeToggle` mounted in the footer; slate/white
  literals migrated to sidebar tokens (`bg-sidebar`, `text-sidebar-foreground[/x]`, `hover:bg-sidebar-accent`,
  `border-sidebar-border`).

## Verification
- `npm run build` exits 0 ✓ (all routes compiled)
- ThemeProvider imports in `app/[locale]`: **0** ✓ (public stays light by construction — Pitfall 4)
- slate/white literals in Sidebar.tsx: **0** ✓ (Pitfall 2 — dark mode now visibly applies)
- `bg-slate-50` in portal layout main: **0** ✓
- `suppressHydrationWarning` present: **1** ✓ (FOUC prevention — Pitfall 1)
- `ThemeToggle` referenced in Sidebar: **2** (import + render) ✓

## Notes
Default is system preference; manual choice persists via next-themes localStorage. Toggle lives only in
the portal sidebar — no toggle anywhere on the public site (D-03).

## Carry-forward
Wave 2 (13-05) adopts EmptyState + motion primitives and does the homepage spacing pass.
