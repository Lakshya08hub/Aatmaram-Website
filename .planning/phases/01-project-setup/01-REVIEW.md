---
phase: 1
phase_name: project-foundation
status: issues_found
review_depth: standard
files_reviewed: 14
files_reviewed_list:
  - next.config.ts
  - app/layout.tsx
  - app/globals.css
  - app/[locale]/layout.tsx
  - app/[locale]/(public)/layout.tsx
  - components/layout/Header.tsx
  - components/layout/Footer.tsx
  - components/ui/sonner.tsx
  - lib/utils.ts
  - messages/en.json
  - messages/hi.json
  - package.json
  - components.json
  - components/ui/button.tsx
findings:
  critical: 3
  warning: 2
  info: 2
  total: 7
---

# Phase 1: Code Review Report

**Reviewed:** 2026-06-20T00:00:00Z
**Depth:** standard
**Files Reviewed:** 14
**Status:** issues_found

## Summary

Foundation phase establishes Next.js 15 + next-intl + shadcn/ui + Tailwind v4. The i18n routing structure is correct and the shadcn components are standard generated code. Three critical issues exist: the `<html>` element has no `lang` attribute (accessibility and SEO failure), the Footer uses the wrong Link import breaking locale-prefixed navigation, and there are no HTTP security headers at all — a gap that matters for a hospital website handling patient appointment data. Two additional warnings address missing `setRequestLocale` in the locale layout and a suspicious `lucide-react` version string.

## Critical Issues

### CR-01: `<html>` element has no `lang` attribute — accessibility and SEO failure

**File:** `app/layout.tsx:15`
**Issue:** The root layout renders `<html suppressHydrationWarning>` with no `lang` attribute. The locale layout (`app/[locale]/layout.tsx`) returns a `<div>` wrapper, not an `<html>` element, so there is no other place where `lang` gets set. Screen readers and search engines require a correct `lang` attribute to identify the page language. For a bilingual hospital site (Hindi default) serving patients, this is an accessibility failure and damages SEO for Hindi content.
**Fix:**
```tsx
// app/layout.tsx — root layout must pass lang to html
// But in Next.js App Router the cleanest fix is to set lang in the locale layout:

// app/[locale]/layout.tsx — add generateMetadata or set lang via params
export default async function LocaleLayout({ children, params }) {
  const { locale } = await params;
  // ...existing validation...

  return (
    // Wrap with html + body here, and remove html/body from app/layout.tsx
    // OR use Next.js metadata API to set htmlProps:
    <NextIntlClientProvider messages={messages}>
      <div lang={locale} className={GeistSans.variable}>
        {children}
        <Toaster />
      </div>
      {/* GA4 block */}
    </NextIntlClientProvider>
  );
}
```
The correct long-term fix is to move `<html lang={locale}><body>` into the locale layout and make `app/layout.tsx` a shell that only renders `{children}` with no html/body tags (Next.js supports this). At minimum, `lang` must appear somewhere in the rendered HTML.

---

### CR-02: Footer uses raw `next/link` instead of locale-aware `Link` — navigation broken on non-default locale

**File:** `components/layout/Footer.tsx:1`
**Issue:** Footer imports `Link` from `'next/link'` (line 1), not from `'@/i18n/navigation'`. The Header correctly uses `import { Link } from '@/i18n/navigation'`. Because the default locale is Hindi (`hi`) and next-intl uses `[locale]` prefix routing, footer links like `/about` will resolve to the root path without a locale prefix. On the English locale (`/en/...`) clicking a footer link will drop the user back to the Hindi locale silently — a broken navigation experience for English users.
**Fix:**
```tsx
// components/layout/Footer.tsx — replace line 1
import { Link } from '@/i18n/navigation';
// Remove: import Link from 'next/link';
```

---

### CR-03: No HTTP security headers configured — hospital website handling appointment form data

**File:** `next.config.ts:6`
**Issue:** `nextConfig` has no `headers()` function. The site will serve with no `X-Frame-Options`, no `X-Content-Type-Options`, no `Referrer-Policy`, and no Content Security Policy. For a hospital website that collects patient names and phone numbers via the appointment form, and embeds a Gemini chat widget, the absence of security headers is a meaningful attack surface: clickjacking via iframe embedding, MIME-sniffing attacks, and lax referrer leaking patient query strings to GA4. HSTS should also be set once the domain is live.
**Fix:**
```ts
// next.config.ts
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
              "connect-src 'self' https://*.supabase.co https://generativelanguage.googleapis.com",
              "img-src 'self' data: https://*.supabase.co",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ];
  },
  // ...existing config
};
```

---

## Warnings

### WR-01: `setRequestLocale` not called in locale layout — static rendering may use wrong locale

**File:** `app/[locale]/layout.tsx`
**Issue:** The next-intl documentation requires `setRequestLocale(locale)` to be called in every layout/page that participates in static rendering (`generateStaticParams`). The public layout (`app/[locale]/(public)/layout.tsx:19`) calls it, but the parent locale layout does NOT. If any page or layout rendered under `app/[locale]/layout.tsx` calls `useTranslations` or `getTranslations` server-side before the public layout's `setRequestLocale` runs, it may read the wrong locale from the async context — particularly during static pre-rendering. The `getMessages()` call on line 22 of the locale layout is itself a locale-dependent call happening before `setRequestLocale` is called anywhere.
**Fix:**
```tsx
// app/[locale]/layout.tsx — add after locale validation
import { setRequestLocale } from 'next-intl/server';

// Inside the layout function, after locale validation:
setRequestLocale(locale);
const messages = await getMessages();
```

---

### WR-02: `lucide-react` pinned to `^1.17.0` — suspicious major version, likely a mistake

**File:** `package.json:22`
**Issue:** `lucide-react` is listed as `"^1.17.0"`. The package's published versions are in the `0.x` range (e.g., `0.469.0` as of early 2026). Version `1.17.0` does not exist on npm and `^1.17.0` will fail to resolve at install time or resolve to an unexpected package. This will break any deployment that runs `npm install` from scratch (CI, Vercel, new dev machines). The `sonner.tsx` and Header components both import from `lucide-react`.
**Fix:**
```json
// package.json — correct the version
"lucide-react": "^0.469.0"
```
Verify the correct latest version with `npm info lucide-react version` and pin accordingly.

---

## Info

### IN-01: `app/[locale]/layout.tsx` wraps content in `<div>` between `<html><body>` and locale content — unnecessary nesting

**File:** `app/[locale]/layout.tsx:31`
**Issue:** The locale layout renders `<div className={GeistSans.variable}>` as a wrapper. This creates an extra DOM node between `<body>` and the page content solely for attaching the CSS variable. While not a bug, if the `lang` fix in CR-01 moves `<html>/<body>` into this layout, the `GeistSans.variable` class should go on `<body>` directly rather than adding a wrapper div.
**Fix:** When refactoring for CR-01, apply `className={GeistSans.variable}` to the `<body>` element and remove the wrapping `<div>`.

---

### IN-02: Placeholder phone numbers in both `en.json` and `hi.json` — will go live with fake data

**File:** `messages/en.json:162`, `messages/hi.json:160`
**Issue:** Both translation files contain `"+91-XXXXXXXXXX (placeholder)"` as the phone number value. The Footer also hardcodes this placeholder directly (line 55 of Footer.tsx). These will render verbatim on the live site if not replaced before launch.
**Fix:** Track this as a pre-launch checklist item. Replace with the real phone number before go-live. Consider adding a build-time lint rule or grep in CI that fails the build if `XXXXXXXXXX` appears in message files.

---

_Reviewed: 2026-06-20T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
