# Phase 12: Homepage Content Curation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-14
**Phase:** 12-homepage-content-curation
**Areas discussed:** Featured schema, Portal curation UI, Department icons, Facilities section

---

## Featured Schema

| Option | Description | Selected |
|--------|-------------|----------|
| Column on existing tables | Add is_featured + featured_order directly to departments and doctors tables via migration | ✓ |
| Separate homepage_settings table | New table referencing department_id/doctor_id as featured entries | |

**User's choice:** Column on existing tables

---

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit featured_order | Admin controls display sequence via an integer column, ordered ASC | ✓ |
| Creation date order | Featured items display in creation order; no ordering UI needed | |

**User's choice:** Explicit featured_order

---

| Option | Description | Selected |
|--------|-------------|----------|
| Show all (fallback) | If none featured, show all active records — homepage never blank | ✓ |
| Show empty section | Section renders with 0 cards | |
| Hide section entirely | Section disappears if no featured items | |

**User's choice:** Show all as fallback

---

## Portal Curation UI

| Option | Description | Selected |
|--------|-------------|----------|
| Extend existing /content pages | Add Featured toggle + order field inline to existing department/doctor list tables | ✓ |
| New /content/homepage page | Dedicated curation page with featured slot management | |

**User's choice:** Extend existing /content pages

---

| Option | Description | Selected |
|--------|-------------|----------|
| Server Action on toggle click | Immediate update on switch toggle / input blur, no save button | ✓ |
| Save button per row | Form wrapper per row with explicit save | |

**User's choice:** Server Action on toggle click

---

| Option | Description | Selected |
|--------|-------------|----------|
| Inline number input | Small number input per row for featured_order, saved on blur | ✓ |
| Drag-to-reorder | Drag rows to reorder; needs @dnd-kit or similar library | |

**User's choice:** Inline number input

---

## Department Icons on Homepage

| Option | Description | Selected |
|--------|-------------|----------|
| Generic Building2 fallback | Same as /departments page; no schema change needed | ✓ |
| Store icon name in Supabase | Add icon_name text column; map to Lucide component in code | |
| Use image_url as thumbnail | 48px circle image with Building2 fallback | |

**User's choice:** Generic Building2 fallback

---

## Facilities Section

| Option | Description | Selected |
|--------|-------------|----------|
| Departments + doctors only | No facilities section on homepage in this phase | |
| Add featured facilities too | Extend scope: facilities table gets is_featured, homepage gets Facilities grid | ✓ |

**User's choice:** Add featured facilities too (scope extended)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Flat grid | Featured facility cards in a simple grid — same pattern as departments/doctors | ✓ |
| Grouped by category | OPD/ICU/Diagnostics headers with cards — more complex | |

**User's choice:** Flat grid

---

| Option | Description | Selected |
|--------|-------------|----------|
| After Doctors, before CTA | Departments → Doctors → Facilities → Book Appointment | ✓ |
| Between Departments and Doctors | Departments → Facilities → Doctors → CTA | |

**User's choice:** After Doctors, before Appointment CTA

---

## Claude's Discretion

None — all gray areas had explicit user choices.

## Deferred Ideas

None — discussion stayed within phase scope.
