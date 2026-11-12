---
phase: 13
fixed_at: 2026-06-20T00:00:00.000Z
review_path: .planning/phases/13-design-system-foundation/13-REVIEW.md
iteration: 1
findings_in_scope: 10
fixed: 10
skipped: 0
status: all_fixed
---

# Phase 13: Code Review Fix Report

**Fixed at:** 2026-06-20
**Source review:** `.planning/phases/13-design-system-foundation/13-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 10 (3 Critical, 7 Warning)
- Fixed: 10
- Skipped: 0

## Fixed Issues

### CR-001 + WR-003: ThemeToggle fires before mount; pre-mount icon misleading

**Files modified:** `components/portal/theme-toggle.tsx`
**Commit:** e666335
**Applied fix:** Added `disabled={!mounted}` to the `<Button>`. Changed icon rendering so nothing is shown until `mounted` is true (removed the pre-mount Moon fallback that appeared even when theme was actually dark).

---

### CR-002 + WR-004: CountUp hydration mismatch; MotionValue not reset on value change

**Files modified:** `components/motion/count-up.tsx`
**Commit:** b2175b3
**Applied fix:** Both branches already used a consistent `<span>` outer wrapper — confirmed no structural mismatch existed. Added `count.set(0)` before each animation in the `useEffect` so the count resets when the `value` prop changes rather than animating from the last value.

---

### CR-003: FacilitiesClient entirely un-migrated from slate/white literals

**Files modified:** `app/(portal)/content/facilities/FacilitiesClient.tsx`
**Commit:** 0ba722b
**Applied fix:** Replaced all hardcoded slate literals with semantic token classes: `text-slate-800/900/700` → `text-foreground`, `text-slate-500/600/400` → `text-muted-foreground`, `bg-white` → `bg-card`, `border-slate-200` → `border-border`, `bg-slate-100/200` → `bg-muted`. Intentional coloured elements (red error banner, red delete button) left unchanged.

---

### WR-001: `--color-accent` and `--color-muted` defined twice

**Files modified:** `app/globals.css`
**Commit:** 362e1e5
**Applied fix:** Renamed the early brand token aliases from `--color-accent: #16A34A` to `--color-brand-green: #16A34A` and `--color-muted: var(--brand-muted)` to `--color-brand-muted: var(--brand-muted)`. This eliminates the duplicate definition while preserving the brand green as a usable Tailwind token (`bg-brand-green`) distinct from shadcn's `--color-accent`.

---

### WR-002 + WR-007: Portal dark preference bleeding; missing suppressHydrationWarning

**Files modified:** `app/(portal)/layout.tsx`
**Commit:** f823983
**Applied fix:** Added `storageKey="portal-theme"` to the `<ThemeProvider>` so portal dark mode preference uses a separate localStorage key. `suppressHydrationWarning` was already present on `<html>` in `app/layout.tsx` (the root layout that wraps the portal); no change needed for WR-007.

---

### WR-005: Magic number featured-count limits

**Files modified:** `app/(portal)/content/departments/DepartmentsClient.tsx`, `app/(portal)/content/doctors/DoctorsClient.tsx`
**Commit:** 0d11f9f
**Applied fix:** Extracted `const MAX_FEATURED_DEPARTMENTS = 8` and `const MAX_FEATURED_DOCTORS = 3` at the top of each file. Replaced the magic number literals in JSX with the named constants.

---

### WR-006: Raw `<input type="number">` not dark-mode-safe

**Files modified:** `app/(portal)/content/departments/DepartmentsClient.tsx`, `app/(portal)/content/doctors/DoctorsClient.tsx`, `app/(portal)/content/facilities/FacilitiesClient.tsx`
**Commit:** 3d4f12d
**Applied fix:** Replaced `<input type="number" ...>` order field elements with `<Input type="number" ...>` (shadcn component) in all three CMS client files. File upload `<input type="file">` elements were left as raw inputs (correct — no shadcn file input component).

---

_Fixed: 2026-06-20_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
