# Phase 3: Bilingual System - Research

**Researched:** 2026-06-11
**Domain:** next-intl v4 i18n, Devanagari typography, Hindi translation
**Confidence:** HIGH — all Priority 1 and Priority 2 findings verified directly from installed package source and type declarations

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Claude auto-translates all ~177 strings in `messages/hi.json`. No client content needed. Translations are best-effort — client reviews via Phase 5 portal.
- **D-02:** Toggle is a plain text link "EN / HI". Current locale is muted/inactive, other locale is clickable. No dropdown, no flags, no icons.
- **D-03:** Toggle uses `useRouter` + `usePathname` from `next-intl/navigation`. `NEXT_LOCALE` cookie set by middleware automatically.
- **D-04:** CSS font-family fallback chain — Geist → Noto Sans Devanagari → system-ui. Zero package install. Add to `globals.css` `@theme inline` block.

### Claude's Discretion
- `proxy.ts` middleware behavior — confirm `localeDetection` is on by default before adding code.
- Nav link migration — replace `next/link` in `Header.tsx` and `MobileNav.tsx` with locale-aware `Link`.
- Translation quality strategy — translate naturally, keep proper nouns in English.
- Toggle placement — same slot as current EN/HI placeholder span.

### Deferred Ideas (OUT OF SCOPE)
- Admin-editable translations via portal UI (Phase 5)
- Client-provided final Hindi copy and review (post-Phase 3)
- RTL layout support (not applicable — Hindi is LTR)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| I18N-01 | All public UI strings have EN and HI translations | hi.json key structure confirmed; all 10 namespaces, ~177 strings identified |
| I18N-02 | Visitor with Hindi browser preference sees Hindi immediately | localeDetection defaults to true; Accept-Language read by middleware automatically |
| I18N-03 | Language toggle in header switches locale and persists via cookie | createNavigation pattern confirmed; cookie auto-set by middleware on every response |
| I18N-04 | Every nav link works correctly in both locales | createNavigation Link component handles locale prefix automatically |
| I18N-05 | Devanagari script renders legibly on all modern devices | Nirmala UI (Windows), Noto Sans Devanagari (Android AOSP), Kohinoor Devanagari (iOS) all present as system fallbacks |
</phase_requirements>

---

## Summary

Phase 3 delivers a fully bilingual public website using next-intl v4.13.0 (already installed). The infrastructure is already in place: `i18n/routing.ts`, `i18n/request.ts`, and `proxy.ts` middleware are all correctly wired. No new packages are required — this phase is a pure code and content task.

The three deliverables are: (1) a `i18n/navigation.ts` navigation module created via `createNavigation(routing)`, which replaces all bare `next/link` usages in header and mobile nav; (2) a `LanguageToggle` client component that uses `usePathname` (locale-stripped) and `useRouter` from that module; and (3) the fully translated `messages/hi.json` file with 175 strings translated (2 already done).

Font rendering requires only a one-line change to `--font-sans` in `globals.css`. No Google Fonts CDN call, no `@fontsource` package. Every modern platform (Windows 11, Android 8+, iOS 9+) carries a Devanagari-capable system font that the browser uses when Geist fails on a Devanagari codepoint.

**Primary recommendation:** Create `i18n/navigation.ts` as the central navigation export module, use it everywhere nav links exist, and implement `LanguageToggle` as a `'use client'` component using `useLocale()` + `usePathname()` + `useRouter().push()` with a `locale` option.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Locale detection (first visit) | Middleware (Edge) | — | `createMiddleware` runs at Edge before any page renders; reads Accept-Language and NEXT_LOCALE cookie |
| Cookie persistence | Middleware (Edge) | Client (syncLocaleCookie) | Middleware sets cookie on every response; client router also updates it on navigation |
| URL locale prefix routing | Middleware (Edge) | — | `localePrefix: 'always'` enforced by middleware redirect |
| Translation string lookup | Server Component | Client Component | `useTranslations` works in both; prefer server for static content |
| Language toggle interaction | Client Component | — | Requires `useLocale()`, `useRouter()`, `usePathname()` — all client-only hooks |
| Nav link locale awareness | Shared | — | `Link` from `createNavigation` works in both server and client components |
| Devanagari rendering | Browser | — | Pure CSS font-family fallback; no JS or server involvement |

---

## Standard Stack

### Core (already installed — no new packages)

| Library | Version (installed) | Purpose | Why Standard |
|---------|---------------------|---------|--------------|
| next-intl | 4.13.0 | i18n routing, translation, navigation | Already wired; the canonical Next.js App Router i18n solution |
| use-intl | 4.13.0 | `useLocale`, `useTranslations` hooks | Peer dependency of next-intl; already present |

### No New Packages Required

This phase installs zero new packages. All required functionality is already in `node_modules`.

---

## Package Legitimacy Audit

No packages are installed in this phase. Section not applicable.

---

## Architecture Patterns

### System Architecture Diagram

```
Browser request
      |
      v
[proxy.ts middleware — Edge]
  1. Extract locale from URL pathname (/hi/about → locale = 'hi')
  2. If no match: check NEXT_LOCALE cookie (if localeDetection = true)
  3. If no cookie: check Accept-Language header (if localeDetection = true)
  4. If nothing: use defaultLocale ('hi')
  5. Redirect to locale-prefixed URL if needed
  6. Set NEXT_LOCALE cookie on response
      |
      v
[Next.js App Router]
  app/[locale]/layout.tsx
    → getMessages() loads messages/{locale}.json
    → NextIntlClientProvider passes messages to client tree
  app/[locale]/(public)/layout.tsx
    → setRequestLocale(locale)  ← marks locale for RSC tree
    → renders <Header />
        → Header uses Link from i18n/navigation.ts (locale-aware)
        → Header renders <LanguageToggle /> (client component)
  app/[locale]/(public)/page.tsx
    → setRequestLocale(locale)
    → useTranslations('home') reads from loaded messages
      |
      v
[LanguageToggle — Client Component]
  useLocale()        → current locale ('hi' or 'en')
  usePathname()      → current path WITHOUT locale prefix (e.g., '/about')
  useRouter().push() → navigates to same path in other locale
                      → syncLocaleCookie() updates NEXT_LOCALE cookie client-side
```

### Recommended Project Structure

```
i18n/
├── routing.ts        # EXISTING — defineRouting (do not modify)
├── request.ts        # EXISTING — getRequestConfig (do not modify)
└── navigation.ts     # NEW — createNavigation(routing) export

components/
└── layout/
    ├── Header.tsx        # MODIFY — replace next/link with navigation.ts Link
    ├── MobileNav.tsx     # MODIFY — replace next/link with navigation.ts Link
    └── LanguageToggle.tsx  # NEW — 'use client' toggle component

messages/
├── en.json           # EXISTING source of truth — do not modify keys
└── hi.json           # PRIMARY OUTPUT — translate all 175 remaining strings

app/
└── globals.css       # MODIFY — add Noto Sans Devanagari to --font-sans
```

### Pattern 1: Navigation Module (createNavigation)

**What:** A single file that calls `createNavigation(routing)` and re-exports all locale-aware navigation primitives. Every component in the app imports from this module instead of `next/link` or `next/navigation`.

**When to use:** Always — for all nav links on the public site.

```typescript
// i18n/navigation.ts
// Source: next-intl v4 type declarations (dist/types/navigation/react-client/createNavigation.d.ts)
// and official docs pattern at https://next-intl.dev/docs/routing/navigation
import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

export const { Link, useRouter, usePathname, redirect, permanentRedirect, getPathname } =
  createNavigation(routing);
```

This is the ONLY change needed to `i18n/` directory. Do not modify `routing.ts` or `request.ts`.

### Pattern 2: LanguageToggle Component

**What:** A `'use client'` component that renders the EN / HI text toggle. Current locale is visually muted; other locale is a clickable link.

**When to use:** Drop into `Header.tsx` at lines 49–55 (replacing the static `<span>`).

```typescript
// components/layout/LanguageToggle.tsx
// Source: verified from createNavigation.d.ts + syncLocaleCookie.js source
'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';

export function LanguageToggle() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname(); // returns path WITHOUT locale prefix, e.g. '/about'

  const otherLocale = locale === 'hi' ? 'en' : 'hi';

  function handleSwitch() {
    // router.push with locale option: navigates to same pathname in other locale
    // middleware will rewrite URL to /en/[pathname] or /hi/[pathname]
    // syncLocaleCookie() is called internally — NEXT_LOCALE cookie updated client-side
    router.push(pathname, { locale: otherLocale });
  }

  return (
    <div className="flex items-center gap-1 text-sm font-medium">
      <span
        className={locale === 'hi' ? 'text-white' : 'text-white/40 cursor-pointer hover:text-white/70'}
        onClick={locale !== 'hi' ? handleSwitch : undefined}
        role={locale !== 'hi' ? 'button' : undefined}
        tabIndex={locale !== 'hi' ? 0 : undefined}
      >
        HI
      </span>
      <span className="text-white/40">|</span>
      <span
        className={locale === 'en' ? 'text-white' : 'text-white/40 cursor-pointer hover:text-white/70'}
        onClick={locale !== 'en' ? handleSwitch : undefined}
        role={locale !== 'en' ? 'button' : undefined}
        tabIndex={locale !== 'en' ? 0 : undefined}
      >
        EN
      </span>
    </div>
  );
}
```

**Edge case — homepage:** When `pathname` is `/`, `router.push('/', { locale: 'en' })` navigates to `/en`. This is correct. `usePathname()` from `createNavigation` already strips `/hi` or `/en` prefix, verified in `useBasePathname.js` source.

**Edge case — nested paths:** `/hi/about` → `usePathname()` returns `/about` → `router.push('/about', { locale: 'en' })` → navigates to `/en/about`. Correct.

**Edge case — `onKeyDown` for accessibility:** Add `onKeyDown={(e) => e.key === 'Enter' && handleSwitch()}` to the span elements for keyboard accessibility, since spans are not natively focusable buttons.

### Pattern 3: Header Nav Link Migration

**What:** Replace `import Link from 'next/link'` with the locale-aware `Link` from `i18n/navigation.ts`. The locale-aware `Link` prepends the current locale automatically — no `href="/hi/about"` needed, just `href="/about"`.

```typescript
// components/layout/Header.tsx
// Source: createNavigation type signature — Link accepts string href (no locale prefix needed)
import { Link } from '@/i18n/navigation';  // replaces: import Link from 'next/link'

// Nav links can stay as-is:
const navLinks = [
  { label: 'nav.home',   href: '/' },
  { label: 'nav.about',  href: '/about' },
  // ...
];

// Logo link: use '/' (not '/hi') — Link prepends current locale automatically
<Link href="/" className="...">
  {t('site.title')}
</Link>
```

**Important:** Remove the hardcoded `href="/hi"` from the logo `Link` in `Header.tsx` line 25–30. Change to `href="/"`. The locale-aware `Link` handles prefix.

### Pattern 4: setRequestLocale — Confirmed API

**What:** Called in every Server Component page (and layout) to opt into static rendering support. Already used correctly in all existing pages.

```typescript
// Source: server/react-server/index.d.ts confirms export name
import { setRequestLocale } from 'next-intl/server';

// Usage (already in all pages — no change needed for existing pages)
export default async function SomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  // ...
}
```

`setRequestLocale` is the correct name in v4. It was previously `unstable_setRequestLocale` in v3 — the `unstable_` prefix was dropped. [VERIFIED: dist/types/server/react-server/index.d.ts]

### Pattern 5: Devanagari Font Fallback (globals.css)

**What:** One-line addition to the `--font-sans` CSS variable in the `@theme inline` block.

```css
/* app/globals.css — @theme inline block */
/* Source: existing globals.css line 9 + D-04 decision */
--font-sans: var(--font-geist-sans), 'Noto Sans Devanagari', 'Nirmala UI', system-ui;
```

**Why this order:**
- `var(--font-geist-sans)` — handles all Latin characters (already set by `GeistSans.variable` on `<html>`)
- `'Noto Sans Devanagari'` — Android AOSP built-in; matches Geist's clean sans-serif aesthetic
- `'Nirmala UI'` — Windows 11 default Devanagari font (preinstalled for all Hindi language users)
- `system-ui` — ultimate fallback (iOS uses Kohinoor Devanagari or Devanagari Sangam MN via system-ui)

The browser uses font-level Unicode range matching (per-character fallback), so Geist renders Latin glyphs and the next available font renders Devanagari codepoints. This is standard CSS behavior — no JavaScript involved.

### Anti-Patterns to Avoid

- **Bare `next/link` for locale pages:** Using `import Link from 'next/link'` for nav links breaks `localePrefix: 'always'`. Links like `href="/about"` resolve to `/about` instead of `/hi/about`. Use `Link` from `i18n/navigation.ts` exclusively.
- **Manual locale prefix in hrefs:** Writing `href={`/${locale}/about`}` is fragile. The navigation module handles this; never construct locale-prefixed URLs manually.
- **`useRouter` from `next/navigation`:** This is the plain Next.js router — it does not update the `NEXT_LOCALE` cookie. Always use `useRouter` from `i18n/navigation.ts` for locale-switching navigation.
- **`useLocale` from `use-intl` directly:** Technically works (next-intl re-exports it), but for consistency import from `next-intl`: `import { useLocale } from 'next-intl'`.
- **Putting `LanguageToggle` in a Server Component:** It requires `useLocale()`, `useRouter()`, `usePathname()` — all client hooks. It must be `'use client'`.
- **Calling `setRequestLocale` in Client Components:** It's a server-only API. Client components get locale from `useLocale()`.
- **Not calling `setRequestLocale` in layouts:** `PublicLayout` already calls it (verified at line 18 of `app/[locale]/(public)/layout.tsx`). This is required in both the layout AND each page for static rendering to work.
- **Modifying `localeDetection` in routing config:** It defaults to `true`. The existing config is correct — do not add `localeDetection: false`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cookie persistence across sessions | Custom `document.cookie` logic | `createMiddleware(routing)` | Middleware sets NEXT_LOCALE on every response automatically; `syncLocaleCookie` updates it on client navigation |
| Locale-prefixed URLs | String concatenation `/${locale}/${path}` | `Link` + `useRouter` from `createNavigation` | Handles `localePrefix: 'always'`, prefix stripping, edge cases with basePath |
| Accept-Language detection | Custom header parsing | `createMiddleware(routing)` | Uses `negotiator` + `@formatjs/intl-localematcher` with correct RFC 4647 matching |
| Stripping locale from pathname | `pathname.replace(/^\/hi|\/en/, '')` | `usePathname()` from `createNavigation` | Handles all prefix modes, localized pathnames, basePath |

**Key insight:** The entire locale detection → cookie persistence → URL rewriting → navigation loop is handled by next-intl's middleware + `createNavigation`. Any hand-rolled alternative will miss edge cases (basePath, custom prefix per locale, domain-based routing, SSG compatibility).

---

## Common Pitfalls

### Pitfall 1: Logo Link Hardcoded to `/hi`
**What goes wrong:** `Header.tsx` line 25 has `href="/hi"` — after migrating to locale-aware `Link`, this becomes `/hi/hi` (double locale prefix).
**Why it happens:** The link was hardcoded before locale-aware navigation was set up.
**How to avoid:** Change `href="/hi"` to `href="/"`. The locale-aware `Link` adds the prefix.
**Warning signs:** Logo click navigates to a 404 or wrong URL.

### Pitfall 2: Missing generateStaticParams in new pages
**What goes wrong:** New pages without `generateStaticParams()` fail to pre-render all locale variants during `next build`.
**Why it happens:** With `localePrefix: 'always'`, Next.js needs to know all possible `[locale]` values at build time.
**How to avoid:** Every page file must export `generateStaticParams() { return routing.locales.map(locale => ({ locale })); }`. This is already the pattern in all existing pages.
**Warning signs:** `next build` warning about missing static params; 404 on `/en/` pages in production.

### Pitfall 3: useTranslations Used Before setRequestLocale
**What goes wrong:** RSC rendering throws "Failed to call `setRequestLocale`" or returns wrong locale.
**Why it happens:** `setRequestLocale` must be called before any `useTranslations` / `getTranslations` in the render tree. In layouts, it must precede child rendering.
**How to avoid:** Call `setRequestLocale(locale)` as the FIRST statement in the component body, before any other next-intl API call. Already correctly done in all existing pages.
**Warning signs:** Server console error about locale not being set.

### Pitfall 4: hi.json Keys Out of Sync with en.json
**What goes wrong:** `useTranslations('nav')('home')` returns `undefined` or throws in Hindi locale because a key present in `en.json` is missing from `hi.json`.
**Why it happens:** If hi.json is edited without mirroring the full en.json key structure.
**How to avoid:** hi.json must be a structural mirror of en.json — same namespaces, same keys, only values differ. The easiest method: start with a copy of en.json and replace all English values with Hindi translations.
**Warning signs:** Blank strings or `[missing "hi.namespace.key"]` in the rendered UI.

### Pitfall 5: MobileNav Uses next/link — Sheet Stays Open After Navigation
**What goes wrong:** After replacing `next/link` with locale-aware `Link` in `MobileNav.tsx`, the `SheetClose` render prop pattern must still close the sheet on navigation.
**Why it happens:** The `render` prop on `SheetClose` passes a link element; the locale-aware `Link` should work identically since it wraps `next/link` internally.
**How to avoid:** Keep the `SheetClose` render pattern exactly as-is, just swap the imported `Link`. No structural change needed.
**Warning signs:** Mobile drawer stays open after clicking a nav link.

### Pitfall 6: Geist + Devanagari Ligature Gap on Windows
**What goes wrong:** On Windows 11 machines without the Hindi language pack, `Nirmala UI` may not be present, and Noto Sans Devanagari is not a Windows built-in. The browser falls through to `system-ui` which on Windows resolves to `Segoe UI` — which does cover Devanagari but is less legible than Nirmala UI.
**Why it happens:** Windows 11 made many script fonts optional/on-demand, installed only when the corresponding language is enabled.
**How to avoid:** The fallback chain is acceptable for v1. For production quality, consider adding Google Fonts CDN link for Noto Sans Devanagari as a `<link>` in `app/[locale]/layout.tsx` (no package install, just one HTML tag). This is not required by D-04 but is a valid future improvement.
**Warning signs:** Devanagari renders in Segoe UI (recognizable by slightly different letterform style) on Windows EN-US machines.

---

## Hindi Translation Glossary

All medical/UI terms for hi.json translation. Formal register (`आप`-form). Proper nouns stay in English.

### Terms That STAY in English (do not translate)
- Ayushman Bharat, PM-JAY, Pradhan Mantri Jan Arogya Yojana
- ICU (Intensive Care Unit)
- OPD (Outpatient Department)
- Atmaram Child Care and Critical Care (hospital name)
- Kanpur, Uttar Pradesh, Naubasta, Kidwai Nagar (place names)
- Dr. [Name] (doctor names)

### Key Translation Pairs (20-30 terms)

| English | Hindi | Notes |
|---------|-------|-------|
| Home | होम | Or "मुख्य पृष्ठ" but "होम" is common in web UI |
| About Us | हमारे बारे में | |
| Departments | विभाग | |
| Our Doctors | हमारे डॉक्टर | |
| Services | सेवाएं | |
| Contact | संपर्क | |
| Book Appointment | अपॉइंटमेंट बुक करें | |
| Request an Appointment | अपॉइंटमेंट अनुरोध करें | |
| Emergency | आपातकाल | Keep "24x7" as-is |
| Patient Care | रोगी देखभाल | |
| Our Facilities | हमारी सुविधाएं | |
| Critical Care | गहन चिकित्सा | |
| Paediatrics & Neonatology | बाल रोग एवं नवजात विज्ञान | |
| Paediatric Surgery | बाल शल्य चिकित्सा | |
| General Surgery | सामान्य शल्य चिकित्सा | |
| Orthopaedics | हड्डी रोग | |
| Obstetrics & Gynaecology | प्रसूति एवं स्त्री रोग | |
| General Medicine | सामान्य चिकित्सा | |
| Emergency & Trauma | आपातकाल एवं आघात | |
| Beds | बेड | (keep numeral, translate label) |
| Doctors | डॉक्टर | |
| Specialties | विशेषताएं | |
| Years of Service | सेवा के वर्ष | |
| Our Mission | हमारा मिशन | "मिशन" commonly used in Hindi |
| Patient Name | रोगी का नाम | |
| Phone Number | फ़ोन नंबर | |
| Preferred Date | पसंदीदा तिथि | |
| Submit Request | अनुरोध सबमिट करें | |
| Request Received | अनुरोध प्राप्त हुआ | |
| This field is required. | यह फ़ील्ड आवश्यक है। | |
| Address | पता | |
| Map loading... | मानचित्र लोड हो रहा है... | |

### Register Notes
- Use `आप`-form throughout (formal second person) — appropriate for a professional hospital addressing patients [ASSUMED — standard for formal Hindi web content, but not verified against a style guide]
- Use natural Hindi phrasing, not word-for-word literal translation
- Numbers (90, 25+, 8, 24x7) stay as numerals — Hindi uses same numeral glyphs in formal contexts
- "Compassionate Healthcare" → "करुणामय स्वास्थ्य सेवा" (already in hi.json — follow this register)

---

## Code Examples

### Confirmed: Locale Resolution Order (from middleware/resolveLocale.js source)

```
Request comes in
  1. URL pathname match → extract locale from /hi/... or /en/...
  2. NEXT_LOCALE cookie (only if localeDetection = true, which is the default)
  3. Accept-Language header (only if localeDetection = true)
  4. routing.defaultLocale ('hi')
```

This means: a user who manually toggles to EN will see EN on all subsequent visits (cookie persists). A brand-new user with Hindi browser language sees Hindi immediately. Both correct.

### Confirmed: NEXT_LOCALE Cookie Details (from routing/config.js source)

```javascript
// Default cookie config (from routing/config.js minified source):
localeCookie = {
  name: 'NEXT_LOCALE',
  sameSite: 'lax',
  // no maxAge set — session cookie by default
  // path: set to basePath at write time
}
```

The cookie is a **session cookie** (no `maxAge`) by default. It persists for the browser session, but is cleared when the browser closes if cookies are set to clear on exit. To make it truly persistent across browser restarts, the routing config would need `localeCookie: { maxAge: 31536000 }` (1 year). This is NOT required by D-03, but worth noting for the toggle persistence test.

**Test result expected:** Toggle to EN, close tab (not browser), reopen — lands on EN (cookie still present in session). Close browser entirely — behavior depends on browser "clear cookies on close" setting. This matches `NEXT_LOCALE` being a session cookie.

### Confirmed: usePathname Strips Locale (from useBasePathname.js source)

```typescript
// What usePathname returns (verified from source):
// URL: /hi/about → usePathname() returns '/about'
// URL: /en/      → usePathname() returns '/'
// URL: /hi/      → usePathname() returns '/'
// This is the path fragment to pass to router.push() for locale switch
```

### Confirmed: syncLocaleCookie on Client Navigation (from navigation/shared/syncLocaleCookie.js)

When `router.push(pathname, { locale: 'en' })` is called, `syncLocaleCookie` runs before navigation:
- Sets `NEXT_LOCALE=en` in `document.cookie` immediately
- Middleware will also set it on the next response
- Result: cookie is always consistent with displayed locale

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `createSharedPathnamesNavigation` | `createNavigation` | next-intl v4 | Unified API replacing separate shared/localized factories |
| `unstable_setRequestLocale` | `setRequestLocale` | next-intl v4 | Stable API; drop the `unstable_` prefix |
| Separate `Link`, `useRouter` exports from `next-intl/navigation` | All from `createNavigation(routing)` return value | next-intl v4 | Single factory pattern; type-safe with routing config |
| `localeDetection` in middleware options | `localeDetection` in `defineRouting` config | next-intl v3.22+ | Config unified in routing object |

**Deprecated/outdated:**
- `createSharedPathnamesNavigation`: removed in v4 — use `createNavigation`
- `createLocalizedPathnamesNavigation`: removed in v4 — use `createNavigation`
- `unstable_setRequestLocale`: renamed to `setRequestLocale` in v4

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Formal `आप`-form is appropriate register for Hindi hospital website | Hindi Translation Glossary | Low — widely accepted for professional Indian web content; worst case is slightly formal tone |
| A2 | NEXT_LOCALE session cookie persists across tab reopens within same browser session | Cookie Details section | Low — standard browser session cookie behavior; confirmed by syncCookie.js not setting maxAge |
| A3 | Windows 11 systems without Hindi language pack fall through to Segoe UI for Devanagari | Pitfall 6 | Low — Segoe UI does include Devanagari coverage; text will render, just with different aesthetics |

---

## Open Questions

1. **NEXT_LOCALE cookie persistence across browser restarts**
   - What we know: Default config sets no `maxAge` → session cookie cleared on browser close
   - What's unclear: Client expectation — should toggle persist after full browser restart?
   - Recommendation: Test during Phase 3 execution. If persistence across restarts is required, add `localeCookie: { maxAge: 60 * 60 * 24 * 365 }` to `defineRouting` in `routing.ts`. This is a one-liner change.

2. **`useTranslations` in Header (Server Component)**
   - What we know: `Header.tsx` is currently a Server Component; nav labels are hardcoded English strings
   - What's unclear: Whether nav labels should use `useTranslations` (dynamic) or be left as translation keys passed via props
   - Recommendation: Make `Header.tsx` use `getTranslations` (async) for nav labels as part of Phase 3. This requires converting nav labels to use `t('nav.home')` etc. — straightforward given `en.json` already has the `nav` namespace.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| next-intl | All i18n | ✓ | 4.13.0 | — |
| Node.js | Build | ✓ | 24.14.1 | — |
| next | Build/dev | ✓ | 16.2.9 | — |
| Noto Sans Devanagari | Font rendering | ✓ (Android/Chrome) | System | Nirmala UI (Windows) → system-ui (iOS) |
| Test framework (jest/vitest) | Automated tests | ✗ | — | Manual browser testing; no automated tests exist |

**Missing dependencies with no fallback:** None that block execution.

**Missing dependencies with fallback:**
- Test framework: No automated test runner. All i18n verification must be done via `npm run dev` + manual browser testing with DevTools locale override.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None installed — no jest, vitest, or playwright found in package.json |
| Config file | None |
| Quick run command | `npm run dev` + manual browser check |
| Full suite command | Manual test checklist (see below) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| I18N-01 | All strings translated in hi.json | manual | — | ❌ Wave 0 gap |
| I18N-02 | Hindi browser user sees Hindi on first visit | manual | — | — |
| I18N-03 | Toggle switches locale and cookie persists | manual | — | — |
| I18N-04 | Nav links work in both locales | manual | — | — |
| I18N-05 | Devanagari renders legibly | manual | — | — |

### Manual Test Protocol (substitute for automated tests)

1. **I18N-01:** Visit `/hi` in dev server — verify all visible strings are Hindi (not English placeholders)
2. **I18N-02:** In Chrome DevTools > Sensors > Locale, set to `hi-IN` → clear cookies → visit `/` → should redirect to `/hi`
3. **I18N-03:** Toggle to EN → close tab → reopen `localhost:3000` → should land on `/en`
4. **I18N-04:** On `/hi/about`, click EN toggle → should navigate to `/en/about` (not `/en/hi/about`)
5. **I18N-05:** On `/hi` — inspect Devanagari text for correct rendering; zoom to 200% to check legibility

### Sampling Rate

- **Per task commit:** Run `npm run dev`, visit `/hi` and `/en` manually
- **Per wave merge:** Full 5-step manual test protocol above
- **Phase gate:** Full protocol green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] No test framework exists — Phase 3 is verification by manual browser testing only. If automated i18n tests are desired in future, consider Playwright with `test.use({ locale: 'hi' })`.
- [ ] `messages/hi.json` is the primary artifact to verify completeness — a simple key-count diff script could be added if needed.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | n/a — no auth in this phase |
| V3 Session Management | No | n/a |
| V4 Access Control | No | n/a |
| V5 Input Validation | No | No user input in toggle — locale value is constrained to `['hi', 'en']` by routing config |
| V6 Cryptography | No | n/a |

**Security note:** The `NEXT_LOCALE` cookie is `SameSite: Lax` by default (verified from routing/config.js). It carries no sensitive data (just `'hi'` or `'en'`). No security concerns in this phase.

---

## Sources

### Primary (HIGH confidence — verified from installed package source)

- `node_modules/next-intl/dist/types/navigation/react-client/createNavigation.d.ts` — exact return type of `createNavigation`; confirmed `Link`, `useRouter`, `usePathname`, `redirect`, `getPathname`, `permanentRedirect`
- `node_modules/next-intl/dist/esm/production/routing/config.js` — confirmed `NEXT_LOCALE` as default cookie name, `sameSite: 'lax'`, `localeDetection: true` default
- `node_modules/next-intl/dist/esm/production/middleware/resolveLocale.js` — confirmed locale detection order: URL path → cookie → Accept-Language → defaultLocale
- `node_modules/next-intl/dist/esm/production/navigation/react-client/createNavigation.js` — confirmed `usePathname()` strips locale prefix via `useBasePathname`
- `node_modules/next-intl/dist/esm/production/navigation/shared/syncLocaleCookie.js` — confirmed client-side cookie sync on navigation
- `node_modules/next-intl/dist/types/server/react-server/index.d.ts` — confirmed `setRequestLocale` export name (not `unstable_setRequestLocale`)
- `app/[locale]/(public)/layout.tsx`, `page.tsx`, `about/page.tsx` — confirmed existing `setRequestLocale` + `generateStaticParams` patterns
- `node_modules/next-intl/dist/types/react-client/index.d.ts` — confirmed `useLocale` is re-exported from `next-intl` directly

### Secondary (MEDIUM confidence — official docs confirmed via WebSearch)

- [next-intl Navigation APIs docs](https://next-intl.dev/docs/routing/navigation) — `createNavigation` pattern and `usePathname` behavior
- [Microsoft Learn — Nirmala UI](https://learn.microsoft.com/en-us/typography/font-list/nirmala-ui) — Windows default Devanagari font
- [Android AOSP noto-fonts](https://android.googlesource.com/platform/external/noto-fonts/) — Noto Sans Devanagari bundled in AOSP

### Tertiary (LOW confidence — not independently verified)

- iOS Devanagari Sangam MN / Kohinoor Devanagari system font — confirmed present via developer.apple.com system fonts page reference but not deep-verified for specific iOS versions [ASSUMED for exact version coverage]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions confirmed from installed `node_modules/next-intl/package.json`
- Architecture: HIGH — confirmed from package source code, not documentation assumptions
- next-intl v4 API (createNavigation, setRequestLocale, cookie defaults): HIGH — read directly from dist/types and dist/esm source
- Pitfalls: HIGH — derived from code inspection (hardcoded `/hi` in Header.tsx confirmed at line 25)
- Hindi glossary: MEDIUM — based on standard Hindi medical terminology; formal register assumption is LOW
- Font coverage: MEDIUM — Windows confirmed via Microsoft docs; Android via AOSP repo; iOS MEDIUM

**Research date:** 2026-06-11
**Valid until:** 2026-07-11 (next-intl v4 is stable; unlikely to have breaking changes in 30 days)
