# Phase 3: Bilingual System - Context

**Gathered:** 2026-06-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Make every string on every public page available in both English and Hindi. Wire the language toggle in the header so it becomes functional. Ensure that a visitor's first-visit language is auto-detected from the browser's `Accept-Language` header and that their manual selection persists via cookie across pages and sessions.

This phase delivers: full `hi.json` translation file, functional `EN / HI` toggle in Header, Devanagari font fallback in CSS, and verification that `defaultLocale: 'hi'` + `localeDetection` work as expected.

**Not in scope:** Making translations editable from the portal (Phase 5), admin translation UI, or client-provided real Hindi content review (post-Phase 3 content pass).

</domain>

<decisions>
## Implementation Decisions

### Hindi Content Source
- **D-01:** Claude auto-translates all ~177 strings in `messages/hi.json` during execution. No client-provided content needed for Phase 3 to be "done". Translations are best-effort — client reviews and corrects via Phase 5 portal. The Phase 3 goal is a working bilingual site, not a final-copy Hindi site.

### Language Toggle UX
- **D-02:** The toggle in the header is a simple **text link — "EN / HI"** (e.g., clicking "HI" when on an English page switches to the same path in Hindi). No dropdown, no flags, no icons. Minimal and clean, matching the hospital site's design finish.
- **D-03:** Toggle behavior: clicking the inactive locale navigates to the same page in the other locale (e.g., `/en/about` → `/hi/about`). Uses `useRouter` + `usePathname` from `next-intl/navigation`. The `NEXT_LOCALE` cookie (set by `next-intl/middleware` automatically) persists the choice.

### Devanagari Font Rendering
- **D-04:** Use a CSS `font-family` fallback chain — Geist for Latin characters, `Noto Sans Devanagari` via system fonts as fallback. Zero package install. Add to `globals.css` `@theme inline` block and `font-sans` stack. No `@fontsource/noto-sans-devanagari` package needed.

### Claude's Discretion
- `proxy.ts` middleware behavior — `createMiddleware(routing)` already enables `localeDetection` by default (reads `Accept-Language`, sets `NEXT_LOCALE` cookie). No changes needed unless testing reveals it's off.
- Nav link migration — replace `next/link` in `Header.tsx` and `MobileNav.tsx` with `Link` from `next-intl/navigation` so links are locale-aware automatically.
- Translation quality strategy — translate naturally into Hindi (not literal word-for-word). Medical terms like "Ayushman Bharat", "PM-JAY", "ICU" stay in English. Use formal register (`आप`-form).
- Toggle placement — same slot as current EN/HI placeholder span (desktop header right side, mobile nav drawer).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Requirements
- `.planning/ROADMAP.md` §Phase 3 — Goal, I18N-01 to I18N-05, success criteria
- `.planning/REQUIREMENTS.md` I18N-01 to I18N-05 — Bilingual requirements

### Existing i18n Infrastructure
- `i18n/routing.ts` — `defineRouting({ locales: ['hi', 'en'], defaultLocale: 'hi', localePrefix: 'always' })` — routing config already wired; DO NOT change locales or defaultLocale
- `i18n/request.ts` — `getRequestConfig` with `requestLocale` — messages loaded per locale; no changes needed
- `proxy.ts` — `createMiddleware(routing)` — middleware for locale routing + auto-detection; verify localeDetection is active before adding code

### Translation Files
- `messages/en.json` — Source of truth for all translation keys (10 namespaces, ~177 strings) — read this to know every string that needs a Hindi equivalent
- `messages/hi.json` — Current state: only `site.title` and `site.tagline` translated; everything else is English placeholder — this file is the primary output of Phase 3

### Components to Modify
- `components/layout/Header.tsx` — EN/HI placeholder span at lines 49–55 (marked `TODO Phase 3`); nav links use plain `next/link` (marked `TODO Phase 3` at line 1)
- `components/layout/MobileNav.tsx` — Mobile nav; may also need locale-aware links

### Design System
- `app/globals.css` — `@theme inline` block where `--font-sans` is defined; add Devanagari fallback here

### Prior Phase Context
- `.planning/phases/02-public-website/02-CONTEXT.md` — Established design tokens, component patterns, and the note that language toggle slot was reserved in header

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `i18n/routing.ts` — Already configured correctly; re-export `Link`, `useRouter`, `usePathname`, `redirect` from `next-intl/navigation` with `routing` for locale-aware navigation throughout the app
- `proxy.ts` — Already wires middleware; likely needs no code changes for auto-detection
- `components/ui/button.tsx` + `buttonVariants()` — Available for toggle button styling if needed (though D-02 says plain text link)

### Established Patterns
- `localePrefix: 'always'` — Every public URL includes the locale segment; any hardcoded `/about` link breaks under this rule. Use locale-aware `Link` or prepend locale manually.
- `setRequestLocale(locale)` + `generateStaticParams()` — Every Server Component page already calls these; toggle component needs `'use client'` and `useLocale()` / `useRouter()`
- `await params` — Next.js 16 async params pattern already established in all pages
- Geist font via `GeistSans.variable` on `<html>` — font-family CSS variable already set; add Devanagari fallback to the stack in globals.css

### Integration Points
- `Header.tsx` line 49–55 — Replace static span with `<LanguageToggle />` client component
- `app/globals.css` `--font-sans` — Add `'Noto Sans Devanagari'` to the fallback chain
- `messages/hi.json` — Primary write target; must mirror the exact key structure of `en.json`

</code_context>

<specifics>
## Specific Ideas

- Toggle renders as: current locale is muted/inactive, other locale is a clickable link. Example when on English: `HI | EN` where EN is muted (current). When on Hindi: `HI | EN` where HI is muted.
- Hindi register: formal (`आप`-form), natural translation — not literal. Keep proper nouns in English: "Ayushman Bharat", "PM-JAY", "ICU", "OPD", "Atmaram Child Care and Critical Care".
- The `NEXT_LOCALE` cookie set by `createMiddleware` automatically persists preference — no custom cookie code needed. Manual test: visit site, toggle to EN, close browser, reopen — should land on EN.

</specifics>

<deferred>
## Deferred Ideas

- Admin-editable translations via portal UI — Phase 5 (Content Management): when content moves to Supabase, translation strings should be stored per-locale in the DB so admin can correct Claude's translations
- Client-provided final Hindi copy and review — post-Phase 3: once Phase 5 portal exists, client can review and correct all Hindi strings without a developer
- Right-to-left (RTL) layout support — not applicable (Hindi is LTR); no action needed

</deferred>

---

*Phase: 3-Bilingual System*
*Context gathered: 2026-06-11*
