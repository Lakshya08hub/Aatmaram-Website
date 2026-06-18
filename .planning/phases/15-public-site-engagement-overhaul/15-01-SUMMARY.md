---
phase: "15"
plan: "01"
subsystem: public-site
tags: [requirements, migration, i18n, testimonials, pmjay]
dependency_graph:
  requires: []
  provides: [PUBUI-01, PUBUI-02, PUBUI-03, PUBUI-04, PUBUI-05, testimonials-table, pmjay-i18n-keys, testimonials-i18n-keys]
  affects: [REQUIREMENTS.md, supabase/migrations, messages/en.json, messages/hi.json]
tech_stack:
  added: []
  patterns: [moddatetime-or-fallback trigger, RLS public-read + admin-write]
key_files:
  created:
    - supabase/migrations/20260617_testimonials.sql
  modified:
    - .planning/REQUIREMENTS.md
    - messages/en.json
    - messages/hi.json
decisions:
  - testimonials table uses designation (nullable) per plan spec — no NOT NULL constraint
  - RLS admin write policy mirrors existing CMS tables pattern (profiles.role IN ('super_admin', 'admin') AND is_active = true)
  - pmjay namespace uses 8 keys matching plan spec exactly
metrics:
  duration: "~10 minutes"
  completed: "2026-06-18"
  tasks: 2
  files: 4
---

# Phase 15 Plan 01: Foundation — Requirements, Migration, and i18n

One-liner: PUBUI-01 to PUBUI-05 requirements added, testimonials table migration with RLS and updated_at trigger created, pmjay and testimonials i18n namespaces added to EN and HI.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add PUBUI requirements and testimonials migration | 139a629 | .planning/REQUIREMENTS.md, supabase/migrations/20260617_testimonials.sql |
| 2 | Add pmjay and testimonials i18n namespaces | 851d882 | messages/en.json, messages/hi.json |

## What Was Built

**REQUIREMENTS.md** — Added a new "Public Site — Engagement (Phase 15)" section with five requirements (PUBUI-01 through PUBUI-05). Updated traceability table to add the Phase 15 row and corrected coverage count from 49 to 54.

**supabase/migrations/20260617_testimonials.sql** — Complete migration for the testimonials table:
- Columns: id (uuid PK), patient_name (text NOT NULL), quote (text NOT NULL), designation (text nullable), is_active (boolean NOT NULL DEFAULT true), sort_order (integer NOT NULL DEFAULT 0), created_at/updated_at (timestamptz NOT NULL DEFAULT now())
- RLS enabled with two policies: "testimonials: public read" (anon + authenticated, USING true) and "testimonials: admin write" (authenticated only, checks profiles.role IN ('super_admin', 'admin') AND is_active = true)
- moddatetime-or-fallback DO $$ trigger block for auto-updating updated_at

**messages/en.json and messages/hi.json** — Two new top-level namespaces appended to each file:
- pmjay: 8 keys (heading, fact1Heading, fact1Body, fact2Heading, fact2Body, fact3Heading, fact3Body, cta)
- testimonials: 3 keys (heading, subtitle, emptyState)

## Deviations from Plan

None — plan executed exactly as written.

## Threat Surface Scan

Migration introduces a new write surface (testimonials table). The RLS admin write policy matches the existing CMS table pattern — only super_admin or admin roles with is_active = true can mutate. No new trust boundary introduced beyond what the threat model documented (T-15-01).

## Self-Check: PASSED

- .planning/REQUIREMENTS.md contains PUBUI-01: confirmed
- supabase/migrations/20260617_testimonials.sql contains CREATE TABLE testimonials: confirmed
- supabase/migrations/20260617_testimonials.sql contains moddatetime: confirmed
- messages/en.json pmjay keys: 8, testimonials keys: 3
- messages/hi.json pmjay keys: 8, testimonials keys: 3
- Both JSON files validate cleanly (node -e "require('./messages/en.json')" exits 0)
- Commits 139a629 and 851d882 confirmed in git log
