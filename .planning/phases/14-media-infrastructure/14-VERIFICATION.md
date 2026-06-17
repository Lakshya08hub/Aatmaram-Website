---
phase: 14-media-infrastructure
verified: 2026-06-17T00:00:00Z
status: human_needed
score: 12/12 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Upload a photo via the Doctors edit form and confirm the image appears in the doctor card on the public site"
    expected: "File input triggers upload, toast success fires, image preview updates in the edit form, public doctor card shows the photo (not initials)"
    why_human: "Cannot test browser File API, Supabase Storage round-trip, and next/image rendering from a grep-only analysis"
  - test: "Upload a department image and verify it renders as a 16:9 header on the public departments page"
    expected: "Image appears above the card content area with correct aspect ratio; icon fallback is preserved when no image is set"
    why_human: "Rendering and fallback behavior requires visual inspection in a running browser"
  - test: "Upload a hero background image via /portal/media and verify it appears on the homepage"
    expected: "Homepage hero section shows the full-bleed image with a white/70 overlay; text remains readable over the image"
    why_human: "Full-bleed background + overlay readability cannot be verified by static analysis"
  - test: "Attempt to upload a file over 5 MB and a non-image MIME type (e.g. a PDF)"
    expected: "Client-side validation rejects both with toast.error messages before any Server Action call"
    why_human: "File API interaction and toast rendering require a browser; grep confirms the guard code exists but cannot confirm it fires correctly"
  - test: "Confirm the /portal/media route is accessible to super_admin and admin but absent from the sidebar for non-CMS roles"
    expected: "Media nav item visible only for super_admin and admin; staff/doctor/receptionist do not see it"
    why_human: "Role-based sidebar visibility requires logging in as each role and inspecting the rendered nav"
  - test: "Confirm Supabase Storage bucket 'media' is public and RLS policies are active in the dashboard"
    expected: "Storage shows media bucket with public=true; Policies tab shows public read + admin write + admin delete policies"
    why_human: "Plan 02 was a human-action checkpoint (manual SQL paste); cannot verify live Supabase state from the codebase"
---

# Phase 14: Media Infrastructure Verification Report

**Phase Goal:** Build the image-upload pipeline so the Super Admin can upload photos for doctors, departments, facilities, and a homepage hero — and have those images render on the public site using next/image.
**Verified:** 2026-06-17
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | next.config.ts contains images.remotePatterns for ilvkpbuqjgmldunjpwor.supabase.co | VERIFIED | `grep -c "ilvkpbuqjgmldunjpwor" next.config.ts` → 1; `grep -c "remotePatterns" next.config.ts` → 1 |
| 2 | Migration SQL file creates the media bucket, sets RLS, adds hero_image_url to hospital_info, and adds image_url to facilities | VERIFIED | `supabase/migrations/20260617_media_bucket.sql` exists; contains `INSERT INTO storage.buckets`, `hero_image_url`, `image_url`, `"media: public read"` policy |
| 3 | uploadImageAction validates MIME type and size before Storage upload; gated by requireCmsRole() | VERIFIED | `app/(portal)/actions/media.ts`: requireCmsRole() → 4 occurrences; revalidatePath → 23; `storage.from('media')` present; createAdminClient used for Storage and DB writes |
| 4 | deleteImageAction removes file from Storage and clears the DB column | VERIFIED | `deleteImageAction` → 2 occurrences in media.ts; `admin.storage.from('media').remove` found at line 222 |
| 5 | DepartmentsClient, DoctorsClient, FacilitiesClient have file inputs calling uploadImageAction; URL text inputs removed; upload disabled in create mode | VERIFIED | `uploadImageAction` → 2 occurrences each file; `type="file"` → 1 each; save-first hint text confirmed in all three files; Zod `.url()` removed (`z.string().optional()` confirmed) |
| 6 | DoctorCard renders circular next/image when photoUrl is set; initials fallback unchanged when null | VERIFIED | `photoUrl` → 4 occurrences; `import Image from 'next/image'` at line 1 of DoctorCard.tsx |
| 7 | DepartmentCard renders 16:9 image header when imageUrl is set; icon fallback unchanged | VERIFIED | `imageUrl` → 4 occurrences; `import Image from 'next/image'` at line 1 of DepartmentCard.tsx |
| 8 | FacilityCard renders 16:9 image header when imageUrl is set; icon fallback unchanged | VERIFIED | `imageUrl` → 4 occurrences; `import Image from 'next/image'` at line 1 of FacilityCard.tsx |
| 9 | Homepage hero section renders full-bleed next/image background from hero_image_url when set; falls back to plain section when null | VERIFIED | `app/[locale]/(public)/page.tsx`: `heroImageUrl` → 3 occurrences; `<Image src={heroImageUrl} alt="" fill sizes="100vw" ... priority />` confirmed at line 54; conditional ternary at line 52 |
| 10 | photoUrl and imageUrl props are wired from page.tsx to card components | VERIFIED | `photoUrl` → 1 occurrence; `imageUrl` → 2 occurrences in homepage; `getHospitalInfo` imported and called at line 39 |
| 11 | Portal Media page exists at /portal/media with hero upload, 16:9 preview, EmptyState, and inline confirm-remove | VERIFIED | `app/(portal)/media/page.tsx` and `app/(portal)/media/MediaClient.tsx` exist; `uploadImageAction` → 3; `deleteImageAction` → 3; `EmptyState` → 2; `confirmRemove` state confirmed |
| 12 | getHospitalInfo() returns hero_image_url; Facility interface includes image_url | VERIFIED | `lib/db/hospital-info.ts`: `hero_image_url: string | null` in interface; `lib/db/facilities.ts`: `image_url: string | null` at line 14 |

**Score:** 12/12 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260617_media_bucket.sql` | SQL for bucket, RLS, schema columns | VERIFIED | File exists; contains all required SQL blocks |
| `next.config.ts` | remotePatterns for Supabase hostname | VERIFIED | remotePatterns + hostname confirmed |
| `app/(portal)/actions/media.ts` | uploadImageAction + deleteImageAction Server Actions | VERIFIED | Both exports present; auth gate, validation, admin client, revalidatePath all confirmed |
| `app/(portal)/content/departments/DepartmentsClient.tsx` | File upload control replacing URL text field | VERIFIED | uploadImageAction called; type="file" present; save-first hint present |
| `app/(portal)/content/doctors/DoctorsClient.tsx` | File upload control replacing URL text field | VERIFIED | Same pattern confirmed |
| `app/(portal)/content/facilities/FacilitiesClient.tsx` | File upload control replacing URL text field | VERIFIED | Same pattern confirmed |
| `app/(portal)/media/page.tsx` | Server Component shell fetching hospital_info | VERIFIED | getHospitalInfo() called; heroImageUrl + hospitalInfoId passed to MediaClient |
| `app/(portal)/media/MediaClient.tsx` | Client Component with hero upload/preview/remove | VERIFIED | uploadImageAction, deleteImageAction, EmptyState, confirmRemove all present |
| `components/public/DoctorCard.tsx` | photoUrl prop + next/image rendering | VERIFIED | photoUrl → 4 occurrences; Image imported |
| `components/public/DepartmentCard.tsx` | imageUrl prop + next/image rendering | VERIFIED | imageUrl → 4 occurrences; Image imported |
| `components/public/FacilityCard.tsx` | imageUrl prop + next/image rendering | VERIFIED | imageUrl → 4 occurrences; Image imported |
| `lib/db/hospital-info.ts` | hero_image_url in HospitalInfo interface | VERIFIED | `hero_image_url: string | null` confirmed |
| `lib/db/facilities.ts` | image_url in Facility interface | VERIFIED | `image_url: string | null` at line 14 |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| next.config.ts | ilvkpbuqjgmldunjpwor.supabase.co | images.remotePatterns hostname | WIRED | grep confirms hostname in remotePatterns |
| app/(portal)/actions/media.ts | lib/supabase/admin.ts | createAdminClient() | WIRED | import at line 12; called at lines 151 and 204 |
| app/(portal)/actions/media.ts | storage.buckets (media) | admin.storage.from('media').upload | WIRED | `storage.from('media')` at lines 155 and 160 |
| DepartmentsClient.tsx | app/(portal)/actions/media.ts | uploadImageAction() call | WIRED | 2 occurrences (import + call) |
| DoctorsClient.tsx | app/(portal)/actions/media.ts | uploadImageAction() call | WIRED | 2 occurrences (import + call) |
| FacilitiesClient.tsx | app/(portal)/actions/media.ts | uploadImageAction() call | WIRED | 2 occurrences (import + call) |
| app/(portal)/media/page.tsx | lib/db/hospital-info.ts | getHospitalInfo() call | WIRED | import at line 5; call at line 13 |
| app/(portal)/media/MediaClient.tsx | app/(portal)/actions/media.ts | uploadImageAction + deleteImageAction | WIRED | both imported at line 16; called in handlers |
| app/[locale]/(public)/page.tsx | components/public/DoctorCard.tsx | photoUrl={doctor.photo_url} prop | WIRED | photoUrl prop confirmed in page.tsx |
| app/[locale]/(public)/page.tsx | hero section JSX | heroImageUrl from getHospitalInfo | WIRED | heroImageUrl extracted at line 42; used in JSX at line 52 |

---

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|---------------|-------------|--------|----------|
| MEDIA-01 | 14-01, 14-02, 14-03 | Migration adds hero_image_url column, media bucket, RLS policies | SATISFIED | Migration SQL file exists with all required SQL; next.config.ts updated; uploadImageAction uses admin client with RLS bypass |
| MEDIA-02 | 14-03, 14-04 | Admin can upload images via inline file inputs on CRUD edit forms; disabled on create | SATISFIED | All three CRUD clients have file inputs calling uploadImageAction; create-mode disabled with save-first hint; Zod .url() removed |
| MEDIA-03 | 14-06 | Public site renders doctor photos, department/facility images via next/image with fallbacks | SATISFIED | All three card components have conditional next/image + preserved fallbacks; props wired from page.tsx |
| MEDIA-04 | 14-05, 14-06 | Admin can upload hero background via portal Media section; homepage renders it with fallback | SATISFIED | /portal/media page exists with upload/preview/remove; homepage hero is conditional on hero_image_url |

All four requirement IDs declared in the PLAN frontmatter are satisfied by codebase evidence.

---

### Anti-Patterns Found

No TBD, FIXME, or XXX debt markers found in files modified by this phase. No stub implementations detected — all file inputs are wired to real Server Actions, all image renders use real DB column values with proper null guards.

---

### Behavioral Spot-Checks

Step 7b skipped for Plan 02 truths (requires live Supabase dashboard — cannot verify from codebase). All other truths verified statically.

| Behavior | Result | Status |
|----------|--------|--------|
| Migration SQL file contains all required SQL blocks | All 4 grep checks pass | PASS |
| next.config.ts has Supabase remotePatterns | Both grep checks pass | PASS |
| media.ts exports uploadImageAction and deleteImageAction with auth gate | 4 requireCmsRole occurrences; 23 revalidatePath; storage.from('media') present | PASS |
| All 3 CRUD clients have file inputs wired to uploadImageAction | type="file" and uploadImageAction in all 3 files | PASS |
| All 3 public card components import next/image and accept image props | Image import + prop occurrences confirmed in all 3 | PASS |
| Homepage wires heroImageUrl to conditional hero section and passes props to cards | heroImageUrl conditional at line 52; all 3 card props confirmed | PASS |

---

### Human Verification Required

#### 1. End-to-end Doctor Photo Upload

**Test:** In the portal, open an existing doctor's edit form, select a JPG/PNG photo file, and wait for the upload to complete.
**Expected:** File input triggers uploadImageAction, toast "Photo uploaded" appears, preview thumbnail updates in the form, and the public /en/doctors page shows the photo in the circular avatar.
**Why human:** Browser File API, Supabase Storage round-trip, and next/image rendering from a real URL cannot be tested by static analysis.

#### 2. Department and Facility Image Rendering

**Test:** Upload a department image via the edit sheet and visit the public departments page.
**Expected:** 16:9 image header appears above the card content; other departments with no image show the icon fallback without error.
**Why human:** Rendering and fallback visual behavior requires a running browser.

#### 3. Homepage Hero Background

**Test:** Upload a hero image via /portal/media and visit the public homepage.
**Expected:** Homepage hero section shows the full-bleed image with a white/70 overlay; existing text and CTA remain readable over the image. When image is removed, the plain bg-white section renders instead.
**Why human:** Full-bleed background + overlay readability requires visual inspection.

#### 4. Client-side Validation for File Type and Size

**Test:** In any upload control, attempt to upload a PDF file and then attempt to upload a file over 5 MB.
**Expected:** Both are rejected with toast.error messages before the Server Action is called.
**Why human:** File API interaction requires a browser; the guard code exists but cannot be confirmed to fire without running the page.

#### 5. Role-based Media Nav Visibility

**Test:** Log in as a staff/receptionist/doctor role and inspect the portal sidebar.
**Expected:** Media nav item is absent; only super_admin and admin see it.
**Why human:** Role-based sidebar rendering requires logging in as each role.

#### 6. Supabase Storage Bucket and RLS (Plan 02 Human Checkpoint)

**Test:** Open the Supabase dashboard for project ilvkpbuqjgmldunjpwor. Go to Storage and confirm the "media" bucket exists with Public = true. Go to Storage > Policies and confirm "media: public read", "media: admin write", and "media: admin delete" policies exist. Go to Table Editor and confirm hospital_info has hero_image_url and facilities has image_url columns.
**Expected:** All four items confirmed in the Supabase dashboard.
**Why human:** Plan 02 was a blocking human-action checkpoint (manual SQL paste). The SQL file exists in the repo but live Supabase state cannot be verified from codebase inspection.

---

### Gaps Summary

No code gaps found. All 12 must-have truths are VERIFIED against the actual codebase. The `human_needed` status reflects:

1. Six human verification items that require a running browser or live Supabase dashboard — none of these are gaps in the code, they are runtime behaviors that grep cannot confirm.
2. Plan 02 was an explicit human-action blocking checkpoint (manual SQL paste into Supabase dashboard). The SQL exists and is correct but the live database state cannot be verified from static analysis.

---

_Verified: 2026-06-17_
_Verifier: Claude (gsd-verifier)_
