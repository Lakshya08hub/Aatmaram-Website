# Phase 14: Media Infrastructure — Validation Architecture

## Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected (no jest.config, no vitest.config, no test directory found) |
| Config file | None |
| Quick run command | N/A |
| Full suite command | N/A |

## Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UI-01 | Upload action rejects invalid type | unit | N/A — no test framework | No test infra |
| UI-01 | Upload action rejects oversized file | unit | N/A | No test infra |
| UI-01 | next/image renders with fallback when photo_url is null | visual/manual | Manual browser check | N/A |
| UI-01 | Hero renders fallback when hero_image_url is null | visual/manual | Manual browser check | N/A |

## Wave 0 Gaps

- No test framework is installed. Manual verification is the only option for this phase.
- Manual verification checklist should be included in the plan's verification wave.

*(No test infrastructure exists in this project — all validation is manual/visual)*

## Manual Verification Checklist

### Server Action (Plans 01–03)
- [ ] Upload a valid JPG under 5 MB via the Departments edit form → image appears in the portal and on the public site
- [ ] Upload a file with disallowed type (e.g., PDF) → toast shows "Only jpg, png, webp allowed"
- [ ] Upload a file over 5 MB → toast shows "File must be under 5 MB"
- [ ] Unauthenticated request to uploadImageAction → rejected (requireCmsRole throws)

### CRUD Form Integration (Plan 04)
- [ ] Open Department create dialog → file input is disabled, "Save the department first" hint visible
- [ ] Open Department edit dialog → file input is enabled; selecting an image triggers upload immediately
- [ ] After upload success → image preview thumbnail updates; toast shows "Image uploaded"
- [ ] Same checks apply for Doctors (photo_url) and Facilities (image_url)

### Public Site Rendering (Plans 05–06)
- [ ] Doctor with photo_url set → circular next/image renders on Doctors public page
- [ ] Doctor without photo_url → initials fallback renders; no React error
- [ ] Department with image_url set → 16:9 image header renders on Departments public page
- [ ] Department without image_url → icon fallback renders
- [ ] Facility with image_url set → 16:9 image header renders on Facilities public page
- [ ] Facility without image_url → icon fallback renders
- [ ] Homepage with hero_image_url set → full-bleed background image renders
- [ ] Homepage with hero_image_url null → plain background renders (no error)

### next/image Configuration (Plan 02)
- [ ] No runtime error "Invalid src prop ... hostname not configured" when image URLs are from Supabase Storage
- [ ] `next.config.ts` contains remotePatterns entry for `ilvkpbuqjgmldunjpwor.supabase.co`

### TypeScript
- [ ] `npx tsc --noEmit` passes with zero errors across all modified files
