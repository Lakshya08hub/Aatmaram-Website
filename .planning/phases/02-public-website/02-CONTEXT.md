# Phase 2: Public Website - Context

**Gathered:** 2026-06-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Build all 7 public-facing pages (Home, About, Departments, Doctors, Services, Contact, Appointment Request) with a consistent design system and realistic seeded placeholder content. The Ayushman Bharat PM-JAY badge must be visible and prominent. All pages share a header, footer, and design system.

This phase establishes the visual identity and page scaffolding. Phase 3 adds full bilingual content; Phase 5 makes content CMS-driven from Supabase.

</domain>

<decisions>
## Implementation Decisions

### Color Palette & Visual Tone
- **D-01:** Primary color is Medical Blue (`#1E40AF`). Accent/secondary is PM-JAY green (`#16A34A`). Background near-white (`#F8FAFC`). Text dark slate (`#0F172A`).
- **D-02:** Design finish is Clean & Minimal — white space, subtle box shadows, rounded cards, no decorative elements or gradient sections. Looks like a modern private hospital.

### UI Component Approach
- **D-03:** Install **shadcn/ui** on top of Tailwind v4. Use its copy-paste components (Button, Card, Input, Form, Label, Badge, Toast, Sheet for mobile menu). Components live in `components/ui/` and are fully editable. Do not rebuild accessible primitives from scratch.

### Placeholder Content
- **D-04:** Use **realistic seeded content** — not Lorem ipsum. Seed with:
  - Hospital name: "Atmaram Child Care and Critical Care"
  - Tagline: "Kanpur's trusted super-specialty hospital"
  - Address: Naubasta / Kidwai Nagar, Kanpur-208021, Uttar Pradesh
  - Phone: `+91-XXXXXXXXXX` (placeholder until client provides real number)
  - Departments: Paediatrics & Neonatology, Paediatric Surgery, Critical Care & ICU, General Surgery, Orthopaedics, Obstetrics & Gynaecology, General Medicine, Emergency & Trauma
  - Doctors: ~6 placeholder cards with realistic structure (Dr. [Name], Specialization, placeholder avatar image)
  - Services: align with departments + 90-bed capacity, Ayushman Bharat empanelment
  - About: founding story placeholder, mission, hospital stats (90 beds, ~25-30 doctors)
- **D-05:** All content is hardcoded in Phase 2 (no Supabase reads for public content). Phase 5 will migrate all content to Supabase and replace hardcoded values.

### Appointment Request Form
- **D-06:** Form submits with **client-side validation only + success toast** — no Supabase write in Phase 2. Toast message: "Your appointment request has been received. Our team will call you shortly." Phase 7 creates the appointments table, Supabase write, and portal management workflow.
- **D-07:** Required form fields (matching what Phase 7 will persist): Patient name, Phone number, Preferred doctor (select from seeded list), Preferred date (date picker), Reason / chief complaint (textarea).

### Claude's Discretion
- Page-level SEO metadata (Next.js `metadata` export) per page — implement with sensible titles/descriptions; user did not specify.
- Mobile-first layout — standard practice; Kanpur patients are mobile users. Not discussed but assumed.
- Font choice — use system font stack or a single clean sans-serif (e.g., `font-sans` Tailwind default); no decorative fonts.
- Image placeholders — use `/api/placeholder` or a solid-color div with initials for doctor avatars; no external image service.
- Nav items in header — Home, About, Departments, Doctors, Services, Contact, Book Appointment (CTA button).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Specification
- `.planning/ROADMAP.md` §Phase 2 — Goal, requirements (PUB-01 to PUB-08), success criteria, 7 pages list
- `.planning/PROJECT.md` — Hospital context (name, address, specialties, scale, accreditation, constraints)
- `.planning/STATE.md` — Current position and decisions log

### Phase 1 Output (Existing Infrastructure)
- `app/[locale]/layout.tsx` — Locale layout; Header and Footer components must be added here
- `app/[locale]/(public)/page.tsx` — Current smoke-test homepage; will be replaced with real home page
- `i18n/routing.ts` — Locale routing config (`['hi', 'en']`, `defaultLocale: 'hi'`, `localePrefix: 'always'`)
- `i18n/request.ts` — `getRequestConfig` — `getTranslations()` / `useTranslations()` patterns for Phase 3 keys
- `messages/en.json`, `messages/hi.json` — Translation stubs; Phase 2 adds English keys Phase 3 will fill with Hindi
- `lib/supabase/server.ts` — Server Supabase client (not needed for Phase 2 static content, but available)
- `proxy.ts` — Next.js 16 middleware; matcher already excludes `/portal` and `/api`

### No external specs
No external ADRs or design documents — requirements fully captured in decisions above and ROADMAP.md.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app/[locale]/layout.tsx` — Wrap `{children}` with `<Header />` and `<Footer />` here. Currently bare `<NextIntlClientProvider>` wrapper.
- `lib/supabase/server.ts` — Available for Phase 7 form wiring; not needed in Phase 2.
- `getTranslations('site')` pattern from `page.tsx` — Establishes how to pull i18n keys; Phase 2 adds more namespaces to `messages/en.json`.

### Established Patterns
- **Server Components by default** — All public pages are Server Components (no `'use client'`). Appointment form is the exception — it needs client-side state for validation.
- **`await params`** — Next.js 16 pattern; any page with dynamic params must `await params`.
- **Tailwind v4 import** — `@import "tailwindcss"` in `globals.css`. No `tailwind.config.js` — all config via CSS or PostCSS. shadcn/ui setup must account for v4 syntax.
- **Locale prefix `always`** — All public routes are `/hi/about`, `/en/about` etc. No bare `/about` route.

### Integration Points
- Header language toggle connects to `[locale]` routing — Phase 3 scope, but header needs a placeholder slot for it.
- Appointment form in Phase 2 calls no API; Phase 7 will wire `POST /api/appointments`.
- The smoke-test Supabase div in current `page.tsx` must be removed when the real homepage is built.

</code_context>

<specifics>
## Specific Ideas

- **Ayushman Bharat PM-JAY badge** must be prominent on the homepage — likely in the hero section or a trust-signals band below the hero. The badge is government-issued; use its official logo (or a styled text badge if image is unavailable).
- **Realistic content preview list** from discussion:
  - Departments: Paediatrics & Neonatology, Paediatric Surgery, Critical Care & ICU, General Surgery, Orthopaedics, Obs & Gynaecology, General Medicine, Emergency & Trauma (8 departments)
  - Doctor cards: 6 cards — name placeholder, specialty, book appointment CTA
- **Toast message** for appointment form: "Your appointment request has been received. Our team will call you shortly."
- All content is English in Phase 2. Phase 3 adds Hindi. Translation keys should be structured so Phase 3 can replace values without restructuring.

</specifics>

<deferred>
## Deferred Ideas

- Full bilingual content (Hindi text) — Phase 3: Bilingual System
- Making all content editable from the portal — Phase 5: Content Management
- Appointment form → Supabase write — Phase 7: Appointment Request System
- Language toggle in header (functional) — Phase 3: Bilingual System
- Real doctor photos, logo, hospital photography — client content dependency; deferred until client provides assets

</deferred>

---

*Phase: 2-Public Website*
*Context gathered: 2026-06-10*
