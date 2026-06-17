---
phase: 14-media-infrastructure
plan: "04"
subsystem: portal-content-forms
tags: [media, upload, departments, doctors, facilities, file-input]
dependency_graph:
  requires: [14-03]
  provides: [file-upload-controls-departments, file-upload-controls-doctors, file-upload-controls-facilities]
  affects: [portal-content-management, homepage-image-display]
tech_stack:
  added: []
  patterns: [upload-on-select, server-action-upload, hidden-form-field-url]
key_files:
  created: []
  modified:
    - app/(portal)/content/departments/DepartmentsClient.tsx
    - app/(portal)/content/doctors/DoctorsClient.tsx
    - app/(portal)/content/facilities/FacilitiesClient.tsx
    - lib/db/facilities.ts
    - app/(portal)/actions/content.ts
decisions:
  - "Upload-on-select pattern: file chosen triggers uploadImageAction immediately; URL stored via setValue before form submit"
  - "Upload disabled in create mode (no entityId yet); save-first hint shown to user"
  - "Zod .url() validator removed from image_url/photo_url — URL now set programmatically by Server Action"
  - "Facility type and content actions extended to include image_url (Rule 2 auto-fix — field existed in DB but not in TypeScript types)"
metrics:
  duration: "~25 minutes"
  completed: "2026-06-17"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 5
---

# Phase 14 Plan 04: File Upload Controls for Entity Forms — Summary

Portal CRUD forms for departments, doctors, and facilities now have inline file upload controls using the upload-on-select pattern. URL text inputs are replaced; images upload directly to Supabase Storage via `uploadImageAction` and the resulting public URL is written to the hidden form field.

## What Was Built

### Task 1: DepartmentsClient.tsx upload control

- Added `import Image from 'next/image'` and `import { uploadImageAction }` 
- Added `uploadingImage` state
- Extended `useForm` to destructure `watch` and `setValue`
- Replaced `image_url` URL text Input with a file input control
- Zod schema: `image_url: z.string().url(...).optional().or(z.literal(''))` → `z.string().optional()`
- File input disabled when `editingDepartment` is null (create mode)
- "Save the department first, then upload an image." hint in create mode
- 80×80px preview thumbnail using `next/image` with fill layout
- Loader2 spinner during upload
- On success: `setValue('image_url', result.url)`, `toast.success('Image uploaded')`, `router.refresh()`

### Task 2: DoctorsClient.tsx and FacilitiesClient.tsx upload controls

**DoctorsClient.tsx:**
- Same pattern as departments
- `photo_url` column, `doctors` folder/table
- 80×80px circle preview (`rounded-full`)
- Toast: "Photo uploaded"
- Hint: "Save the doctor record first, then upload a photo."

**FacilitiesClient.tsx:**
- Same pattern; `image_url` column, `facilities` folder/table
- 16:9 preview (`w-40 aspect-video`)
- Toast: "Image uploaded"
- Hint: "Save the facility first, then upload an image."

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] Added image_url to Facility TypeScript type and content actions**

- **Found during:** Task 2 (FacilitiesClient)
- **Issue:** The `Facility` interface in `lib/db/facilities.ts` had no `image_url` field. The `createFacilityAction` and `updateFacilityAction` in `content.ts` did not accept `image_url`. This would have caused TypeScript errors on `facility.image_url` access and prevented the URL from being passed through form submit.
- **Fix:** Added `image_url: string | null` to `Facility` interface; added `image_url?: string` to `createFacilityAction` input type and `Partial<{...image_url: string}>` to `updateFacilityAction`; added `image_url` to the insert payload in `createFacilityAction`
- **Files modified:** `lib/db/facilities.ts`, `app/(portal)/actions/content.ts`

## Known Stubs

None — upload controls are wired to real `uploadImageAction` Server Action. No placeholder data.

## Threat Flags

None — no new network endpoints or auth paths introduced. The file input is a client-side control that routes through `uploadImageAction` (already secured with `requireCmsRole()` in Plan 03).

## Self-Check

- [x] `app/(portal)/content/departments/DepartmentsClient.tsx` — uploadImageAction imported, type="file" present, URL text input removed
- [x] `app/(portal)/content/doctors/DoctorsClient.tsx` — uploadImageAction imported, type="file" present, URL text input removed
- [x] `app/(portal)/content/facilities/FacilitiesClient.tsx` — uploadImageAction imported, type="file" present, image_url added to schema and submit
- [x] `lib/db/facilities.ts` — Facility interface extended with image_url
- [x] `app/(portal)/actions/content.ts` — createFacilityAction and updateFacilityAction accept image_url
