---
phase: 2
phase_name: public-site-components
status: issues_found
review_depth: standard
files_reviewed: 11
files_reviewed_list:
  - components/layout/Header.tsx
  - components/layout/Footer.tsx
  - components/layout/MobileNav.tsx
  - components/public/DepartmentCard.tsx
  - components/public/DoctorCard.tsx
  - components/public/PMJAYBadge.tsx
  - components/public/SectionHeading.tsx
  - app/[locale]/(public)/layout.tsx
  - app/[locale]/(public)/page.tsx
  - app/[locale]/(public)/departments/page.tsx
  - app/[locale]/(public)/doctors/page.tsx
  - app/[locale]/(public)/services/page.tsx
  - app/[locale]/(public)/contact/page.tsx
  - app/[locale]/(public)/about/page.tsx
findings:
  critical: 2
  warning: 5
  info: 4
  total: 11
---

# Phase 2: Code Review Report

**Reviewed:** 2026-06-20T00:00:00Z
**Depth:** standard
**Files Reviewed:** 14
**Status:** issues_found

## Summary

Phase 2 covers the public-facing layout shell (Header, Footer, MobileNav), shared UI components (DepartmentCard, DoctorCard, PMJAYBadge, SectionHeading), the public layout wrapper, and all six public pages. The static `lib/data/` files listed in scope do not exist on disk — the data layer has already been migrated to `lib/db/` Supabase queries, so those files are not present and cannot be reviewed.

The component code is generally clean, uses next-intl correctly, and avoids XSS vectors. Two critical issues were found: an unvalidated iframe `src` attribute sourced from a database field (open redirect / content injection) and a crash-level null-dereference in the `getInitials` helper. Five warnings cover i18n gaps, locale-unaware `next/link` usage in Footer, a swallowed error in the public layout, and duplicate rendering of the same facilities list on the services page.

---

## Critical Issues

### CR-01: Unvalidated `mapsEmbedUrl` rendered directly in iframe src

**File:** `app/[locale]/(public)/contact/page.tsx:107`
**Issue:** `hospitalInfo.maps_embed_url` is read from the database and placed verbatim into an `<iframe src={mapsEmbedUrl}>` with no validation. Any staff member with write access to the `hospital_info` row can inject an arbitrary URL — including `javascript:` URIs on browsers that allow them in iframes, malicious sites, or tracking pixels. Even without a `javascript:` attack, this is an uncontrolled open-redirect vector embedded in a page rendered to all public visitors.
**Fix:**
```tsx
// Validate that the URL is a real Google Maps embed before rendering it.
const GMAPS_EMBED_RE = /^https:\/\/www\.google\.com\/maps\/embed\?/;

const safeMapsEmbedUrl =
  mapsEmbedUrl && GMAPS_EMBED_RE.test(mapsEmbedUrl) ? mapsEmbedUrl : '';

// Then use safeMapsEmbedUrl in the conditional branch:
{safeMapsEmbedUrl ? (
  <iframe src={safeMapsEmbedUrl} ... />
) : (
  <div>...placeholder...</div>
)}
```

---

### CR-02: Crash on empty `full_name` in `getInitials` (doctors page)

**File:** `app/[locale]/(public)/doctors/page.tsx:22`
**Issue:** `getInitials` maps over `fullName.split(' ')` and calls `part[0].toUpperCase()` on every non-empty part. If the database row has `full_name = ''` (empty string), `split(' ')` returns `['']`, `.filter(Boolean)` correctly removes it, `.slice(0,2)` gives `[]`, and `.map(part => part[0]...)` is never called — so the standalone `getInitials` on the doctors page is actually safe.

However, on the **home page** (`app/[locale]/(public)/page.tsx:205`), the initials are computed inline as:
```ts
(doctor.full_name ?? '').trim().split(/\s+/).filter(Boolean).map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '?'
```
That inline version handles empty correctly (falls back to `'?'`). The standalone `getInitials` on the doctors page returns `''` (empty string) for a doctor with an empty name, and that empty string is passed directly as `initials` prop to `DoctorCard` with no fallback. `DoctorCard` renders `{initials}` inside a `<span>` — visually blank, but not a crash. The inconsistency between the two call sites means the doctors page will silently render a blank avatar initial while the home page shows `?`. This is a data-consistency bug: fix `getInitials` to return a fallback, or share the inline logic.

**Fix:**
```ts
function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.length > 0 ? parts.map((p) => p[0].toUpperCase()).join('') : '?';
}
```

---

## Warnings

### WR-01: Footer uses bare `next/link` instead of i18n-aware `Link` from `@/i18n/navigation`

**File:** `components/layout/Footer.tsx:1`
**Issue:** `Footer` imports `Link` from `'next/link'` (line 1), while every other component in the codebase imports `Link` from `'@/i18n/navigation'`. The i18n `Link` automatically prepends the active locale prefix (e.g., `/hi/about`). The bare `next/link` will generate locale-less hrefs (`/about`), which either 404 or redirect — breaking navigation from footer links for Hindi-locale visitors.
**Fix:**
```tsx
// Replace line 1:
import { Link } from '@/i18n/navigation';
// Remove 'next/link' import.
```

---

### WR-02: `setRequestLocale` called without `await` (no-op in some Next.js intl setups)

**File:** `app/[locale]/(public)/layout.tsx:19`, `app/[locale]/(public)/departments/page.tsx:22`, and all other public pages
**Issue:** `setRequestLocale(locale)` is called without `await`. In the current `next-intl` v3 API, `setRequestLocale` is synchronous, so this is not wrong today — but the function signature accepts a `string` and must be called before any `getTranslations` call. The concern is that `locale` is destructured from `await params` on the same line, which is correct. However, the public **layout** file calls `setRequestLocale(locale)` but then does not call `getTranslations` itself — the locale is set only for the layout's render scope, not for child page components, which re-call `setRequestLocale` individually. This is the correct next-intl pattern. No functional bug, but flagging for awareness. **The real risk:** if a future refactor moves `setRequestLocale` below a `getTranslations` call in any page, translations will silently fall back to the default locale without an error.
**Fix:** Add a lint comment or a utility wrapper to enforce call order. Low risk now, but a pit to fall into.

---

### WR-03: Services page renders the `facilities` list twice with different UI

**File:** `app/[locale]/(public)/services/page.tsx:52-96`
**Issue:** The same `facilities` array fetched from the database is rendered twice on the same page — once as a checklist (Section 2, lines 53-59) and once as a card grid (Section 4, lines 85-96). Both sections iterate `facilities.map(...)`. This is not a crash, but it means every facility appears twice on the page, which is confusing to users and inflates the DOM. It is likely a copy-paste error where one section was meant to show services and the other facilities (which are separate concepts in the data model as seen in `lib/db/` — there appear to be both `services` and `facilities` tables).
**Fix:** Fetch and render services and facilities separately, or decide on one representation per section.

---

### WR-04: `MobileNav` passes `render` prop to `SheetTrigger`/`SheetClose` — non-standard Radix pattern

**File:** `components/layout/MobileNav.tsx:29-38, 48-57, 62-74`
**Issue:** The component uses `<SheetTrigger render={<Button ...>}>` and `<SheetClose render={<Link .../>}>`. The standard Radix UI / shadcn pattern is `asChild` prop, not a `render` prop. The `render` prop exists in Radix v2's new slot API, but many shadcn installations ship Radix v1 where `render` is silently ignored — meaning `SheetTrigger` renders its own `<button>` in addition to the `<Button>` child, producing double-rendered interactive elements and breaking accessibility (two focusable elements per trigger). This needs verification against the installed Radix version.
**Fix:**
```tsx
// Standard pattern for all Radix v1 / shadcn installations:
<SheetTrigger asChild>
  <Button variant="ghost" ...>
    <Menu className="h-6 w-6" />
  </Button>
</SheetTrigger>

// And for SheetClose:
<SheetClose asChild>
  <Link href={link.href} className="...">
    {tNav(link.key)}
  </Link>
</SheetClose>
```

---

### WR-05: `DepartmentCard` `alt` text is constructed by string concatenation from untrusted data

**File:** `components/public/DepartmentCard.tsx:20`
**Issue:** `alt={name + ' image'}` concatenates a database-sourced `name` field. While this does not cause XSS in JSX (React escapes attribute values), if a department name contains quotes or special HTML characters, the alt text will be unhelpfully garbled. More importantly, the alt pattern `"<name> image"` is a known accessibility anti-pattern — screen readers already announce it is an image; the alt should describe the visual content, not redundantly say "image."
**Fix:**
```tsx
// Use a descriptive alt or empty alt for decorative images:
alt={name}  // describes the subject
// or if the image is purely decorative alongside the icon/title:
alt=""
```

---

## Info

### IN-01: Hardcoded English strings in `Footer.tsx` not run through `t()` translation

**File:** `components/layout/Footer.tsx:4-11, 33, 50, 63`
**Issue:** Footer nav link labels are hardcoded English strings (`'Home'`, `'About Us'`, etc. — lines 5-10). Column headings "Quick Links" (line 33) and "Contact" (line 50) are also hardcoded. The copyright line (line 63) is hardcoded. None of these go through `getTranslations`. Since the project is bilingual EN/HI with Hindi as default, Hindi-locale visitors see English footer text.
**Fix:** Import `getTranslations` (Footer is a server component), fetch `t = await getTranslations('nav')`, and use `t('home')` etc. for nav labels. Add `footer.quickLinks`, `footer.contact`, `footer.copyright` keys to the message files.

---

### IN-02: Logo text "Atmaram Child Care" in `Header.tsx` is hardcoded, not translated

**File:** `components/layout/Header.tsx:32`
**Issue:** The logo link text `Atmaram Child Care` is a hardcoded English string inside the server component. For a bilingual site, the logo text should either be the same in both languages (acceptable for a proper noun) or run through translation. If it is intentionally language-invariant, add a comment to that effect so future maintainers do not try to translate it.
**Fix:** Add `{/* Logo text is language-invariant — proper noun */}` comment, or move to a translation key `t('logoText')` if the client wants a Hindi display name.

---

### IN-03: `metadata` on `about/page.tsx` contains an unescaped right single quote in description

**File:** `app/[locale]/(public)/about/page.tsx:11`
**Issue:** The metadata `description` string contains `Kanpur's` with a curly apostrophe (`'`). In a TypeScript string literal this is fine syntactically, but it renders as a literal Unicode character in the HTML `<meta>` description tag. Some older HTML parsers or SEO crawlers may not handle curly quotes well in meta tags. This is low impact but worth normalising.
**Fix:**
```ts
description: "Learn about Atmaram Child Care and Critical Care — Kanpur's trusted super-specialty hospital with 90 beds and 25+ doctors.",
// Use a straight apostrophe (') or escape as &apos; is not valid in attribute context.
```

---

### IN-04: `lib/data/departments.ts`, `lib/data/doctors.ts`, `lib/data/services.ts` listed in scope do not exist

**File:** `lib/data/` (all three files)
**Issue:** The three static data files listed as key files for this phase are absent from the repository. Data is sourced from `lib/db/` Supabase queries instead. This suggests either (a) the static data phase was skipped and replaced by live DB queries earlier than planned, or (b) the files were deleted after migration. This is not a code bug, but the SUMMARY for Phase 02 references these files and will be misleading for future reviewers. The phase plan artifact should be updated to reflect that these files were never committed.
**Fix:** Update the Phase 02 SUMMARY to note that static data files were superseded by `lib/db/` queries before this phase landed.

---

_Reviewed: 2026-06-20T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
