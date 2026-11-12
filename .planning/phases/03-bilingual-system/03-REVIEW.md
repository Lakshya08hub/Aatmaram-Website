---
phase: 3
phase_name: bilingual-system
status: issues_found
review_depth: standard
files_reviewed: 9
files_reviewed_list:
  - i18n/navigation.ts
  - app/globals.css
  - messages/hi.json
  - components/layout/LanguageToggle.tsx
  - components/layout/Header.tsx
  - components/layout/MobileNav.tsx
  - app/[locale]/(public)/layout.tsx
  - app/[locale]/(public)/page.tsx
  - app/[locale]/(public)/about/page.tsx
findings:
  critical: 1
  warning: 4
  info: 3
  total: 8
---

# Phase 3: Bilingual System — Code Review Report

**Reviewed:** 2026-06-20T00:00:00Z
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found

## Summary

The bilingual infrastructure is structurally correct: `i18n/navigation.ts` exports from `createNavigation(routing)` using the right config, `Header.tsx` is a proper async server component using `getTranslations`, and all components use the locale-aware `Link` from `@/i18n/navigation` rather than `next/link`. No `dangerouslySetInnerHTML` usage was found. The `<span role="button">` pattern flagged in phase 15 is not present here — `LanguageToggle` uses native `<button>` elements throughout.

One critical issue: a placeholder phone number string is present in the production Hindi message file and will be visible to patients. Four warnings cover a missing `type="button"` on the nav-variant toggle button, a misplaced `aria-label` on a non-interactive `<div>`, a static English-only `metadata` export on the locale-routed home page, and a large block of duplicated JSX in the hero section. Three info items cover a redundant `generateStaticParams`, a dropped query string on locale switch, and an English value in the Hindi badge key.

---

## Critical Issues

### CR-01: Placeholder phone number exposed in production translation file

**File:** `messages/hi.json:161,168`
**Issue:** Both the general phone and emergency contact fields contain the literal placeholder string `"+91-XXXXXXXXXX (placeholder)"` and `"+91-XXXXXXXXXX"`. These strings are rendered directly on the public contact page. Any patient visiting the site will see them before real numbers are added — there is no runtime guard, fallback, or suppression. The contact page has no `if (value.includes('placeholder'))` guard.
**Fix:** Either replace with real numbers before shipping, or add an explicit `null`/empty value and guard the rendering in the contact page component so the field is simply omitted when unpopulated:
```json
"phone": {
  "heading": "फ़ोन",
  "value": ""
},
"emergency": {
  "heading": "24x7 आपातकाल",
  "value": ""
}
```
In the contact page component:
```tsx
{contact.phone.value && (
  <p>{contact.phone.value}</p>
)}
```

---

## Warnings

### WR-01: `LanguageToggle` nav variant button missing `type="button"`

**File:** `components/layout/LanguageToggle.tsx:55`
**Issue:** The nav-variant `<button>` element has no explicit `type` attribute. The HTML default for `<button>` inside a `<form>` is `type="submit"`. While this button is not currently inside a form, the drawer buttons on lines 27 and 41 already correctly carry `type="button"`. The nav-variant button does not. This is inconsistent and will cause an accidental form submission if the component is ever rendered inside a form context.
**Fix:**
```tsx
<button
  type="button"
  className="bg-white text-blue-900 font-bold px-3 py-1 rounded-full text-sm min-h-[44px] flex items-center gap-1"
  onClick={handleSwitch}
  aria-label={ariaLabel}
>
```

### WR-02: `aria-label` on non-interactive `<div>` in drawer variant is ignored by screen readers

**File:** `components/layout/LanguageToggle.tsx:20-23`
**Issue:** The drawer variant wraps everything in a `<div aria-label={ariaLabel}>`. `aria-label` is only meaningful on interactive elements or landmark/widget roles. Placed on a plain `<div>`, screen readers silently discard the attribute — the label is never announced. The individual `<button>` elements inside do carry their own `aria-label` values (lines 31, 42), so accessibility is partially salvaged, but the outer label serves no purpose and creates a false sense of coverage.
**Fix:** Remove `aria-label` from the outer `<div>`. The inner buttons already carry descriptive `aria-label` values:
```tsx
<div className="flex items-center justify-center gap-2 text-sm font-medium py-3 min-h-[44px]">
```

### WR-03: Home page `metadata` export is not locale-aware — always serves English metadata

**File:** `app/[locale]/(public)/page.tsx:29-33`
**Issue:** The static `metadata` export hardcodes an English title and description regardless of the active locale. Since the default locale is Hindi and the site is bilingual, search engines and browser tabs will always display English metadata even for Hindi-locale visitors. The `generateMetadata` async function pattern is the correct replacement for dynamic locale-based metadata in Next.js App Router.
**Fix:** Replace the static export with a locale-aware `generateMetadata` function:
```tsx
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'site' });
  return {
    title: t('title'),
    description: locale === 'hi'
      ? '90-बेड सुपर-स्पेशलिटी अस्पताल, Kanpur। बाल रोग, गहन चिकित्सा, शल्य चिकित्सा। Ayushman Bharat PM-JAY सूचीबद्ध।'
      : 'A 90-bed super-specialty hospital in Kanpur offering paediatrics, critical care, surgery and more. Ayushman Bharat PM-JAY empanelled.',
  };
}
```

### WR-04: Hero section inner JSX is duplicated verbatim across both branches of the `heroImageUrl` conditional

**File:** `app/[locale]/(public)/page.tsx:63-129`
**Issue:** The conditional `heroImageUrl && heroImageUrl.length > 0` renders two `<section>` elements whose only difference is the outer classname (`relative py-16 md:py-24 px-4 overflow-hidden` vs `bg-white py-16 md:py-24 px-4`). The entire inner tree — `<h1>`, `<p>`, `<PMJAYBadge />`, appointment `<Link>/<Button>`, secondary link — is copy-pasted line-for-line across both branches (lines 67-94 repeat on lines 99-128). Any future change to hero content requires editing two places; they will inevitably diverge.
**Fix:** Extract a shared variable for the section class and render the inner content once:
```tsx
const heroSectionClass = heroImageUrl && heroImageUrl.length > 0
  ? 'relative py-16 md:py-24 px-4 overflow-hidden'
  : 'bg-white py-16 md:py-24 px-4';

return (
  <main>
    <section className={heroSectionClass}>
      {heroImageUrl && heroImageUrl.length > 0 && (
        <>
          <Image src={heroImageUrl} alt="" fill sizes="100vw" className="object-cover object-center -z-10" priority />
          <div className="absolute inset-0 bg-white/70 -z-10" />
        </>
      )}
      <div className="relative max-w-4xl mx-auto text-center">
        {/* shared inner content once */}
      </div>
    </section>
    {/* ... */}
  </main>
);
```

---

## Info

### IN-01: `generateStaticParams` in `about/page.tsx` duplicates the layout-level export

**File:** `app/[locale]/(public)/about/page.tsx:14-16`
**Issue:** The parent `PublicLayout` at `app/[locale]/(public)/layout.tsx:7-9` already exports `generateStaticParams` for the same `routing.locales` array. Next.js App Router uses the nearest layout-level `generateStaticParams` for segment generation; having a duplicate in the page is redundant. If the two ever return different sets, the behavior is framework-defined and potentially confusing.
**Fix:** Remove `generateStaticParams` from `about/page.tsx`. The layout export is sufficient for all routes under `[locale]`.

### IN-02: Locale switch drops query string parameters from the current URL

**File:** `components/layout/LanguageToggle.tsx:13`
**Issue:** `router.push(pathname, { locale: otherLocale })` uses only `pathname` from `usePathname()`, which does not include the query string. On pages that use query parameters (e.g., the appointment form with pre-filled fields, or any future filter/search pages), switching locale silently discards all query params.
**Fix:** Use `useSearchParams()` to preserve the current query string:
```tsx
import { useSearchParams } from 'next/navigation';
// ...
const searchParams = useSearchParams();

function handleSwitch() {
  const query = searchParams.toString();
  router.push(query ? `${pathname}?${query}` : pathname, { locale: otherLocale });
}
```

### IN-03: `common.ayushmanBadge` in `hi.json` is an English string in the Hindi message file

**File:** `messages/hi.json:18`
**Issue:** The value `"Ayushman Bharat PM-JAY Empanelled"` is entirely in English. While this is likely intentional (PM-JAY is a proper scheme name best kept in its official English form), there is no comment or convention making this decision explicit. Future editors may flag it as an untranslated key.
**Fix:** If intentional, add a translator comment in source (next-intl supports no inline comments in JSON, so document this in a `TRANSLATION-NOTES.md` or team convention note). The key value may also be left as-is if the English brand name is the official designation — just ensure the decision is documented so it is not treated as an omission.

---

_Reviewed: 2026-06-20T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
