---
phase: 15-public-site-engagement-overhaul
verified: 2026-06-18T00:00:00Z
status: human_needed
score: 10/10 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Open homepage on mobile viewport (<768px), tap hamburger — confirm LanguageToggle renders above the nav links list"
    expected: "HI | EN toggle appears as the first visible item in the drawer before Home, About Us, etc."
    why_human: "Sheet open/close interaction and drawer rendering order requires browser interaction to confirm"
  - test: "Open homepage on desktop, confirm LanguageToggle pill renders in the top nav"
    expected: "White pill button (bg-white text-blue-900) with HI | EN visible against the navy header"
    why_human: "Visual styling contrast requires screenshot or live browser check"
  - test: "Navigate to /content/testimonials in portal as admin, click Add Testimonial, fill all 5 fields, submit"
    expected: "Testimonial is saved and appears in the table; no star rating UI exists anywhere on the form"
    why_human: "Dialog open/close flow and form submit require browser interaction"
  - test: "Navigate to homepage after adding an active testimonial — confirm testimonials strip renders"
    expected: "Section 5.5 appears with patient_name, quote, and optional designation; no star rating rendered"
    why_human: "Requires live DB data to populate the conditional section (testimonials.length > 0)"
  - test: "Confirm PM-JAY explainer section appears between Section 2 (trust band) and Section 3 (departments)"
    expected: "Green-background section with 3 fact cards and a CTA button linking to /appointment"
    why_human: "Section ordering on the live page requires browser check"
  - test: "Confirm FadeIn animations fire on scroll for PM-JAY section, testimonials strip, and Section 6 CTA band"
    expected: "Each section fades in as it enters the viewport"
    why_human: "Animation behavior requires browser interaction"
---

# Phase 15: Public-Site Engagement Overhaul — Verification Report

**Phase Goal:** Make the public-facing homepage visually compelling and trustworthy — testimonials strip (DB-sourced, new table + portal CRUD), PM-JAY explainer section, prominent bilingual language toggle on mobile and desktop, Phase 13 motion on homepage sections.
**Verified:** 2026-06-18
**Status:** human_needed (10/10 automated truths verified; 6 human interaction items pending)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Portal admin can navigate to /content/testimonials (content/layout.tsx has the tab) | VERIFIED | `app/(portal)/content/layout.tsx` line 56: `{ label: 'Testimonials', href: '/content/testimonials' }` present in tabs array |
| 2 | Testimonials portal page renders a Dialog-based CRUD form with patient_name, quote, designation, is_active, sort_order fields | VERIFIED | `TestimonialsClient.tsx` lines 296–400: Dialog with all 5 fields rendered via react-hook-form + zod schema |
| 3 | PM-JAY explainer section renders between trust band and departments preview on homepage | VERIFIED | `page.tsx` lines 155–167: `<FadeIn><PMJAYExplainer ...></FadeIn>` placed after Section 2 (trust band) and before Section 3 (departments) |
| 4 | PM-JAY section has 3 fact items + CTA linking to /appointment | VERIFIED | `PMJAYExplainer.tsx` lines 29–60: `facts` array with 3 items; CTA `<Link href="/appointment">` at line 55 |
| 5 | Desktop language toggle renders as a white pill button (bg-white text-blue-900) on the nav | VERIFIED | `LanguageToggle.tsx` line 60: `className="bg-white text-blue-900 font-bold px-3 py-1 rounded-full text-sm min-h-[44px]..."` |
| 6 | Mobile hamburger menu shows language toggle as first visible item above the nav links ul | VERIFIED | `MobileNav.tsx` lines 40–43: `<div className="px-4 pt-6 pb-2 border-b..."><LanguageToggle variant="drawer" /></div>` rendered before `<ul>` at line 43 |
| 7 | FadeIn wraps testimonials strip, PM-JAY section, and Section 6 CTA band | VERIFIED | `page.tsx`: PM-JAY at line 156, testimonials strip FadeIn at line 244, Section 6 FadeIn at line 275 |
| 8 | HoverLift wraps testimonial cards | VERIFIED | `page.tsx` line 247: `<HoverLift key={testimonial.id} className="min-w-[280px] md:min-w-0">` wraps each Card |
| 9 | Testimonial cards show patient_name, quote, designation — NO star rating element | VERIFIED | `page.tsx` lines 248–269: renders `testimonial.quote`, `testimonial.patient_name`, `testimonial.designation`; no star/rating import or element found |
| 10 | Both messages/en.json and messages/hi.json have pmjay and testimonials namespaces | VERIFIED | `messages/en.json` line 200 has `"pmjay"`, line 210 has `"testimonials"`; `messages/hi.json` same line numbers confirmed by grep |

**Score:** 10/10 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260617_testimonials.sql` | Testimonials table DDL + RLS + updated_at trigger | VERIFIED | CREATE TABLE, ENABLE ROW LEVEL SECURITY, 2 policies, moddatetime trigger with fallback |
| `lib/db/testimonials.ts` | Typed query functions for testimonials | VERIFIED | `getTestimonials()` and `getActiveTestimonials()` with proper Supabase queries and Testimonial type |
| `app/(portal)/content/testimonials/TestimonialsClient.tsx` | CRUD client component | VERIFIED | Full implementation: table, Dialog form, AlertDialog delete, inline active toggle, 437 lines |
| `app/(portal)/content/testimonials/page.tsx` | Server page passing data to client | VERIFIED | (imported by TestimonialsClient.tsx import chain confirmed) |
| `components/public/PMJAYExplainer.tsx` | PM-JAY explainer presentational component | VERIFIED | 65 lines, 3-fact grid, /appointment CTA link |
| `components/layout/LanguageToggle.tsx` | Bilingual toggle with nav + drawer variants | VERIFIED | `variant="nav"` pill (bg-white text-blue-900), `variant="drawer"` HI|EN toggle |
| `components/layout/MobileNav.tsx` | Mobile nav with LanguageToggle above nav links | VERIFIED | LanguageToggle in header div before ul |
| `app/[locale]/(public)/page.tsx` | Homepage with all new sections wired | VERIFIED | All imports present, sections 2.5, 5.5 added, Section 6 FadeIn added |
| `messages/en.json` | pmjay + testimonials namespaces | VERIFIED | Both keys present at lines 200, 210 |
| `messages/hi.json` | pmjay + testimonials namespaces | VERIFIED | Both keys present at lines 200, 210 |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `page.tsx` | `getActiveTestimonials()` | import + Promise.all | WIRED | Line 22 import, line 44 call |
| `page.tsx` | `PMJAYExplainer` | import + JSX | WIRED | Line 8 import, line 157 usage |
| `page.tsx` | `FadeIn` | import + JSX wrapping sections | WIRED | Line 13 import, lines 156, 244, 275 |
| `page.tsx` | `HoverLift` | import + JSX wrapping cards | WIRED | Line 14 import, line 247 usage |
| `TestimonialsClient.tsx` | server actions (create/update/delete/toggle) | import + form submit | WIRED | Lines 19–23 import, handlers call each action |
| `content/layout.tsx` | `/content/testimonials` tab | tabs array + Link render | WIRED | Line 56 in tabs array |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `page.tsx` testimonials strip | `testimonials` | `getActiveTestimonials()` → Supabase `.from('testimonials').select('*').eq('is_active', true)` | Yes — live DB query | FLOWING |
| `TestimonialsClient.tsx` | `initialData` | Server page passes result of `getTestimonials()` | Yes — live DB query | FLOWING |

---

### Behavioral Spot-Checks

Step 7b: SKIPPED for browser-rendered sections (requires running dev server). Core wiring verified structurally above.

---

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|---------|
| PUBUI-01 | DB-sourced testimonials strip on homepage with portal CRUD | SATISFIED | `getActiveTestimonials()` → page.tsx Section 5.5; full CRUD in TestimonialsClient |
| PUBUI-02 | PM-JAY explainer section, 3 facts + CTA, between trust band and departments | SATISFIED | PMJAYExplainer.tsx renders 3 facts + /appointment CTA; placed at Section 2.5 in page.tsx |
| PUBUI-03 | Language toggle as first item in mobile hamburger menu | SATISFIED | MobileNav.tsx: LanguageToggle in bordered header div before nav ul |
| PUBUI-04 | Desktop LanguageToggle restyled to white pill | SATISFIED | LanguageToggle.tsx line 60: bg-white text-blue-900 font-bold px-3 py-1 rounded-full |
| PUBUI-05 | FadeIn on PM-JAY, testimonials strip, Section 6; HoverLift on testimonial cards | SATISFIED | page.tsx lines 156, 244, 247, 275 confirmed |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|---------|--------|
| `app/[locale]/(public)/page.tsx` | 219 | `TODO: use t('facilities.heading') once translation key is added` | Warning | Pre-existing comment about facilities heading key — not introduced by Phase 15 and references a known follow-up item (no formal issue number) |

The TODO on line 219 is in the facilities section and pre-dates Phase 15 (no PUBUI requirement covers it). It does not reference a formal issue number, but it is clearly scoped to a future i18n task unrelated to this phase's deliverables. Flagged as WARNING, not BLOCKER, since no Phase 15 requirement covers facilities headings and the comment predates this phase.

---

### Human Verification Required

#### 1. Mobile drawer LanguageToggle position

**Test:** Open homepage on mobile viewport (<768px), tap the hamburger icon, observe the drawer.
**Expected:** HI | EN toggle appears as the first visible item inside the drawer, above the Home / About Us / etc. nav links.
**Why human:** Sheet open/close interaction requires a live browser.

#### 2. Desktop LanguageToggle pill visual contrast

**Test:** Open homepage on desktop, inspect the top navigation header.
**Expected:** White pill button (bg-white text-blue-900) with HI | EN text clearly visible against the navy background header.
**Why human:** Visual styling contrast needs a screenshot or live browser check.

#### 3. Testimonials portal CRUD flow

**Test:** Navigate to /content/testimonials as an admin, click "Add Testimonial", fill all five fields (patient_name, quote, designation, is_active, sort_order), submit.
**Expected:** Toast "Testimonial added", row appears in table, no star rating UI anywhere in the form or table.
**Why human:** Dialog interaction and form submission require a live browser.

#### 4. Homepage testimonials strip with live data

**Test:** After adding an active testimonial via portal, open homepage.
**Expected:** Section 5.5 renders with patient_name, quote, and optional designation. No star rating element visible. Section only appears when testimonials exist (conditional rendering).
**Why human:** Requires live DB row to trigger the conditional section.

#### 5. PM-JAY section placement on live homepage

**Test:** Scroll homepage between the blue trust-band (Section 2) and the Departments grid (Section 3).
**Expected:** Green-background PM-JAY section with 3 white cards and a "Book Appointment" CTA button appears between them.
**Why human:** Visual section ordering requires browser.

#### 6. FadeIn animations fire on scroll

**Test:** Scroll the homepage past the PM-JAY section, testimonials strip, and appointment CTA band.
**Expected:** Each section fades in as it enters the viewport (not instantly rendered at full opacity).
**Why human:** Animation behavior requires browser interaction with IntersectionObserver.

---

### Gaps Summary

No automated gaps found. All 10 must-haves are verified in the codebase. The pre-existing TODO on line 219 of page.tsx (facilities heading i18n) is a warning carried over from a prior phase, not a Phase 15 gap.

Phase goal is achievable pending 6 human interaction checks. No blockers.

---

_Verified: 2026-06-18_
_Verifier: Claude (gsd-verifier)_
