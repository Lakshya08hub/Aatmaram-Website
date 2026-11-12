---
phase: 2
fixed_at: 2026-06-20T00:00:00Z
review_path: .planning/phases/02-public-site-components/02-REVIEW.md
iteration: 1
findings_in_scope: 7
fixed: 4
skipped: 3
status: partial
---

# Phase 2: Code Review Fix Report

**Fixed at:** 2026-06-20
**Source review:** `.planning/phases/02-public-site-components/02-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope (Critical + Warning): 7
- Fixed: 4
- Skipped: 3

## Fixed Issues

### CR-01: Unvalidated `mapsEmbedUrl` rendered directly in iframe src

**File modified:** `app/[locale]/(public)/contact/page.tsx`
**Applied fix:** Added `GMAPS_EMBED_RE` regex (`/^https:\/\/www\.google\.com\/maps\/embed\?/`) and derived `mapsEmbedUrl` from `rawMapsUrl` only when the pattern matches; otherwise falls back to empty string. The existing conditional branch already renders the placeholder when `mapsEmbedUrl` is falsy, so no JSX changes were needed.

### CR-02: Crash/blank on empty `full_name` in `getInitials` (doctors page)

**File modified:** `app/[locale]/(public)/doctors/page.tsx`
**Applied fix:** Rewrote `getInitials` to use `trim().split(/\s+/)` (regex split handles multiple spaces), guard on `parts.length > 0`, and return `'?'` as fallback. Matches the inline pattern already used on the home page.

### WR-01: Footer uses bare `next/link` instead of i18n-aware Link

**File modified:** `components/layout/Footer.tsx`
**Applied fix:** Replaced `import Link from 'next/link'` with `import { Link } from '@/i18n/navigation'`. All existing `<Link>` usages in the file are unchanged — the named export is a drop-in replacement that adds locale prefix automatically.

### WR-05: `DepartmentCard` alt text uses "image" anti-pattern

**File modified:** `components/public/DepartmentCard.tsx`
**Applied fix:** Changed `alt={name + ' image'}` to `alt={name}`. The word "image" is redundant (screen readers already announce image role); using just the department name is both accessible and accurate.

## Skipped Issues

### WR-02: `setRequestLocale` called without await

**File:** `app/[locale]/(public)/layout.tsx:19` and all public pages
**Reason:** No code change needed. The reviewer confirmed this is the correct next-intl v3 pattern — `setRequestLocale` is synchronous. The finding is informational/awareness-only with no actionable fix. The suggested mitigation (lint comment or utility wrapper) is an IN-tier enhancement, not a functional bug.

### WR-03: Services page renders `facilities` list twice

**File:** `app/[locale]/(public)/services/page.tsx:52-96`
**Reason:** Skipped — fixing this requires understanding which data to substitute (services vs. facilities) and likely touches `lib/db/` queries. This is a product-level decision (what to show in Section 2 vs Section 4) that should be made with the client before committing a change. Marked for manual follow-up.

### WR-04: `MobileNav` uses `render` prop instead of `asChild`

**File:** `components/layout/MobileNav.tsx:29-38, 48-57, 62-74`
**Reason:** Skipped — the project uses `@base-ui/react` (not `@radix-ui`), confirmed in `package.json`. The `render` prop is the correct Base UI v1 API. The reviewer's suggestion to use `asChild` is the Radix UI pattern and does NOT apply here. Switching to `asChild` would break the components. No change made.

---

_Fixed: 2026-06-20_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
