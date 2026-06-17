# Phase 15: Public Site Engagement Overhaul - Research

**Researched:** 2026-06-17
**Domain:** Next.js App Router public site — DB-driven testimonials, homepage sections, language toggle UX, Framer Motion
**Confidence:** HIGH (all findings verified against actual codebase files)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Testimonials stored in a new `testimonials` DB table — not hardcoded in translation files.
- **D-02:** Fields: `patient_name`, `quote`, `designation` (nullable), `is_active` boolean, `sort_order` integer. No star ratings.
- **D-03:** Homepage layout: horizontal scroll card strip — 3 cards side-by-side on desktop, horizontal scroll on mobile. Reuses existing `Card` component. No auto-rotation JS.
- **D-04:** PM-JAY section placement: between trust band (Section 2) and departments preview (Section 3).
- **D-05:** PM-JAY content: 3 key facts — what PM-JAY is, who qualifies, CTA to /appointment. No document checklist.
- **D-06:** Mobile: add language toggle as FIRST item in existing `MobileNav` hamburger menu.
- **D-07:** Desktop: keep existing LanguageToggle position, restyle to white pill `bg-white text-blue-900 font-bold px-3 py-1 rounded-full` against navy header.
- **D-08:** Motion scope: homepage only. Inner pages stay static.
- **D-09:** Style: subtle 200ms fade-in. `prefers-reduced-motion` respected. Consistent with Phase 13 FadeIn defaults.
- **D-10:** Apply `FadeIn` to: new testimonials strip, PM-JAY explainer section, Section 6 appointment CTA band. `HoverLift` on testimonial cards.

### Claude's Discretion

- Exact copy for PM-JAY explainer (3 facts) — Claude may write, must be in both EN and HI files.
- Testimonials portal CRUD page design — follow Sheet + react-hook-form + Zod from departments/facilities.
- Testimonials section heading copy and visual treatment — follow established `SectionHeading` pattern.

### Deferred Ideas (OUT OF SCOPE)

- Full PM-JAY document checklist / dedicated `/services/ayushman-bharat` page.
- Motion on inner public pages (departments, doctors, services).
- Auto-rotating testimonial carousel.
- Floating language toggle button.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PUBUI-01 | DB-sourced testimonials strip on homepage with portal CRUD | DB module pattern from departments.ts; CRUD from DepartmentsClient.tsx; migration from CMS SQL |
| PUBUI-02 | PM-JAY explainer section (3 facts + CTA) between trust band and departments | Homepage section insertion point identified; i18n namespace pattern confirmed |
| PUBUI-03 | Bilingual language toggle prominent in mobile hamburger menu (first item) | MobileNav.tsx structure fully read; current first item is nav links list |
| PUBUI-04 | Desktop LanguageToggle restyled to white pill for contrast | Current nav variant classes identified; change is CSS-only in existing component |
| PUBUI-05 | Phase 13 FadeIn applied to new sections + Section 6 CTA band | fade-in.tsx and hover-lift.tsx props confirmed; Section 6 currently unwrapped |

Note: PUBUI-01 through PUBUI-05 are referenced in ROADMAP.md but not yet written into REQUIREMENTS.md. The planner must add these definitions to `.planning/REQUIREMENTS.md` as a Wave 0 task.
</phase_requirements>

---

## Summary

Phase 15 is a focused homepage enhancement with four independent work streams: (1) a new `testimonials` DB table + portal CRUD + homepage strip, (2) a PM-JAY explainer section inserted into the homepage, (3) language toggle UX improvements on mobile and desktop, and (4) Framer Motion wrappers on remaining unwrapped homepage sections. All patterns already exist in the codebase; this phase replicates them into new contexts rather than introducing new libraries or paradigms.

The entire codebase was read directly during research. Confidence is HIGH across all findings. No new npm packages are required — Framer Motion and all UI primitives are already installed. No external API integrations. The sole net-new external surface is one new Supabase table and its migration.

**Primary recommendation:** Build the four streams in dependency order — DB migration first (PUBUI-01 prerequisite), then DB module + server action + portal CRUD page, then homepage section insertion, then language toggle changes. Motion wrappers are the last and simplest step.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Testimonials data storage | Database (Supabase) | — | New `testimonials` table with RLS |
| Testimonials read (homepage) | Frontend Server (SSR) | — | Server Component data fetch in page.tsx |
| Testimonials CRUD (portal) | API / Backend (Server Actions) | Browser / Client (form) | requireCmsRole() gate; revalidatePath on write |
| PM-JAY section render | Frontend Server (SSR) | — | Static copy from i18n; no DB fetch needed |
| Language toggle (mobile) | Browser / Client | — | MobileNav is already a 'use client' component |
| Language toggle (desktop) | Browser / Client | — | LanguageToggle is already 'use client' |
| FadeIn / HoverLift | Browser / Client | — | Framer Motion client island wrapping SSR children |

---

## Standard Stack

### Core (already installed — no new packages)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| framer-motion | already in project | FadeIn / HoverLift primitives | Phase 13 decision; `fade-in.tsx` and `hover-lift.tsx` already exist |
| react-hook-form | already in project | Portal CRUD form | Already used in DepartmentsClient.tsx |
| @hookform/resolvers | already in project | zodResolver bridge | Already used in DepartmentsClient.tsx |
| zod | already in project | Form schema validation | Already used in DepartmentsClient.tsx |
| next-intl | already in project | i18n namespaces | Already used everywhere |
| @supabase/ssr | already in project | Supabase client | Already used in all DB modules |

### No New Packages Required

This phase installs zero new npm packages. All required libraries are already in the project.

## Package Legitimacy Audit

No new packages to audit — Phase 15 uses only libraries already present in the project.

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
Public visitor
    |
    v
app/[locale]/(public)/page.tsx  (Server Component)
    |-- Promise.all([
    |       getFeaturedDepartments(),
    |       getFeaturedDoctors(),
    |       getFeaturedFacilities(),
    |       getHospitalInfo(),
    |  +->  getActiveTestimonials()    <-- NEW
    |   ])
    |
    v
Renders sections in order:
  Section 1: Hero
  Section 2: Trust Band  <-- FadeIn already applied
  Section 2.5: PM-JAY Explainer  <-- NEW (FadeIn)
  Section 3: Departments
  Section 4: Doctors
  Section 5: Facilities
  Section 6: Testimonials Strip  <-- NEW (FadeIn, HoverLift on cards)
  Section 7: Appointment CTA Band  <-- FadeIn NEW (currently unwrapped)

Portal Admin
    |
    v
app/(portal)/content/testimonials/page.tsx  (Server Component)
    |-- getDepartments()-style fetch → TestimonialsClient (Client Component)
    |
TestimonialsClient.tsx
    |-- Dialog (add/edit) + AlertDialog (delete)
    |-- react-hook-form + zodResolver + zod schema
    |-- createTestimonialAction / updateTestimonialAction / deleteTestimonialAction
    |      |-- requireCmsRole() → adminClient.from('testimonials')
    |      |-- revalidatePath('/en') + revalidatePath('/hi')
    v
Supabase `testimonials` table (new migration)
```

### Recommended Project Structure

```
supabase/migrations/
└── 20260617_testimonials.sql     # new table + RLS + write policies

lib/db/
└── testimonials.ts               # getActiveTestimonials() — mirrors departments.ts

app/(portal)/
└── content/
    └── testimonials/
        ├── page.tsx              # Server Component: fetch + pass to client
        └── TestimonialsClient.tsx # Client Component: Dialog CRUD pattern

app/(portal)/actions/
└── content.ts                    # ADD: createTestimonialAction, updateTestimonialAction, deleteTestimonialAction, toggleTestimonialActive

app/[locale]/(public)/
└── page.tsx                      # MODIFY: add testimonials fetch + PM-JAY section + motion wrappers

components/public/
└── PMJAYExplainer.tsx            # new section component (or inline in page.tsx)

messages/
├── en.json                       # ADD: pmjay.* and testimonials.* namespaces
└── hi.json                       # ADD: same namespaces in Hindi
```

### Pattern 1: DB Module (lib/db/testimonials.ts)

Mirrors `lib/db/departments.ts` exactly. [VERIFIED: codebase read]

```typescript
// lib/db/testimonials.ts
import { createClient } from '@/lib/supabase/server';

export interface Testimonial {
  id: string;
  patient_name: string;
  quote: string;
  designation: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export async function getTestimonials(): Promise<Testimonial[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('testimonials')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return data as Testimonial[];
}

export async function getActiveTestimonials(): Promise<Testimonial[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('testimonials')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Testimonial[];
}
```

### Pattern 2: Supabase Migration (follows 20260612_cms_tables.sql + 20260613_patient_records.sql)

[VERIFIED: codebase read — both migration files read]

Key findings from existing migrations:
- `id uuid PRIMARY KEY DEFAULT gen_random_uuid()` — exact column definition
- `created_at timestamptz NOT NULL DEFAULT now()` — exact timestamp pattern
- `updated_at timestamptz NOT NULL DEFAULT now()` — initial value; trigger needed for auto-update
- The CMS migration (20260612) does NOT have an updated_at trigger — it relies on the app updating `updated_at` manually. The patient_records migration (20260613) adds a `moddatetime`-or-fallback trigger pattern.
- Decision: testimonials migration SHOULD include the trigger pattern from 20260613 since it's newer and more robust.
- RLS pattern: `ENABLE ROW LEVEL SECURITY` + `CREATE POLICY "testimonials: public read" ON testimonials FOR SELECT TO anon, authenticated USING (true)` + write policies for authenticated with role check.

```sql
-- supabase/migrations/20260617_testimonials.sql
CREATE TABLE testimonials (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_name text        NOT NULL,
  quote        text        NOT NULL,
  designation  text,
  is_active    boolean     NOT NULL DEFAULT true,
  sort_order   integer     NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "testimonials: public read"
  ON testimonials FOR SELECT
  TO anon, authenticated USING (true);

CREATE POLICY "testimonials: admin write"
  ON testimonials FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role IN ('super_admin', 'admin')
        AND profiles.is_active = true
    )
  );

-- Auto-update updated_at (pattern from 20260613_patient_records.sql)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'moddatetime') THEN
    EXECUTE $t$
      CREATE TRIGGER set_updated_at
        BEFORE UPDATE ON testimonials
        FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
    $t$;
  ELSE
    EXECUTE $t$
      CREATE OR REPLACE FUNCTION update_testimonials_updated_at()
        RETURNS TRIGGER AS $fn$
        BEGIN NEW.updated_at = now(); RETURN NEW; END;
        $fn$ LANGUAGE plpgsql;
    $t$;
    EXECUTE $t$
      CREATE TRIGGER set_updated_at
        BEFORE UPDATE ON testimonials
        FOR EACH ROW EXECUTE FUNCTION update_testimonials_updated_at();
    $t$;
  END IF;
END;
$$;
```

### Pattern 3: Server Actions (extends content.ts)

[VERIFIED: codebase read — content.ts lines 1-77 read]

The Server Actions file at `app/(portal)/actions/content.ts` exports per-table actions. New testimonials actions follow the identical shape:

```typescript
// Shape to add to content.ts
export async function createTestimonialAction(input: {
  patient_name: string;
  quote: string;
  designation?: string;
  is_active: boolean;
  sort_order: number;
}): Promise<{ error?: string }> {
  try {
    await requireCmsRole();  // already defined in content.ts
    const { error } = await createAdminClient().from('testimonials').insert({...input});
    if (error) throw new Error(error.message);
    revalidatePath('/en');
    revalidatePath('/hi');
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
```

Note: revalidate `/en` and `/hi` root paths (homepage) not `/en/testimonials` (no such page).

### Pattern 4: Portal CRUD Client (TestimonialsClient.tsx)

[VERIFIED: codebase read — DepartmentsClient.tsx fully read]

Simplification vs departments: testimonials do NOT need image upload or featured/order toggle in the table — `sort_order` is an editable number input in the Dialog form itself (like the inline input in departments, but moved into the form since there's no image workflow). The table shows: `patient_name`, `quote` (truncated), `designation`, `is_active` toggle, `sort_order`, Edit/Delete buttons.

Dialog uses `Dialog` + `DialogContent` (not Sheet — departments uses Dialog, confirmed). Zod schema:

```typescript
const testimonialSchema = z.object({
  patient_name: z.string().min(1).max(100),
  quote: z.string().min(1).max(600),
  designation: z.string().max(100).optional(),
  is_active: z.boolean(),
  sort_order: z.coerce.number().int().min(0).max(999),
});
```

### Pattern 5: Portal Content Layout Sub-nav

[VERIFIED: codebase read — app/(portal)/content/layout.tsx fully read]

The content sub-nav is defined as a `tabs` array in `app/(portal)/content/layout.tsx`. Adding Testimonials requires adding one entry:

```typescript
// In app/(portal)/content/layout.tsx, add to tabs array:
{ label: 'Testimonials', href: '/content/testimonials' },
```

The sidebar in `lib/portal/roles.ts` shows `content` as a single link to `/content` — no change needed there. The sub-tab nav in `content/layout.tsx` is what shows individual pages.

### Pattern 6: Homepage Section Insertion

[VERIFIED: codebase read — page.tsx fully read]

Current homepage section order:
- Section 1: Hero (lines 51–118)
- Section 2: Trust Signals Band (lines 120–146) — `FadeIn` ALREADY applied
- Section 3: Departments Preview (lines 148–166) — no FadeIn
- Section 4: Doctors Preview (lines 168–193) — no FadeIn
- Section 5: Facilities Preview (lines 195–213) — no FadeIn
- Section 6: Appointment CTA Band (lines 215–235) — no FadeIn

New section insertion per D-04:
- **PM-JAY Explainer** inserts BETWEEN Section 2 (trust band) and Section 3 (departments)
- **Testimonials Strip** inserts BEFORE Section 6 (appointment CTA) per CONTEXT.md canonical refs note ("between doctors and facilities" or "before appointment CTA")

Sections 3, 4, 5 do NOT get FadeIn per D-08/D-10 (homepage sections not yet wrapped; only the NEW sections + Section 6 CTA get wrapped). D-10 specifies: testimonials strip, PM-JAY explainer, Section 6 appointment CTA band.

Data fetch in `Promise.all` in page.tsx gets one new entry: `getActiveTestimonials()`.

### Pattern 7: MobileNav Language Toggle

[VERIFIED: codebase read — MobileNav.tsx fully read]

Current MobileNav structure:
1. `<ul>` containing `navLinks.map(...)` — Home, About Us, Departments, Our Doctors, Services, Contact
2. Footer `<div>` with `LanguageToggle` (variant="drawer") + Book Appointment button

Decision D-06: language toggle becomes the FIRST item in the hamburger menu. This means adding it ABOVE the `<ul>` of nav links, not inside the `<ul>`. The existing `LanguageToggle variant="drawer"` can be reused.

The current drawer variant of LanguageToggle shows `HI | EN` as two clickable spans — visually sufficient. No restyling of the drawer variant is required per D-06/D-07 (D-07 only specifies the desktop `nav` variant gets the white pill treatment).

The existing `LanguageToggle` at the bottom of the drawer (`<div className="p-4 border-t">`) can be removed or kept — decision is Claude's discretion, but removing the duplicate is cleaner.

### Pattern 8: LanguageToggle Desktop Restyle

[VERIFIED: codebase read — LanguageToggle.tsx fully read]

Current `nav` variant (desktop) classes — the active locale span:
```
text-white
```
The inactive locale span:
```
text-white/50 cursor-pointer hover:text-white/80 transition-colors
```
Separator: `text-white/30`

This renders as low-contrast text-only toggle against the navy header. D-07 decision: replace with white background pill. The implementation approach is to change the outer wrapper `<div>` and the span classes in the `nav` variant only. The `drawer` variant is unchanged.

New nav variant wrapper:
```tsx
<button
  onClick={handleSwitch}
  className="bg-white text-blue-900 font-bold px-3 py-1 rounded-full text-sm min-h-[44px] flex items-center"
  aria-label={ariaLabel}
>
  {locale === 'hi' ? 'HI' : 'EN'} | {locale === 'hi' ? 'EN' : 'HI'}
</button>
```

Note: The pill should be a single `<button>` element (not two separate clickable spans) — clicking it always switches to the other locale, same as current behavior. This simplifies the markup and is more accessible.

### Pattern 9: i18n Namespace Additions

[VERIFIED: codebase read — en.json and hi.json fully read]

Existing namespaces in en.json: `site`, `nav`, `common`, `home`, `about`, `departments`, `doctors`, `services`, `contact`, `appointment`.

New namespaces needed:
- `pmjay` — for the new PM-JAY explainer section
- `testimonials` — for the testimonials strip section heading

```json
// en.json additions
"pmjay": {
  "heading": "Ayushman Bharat PM-JAY — Free Treatment for Eligible Families",
  "fact1Heading": "What is PM-JAY?",
  "fact1Body": "Pradhan Mantri Jan Arogya Yojana provides cashless treatment up to ₹5 lakh per family per year at empanelled hospitals.",
  "fact2Heading": "Who Qualifies?",
  "fact2Body": "Families listed in SECC data, ration card holders, and those with annual income below ₹5 lakh are eligible.",
  "fact3Heading": "How to Avail?",
  "fact3Body": "Bring your Aadhaar card and ration card. Our team will verify your eligibility and arrange cashless treatment.",
  "cta": "Check Eligibility / Book Free Consultation"
},
"testimonials": {
  "heading": "What Our Patients Say",
  "subtitle": "Trusted by families across Kanpur and surrounding districts"
}
```

```json
// hi.json additions
"pmjay": {
  "heading": "Ayushman Bharat PM-JAY — पात्र परिवारों के लिए निःशुल्क उपचार",
  "fact1Heading": "PM-JAY क्या है?",
  "fact1Body": "प्रधानमंत्री जन आरोग्य योजना (PM-JAY) पात्र परिवारों को प्रति वर्ष ₹5 लाख तक का कैशलेस उपचार प्रदान करती है।",
  "fact2Heading": "कौन पात्र है?",
  "fact2Body": "SECC सूची में शामिल परिवार, राशन कार्ड धारक, और वार्षिक आय ₹5 लाख से कम वाले परिवार पात्र हैं।",
  "fact3Heading": "कैसे लाभ उठाएं?",
  "fact3Body": "आधार कार्ड और राशन कार्ड लेकर आएं। हमारी टीम आपकी पात्रता की जांच करेगी और कैशलेस उपचार की व्यवस्था करेगी।",
  "cta": "पात्रता जांचें / निःशुल्क परामर्श बुक करें"
},
"testimonials": {
  "heading": "हमारे मरीज़ क्या कहते हैं",
  "subtitle": "कानपुर और आसपास के जिलों के परिवारों का विश्वास"
}
```

### Anti-Patterns to Avoid

- **Don't hardcode testimonials in translation files:** D-01 decision — DB only. Translation files get only section headings, not quote content.
- **Don't use Sheet for testimonials portal CRUD:** DepartmentsClient uses `Dialog` (not Sheet despite CONTEXT.md saying "Sheet + react-hook-form" — the actual code uses `Dialog`). Planner note: CONTEXT.md wording is slightly imprecise; the actual UI primitive is `Dialog`/`DialogContent`.
- **Don't wrap Sections 3/4/5 in FadeIn:** D-10 scopes motion to new sections only + Section 6 CTA. Adding FadeIn to departments/doctors/facilities cards is deferred.
- **Don't add testimonials as a top-level sidebar nav item:** Testimonials lives under the `content` section as a sub-tab. Only the `content/layout.tsx` tabs array needs updating.
- **Don't fetch testimonials client-side:** Public pages fetch all data server-side in the page component (established pattern, confirmed in page.tsx).
- **Don't use two separate clickable spans for the desktop language toggle pill:** Convert to a single `<button>` that toggles locale — cleaner and more accessible.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form validation | Custom validation logic | `zod` + `zodResolver` | Already in project; used in DepartmentsClient |
| Optimistic UI feedback | Manual state sync | `toast` (sonner) + `router.refresh()` | Already in project; established pattern |
| Portal auth gate | Custom middleware | `requireCmsRole()` already in content.ts | Reuse — don't duplicate |
| Animation | CSS transitions | `FadeIn` / `HoverLift` from components/motion/ | Already built with `prefers-reduced-motion` support |
| DB query typing | Manual type casts | Typed interface + `as Type[]` pattern | Established in departments.ts |
| RLS write policies | Application-level checks only | Supabase RLS `USING` clause checking profiles.role | Defense in depth; matches existing pattern |

---

## Common Pitfalls

### Pitfall 1: Dialog vs Sheet Naming Confusion

**What goes wrong:** CONTEXT.md says "Sheet + react-hook-form + Zod" but the actual departments CRUD uses `Dialog`/`DialogContent`, not `Sheet`/`SheetContent`. Sheet is only used for the MobileNav hamburger drawer.
**Why it happens:** The describe-phase used "Sheet" generically to mean "slide-over panel" but the code uses shadcn's `Dialog` (modal).
**How to avoid:** Follow `DepartmentsClient.tsx` exactly — `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter`. Do not use `Sheet`.
**Warning signs:** Importing from `@/components/ui/sheet` in a portal CRUD context.

### Pitfall 2: revalidatePath Scope for Homepage

**What goes wrong:** Using `revalidatePath('/en/testimonials')` or `revalidatePath('/')` — neither exists or matches the homepage route.
**Why it happens:** The homepage is at `/en` and `/hi` (locale-prefixed root).
**How to avoid:** Call `revalidatePath('/en')` and `revalidatePath('/hi')` in testimonials server actions. The homepage is `app/[locale]/(public)/page.tsx`.
**Warning signs:** Changes in portal not reflecting on public site after save.

### Pitfall 3: MobileNav Language Toggle Position

**What goes wrong:** Adding the language toggle inside the `<ul>` nav links list as a `<li>` item — mixing nav links with the toggle breaks the visual and semantic structure.
**Why it happens:** The obvious placement is "inside the list" but the current structure separates content (`<ul>`) from footer controls (`<div className="p-4 border-t">`).
**How to avoid:** Add a dedicated language toggle section ABOVE the `<ul>` nav links (e.g., a `<div className="px-4 pb-2 pt-8">` wrapping `<LanguageToggle variant="drawer" />`). Optionally remove the duplicate from the bottom footer div.
**Warning signs:** Language toggle appearing between "Home" and "About Us" nav items.

### Pitfall 4: FadeIn `y: 16` vs D-09 "200ms fade-in, no translate/slide"

**What goes wrong:** The existing `FadeIn` component uses `initial={{ opacity: 0, y: 16 }}` (a slight upward translate on entry). D-09 says "no translate/slide" — this is a potential conflict.
**Why it happens:** D-09 describes the intent; the existing Phase 13 FadeIn has a subtle y-translate baked in. The trust band already uses this and it was accepted in Phase 13.
**How to avoid:** Use the existing `FadeIn` component as-is — it's consistent with the already-deployed trust band. The `y: 16` translate is 16px over 0.4s which reads as "fade-in" to users. Alternatively, if strict adherence to D-09 is required, pass a `delay` or override — but this would require a new prop. Recommendation: use existing FadeIn as-is for consistency.
**Warning signs:** Creating a new component called `FadeInOnly` or modifying the existing FadeIn.

### Pitfall 5: Testimonials `sort_order` — No Auto-Increment

**What goes wrong:** Two testimonials saved with the same `sort_order` value; ordering becomes non-deterministic.
**Why it happens:** Unlike `featured_order` in departments (managed via a dedicated toggle), testimonials sort_order is entered manually in the form.
**How to avoid:** Server action for `createTestimonialAction` should default `sort_order` to `(SELECT COALESCE(MAX(sort_order), 0) + 1 FROM testimonials)` or fetch current max + 1 before insert. The form shows the computed default, allowing the admin to change it.
**Warning signs:** Multiple testimonials showing at the same position.

### Pitfall 6: Updated_at Without Trigger in CMS Tables

**What goes wrong:** The earlier `departments`/`facilities` tables in `20260612_cms_tables.sql` do not have an `updated_at` trigger. If the new testimonials migration follows only that pattern, `updated_at` won't auto-update on edit.
**Why it happens:** The CMS migration predates the trigger pattern introduced in the patient records migration.
**How to avoid:** Include the moddatetime-or-fallback trigger block from `20260613_patient_records.sql` in the testimonials migration. [VERIFIED: both migrations read]

---

## Code Examples

### Homepage Section Integration

```tsx
// In app/[locale]/(public)/page.tsx

// Add to imports:
import { getActiveTestimonials } from '@/lib/db/testimonials';
import { HoverLift } from '@/components/motion/hover-lift';
import { Card, CardContent } from '@/components/ui/card';

// Add to Promise.all:
const [departments, doctors, facilities, info, testimonials] = await Promise.all([
  getFeaturedDepartments(),
  getFeaturedDoctors(),
  getFeaturedFacilities(),
  getHospitalInfo(),
  getActiveTestimonials(),   // NEW
]);

// Add translations:
const tPmjay = await getTranslations('pmjay');
const tTestimonials = await getTranslations('testimonials');
```

### FadeIn Already Applied (Trust Band — confirmed)

```tsx
// Section 2 — already wrapped (lines 123-144 of page.tsx):
<FadeIn className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
  {/* ... */}
</FadeIn>
```

### Section 6 CTA Band — Add FadeIn Wrapper

```tsx
// Section 6 — currently unwrapped. Wrap inner content:
<section className="bg-blue-50 py-16 md:py-24 px-4">
  <FadeIn>
    <div className="max-w-4xl mx-auto text-center">
      {/* existing content unchanged */}
    </div>
  </FadeIn>
</section>
```

### Testimonials Strip

```tsx
{/* Section 6 — Testimonials Strip (before Appointment CTA) */}
{testimonials.length > 0 && (
  <section className="py-16 md:py-24 px-4 bg-slate-50">
    <div className="max-w-7xl mx-auto">
      <SectionHeading
        title={tTestimonials('heading')}
        subtitle={tTestimonials('subtitle')}
      />
      <FadeIn>
        <div className="mt-8 flex gap-4 overflow-x-auto pb-4 md:grid md:grid-cols-3 md:overflow-visible">
          {testimonials.map((t) => (
            <HoverLift key={t.id} className="min-w-[280px] md:min-w-0">
              <Card className="h-full">
                <CardContent className="p-6">
                  <p className="text-slate-700 italic">&ldquo;{t.quote}&rdquo;</p>
                  <div className="mt-4">
                    <p className="font-semibold text-slate-900 text-sm">{t.patient_name}</p>
                    {t.designation && (
                      <p className="text-slate-500 text-xs mt-0.5">{t.designation}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </HoverLift>
          ))}
        </div>
      </FadeIn>
    </div>
  </section>
)}
```

### Desktop LanguageToggle Restyle (nav variant)

```tsx
// In LanguageToggle.tsx, replace the nav variant return:
// Current: two separate spans for active/inactive locale
// New: single pill button

if (variant === 'nav') {  // or the default case
  return (
    <button
      onClick={handleSwitch}
      className="bg-white text-blue-900 font-bold px-3 py-1 rounded-full text-sm min-h-[44px] flex items-center gap-1"
      aria-label={ariaLabel}
    >
      <span>{locale === 'hi' ? 'EN' : 'HI'}</span>
      <span className="opacity-50">|</span>
      <span>{locale === 'hi' ? 'HI' : 'EN'}</span>
    </button>
  );
}
```

Note: The active locale is shown second (on the right), inactive first — so clicking switches to the current right-side option. Alternatively, show active locale highlighted. Final UX is Claude's discretion.

### MobileNav Language Toggle First Item

```tsx
// In MobileNav.tsx, before the <ul> nav links:
<nav className="flex flex-col h-full">
  {/* Language toggle — first item per D-06 */}
  <div className="px-4 pt-6 pb-2 border-b border-slate-100">
    <LanguageToggle variant="drawer" />
  </div>
  <ul className="flex flex-col gap-1 p-4 flex-1">
    {navLinks.map((link) => ( ... ))}
  </ul>
  {/* Footer: Book Appointment only (remove duplicate LanguageToggle) */}
  <div className="p-4 border-t border-slate-100">
    <SheetClose render={<Link href="/appointment" ... />}>
      Book Appointment
    </SheetClose>
  </div>
</nav>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded testimonials in JSX | DB-sourced from `testimonials` table | Phase 15 | Admin can update without a deploy |
| Text-only language toggle (low contrast) | White pill button, high contrast | Phase 15 | Meets WCAG AA contrast on navy header |
| Language toggle buried in drawer footer | Language toggle as first item in mobile nav | Phase 15 | Prominent discovery for Hindi users |

**No deprecated patterns found** — all Phase 13/14 primitives are current and in active use.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | PM-JAY copy written by Claude (discretion area) — specific copy in Code Examples section is a proposal | i18n Namespace Additions | Low — copy is editable in translation files; no code risk |
| A2 | Testimonials strip renders conditionally (`testimonials.length > 0`) — hides section if DB is empty | Code Examples | Low — graceful degradation; confirmed as correct pattern |
| A3 | `sort_order` default should be `max + 1` computed in server action | Pitfall 5 | Medium — if omitted, all new testimonials default to 0 and ordering is by created_at |

---

## Open Questions

1. **Should Sections 3, 4, 5 (Departments, Doctors, Facilities) get FadeIn this phase?**
   - What we know: D-10 lists only "new testimonials strip, PM-JAY section, Section 6 CTA band"
   - What's unclear: Whether the planner should infer that these unwrapped sections are an oversight or intentionally excluded
   - Recommendation: Follow D-10 literally — only wrap what's specified. Note the others are still unwrapped as a follow-up opportunity.

2. **Testimonials strip: should it appear before or after Facilities (Section 5)?**
   - What we know: CONTEXT.md canonical refs say "Testimonials strip adds as Section 7 (before appointment CTA, or between doctors and facilities)"
   - Recommendation: Place between Facilities and Appointment CTA (i.e., after Section 5, before the renamed Section 7 CTA). This is the most natural social-proof position.

3. **PUBUI requirements missing from REQUIREMENTS.md**
   - What we know: ROADMAP.md references PUBUI-01 through PUBUI-05 but they don't exist in REQUIREMENTS.md
   - Recommendation: Wave 0 task to add PUBUI-01 to PUBUI-05 definitions to REQUIREMENTS.md

---

## Environment Availability

Step 2.6: SKIPPED — Phase 15 is code/config/DB-migration changes only. No new external CLI tools, runtimes, or services required. Supabase is already connected (used in all prior phases). No ffmpeg, Docker, or other infrastructure needed.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Not yet detected (no jest.config or vitest.config found in project) |
| Config file | None detected |
| Quick run command | N/A |
| Full suite command | N/A |

This project has no automated test infrastructure as of Phase 15 research. All validation is manual (visual inspection + portal interaction testing).

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PUBUI-01 | Testimonials appear on homepage from DB | manual | visit / in both locales | N/A |
| PUBUI-01 | Portal admin can add/edit/delete testimonials | manual | log in as admin, visit /content/testimonials | N/A |
| PUBUI-02 | PM-JAY section visible between trust band and departments | manual | visual inspection | N/A |
| PUBUI-03 | Language toggle is first item in mobile hamburger | manual | open mobile nav on small screen | N/A |
| PUBUI-04 | Desktop language toggle shows white pill | manual | visual inspection on navy header | N/A |
| PUBUI-05 | FadeIn on new sections; HoverLift on testimonial cards | manual | scroll homepage; hover cards | N/A |

### Wave 0 Gaps

- [ ] No test framework present — this is a known project-wide gap, not Phase 15-specific
- [ ] Consider adding Playwright smoke test for homepage section visibility in a future phase

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | yes | `requireCmsRole()` gates all write actions; content/layout.tsx role-guards portal routes |
| V5 Input Validation | yes | Zod schema on all testimonial form inputs; max lengths enforced |
| V6 Cryptography | no | — |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Unauthorized write to testimonials | Spoofing / Tampering | `requireCmsRole()` in server action + RLS policy on table |
| XSS via quote/patient_name content | Tampering | React JSX auto-escapes; no `dangerouslySetInnerHTML` |
| Unvalidated sort_order (e.g., negative INT) | Tampering | Zod `.int().min(0).max(999)` constraint |

---

## Sources

### Primary (HIGH confidence)
- `app/(portal)/content/departments/DepartmentsClient.tsx` — CRUD pattern, Dialog usage, form shape [VERIFIED: file read]
- `app/(portal)/actions/content.ts` — requireCmsRole pattern, server action shape [VERIFIED: file read]
- `app/(portal)/content/layout.tsx` — sub-nav tabs array pattern [VERIFIED: file read]
- `lib/db/departments.ts` — DB module pattern, typed interface, query shape [VERIFIED: file read]
- `lib/portal/roles.ts` — role definitions, ROLE_SECTIONS, sidebar nav [VERIFIED: file read]
- `components/portal/Sidebar.tsx` — sidebar rendering pattern [VERIFIED: file read]
- `components/motion/fade-in.tsx` — FadeIn props (children, className, delay) [VERIFIED: file read]
- `components/motion/hover-lift.tsx` — HoverLift props (children, className) [VERIFIED: file read]
- `components/layout/MobileNav.tsx` — current hamburger structure [VERIFIED: file read]
- `components/layout/LanguageToggle.tsx` — current nav/drawer variant classes [VERIFIED: file read]
- `app/[locale]/(public)/page.tsx` — homepage section order, data fetch pattern [VERIFIED: file read]
- `messages/en.json` — all existing namespaces and key naming convention [VERIFIED: file read]
- `supabase/migrations/20260612_cms_tables.sql` — migration conventions (uuid, timestamptz, RLS style) [VERIFIED: file read]
- `supabase/migrations/20260613_patient_records.sql` — updated_at trigger pattern [VERIFIED: file read]

### Secondary (MEDIUM confidence)
- None required — all findings verified from codebase.

### Tertiary (LOW confidence)
- None.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new packages; all libraries confirmed in codebase
- Architecture: HIGH — all patterns read directly from source files
- Pitfalls: HIGH — identified from direct code inspection, not speculation
- i18n copy: MEDIUM — Claude's discretion area; copy is proposable but client may revise

**Research date:** 2026-06-17
**Valid until:** 2026-07-17 (stable stack; codebase patterns won't drift in 30 days)
