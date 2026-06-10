# Phase 3: Bilingual System - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-11
**Phase:** 3-Bilingual System
**Areas discussed:** Hindi content source, Language toggle UX, Devanagari font rendering

---

## Hindi Content Source

| Option | Description | Selected |
|--------|-------------|----------|
| Claude auto-translates | AI translates all ~177 strings inline during execution | ✓ |
| Client provides | Wait for client-provided Hindi copy before coding | |
| Hybrid | Claude translates, mark as "needs client review" | |

**User's choice:** Claude auto-translates everything into `hi.json`.
**Notes:** User clarified that translations are automatic but admin should be able to edit them (Phase 5 concern — when content moves to Supabase). Phase 3 is "done" when the site renders correctly in Hindi with AI translations; client refinement is a post-Phase 3 content pass.

---

## Language Toggle UX

| Option | Description | Selected |
|--------|-------------|----------|
| Text link — EN / HI | Simple text in header, switches locale on click | ✓ |
| Globe icon + language name | Small globe icon + language label | |
| Flag icons (IN / GB) | India/UK flags | |

**User's choice:** Simple text link "EN / HI".
**Notes:** Clean, minimal — matches hospital site design finish. Current locale shown as muted/inactive, other locale as a clickable link. Switching navigates to same page path in the other locale.

---

## Devanagari Font Rendering

| Option | Description | Selected |
|--------|-------------|----------|
| System Noto Sans Devanagari fallback | CSS font-family chain, zero install | ✓ |
| Add Noto Sans Devanagari package | @fontsource/noto-sans-devanagari or similar | |

**User's choice:** System fallback via CSS font-family chain.
**Notes:** Safe choice — avoids package install complexity and avoids network font loading issues (the team already hit Turbopack/Google Fonts network problems in Phase 2). System Noto Sans Devanagari is available on all modern devices.

---

## Claude's Discretion

- `proxy.ts` middleware — `localeDetection` is enabled by default in next-intl; no changes unless testing shows otherwise
- Nav link migration to `next-intl/navigation` Link — standard task, no user preference needed
- Translation register and quality — formal Hindi (`आप`-form), natural (not literal), medical/brand terms in English
- Toggle active/inactive visual state — current locale muted, other locale clickable

## Deferred Ideas

- Admin-editable translations via portal UI — Phase 5 (Content Management)
- Client final Hindi copy review — post-Phase 3 content pass once Phase 5 portal exists
