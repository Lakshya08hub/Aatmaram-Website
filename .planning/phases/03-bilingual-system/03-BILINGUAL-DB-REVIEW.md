---
phase: 03-bilingual-system
reviewed: 2026-06-23T00:00:00Z
depth: deep
files_reviewed: 17
files_reviewed_list:
  - supabase/migrations/20260623_bilingual_content.sql
  - lib/db/i18n.ts
  - lib/db/departments.ts
  - lib/db/doctors.ts
  - lib/db/facilities.ts
  - lib/db/hospital-info.ts
  - lib/db/testimonials.ts
  - app/(portal)/actions/content.ts
  - app/(portal)/content/departments/DepartmentsClient.tsx
  - app/(portal)/content/doctors/DoctorsClient.tsx
  - app/(portal)/content/facilities/FacilitiesClient.tsx
  - app/(portal)/content/hospital-info/HospitalInfoClient.tsx
  - app/(portal)/content/testimonials/TestimonialsClient.tsx
  - app/[locale]/(public)/departments/page.tsx
  - app/[locale]/(public)/doctors/page.tsx
  - app/[locale]/(public)/services/page.tsx
  - app/[locale]/(public)/page.tsx
findings:
  critical: 4
  warning: 6
  info: 3
  total: 13
status: issues_found
---

# Phase 03: Bilingual DB Review

**Reviewed:** 2026-06-23
**Depth:** deep
**Files Reviewed:** 17
**Status:** issues_found

## Summary

The bilingual feature is structurally sound — every `_hi` column added in the migration is reflected in all TypeScript interfaces and all Supabase column-select strings. The `localize()` helper is used consistently on every patient-facing render path. Admin forms all populate `_hi` fields in `openEditDialog`/`openEditSheet` `reset()` calls, so Hindi translations are not silently cleared on edit.

However four blockers were found:

1. `homepage page.tsx` accesses `info?.hero_image_url` but the `HospitalInfo` interface and migration do not define that column — this is a compile-time TypeScript error that will produce `undefined` at runtime on every page load.
2. `updateFacilityAction` skips Zod validation entirely on the update path, meaning Hindi fields from user input reach the DB without length checks.
3. The inline `patient_name` edit in `TestimonialsClient` calls `updateTestimonialAction` without forwarding `_hi` fields — this silently NULLs all Hindi translations on every inline name edit.
4. `revalidateHospitalInfo()` is defined but never called from `updateHospitalInfoAction`; the public About/Contact pages are never revalidated when hospital info (including `about_text_hi` and `opd_timings_hi`) changes.

---

## Critical Issues

### CR-01: `hero_image_url` accessed on `HospitalInfo` but column does not exist

**File:** `app/[locale]/(public)/page.tsx:62`
**Issue:** `info?.hero_image_url` is read on line 62, but the `HospitalInfo` interface in `lib/db/hospital-info.ts` has no `hero_image_url` field, and the migration `20260623_bilingual_content.sql` does not add that column. TypeScript should flag this as a type error (`Property 'hero_image_url' does not exist on type 'HospitalInfo'`). At runtime `heroImageUrl` is always `undefined`, meaning the hero image feature is permanently broken. Additionally, because the column-select string in `getHospitalInfo()` does not include `hero_image_url`, Supabase would not return it even if the column existed.

**Fix:**
Either add the column to the interface, the migration, and the select string:
```sql
-- New migration
ALTER TABLE hospital_info ADD COLUMN IF NOT EXISTS hero_image_url TEXT;
```
```typescript
// lib/db/hospital-info.ts — add to interface and select string
hero_image_url: string | null;
```
Or remove the feature from `page.tsx` if it is not yet implemented.

---

### CR-02: `updateFacilityAction` bypasses Zod validation — raw user input written to DB

**File:** `app/(portal)/actions/content.ts:382-407`
**Issue:** `updateFacilityAction` (line 382) does NOT call `facilityCreateSchema.partial().safeParse(input)`. It passes the raw `input` object directly through `Object.fromEntries(Object.entries(input).filter(...))` to the DB update. This means:
- `name_hi` and `description_hi` are written without max-length checks (100 / 500 chars respectively).
- Any field value, no matter how large, reaches Supabase without server-side validation.

Compare to `updateDepartmentAction` (line 135) which correctly calls `departmentCreateSchema.partial().safeParse(input)` first. The facility update path is the only one that skips this step.

**Fix:**
```typescript
export async function updateFacilityAction(...): Promise<{ error?: string }> {
  try {
    await requireCmsRole();

    // Add this validation block (mirrors updateDepartmentAction):
    const parsed = facilityCreateSchema.partial().safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0].message };
    }

    const cleaned = Object.fromEntries(
      Object.entries(parsed.data).filter(   // use parsed.data, not input
        ([k, v]) => FACILITY_ALLOWED_FIELDS.includes(k as ...) && v !== undefined
      )
    );
    // ... rest unchanged
```

---

### CR-03: Inline patient name edit in `TestimonialsClient` silently NULLs all Hindi fields

**File:** `app/(portal)/content/testimonials/TestimonialsClient.tsx:253-259`
**Issue:** The `InlineEditCell` `onSave` callback for `patient_name` calls:
```typescript
await updateTestimonialAction(testimonial.id, {
  patient_name: v,
  quote: testimonial.quote,
  designation: testimonial.designation ?? undefined,
  is_active: testimonial.is_active,
  sort_order: testimonial.sort_order,
});
```
The `_hi` fields (`patient_name_hi`, `quote_hi`, `designation_hi`) are omitted entirely. In `updateTestimonialAction`, the update payload always sets these explicitly to `parsed.data.patient_name_hi || null` (line 637-639). Because they are absent from the input, Zod parses them as `undefined`, and `undefined || null` evaluates to `null`, so the update statement writes `NULL` into all three Hindi columns. Editing a patient name in the table row therefore destroys any previously stored Hindi translation for that testimonial.

**Fix:** Forward all `_hi` fields from the existing record in the inline save callback:
```typescript
onSave={async (v) => {
  if (v.trim() === '') return { error: 'Field cannot be empty' };
  const r = await updateTestimonialAction(testimonial.id, {
    patient_name: v,
    quote: testimonial.quote,
    designation: testimonial.designation ?? undefined,
    is_active: testimonial.is_active,
    sort_order: testimonial.sort_order,
    patient_name_hi: testimonial.patient_name_hi ?? undefined,
    quote_hi: testimonial.quote_hi ?? undefined,
    designation_hi: testimonial.designation_hi ?? undefined,
  });
  if (!r.error) router.refresh();
  return r;
}}
```

---

### CR-04: `revalidateHospitalInfo()` is defined but never called — public pages never revalidate

**File:** `app/(portal)/actions/content.ts:554-557` and `728-771`
**Issue:** `revalidateHospitalInfo()` is defined at line 554:
```typescript
function revalidateHospitalInfo(): void {
  revalidatePath('/en/contact');
  revalidatePath('/hi/contact');
}
```
But `updateHospitalInfoAction` (line 728) never calls it. The public `/contact` page (and any other page that uses `about_text_hi` / `opd_timings_hi`) will therefore serve stale content forever after a hospital info update. Since the homepage also renders `info.about_text` (indirectly through the About section), it too may be affected depending on how caching is configured.

Additionally, the `revalidateHospitalInfo` function only revalidates `/en/contact` and `/hi/contact`, but the homepage at `/en` and `/hi` also renders `getHospitalInfo()` data. Those paths are not invalidated even if the function were called.

**Fix:**
```typescript
// In updateHospitalInfoAction, before `return {}`:
revalidateHospitalInfo();
revalidatePath('/en');   // homepage uses info too
revalidatePath('/hi');
return {};
```

---

## Warnings

### WR-01: `testimonialSchema` in `content.ts` does not include `is_active`; value taken raw from input

**File:** `app/(portal)/actions/content.ts:19-27` and lines `595`, `640`
**Issue:** `testimonialSchema` (line 19) validates `patient_name`, `quote`, `designation`, `sort_order`, and the three `_hi` fields, but not `is_active`. In both `createTestimonialAction` and `updateTestimonialAction`, `is_active` is written as `input.is_active` (the raw, unvalidated value) rather than a validated boolean. A caller that sends a non-boolean (e.g. a string `"true"`) could cause a type mismatch or unexpected DB behavior. All other boolean fields in the codebase come from the form as proper booleans, so this is low-probability but still a schema gap.

**Fix:** Add `is_active: z.boolean()` to `testimonialSchema` and reference `parsed.data.is_active` in both actions.

---

### WR-02: `updateDepartmentAction` allows clearing required field `name` via empty `_hi` string logic inconsistency

**File:** `app/(portal)/actions/content.ts:147-155`
**Issue:** `DEPARTMENT_REQUIRED_FIELDS` contains only `['name']`. The filter rejects empty string for `name`, but also passes through `name_hi: ''` (since `name_hi` is not in `DEPARTMENT_REQUIRED_FIELDS`). This is intentional per the comment ("optional fields allow empty strings so admins can intentionally clear them"). However, when `name_hi` is an empty string `''`, the value passes the `ALLOWED_FIELDS` check and lands in `cleaned`. The DB then stores an empty string for `name_hi` rather than `NULL`. `localize()` checks `hi && hi.trim().length > 0`, so an empty string would fall back to English — the behavior is correct. But the data model inconsistency (NULL vs empty string for "no translation") could cause confusion in future queries. The other actions (doctor create, facility create) normalize empty strings to `null` with `|| null`. Consider normalizing `name_hi: ''` to `null` in update paths as well.

**Fix:** In `updateDepartmentAction` and `updateDoctorAction`, convert empty-string optional fields to `null`:
```typescript
// after building cleaned:
for (const optField of ['name_hi', 'description_hi', 'image_url']) {
  if (cleaned[optField] === '') cleaned[optField] = null;
}
```

---

### WR-03: `localize()` second parameter is typed `string | null | undefined` but callers pass plain `string` for `en`

**File:** `lib/db/i18n.ts:6`
**Issue:** The `en` parameter is typed `string` (not `string | null | undefined`). This is fine for all current usages since the English fields are non-nullable in every interface. However, if `en` is ever passed as `null | undefined` (which TypeScript would allow via `as string` casts or from untyped data), `localize()` would return `null` or `undefined` which the renderer would display as the literal string `"null"`. The function should defensively handle this:

**Fix:**
```typescript
export function localize(en: string | null | undefined, hi: string | null | undefined, locale: string): string {
  if (locale === 'hi' && hi && hi.trim().length > 0) return hi;
  return en ?? '';
}
```

---

### WR-04: Facilities `description` max-length mismatch between client schema and server schema

**File:** `app/(portal)/content/facilities/FacilitiesClient.tsx:75` vs `app/(portal)/actions/content.ts:329`
**Issue:** The client-side Zod schema (`FacilitiesClient.tsx` line 75) caps `description` at 300 characters. The server-side schema (`facilityCreateSchema` in `content.ts` line 329) caps it at 500. A description of 301–500 characters passes server-side Zod but is flagged as invalid on the client, meaning an admin who enters 350 characters sees a client error even though the data would be accepted by the server. The mismatch is confusing and should be aligned; the intent appears to be 500 based on the SQL (TEXT, no constraint).

**Fix:** Change `FacilitiesClient.tsx` line 75 to `max(500, ...)` to match the server schema and the `description_hi` client limit which is already 500 (line 79).

---

### WR-05: `revalidateHospitalInfo` only revalidates `/contact` — homepage is missed

**File:** `app/(portal)/actions/content.ts:554-557`
**Issue:** (Distinct from CR-04.) Even when the function is eventually called, it revalidates `/en/contact` and `/hi/contact` but not `/en` and `/hi`. The homepage (`page.tsx`) calls `getHospitalInfo()` and uses `info` data. Changes to `about_text_hi` and `opd_timings_hi` would not appear on the homepage without a manual cache purge.

**Fix:** Add homepage revalidation paths to `revalidateHospitalInfo()`.

---

### WR-06: `DOCTOR_PUBLIC_COLUMNS` is identical to `DOCTOR_CMS_COLUMNS` — misleading constant name

**File:** `lib/db/doctors.ts:29-35`
**Issue:** The comment on line 32 says "Public site queries: same as CMS minus is_featured/featured_order (not display-relevant) and created_at." But the actual string is byte-for-byte identical to `DOCTOR_CMS_COLUMNS`, including `is_featured`, `featured_order`, and `created_at`. The comment documents an intended difference that was never implemented. This means public-site queries return all internal fields they do not need. While not a data exposure risk (RLS should cover that), it is dead code and a maintenance hazard.

**Fix:** Either align the constant with the comment (remove `is_featured`, `featured_order`, `created_at` from the public select), or remove the redundant constant and use `DOCTOR_CMS_COLUMNS` directly in public queries. The public pages do use `is_featured` (for homepage fallback logic), so verify before removing.

---

## Info

### IN-01: `metadata` on public pages is not locale-aware

**File:** `app/[locale]/(public)/departments/page.tsx:11-15`, `app/[locale]/(public)/doctors/page.tsx:12-16`, `app/[locale]/(public)/services/page.tsx:13-17`
**Issue:** The `metadata` export is a static object on all three public listing pages. It does not branch on locale, so Hindi users see English `<title>` and `<description>` tags. The homepage (`page.tsx`) correctly implements `generateMetadata` with locale-branching. The three listing pages should follow the same pattern.

**Fix:** Convert `export const metadata` to `export async function generateMetadata({ params })` on each page, use `getTranslations` to produce locale-appropriate strings.

---

### IN-02: `console.error` left in production paths on public pages

**File:** `app/[locale]/(public)/departments/page.tsx:31`, `app/[locale]/(public)/doctors/page.tsx:35`, `app/[locale]/(public)/services/page.tsx:30`
**Issue:** Fetch failures log to `console.error` in server-side render context. This is intentional for debugging but will appear in production server logs permanently and may expose internal error messages. Consider replacing with a structured logger or silencing in production.

**Fix:** Wrap in an environment check or use a logger utility that suppresses output in production.

---

### IN-03: `MAX_FEATURED_DEPARTMENTS` constant declared before the module comment block

**File:** `app/(portal)/content/departments/DepartmentsClient.tsx:3`
**Issue:** Line 3 is `const MAX_FEATURED_DEPARTMENTS = 8` followed by line 4 which is the module comment `// app/(portal)/content/...`. The constant appears before the module comment, which is likely a copy-paste ordering error. The same pattern exists in `DoctorsClient.tsx:3`. While functionally harmless, the file header structure is inconsistent with other files.

**Fix:** Move the `const MAX_FEATURED_*` declarations to after the module comment and import block.

---

_Reviewed: 2026-06-23_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
