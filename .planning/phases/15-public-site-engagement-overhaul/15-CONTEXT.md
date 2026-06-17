# Phase 15: Public Site Engagement Overhaul - Context

**Gathered:** 2026-06-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the public-facing homepage visually compelling and trustworthy — a full-bleed hero (already wired in Phase 14), a testimonials strip with DB-sourced quotes, a PM-JAY explainer section, a prominent bilingual language toggle on mobile, and Phase 13 motion applied to homepage sections. No changes to inner public pages (departments, doctors, services).

</domain>

<decisions>
## Implementation Decisions

### Testimonials
- **D-01:** Testimonials are stored in a new `testimonials` DB table — not hardcoded in translation files or hospital_info. Admin can add/edit/remove quotes from the portal.
- **D-02:** Fields: `patient_name`, `quote`, `designation` (optional, e.g. "Father of patient, Kanpur"), `is_active` (boolean toggle), `sort_order` (integer). No star ratings — designation/city context reads as more credible than admin-set stars for Indian healthcare.
- **D-03:** Homepage layout: horizontal scroll card strip — 3 cards side-by-side on desktop, horizontal scroll on mobile. Reuses the existing `Card` component. No auto-rotation JS.

### PM-JAY Explainer
- **D-04:** Placement: a dedicated full-width section on the homepage, positioned between the trust band (Section 2) and the departments preview (Section 3).
- **D-05:** Content: 3 key facts — (1) what PM-JAY is (free treatment under Ayushman Bharat), (2) who qualifies (families under ₹5L income / ration card holders), (3) CTA — "Check eligibility / Book free consultation" linking to `/appointment`. No document checklist — that belongs in a future dedicated page.

### Language Toggle
- **D-06:** Mobile: add the language toggle as the first item in the existing `MobileNav` hamburger menu. No new layout element.
- **D-07:** Desktop: keep existing `LanguageToggle` component position in the header, but increase visual contrast — white background pill with bold `EN | हिं` text against the navy header. Modify the existing `LanguageToggle` component styling only.

### Motion
- **D-08:** Scope: homepage only. Inner pages (departments, doctors, services) stay static this phase.
- **D-09:** Style: subtle — 200ms fade-in, no translate/slide. Consistent with Phase 13 FadeIn defaults already in use on the homepage trust band. `prefers-reduced-motion` must be respected (Phase 13 contract).
- **D-10:** Apply `FadeIn` to: the new testimonials strip, the PM-JAY explainer section, and any homepage sections not yet wrapped (Section 6 appointment CTA band). `HoverLift` on testimonial cards.

### Claude's Discretion
- Exact copy for PM-JAY explainer (3 facts) — Claude may write this but must keep it in both EN and HI translation files.
- Testimonials portal CRUD page design — follow existing portal CRUD patterns (Sheet + react-hook-form + Zod, same as departments/facilities).
- Testimonials section heading copy and visual treatment — follow established `SectionHeading` pattern.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Homepage
- `app/[locale]/(public)/page.tsx` — Current 6-section homepage. New sections insert between Section 2 (trust band) and Section 3 (departments). Testimonials strip adds as Section 7 (before appointment CTA, or between doctors and facilities).

### Phase 13 Motion Primitives
- `components/motion/fade-in.tsx` — FadeIn component with `prefers-reduced-motion` support. Use for new sections.
- `components/motion/hover-lift.tsx` — HoverLift for card hover states. Apply to testimonial cards.
- `components/motion/count-up.tsx` — Already applied on trust band. No changes needed.

### Phase 14 Media (hero already wired)
- Hero image is already wired in `app/[locale]/(public)/page.tsx` via `hero_image_url` from `getHospitalInfo()`. No hero changes in Phase 15.

### Existing Portal CRUD Pattern (analog for testimonials portal page)
- `app/(portal)/content/departments/DepartmentsClient.tsx` — Sheet + react-hook-form + Zod CRUD pattern to replicate for testimonials.
- `app/(portal)/actions/content.ts` — Server Action shape to mirror for testimonials CRUD actions.
- `supabase/migrations/20260612_cms_tables.sql` — Existing migration style reference. New testimonials migration follows same conventions.

### Language Toggle
- `components/layout/LanguageToggle.tsx` — Existing component to restyle (contrast increase only).
- `components/layout/MobileNav.tsx` — Add language toggle as first item here.
- `components/layout/Header.tsx` — Desktop header; LanguageToggle already present. No structural changes.

### i18n
- `messages/en.json` and `messages/hi.json` — All new visible copy (PM-JAY explainer, testimonials section heading, hero copy changes) must be added to both files.
- `app/[locale]/(public)/layout.tsx` — Public layout wrapper (no changes needed).

### Requirements
- `PUBUI-01` through `PUBUI-05` in `.planning/REQUIREMENTS.md`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/ui/card.tsx` — Testimonial cards reuse this. No new component needed.
- `components/public/SectionHeading.tsx` — Use for testimonials section heading and PM-JAY section heading.
- `components/public/PMJAYBadge.tsx` — Keep as-is in hero. PM-JAY explainer section is a new, separate component.
- `components/motion/fade-in.tsx` + `hover-lift.tsx` — Apply to new homepage sections.

### Established Patterns
- All new portal CRUD (testimonials) follows the Sheet + react-hook-form + Zod pattern from departments/facilities.
- Server Actions follow `requireCmsRole()` → validate → Supabase write → `revalidatePath()` shape from `content.ts`.
- Public pages fetch all data server-side in the page component; no client-side fetching.
- next-intl: all copy goes through `getTranslations('namespace')`. New namespaces needed: `testimonials`, `pmjay`.

### Integration Points
- `app/[locale]/(public)/page.tsx` — Main integration point. Add testimonials fetch, PM-JAY section, and motion wrappers here.
- `lib/db/` — New `testimonials.ts` DB module (follows `departments.ts` pattern: typed interface, `getActiveTestimonials()` function).
- Portal nav (`app/(portal)/layout.tsx`) — Add "Testimonials" under the existing content section.

</code_context>

<specifics>
## Specific Ideas

- Testimonials designation examples: "Father of patient, Kanpur" / "Patient, Unnao" / "Mother of patient" — concise, local, credible.
- PM-JAY explainer: green accent color (matching PMJAYBadge `bg-green-600`) to visually tie back to the existing badge.
- Language toggle desktop restyle: white pill `bg-white text-blue-900 font-bold px-3 py-1 rounded-full` against the navy header — no new component, CSS only.

</specifics>

<deferred>
## Deferred Ideas

- Full PM-JAY document checklist / dedicated `/services/ayushman-bharat` page — future phase.
- Motion on inner public pages (departments, doctors, services) — explicitly deferred to avoid testing burden.
- Auto-rotating testimonial carousel — adds client-side JS complexity and accessibility concerns; deferred.
- Floating language toggle button — not needed given mobile hamburger menu solution.

</deferred>

---

*Phase: 15-public-site-engagement-overhaul*
*Context gathered: 2026-06-17*
