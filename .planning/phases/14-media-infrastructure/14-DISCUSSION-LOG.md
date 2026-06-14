# Phase 14: Media Infrastructure - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-14
**Phase:** 14-Media Infrastructure
**Areas discussed:** Upload mechanism, Bucket layout & access, Image constraints & processing, Site-level media scope

---

## Upload Mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Through a Server Action | File → Server Action (admin client) → Storage + save URL; auth/validation/DB write centralized | ✓ |
| Direct browser → Supabase | Client uploads via supabase-js + RLS, then action saves URL | |

**User's choice:** Through a Server Action (Recommended)
**Notes:** Mirrors existing content.ts pattern (requireCmsRole + createAdminClient + revalidatePath). One trusted place for auth + validation.

---

## Bucket Layout & Access

| Option | Description | Selected |
|--------|-------------|----------|
| One public bucket, folders per type | Single `media` bucket; doctors/departments/facilities/site folders; public read; RLS admin write | ✓ |
| Separate bucket per entity | Distinct buckets per entity | |
| Private bucket + signed URLs | Signed short-lived URLs | |

**User's choice:** One public bucket, folders per type (Recommended)
**Notes:** Images are public marketing content anyway; signed URLs add needless complexity. RLS: super_admin/admin write only.

---

## Image Constraints & Processing

| Option | Description | Selected |
|--------|-------------|----------|
| Validate + Supabase transform on render | Type/size validation on upload; store original; resize via Supabase transforms + next/image | ✓ |
| Client-side compress before upload | Browser resize/compress before upload | |
| Store raw, next/image only | No transform layer | |

**User's choice:** Validate + Supabase transform on render (Recommended)
**Notes:** No client image library needed; next/image + Supabase transforms handle responsive sizing.

---

## Site-Level Media Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Entity images + hero background only | doctors/departments/facilities uploads + one homepage hero slot; testimonial avatars → Phase 15 | ✓ |
| Generic site-media manager | Flexible key→image store | |
| Entity images only | No site images this phase | |

**User's choice:** Entity images + hero background only (Recommended)
**Notes:** Testimonials are built in Phase 15, so their avatars belong there. Phase 14 ships entity uploads + a single hero-background slot to avoid building UI for non-existent data.

## Claude's Discretion

- Bucket name, file-naming scheme, folder paths.
- Hero URL storage: hospital_info column vs dedicated table.
- next/image sizes + Supabase transform params per surface.
- Portal placement of the hero/site-media upload control.
- Upload-control UX (preview, drag-drop vs picker, progress).

## Deferred Ideas

- Testimonial avatars + other Phase 15 imagery → Phase 15.
- Client-side image compression.
- Private buckets / signed URLs.
- Generic key→image site-media manager.
