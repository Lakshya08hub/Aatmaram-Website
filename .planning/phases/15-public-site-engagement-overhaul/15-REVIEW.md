---
phase: 15
phase_name: public-site-engagement-overhaul
status: issues_found
review_depth: standard
files_reviewed: 9
files_reviewed_list:
  - app/(portal)/actions/content.ts
  - app/(portal)/content/layout.tsx
  - app/(portal)/content/testimonials/TestimonialsClient.tsx
  - app/(portal)/content/testimonials/page.tsx
  - app/[locale]/(public)/page.tsx
  - components/layout/LanguageToggle.tsx
  - components/layout/MobileNav.tsx
  - components/public/PMJAYExplainer.tsx
  - lib/db/testimonials.ts
findings:
  critical: 4
  warning: 6
  info: 4
  total: 14
---

# Phase 15: Code Review Report

**Reviewed:** 2026-06-19T00:00:00Z
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found

## Summary

Nine files were reviewed covering server actions, portal page guards, testimonials CRUD, the public homepage, layout components, and database helpers. The auth/role gating architecture is sound — `requireCmsRole()` is consistently called before any DB write, `redirect()` is used correctly, and the `createAdminClient` is only reached after auth. The main security gaps are: (1) no input sanitisation on free-text fields before DB insert, which allows XSS payloads to be stored and later rendered on the public homepage; (2) the public homepage propagates a thrown error from `getActiveTestimonials` as an unhandled server crash rather than a graceful fallback; (3) the portal page's auth path silently swallows a profile-query error without redirecting (missing `error` check). Accessibility issues exist in `LanguageToggle` (non-button interactive elements with only partial keyboard support), and there are several hardcoded English strings that bypass i18n.

---

## Critical Issues

### CR-001 — Stored XSS: unvalidated free-text fields written to DB via admin client

**Severity:** Critical
**File:** `app/(portal)/actions/content.ts:416-440` (createTestimonialAction) and updateTestimonialAction (442-472)
**Issue:** `patient_name`, `quote`, and `designation` are inserted directly into the `testimonials` table with no sanitisation. The values are later rendered on the public homepage (`app/[locale]/(public)/page.tsx:251-259`) inside JSX text nodes, which React escapes — so JSX itself is safe. However, if any other surface (server-side email, PDF export, raw DB read, future `dangerouslySetInnerHTML` usage) ever consumes these fields, stored XSS will fire. More critically, `designation` is optional and its value is trust-rendered — an admin or compromised admin account can store arbitrary Unicode / RTL overrides / zero-width characters that break layout and mislead users visually. The same pattern repeats for `department.name`, `department.description`, `doctor.bio`, and `facility.description` across the same file.

Additionally, `sort_order` is validated by Zod on the client form, but the server action accepts `sort_order: number` with no server-side range check. A direct HTTP call to the Server Action can pass `sort_order: 9999999` or `-1`.

**Fix:**
```ts
// In createTestimonialAction / updateTestimonialAction, add server-side validation:
import { z } from 'zod';

const testimonialInsertSchema = z.object({
  patient_name: z.string().min(1).max(100),
  quote: z.string().min(1).max(600),
  designation: z.string().max(100).optional(),
  is_active: z.boolean(),
  sort_order: z.number().int().min(0).max(999),
});

export async function createTestimonialAction(input: { ... }) {
  try {
    await requireCmsRole();
    const parsed = testimonialInsertSchema.parse(input); // throws ZodError on bad input
    const { error } = await createAdminClient().from('testimonials').insert(parsed);
    ...
  }
}
```
Apply equivalent schemas to all other create/update actions in this file.

---

### CR-002 — Unhandled thrown error crashes public homepage (no testimonials fallback)

**Severity:** Critical
**File:** `app/[locale]/(public)/page.tsx:39-45`
**Issue:** `getActiveTestimonials()` throws on Supabase error (see `lib/db/testimonials.ts:47-49`). It is called inside `Promise.all` with no try/catch:

```ts
const [departments, doctors, facilities, info, testimonials] = await Promise.all([
  getFeaturedDepartments(),
  getFeaturedDoctors(),
  getFeaturedFacilities(),
  getHospitalInfo(),
  getActiveTestimonials(),  // throws — kills the entire homepage render
]);
```

A transient Supabase error on the testimonials table will render the entire homepage as a 500 error page. Other data (departments, doctors, info) is lost too because `Promise.all` short-circuits on the first rejection.

**Fix:**
```ts
// Wrap individual fetches that can degrade gracefully:
const [departments, doctors, facilities, info, testimonials] = await Promise.all([
  getFeaturedDepartments().catch(() => []),
  getFeaturedDoctors().catch(() => []),
  getFeaturedFacilities().catch(() => []),
  getHospitalInfo().catch(() => null),
  getActiveTestimonials().catch(() => []),
]);
```

---

### CR-003 — Portal page silently ignores profile query error — role bypass possible

**Severity:** Critical
**File:** `app/(portal)/content/testimonials/page.tsx:16-23`
**Issue:** The profile fetch result is destructured without checking `error`:

```ts
const { data: profile } = await supabase
  .from('profiles')
  .select('role')
  .eq('user_id', user.id)
  .single();

if (!profile || !canAccessSection(profile.role as StaffRole, 'content')) {
  redirect('/dashboard');
}
```

If the DB query returns an error (network blip, RLS policy failure), `data` will be `null` and `error` will be set. The guard correctly catches `!profile` and redirects — so in this specific case the failure mode is safe (denies access). However, the pattern is fragile and inconsistent with `content/layout.tsx` which correctly checks `if (error || !profile)`. If a future developer copies this pattern and the error case produces partial data instead of null, the role check will silently pass with an undefined role that `canAccessSection` might mishandle.

More concretely: the redirect target is `/dashboard` (relative), while `layout.tsx` redirects to `/login`. An authenticated user with a DB error will land on `/dashboard` (still inside the portal), not logged out. This is inconsistent with the security intent.

**Fix:**
```ts
const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('role')
  .eq('user_id', user.id)
  .single();

if (profileError || !profile || !canAccessSection(profile.role as StaffRole, 'content')) {
  redirect('/portal/dashboard');
}
```

---

### CR-004 — `setFeaturedOrder` silently swallows invalid input (returns `{}` instead of error)

**Severity:** Critical
**File:** `app/(portal)/actions/content.ts:374`
**Issue:**
```ts
if (isNaN(order) || order < 0) return {};
```
When `order` is invalid, the action returns a success response (`{}`). The caller has no way to distinguish "order was set" from "order was silently ignored." A staff member who accidentally types a negative number sees no error — the DB is not updated, but the UI shows success. This is a silent data-integrity failure that will confuse users and is difficult to debug in production.

**Fix:**
```ts
if (isNaN(order) || order < 0) {
  return { error: 'Order must be a non-negative integer' };
}
```

---

## Warnings

### WR-001 — Hardcoded English string bypasses i18n on the public homepage

**Severity:** Warning
**File:** `app/[locale]/(public)/page.tsx:221-223`
**Issue:**
```tsx
{/* TODO: use t('facilities.heading') once translation key is added to messages files */}
<SectionHeading title="Our Facilities" />
```
The Facilities section heading is hardcoded in English. Hindi users see "Our Facilities" instead of the translated equivalent. The TODO comment acknowledges this but it was shipped in this state. This is a deliverable defect for a bilingual hospital site.

**Fix:** Add the translation key to both `messages/en.json` and `messages/hi.json`, then replace the hardcoded string:
```tsx
<SectionHeading title={t('sections.facilities')} />
```

---

### WR-002 — MobileNav nav links are hardcoded in English — not translated

**Severity:** Warning
**File:** `components/layout/MobileNav.tsx:15-22`
**Issue:**
```ts
const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'About Us', href: '/about' },
  ...
  { label: 'Book Appointment', ... },
];
```
All navigation labels and the "Book Appointment" CTA at line 71 are hardcoded English strings. On a Hindi-locale page, the mobile drawer shows English labels. The desktop nav likely has the same issue (not in scope here) but this file is confirmed to be hardcoded.

**Fix:** Use `useTranslations('nav')` (or equivalent) inside the component and replace string literals with `t('home')`, `t('about')`, etc. Since the component is `'use client'`, `useTranslations` is available.

---

### WR-003 — `LanguageToggle` drawer variant: interactive `<span>` not a true button

**Severity:** Warning
**File:** `components/layout/LanguageToggle.tsx:22-53`
**Issue:** The drawer variant renders clickable `<span>` elements with `role="button"` and `tabIndex={0}`, but the `onKeyDown` handler only handles `Enter` — not `Space`, which is also required by ARIA spec for `role="button"`. Assistive technology users pressing Space on these controls will not trigger the language switch.

Additionally, the wrapping `<div>` at line 21 also has `aria-label` set, creating a confusing landmark — the `aria-label` belongs on the interactive child, not the container.

**Fix:**
```tsx
// Replace <span role="button"> with actual <button>:
<button
  type="button"
  className="text-slate-400 cursor-pointer hover:text-slate-600 transition-colors"
  onClick={handleSwitch}
  aria-label="हिंदी में देखें"
>
  HI
</button>
```
Remove `aria-label` from the wrapping `<div>`.

---

### WR-004 — `updateDepartmentAction` and `updateDoctorAction` spread unchecked `Partial<>` input into DB update

**Severity:** Warning
**File:** `app/(portal)/actions/content.ts:85-89`, `175-178`
**Issue:**
```ts
const { error } = await createAdminClient()
  .from('departments')
  .update({ ...input, updated_at: new Date().toISOString() })
  .eq('id', id);
```
`input` is typed as `Partial<{...}>` but there is no server-side validation that the provided fields are non-empty strings. An empty `name: ""` or `description: ""` will be persisted to the DB since Zod validation only exists client-side. A direct HTTP call to the Server Action can bypass the form and send empty strings.

**Fix:** Add server-side Zod validation for the partial update payloads, similar to the recommendation in CR-001.

---

### WR-005 — `getTestimonials` uses `select('*')` — over-fetches and exposes all columns

**Severity:** Warning
**File:** `lib/db/testimonials.ts:26-29`
**Issue:** Both `getTestimonials()` and `getActiveTestimonials()` use `select('*')`. If future migrations add columns to the `testimonials` table (e.g., internal notes, IP address, reviewer metadata), they will be silently fetched and held in server memory. For the public homepage case (`getActiveTestimonials`), this is a minor data-hygiene issue since testimonials are not patient records — but it is a pattern to fix before sensitive columns are added.

**Fix:**
```ts
.select('id, patient_name, quote, designation, is_active, sort_order, created_at, updated_at')
```

---

### WR-006 — `toggleFeatured` cap checks are not atomic — race condition allows exceeding limits

**Severity:** Warning
**File:** `app/(portal)/actions/content.ts:320-343`
**Issue:** The featured count check and the update are two separate DB round-trips with no transaction:
```ts
const { count } = await admin.from('doctors').select(...).eq('is_featured', true);
if ((count ?? 0) >= 3) throw new Error('Maximum 3 featured doctors allowed');
// <-- another admin can increment count here between these two lines
await admin.from(table).update({ is_featured: value }).eq('id', id);
```
Concurrent admin actions (two tabs open) can both pass the count check and both set `is_featured = true`, resulting in 4+ featured doctors. In a single-admin hospital portal this is low-probability but the fix is straightforward.

**Fix:** Enforce the cap with a database-level constraint (`CHECK` on count or a trigger) or use a Postgres function called via RPC that performs the check and update atomically.

---

## Info

### IN-001 — Duplicate section comment header for `Hospital Info actions`

**Severity:** Info
**File:** `app/(portal)/actions/content.ts:393`, `515`
**Issue:** The comment `// Hospital Info actions (CMS-03)` appears twice — once at line 393 (above the revalidate helper) and again at line 515 (above `updateHospitalInfoAction`). The `revalidateHospitalInfo` function and `updateHospitalInfoAction` are in different sections because testimonials code was inserted between them. This splits the Hospital Info block and is confusing.

**Fix:** Move `revalidateHospitalInfo` to be immediately above `updateHospitalInfoAction` and remove the duplicate section header.

---

### IN-002 — PMJAYExplainer uses array index as `key` prop

**Severity:** Info
**File:** `components/public/PMJAYExplainer.tsx:40`
**Issue:**
```tsx
{facts.map((fact, index) => (
  <div key={index} ...>
```
The `facts` array is static and never reordered, so this is not a functional bug in practice. However, using index as key is a pattern React will warn about when list items can change order.

**Fix:** Use a stable identifier:
```tsx
{facts.map((fact) => (
  <div key={fact.heading} ...>
```

---

### IN-003 — `revalidateHospitalInfo` is defined but the only action that calls it (`updateHospitalInfoAction`) is in the same file — verify the function is not orphaned

**Severity:** Info
**File:** `app/(portal)/actions/content.ts:398-401`
**Issue:** `revalidateHospitalInfo` revalidates `/en/contact` and `/hi/contact`. `updateHospitalInfoAction` calls it at line 539. This looks correct, but the code comment at line 393 says `// Hospital Info actions (CMS-03)` while the function itself is separated from `updateHospitalInfoAction` by ~115 lines of testimonials code. Worth confirming that `revalidateHospitalInfo` is not intended to also revalidate the homepage (hospital info sometimes includes `about_text` which may appear there).

**Fix:** Review whether `/en` and `/hi` should also be revalidated when `about_text` changes; if so, call `revalidateHomepages()` from `updateHospitalInfoAction`.

---

### IN-004 — Hero image `alt=""` is intentionally decorative — document the intent

**Severity:** Info
**File:** `app/[locale]/(public)/page.tsx:61`
**Issue:**
```tsx
<Image src={heroImageUrl} alt="" fill ... />
```
An empty `alt` attribute is the correct WCAG pattern for a purely decorative background image. However, for a hospital homepage where the hero image may contain meaningful content (the hospital building, medical staff), a decorative-empty alt may not be semantically correct if the image conveys information.

**Fix:** Confirm with the client whether the hero image will be purely decorative (e.g., abstract pattern) or content-carrying (photo of the hospital). If content-carrying, the `alt` should describe the image. Add a comment to document the intent either way.

---

_Reviewed: 2026-06-19T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
