# Plan 13-05 Summary — Adoption proof + spacing

**Status:** Complete
**Requirements:** UI-01, UI-03, UI-04
**Executed:** 2026-06-14 (inline, sequential)

## What was built

Adopted the Wave-1 primitives to prove them and delivered the 8pt spacing deliverable.

### Task 1 — Homepage (UI-01 + UI-03)
- Unified the four content sections (Departments, Doctors, Facilities, Appointment CTA) to
  `py-16 md:py-24`, matching the Hero. Trust band kept at compact `py-8` (intentional accent strip).
  No custom spacing token introduced (D-08).
- Wrapped the trust-band grid in `<FadeIn>`; stats animate via `<CountUp>`: `90`, `25` (suffix `+`),
  `8`. `24x7` left static (non-numeric, A4).
- Page remains an async RSC — no `'use client'`; FadeIn/CountUp are nested client islands. Public
  site stays light (no theme logic added).

### Task 2 — EmptyState adoption (UI-04)
- All three portal content clients now render the shared `<EmptyState>` in their `length === 0`
  branch, replacing the inline `text-slate-*` blocks:
  - Departments → icon `Building2`, "No departments yet"
  - Doctors → icon `Stethoscope`, "No doctors yet"
  - Facilities → icon `Building`, "No facilities yet" (normalized copy)
- Body copy unified to "Add your first {entity} to display it on the public site."; action button
  preserved. Token classes make them dark-mode-correct automatically.

## Verification
- `npm run build` exits 0 ✓ (page stays RSC — no async-in-client error)
- `page.tsx` has no `'use client'` ✓
- `EmptyState` referenced in all 3 clients (2 each: import + render) ✓
- Stale `text-slate-700` empty-state markup removed from all 3 ✓

## End-of-phase manual checklist (for /gsd:verify-work)
| Check | How | Status |
|-------|-----|--------|
| Theme persists | Toggle dark in portal sidebar, navigate + reload | ⏳ manual |
| Public stays light | OS dark on → open any `[locale]` route | ⏳ manual |
| Dark accents meet AA | Contrast tool on portal dark surface | ✓ pre-verified (13-01) |
| Reduced-motion | OS reduce-motion on → homepage stats render static | ⏳ manual |
| EmptyState renders | Open a portal content page with empty list | ⏳ manual |

Build-level verification is green; the ⏳ items are runtime visual checks for the human UAT pass.
