# Phase 2: Public Website - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-10
**Phase:** 2-Public Website
**Areas discussed:** Color palette & visual tone, UI component approach, Placeholder content depth, Appointment form scope

---

## Color Palette & Visual Tone

**Question 1: Primary color tone**

| Option | Description | Selected |
|--------|-------------|----------|
| Medical Blue | Deep blue (#1E40AF), green accent (#16A34A), near-white bg, dark slate text. Clinical trust and professionalism. | ✓ |
| Healthcare Green | Green primary (#15803D), sky blue accent, green-tint bg. Natural, wellness-forward. | |
| Deep Teal | Teal primary (#0F766E), amber accent, modern feel. | |
| Navy + Saffron | Navy primary, saffron/orange accent. Distinctly Indian, warm. | |

**User's choice:** Medical Blue (recommended option)

---

**Question 2: Design finish**

| Option | Description | Selected |
|--------|-------------|----------|
| Clean & Minimal | White space, subtle shadows, rounded cards, no decorative elements. | ✓ |
| Rich & Warm | Gradients, photography backgrounds, warm overlays. | |
| Government/Institutional | Dense, formal, tabular. | |

**User's choice:** Clean & Minimal (recommended option)

---

## UI Component Approach

| Option | Description | Selected |
|--------|-------------|----------|
| shadcn/ui on top of Tailwind | Pre-built accessible components (Button, Card, Form, Badge, Toast, Sheet). Copy-paste model, components in `/components/ui/`. | ✓ |
| Pure Tailwind, no library | Build every component from scratch with Tailwind classes. Full control, more time. | |

**User's choice:** shadcn/ui (recommended option)

---

## Placeholder Content Depth

| Option | Description | Selected |
|--------|-------------|----------|
| Realistic seeded content | Real hospital name, address, actual specialty names, 6 realistic doctor cards, real phone placeholder. Site is previewable for client after Phase 2. | ✓ |
| Bare placeholders | 'Doctor Name', 'Department Desc', Lorem ipsum. Faster, clearly temporary. | |

**User's choice:** Realistic seeded content (recommended option)

---

## Appointment Form Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Toast only — no Supabase write | Client-side validation + success toast. No DB schema. Phase 7 creates appointments table. | ✓ |
| Write to Supabase now | Create appointments table in Phase 2. Less Phase 7 work, but premature schema decisions. | |

**User's choice:** Toast only (recommended option)

---

## Claude's Discretion

- SEO metadata per page (Next.js `metadata` export)
- Mobile-first layout (standard assumption for Kanpur patient demographic)
- Font choice (system sans-serif / Tailwind default)
- Image placeholders (solid-color div or initials for doctor avatars)
- Nav items (Home, About, Departments, Doctors, Services, Contact, Book Appointment CTA)

## Deferred Ideas

- Full Hindi content — Phase 3: Bilingual System
- Language toggle in header (functional) — Phase 3: Bilingual System
- All content editable from portal — Phase 5: Content Management
- Appointment form → Supabase write + portal view — Phase 7: Appointment Request System
- Real doctor photos, logo, hospital photography — awaiting client assets
