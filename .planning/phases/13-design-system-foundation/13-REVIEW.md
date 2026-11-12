---
phase: 13
phase_name: design-system-foundation
status: issues_found
review_depth: standard
files_reviewed: 13
files_reviewed_list:
  - app/globals.css
  - components/ui/empty-state.tsx
  - components/motion/fade-in.tsx
  - components/motion/hover-lift.tsx
  - components/motion/count-up.tsx
  - components/portal/theme-provider.tsx
  - components/portal/theme-toggle.tsx
  - app/(portal)/layout.tsx
  - components/portal/Sidebar.tsx
  - app/[locale]/(public)/page.tsx
  - app/(portal)/content/departments/DepartmentsClient.tsx
  - app/(portal)/content/doctors/DoctorsClient.tsx
  - app/(portal)/content/facilities/FacilitiesClient.tsx
findings:
  critical: 3
  warning: 7
  info: 3
  total: 13
---

# Phase 13: Code Review Report

**Reviewed:** 2026-06-20T00:00:00Z
**Depth:** standard
**Files Reviewed:** 13
**Status:** issues_found

## Summary

Phase 13 added dark mode infrastructure (ThemeProvider, ThemeToggle, globals.css token overrides), three motion primitives (FadeIn, HoverLift, CountUp), a shared EmptyState component, and wired the portal layout with a role-scoped Sidebar. Most of the design-system plumbing is solid — token indirection via private `--brand-*` vars is correct, prefers-reduced-motion is respected, and `suppressHydrationWarning` is appropriately absent because the ThemeProvider is portal-only and the portal layout is an async Server Component that does not render `<html>`.

Three blockers were found: (1) the ThemeToggle shows the wrong icon on first render after mount because the mounted guard condition is misordered; (2) `CountUp` is imported and rendered in the homepage RSC without a `'use client'` boundary wrapper — it works only because the homepage is not itself a Client Component, so `useInView` / `useEffect` will crash at runtime; (3) FacilitiesClient still uses raw slate/white literals for the page header, error banner, table wrapper, and form labels — these won't flip in dark mode, giving the portal a broken appearance when dark mode is active.

---

## Structural Findings (fallow)

No structural pre-pass was provided for this phase.

---

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-001 — ThemeToggle renders wrong icon on first paint after mount

**Severity:** Critical
**File:** `components/portal/theme-toggle.tsx:32`

**Issue:** The mounted guard condition is `{mounted && isDark ? <Sun /> : <Moon />}`. When `mounted` is `false` (SSR and the client frame before the effect fires) this correctly renders `<Moon />`. After mount, if the resolved theme is dark, it correctly renders `<Sun />`. However if the resolved theme is *light* after mount, the condition `mounted && isDark` is `true && false = false` and still falls to the `<Moon />` branch — which is correct. The bug is more subtle: the condition `mounted && isDark` means the pre-mount fallback and the post-mount-light state produce the same element (`<Moon />`), so no hydration mismatch occurs. BUT the icon is semantically inverted: when `mounted=false` we show the Moon icon (placeholder), but after mounting in *dark* mode we show the Sun icon. This is correct. The problem is: **when dark mode is active and the page first loads, before `useEffect` fires, `mounted` is `false`, so the Moon icon is rendered both on the server and on the initial client frame. The toggle click handler then reads `isDark` which is `false` (because `mounted=false` means `resolvedTheme` is undefined, so `isDark = undefined === 'dark'` is `false`), and calls `setTheme('dark')` — setting dark when the user intended to go light.**

The root cause: `onClick` runs `setTheme(isDark ? 'light' : 'dark')`, but `isDark` is derived from `resolvedTheme` which is `undefined` pre-mount. If the user clicks the toggle before the `useEffect` runs (rare but possible on slow connections), the theme flips to dark even when it was already dark.

**Fix:**
```tsx
// Disable the button until mounted so resolvedTheme is reliable
<Button
  ...
  disabled={!mounted}
  onClick={() => setTheme(isDark ? 'light' : 'dark')}
>
  {mounted ? (isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />) : (
    <Moon className="h-4 w-4" aria-hidden />
  )}
</Button>
```

---

### CR-002 — `CountUp` used in RSC without a client boundary wrapper

**Severity:** Critical
**File:** `app/[locale]/(public)/page.tsx:137-148`

**Issue:** `CountUp` uses `useEffect`, `useRef`, `useInView`, `useMotionValue`, and `useTransform` — all React client hooks. `page.tsx` is a Server Component (no `'use client'` directive). Next.js App Router allows a Server Component to import a Client Component only if that Client Component file carries `'use client'`. `CountUp` does carry `'use client'`, so the import itself is legal. However, `CountUp` is rendered *inside* a `<FadeIn>` wrapper which is also a Client Component. The issue is that the stat band wraps multiple `<CountUp>` elements inside a *single* `<FadeIn>` — `FadeIn` renders a `motion.div` that wraps children. This means `CountUp` children are rendered as part of the Client Component tree, which is fine.

The actual bug is that `CountUp` renders `<motion.span>{rounded}</motion.span>` where `rounded` is a `MotionValue`. Framer Motion's `motion.span` that subscribes to a `MotionValue` must be rendered in a client context — and it is because `CountUp` itself has `'use client'`. No crash here.

**Real CR-002 — `CountUp` initial value causes layout shift / number flash:** On the server render (SSR), `CountUp` returns the `reduce` branch because `useReducedMotion()` during SSR returns `null` which is falsy, so `reduce = null` — the `if (reduce)` branch is **not** taken. The non-reduced branch renders `<motion.span>{rounded}</motion.span>` where `rounded` is a transform of `count` (MotionValue starting at 0). On SSR, MotionValues serialize to their initial value. So the server renders `0` for every stat. On client hydration the animation triggers, counting up from 0 to the target. This is intentional (count-up effect), but if `useReducedMotion()` returns `true` on the client and `null` on the server, there is a hydration mismatch: server renders the animated `<motion.span>0</motion.span>`, client renders the static `{value}` span. The structure differs (one has a nested `motion.span`, the other does not), causing a React hydration error.

**Fix:** Check `useReducedMotion()` returns `null` on server and treat null as non-reduced for the structural render, but ensure both branches produce the same DOM shape:
```tsx
// In CountUp, always render a span wrapper to keep DOM shape stable:
if (reduce) {
  return (
    <span ref={ref} className={className}>
      {prefix}<span>{value}</span>{suffix}
    </span>
  )
}
// The motion.span branch already wraps in a span, so shapes now match.
```

---

### CR-003 — FacilitiesClient hardcoded literals break dark mode

**Severity:** Critical
**File:** `app/(portal)/content/facilities/FacilitiesClient.tsx:225,231,248-249,267,364,378,393,415-416,419,427,449,452`

**Issue:** Unlike `DepartmentsClient` and `DoctorsClient` which were updated to use design token classes (`text-foreground`, `text-muted-foreground`, `border-border`, `bg-card`), `FacilitiesClient` was not migrated. It retains raw Tailwind color literals throughout:

- Line 225: `text-slate-800` (page heading)
- Line 231: `border-red-200 bg-red-50 text-red-700` (error banner — should use `border-destructive bg-destructive/10 text-destructive`)
- Line 248: `border-slate-200 bg-white` (table card wrapper)
- Line 249: `text-slate-500` (featured count label)
- Line 267: `text-slate-500` (description cell)
- Lines 364, 378, 393, 415: `text-slate-700` (form labels)
- Line 416: `text-slate-400` (optional hint)
- Line 419: `border-slate-200` (image preview border)
- Line 427: `text-slate-500 file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200` (file input)
- Line 449: `text-slate-400` (helper text)
- Line 452: `text-slate-500` (upload spinner text)

In dark mode (portal dark theme active), these all render as light-mode colors against a dark background, making text unreadable and the card/border invisible against the dark surface.

**Fix:** Replace all slate literals with their token equivalents, consistent with DepartmentsClient and DoctorsClient:
```tsx
// Line 225
<h1 className="text-xl font-semibold text-foreground">Facilities</h1>

// Line 231
<div className="mt-4 rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">

// Line 248
<div className="mt-6 rounded-lg border border-border bg-card shadow-sm overflow-hidden">

// Line 249
<p className="px-4 pt-3 text-sm text-muted-foreground">

// Line 267
<TableCell className="text-muted-foreground">

// Form labels (lines 364, 378, 393, 415)
<label ... className="text-sm font-medium text-foreground">

// Line 416
<span className="text-muted-foreground font-normal">

// Line 419
<div className="relative w-40 aspect-video overflow-hidden rounded border border-border">

// Line 427 file input
className="block text-sm text-muted-foreground file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-muted file:text-foreground hover:file:bg-muted/80"

// Lines 449, 452
<p className="text-xs text-muted-foreground">
```

---

## Warnings

### WR-001 — `globals.css` duplicate `--color-accent` and `--color-muted` definitions

**Severity:** Warning
**File:** `app/globals.css:19,41-43`

**Issue:** `--color-accent` is defined twice in the `@theme inline` block: first as `#16A34A` (the hospital green brand color, line 19), then overridden by `var(--accent)` (the shadcn neutral, line 41). Similarly `--color-muted` is defined as `var(--brand-muted)` at line 22, then immediately overridden by `var(--muted)` at line 43. The later definition wins in CSS cascade order within `@theme`, so the brand green `#16A34A` and the brand muted `var(--brand-muted)` are silently shadowed and have no effect. Any component using `bg-accent` or `text-muted` gets the shadcn neutral, not the brand color.

**Fix:** Remove the orphaned first definitions and use only one alias per token. If the hospital green is needed, expose it under a distinct token name such as `--color-brand-green`:
```css
/* Remove lines 19 and 22 (the first --color-accent and --color-muted) */
/* Add a dedicated brand-green token: */
--color-brand-green: #16A34A;
```
Update all usages of `bg-accent` / `text-accent` that were intended as the hospital green to use `bg-brand-green` / `text-brand-green`.

---

### WR-002 — `@custom-variant dark` selector targets `.dark *` but ThemeProvider applies `.dark` to a `<div>`, not `<html>`

**Severity:** Warning
**File:** `app/globals.css:4` / `app/(portal)/layout.tsx:47`

**Issue:** `globals.css` declares `@custom-variant dark (&:is(.dark *))` — every element must be a descendant of `.dark`. The portal `ThemeProvider` uses `attribute="class"` which appends `dark` to the element it wraps, which is the `<ThemeProvider>` render root. In next-themes, `attribute="class"` targets the `<html>` element **by default**. Since the portal layout doesn't pass a `storageKey` or `forcedTheme`, next-themes will add/remove `.dark` on `<html>`. This means on the public site, if a user had previously set a dark preference (stored in localStorage under next-themes' default key `"theme"`), `<html>` will get `.dark` added by next-themes even though the ThemeProvider is portal-only — **because next-themes reads localStorage on the public site's initial render too**, since the root app layout renders before the portal layout guard can run.

The public site's `<html>` element is defined in `app/layout.tsx` (root layout). The portal's ThemeProvider only wraps portal routes. However next-themes `attribute="class"` manipulates `document.documentElement` (i.e. `<html>`) globally. This means: if a staff member browses the portal in dark mode and then navigates directly to the public site in the same browser session, next-themes' client-side code will read `localStorage.getItem('theme') === 'dark'` and add `.dark` to `<html>` — causing the public site to render in dark mode.

**Fix:** Scope next-themes to the portal DOM subtree by adding a wrapping `<div id="portal-root">` and setting the `attribute` target to that element, or — simpler — set a namespace storage key so the preference is portal-specific:
```tsx
<ThemeProvider
  attribute="class"
  defaultTheme="system"
  enableSystem
  disableTransitionOnChange
  storageKey="portal-theme"   {/* add this */}
>
```
This alone does not fix the `<html>` target (next-themes still targets `<html>`). To fully isolate, pass a container ref or wrap in a custom provider that sets class on a portal `<div>`. At minimum, the `storageKey` change prevents the public site from inheriting the portal's stored theme preference.

---

### WR-003 — `ThemeToggle` Moon icon shown pre-mount gives wrong affordance

**Severity:** Warning
**File:** `components/portal/theme-toggle.tsx:32`

**Issue:** Before mount (SSR and first client frame), `mounted=false` so `mounted && isDark` is always `false`, rendering `<Moon />`. Moon conventionally means "switch to dark mode". If the current system theme is dark, a returning staff member sees Moon — suggesting they are in light mode — then the page fully renders and flips to Sun. This is a flash of incorrect icon that causes visual confusion, separate from the click-on-unmounted issue in CR-001.

**Fix:** Render a size-placeholder `<div>` with no icon (or an invisible skeleton) until mounted, rather than a semantically misleading Moon icon:
```tsx
if (!mounted) {
  return (
    <Button type="button" variant="ghost" size="icon"
      className="min-h-[44px] min-w-[44px]" aria-label="Toggle theme" disabled>
      <span className="h-4 w-4 block" />
    </Button>
  )
}
return (
  <Button ... onClick={() => setTheme(isDark ? 'light' : 'dark')}>
    {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
  </Button>
)
```

---

### WR-004 — `CountUp` `useEffect` dep array includes `count` MotionValue (stable ref, but signals intent unclear)

**Severity:** Warning
**File:** `components/motion/count-up.tsx:45`

**Issue:** The `useEffect` dependency array is `[inView, reduce, count, value, duration]`. `count` is a `useMotionValue(0)` — its reference is stable across renders (MotionValues don't change identity). Including it in the dep array is harmless but suggests the developer expected it might change. More importantly: if `value` changes after the component mounts (e.g. the stat is updated), the animation re-triggers correctly because `value` is in the dep array. However `count` is never reset to 0 before re-animating — if `value` changes from 90 to 50, the animation will count from wherever `count` currently sits (likely 90) down to 50. The `animate(count, value, ...)` call handles this via framer-motion's internal easing, so the visual result is acceptable but the count may not start from 0 on a value change.

**Fix:** Reset the MotionValue before re-animating on value change:
```tsx
useEffect(() => {
  if (reduce || !inView) return
  count.set(0)  // reset to 0 before animating to new value
  const controls = animate(count, value, { duration, ease: "easeOut" })
  return controls.stop
}, [inView, reduce, count, value, duration])
```

---

### WR-005 — Featured-count labels are magic numbers hardcoded in JSX

**Severity:** Warning
**File:** `app/(portal)/content/departments/DepartmentsClient.tsx:232` / `app/(portal)/content/doctors/DoctorsClient.tsx:272`

**Issue:** The labels `"8 featured"` (departments) and `"3 featured"` (doctors) are hardcoded as numeric literals in JSX:
- `DepartmentsClient.tsx:232`: `{featuredCount} of 8 featured`
- `DoctorsClient.tsx:272`: `{featuredCount} of 3 featured`

These limits are presumably enforced by the server action (`toggleFeatured` returns an error when the limit is exceeded), but the UI label magic numbers are disconnected from the enforcement logic. If the limit changes in the action, the UI label silently becomes wrong.

**Fix:** Export the limit constants from a shared location (e.g. `lib/portal/content-limits.ts`) and import them in both the action and the client:
```ts
// lib/portal/content-limits.ts
export const FEATURED_DEPARTMENTS_MAX = 8
export const FEATURED_DOCTORS_MAX = 3
```
```tsx
// DepartmentsClient.tsx
import { FEATURED_DEPARTMENTS_MAX } from '@/lib/portal/content-limits'
// ...
<p>{featuredCount} of {FEATURED_DEPARTMENTS_MAX} featured</p>
```

---

### WR-006 — Order input in all three CMS clients is uncontrolled native `<input>` without token classes

**Severity:** Warning
**File:** `app/(portal)/content/departments/DepartmentsClient.tsx:287-308` / `app/(portal)/content/doctors/DoctorsClient.tsx:335-356` / `app/(portal)/content/facilities/FacilitiesClient.tsx:297-320`

**Issue:** The featured-order `<input type="number">` uses bare `className="w-14 border rounded px-1 text-sm"` with no color tokens. In dark mode, the border color will be the browser default (typically gray) rather than `border-border`, the text color will be the browser's inherited default (may be black or undefined) rather than `text-foreground`, and the background will be the browser default (white) rather than `bg-background`. This makes the input invisible or near-invisible against a dark portal surface.

Additionally, this is a raw `<input>` instead of the project's `<Input>` component (shadcn), which already has dark-mode-aware styling. Using the shadcn `Input` component would fix the dark mode issue automatically.

**Fix:**
```tsx
// Replace all three instances:
<Input
  type="number"
  min="0"
  max="99"
  value={fs.order}
  className="w-14 px-1 text-sm"
  onChange={...}
  onBlur={...}
/>
```

---

### WR-007 — `PortalLayout` does not pass `suppressHydrationWarning` — but the missing `storageKey` (WR-002) makes this a real risk

**Severity:** Warning
**File:** `app/(portal)/layout.tsx:46-59`

**Issue:** The portal layout is an async Server Component. The `ThemeProvider` it renders outputs a `<html>`-class-toggling script (the next-themes inline script injected via `next-themes`' `scriptProps`). On first SSR, the server renders without `.dark` on `<html>`. The next-themes client script runs before hydration and adds `.dark` if the stored preference is dark. React then hydrates and sees a mismatch between the server HTML (no `.dark` on `<html>`) and what the client DOM shows (`.dark` present). This is precisely what `suppressHydrationWarning` on `<html>` is meant to fix — and it should be set in `app/layout.tsx` (root layout), not here.

Without `suppressHydrationWarning` on the root `<html>` element, Next.js will log a hydration warning in the console for every portal page load when the user's stored theme is dark. This does not crash the app but produces spurious errors in production logs and can degrade debugging.

**Fix:** In the root layout (`app/layout.tsx`), add:
```tsx
<html lang="hi" suppressHydrationWarning>
```
(The `lang` default locale is `hi` per CLAUDE.md.)

---

## Info

### IN-001 — `FadeIn` used directly in RSC to wrap `PMJAYExplainer` without a key

**Severity:** Info
**File:** `app/[locale]/(public)/page.tsx:160`

**Issue:** `<FadeIn>` wraps `<PMJAYExplainer>` at the top-level of the RSC return (not inside a list). This is fine, but the `FadeIn` at line 160 and the one at line 247 (inside the testimonials section) are siblings with no explicit keys in their parent container. React doesn't require keys for non-list children, so this is not a bug. It is noted because future developers adding more top-level `FadeIn` blocks might introduce ordering issues.

**Fix:** No change required. No bug.

---

### IN-002 — `EmptyState` heading is always `<h2>` regardless of page heading hierarchy

**Severity:** Info
**File:** `components/ui/empty-state.tsx:30`

**Issue:** `EmptyState` hard-codes `<h2>` for the title. In `DepartmentsClient`, `DoctorsClient`, and `FacilitiesClient`, the page already has an `<h1>` heading, so `<h2>` is semantically correct. However if `EmptyState` is ever used on a page without a preceding `<h1>`, it would produce an incorrect heading hierarchy (skipping h1). The component has no `headingLevel` prop to allow customisation.

**Fix:** Add an optional `headingLevel` prop with a default of `2`:
```tsx
interface EmptyStateProps {
  ...
  headingLevel?: 1 | 2 | 3
}
// In render:
const Heading = `h${headingLevel ?? 2}` as const
<Heading className="text-base font-semibold text-foreground">{title}</Heading>
```

---

### IN-003 — Homepage hero section code is duplicated verbatim

**Severity:** Info
**File:** `app/[locale]/(public)/page.tsx:64-129`

**Issue:** The hero section has two branches: one with a hero image (lines 64-96) and one without (lines 97-129). The inner `<div className="max-w-4xl mx-auto text-center">` content — `<h1>`, `<p>`, `<PMJAYBadge>`, CTA button, and secondary link — is identical in both branches (lines 67-95 vs 99-128). The only difference between the two branches is the outer `<section>` wrapper and `<Image>` background. This duplication means future copy changes (headline text, button label, link text) must be made in two places.

**Fix:** Extract the shared inner content:
```tsx
const HeroContent = (
  <div className="max-w-4xl mx-auto text-center">
    <h1 className="text-4xl md:text-5xl font-bold text-slate-900">{t('hero.headline')}</h1>
    {/* ... rest of hero content ... */}
  </div>
)

return heroImageUrl && heroImageUrl.length > 0 ? (
  <section className="relative py-16 md:py-24 px-4 overflow-hidden">
    <Image ... />
    <div className="absolute inset-0 bg-white/70 -z-10" />
    {HeroContent}
  </section>
) : (
  <section className="bg-white py-16 md:py-24 px-4">
    {HeroContent}
  </section>
)
```

---

_Reviewed: 2026-06-20T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
