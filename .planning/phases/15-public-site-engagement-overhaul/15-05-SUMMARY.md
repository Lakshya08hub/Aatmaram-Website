---
phase: "15"
plan: "05"
subsystem: "public-site/layout"
tags: [language-toggle, mobile-nav, accessibility, i18n, ui]
dependency_graph:
  requires: ["15-03"]
  provides: ["PUBUI-03", "PUBUI-04"]
  affects: ["components/layout/LanguageToggle.tsx", "components/layout/MobileNav.tsx"]
tech_stack:
  added: []
  patterns: ["single-button locale switch", "drawer-first language placement"]
key_files:
  created: []
  modified:
    - components/layout/LanguageToggle.tsx
    - components/layout/MobileNav.tsx
decisions:
  - "Nav variant replaced with single <button> — cleaner semantics and better touch target"
  - "Pill shows both locale labels (HI | EN) with opacity to convey current vs alternate"
  - "LanguageToggle placed in dedicated border-b div above ul — not as a li element"
metrics:
  duration: "5 minutes"
  completed: "2026-06-18"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 15 Plan 05: Language Toggle Restyle and Mobile Repositioning Summary

**One-liner:** Desktop LanguageToggle restyled to white pill (bg-white text-blue-900 rounded-full) and mobile drawer toggle moved above nav links ul, eliminating the bottom-footer duplicate.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Restyle LanguageToggle nav variant to white pill (D-07) | 2f5b6f6 | components/layout/LanguageToggle.tsx |
| 2 | Move language toggle to first position in MobileNav drawer (D-06) | b5c82b1 | components/layout/MobileNav.tsx |

## What Was Built

**Task 1 — LanguageToggle.tsx nav variant:**

The nav variant previously rendered two separate clickable spans (active locale in text-white, inactive in text-white/50) with a separator. This was replaced with a single `<button>` element:
- `className="bg-white text-blue-900 font-bold px-3 py-1 rounded-full text-sm min-h-[44px] flex items-center gap-1"`
- `onClick={handleSwitch}` — existing toggle function, no new logic
- Shows "HI | EN" with the active locale at full opacity and the alternate at 50% opacity
- `min-h-[44px]` satisfies WCAG 2.5.5 minimum touch target
- Drawer variant is entirely unchanged

**Task 2 — MobileNav.tsx repositioning:**

The `LanguageToggle variant="drawer"` was previously inside the bottom footer div (`p-4 border-t`). Structure changed to:
1. NEW: `<div className="px-4 pt-6 pb-2 border-b border-slate-100">` containing `<LanguageToggle variant="drawer" />` — above the `<ul>`
2. `<ul>` nav links — unchanged
3. Footer div — LanguageToggle removed; Book Appointment button remains exactly as before

Result: exactly one LanguageToggle in MobileNav, positioned above nav links, not inside a `<li>`.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None — locale switching is an existing mechanism with no new trust boundaries introduced.

## Self-Check: PASSED

- components/layout/LanguageToggle.tsx: confirmed contains "bg-white text-blue-900 font-bold"
- components/layout/MobileNav.tsx: confirmed exactly one LanguageToggle, above the ul
- Commits 2f5b6f6 and b5c82b1 exist in git log
