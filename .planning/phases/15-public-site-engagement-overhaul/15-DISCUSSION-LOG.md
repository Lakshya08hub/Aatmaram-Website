# Phase 15: Public Site Engagement Overhaul - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-17
**Phase:** 15-public-site-engagement-overhaul
**Areas discussed:** Testimonials data source, PM-JAY explainer section, Language toggle prominence, Motion scope and page coverage

---

## Testimonials Data Source

| Option | Description | Selected |
|--------|-------------|----------|
| DB table + portal CRUD | Add a 'testimonials' table. Admin can add/edit/remove quotes from the portal. | ✓ |
| Hardcoded in translation files | 3-4 quotes baked into messages files. No DB. | |
| hospital_info fields | Add 3 testimonial text columns to the singleton. | |

**User's choice:** DB table + portal CRUD

---

## Testimonial Fields

| Option | Description | Selected |
|--------|-------------|----------|
| Name + quote + star rating (1-5) | Admin sets star rating explicitly. | |
| Name + quote only (always show 5 stars) | Simpler, stars are decorative. | |
| Name + quote + designation/city | No stars — shows context like "Father of patient, Kanpur". | ✓ |

**User's choice:** Claude's recommendation — Name + quote + designation/city (no stars). Designation reads as more credible than admin-controlled star ratings for Indian healthcare context.

---

## Testimonial Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Horizontal scroll card strip | 3 cards side by side on desktop, scroll on mobile. Reuses Card component. | ✓ |
| Single centered quote (auto-rotates) | One large quote, fades to next every 5 seconds. | |
| Full-width stacked quotes | 3 quotes stacked vertically in a dark band. | |

**User's choice:** Claude's recommendation — horizontal scroll card strip. Zero client-side JS, consistent with existing card components.

---

## PM-JAY Explainer Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated section on the homepage | Full-width section between trust band and departments. | ✓ |
| Separate /services/ayushman-bharat page | Deeper page with more detail; PMJAYBadge links to it. | |
| Expand PMJAYBadge into a modal | Clicking badge opens a dialog with the explainer. | |

**User's choice:** Dedicated section on the homepage

---

## PM-JAY Explainer Content

| Option | Description | Selected |
|--------|-------------|----------|
| 3 key facts + eligibility CTA | What it is, who qualifies, book free consultation CTA. | ✓ |
| Full scheme details + document checklist | Comprehensive guide with documents, steps, treatments. | |
| Simple badge upgrade with one sentence | Expand badge to add one sentence. | |

**User's choice:** Claude's recommendation — 3 key facts + eligibility CTA. Right depth for a homepage visitor.

---

## Language Toggle — Mobile

| Option | Description | Selected |
|--------|-------------|----------|
| First item in mobile hamburger menu | Add to MobileNav. Zero layout change. | ✓ |
| Persistent pill in mobile header bar | Small chip alongside hamburger icon at all times. | |
| Floating button (bottom-right) | Fixed globe icon floating over all content. | |

**User's choice:** First item in the mobile hamburger menu

---

## Language Toggle — Desktop

| Option | Description | Selected |
|--------|-------------|----------|
| Keep current style, increase contrast | White background pill, bold EN\|हिं, higher contrast. | ✓ |
| Globe icon + language name | Replace text with globe icon. | |
| Side-by-side flag + text buttons | Two distinct clickable buttons for EN and HI. | |

**User's choice:** Keep current style, increase contrast

---

## Motion — Page Coverage

| Option | Description | Selected |
|--------|-------------|----------|
| Homepage only | Complete homepage motion. Inner pages stay static. | ✓ |
| Homepage + section headings on inner pages | FadeIn on /departments, /doctors headings. | |
| All public pages fully animated | Every card and section gets motion. | |

**User's choice:** Homepage only

---

## Motion — Animation Style

| Option | Description | Selected |
|--------|-------------|----------|
| Subtle — 200ms fade-in, no translate | Consistent with Phase 13 FadeIn defaults. | ✓ |
| Moderate — 300ms fade + 16px slide-up | Cards slide up on viewport entry. | |
| Expressive — 400ms stagger + scale-up | Per-card stagger delays. | |

**User's choice:** Subtle — 200ms fade-in, no translate

---

## Claude's Discretion

- Testimonial fields and DB schema design — user deferred to Claude's recommendation
- Testimonial card layout — user deferred to Claude's recommendation  
- PM-JAY explainer content and fields — user deferred to Claude's recommendation
- Exact copy for PM-JAY explainer (3 facts in EN + HI)
- Testimonials portal CRUD page design
- Testimonials section heading copy

## Deferred Ideas

- Full PM-JAY document checklist / dedicated `/services/ayushman-bharat` page — future phase
- Motion on inner public pages — explicitly deferred
- Auto-rotating testimonial carousel — deferred (JS complexity + a11y concerns)
- Floating language toggle button — not needed given hamburger menu solution
