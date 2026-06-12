---
phase: 05-content-management
plan: "03"
subsystem: portal-cms
tags: [doctors, crud, sheet, server-actions, revalidation]
dependency_graph:
  requires: [05-01]
  provides: [portal-doctors-crud]
  affects: [public-doctors-page]
tech_stack:
  added: [components/ui/switch.tsx]
  patterns: [Server Component + Client Component split, Sheet for long forms, Controller for Switch]
key_files:
  created:
    - lib/db/doctors.ts
    - app/(portal)/content/doctors/page.tsx
    - app/(portal)/content/doctors/DoctorsClient.tsx
    - components/ui/switch.tsx
  modified:
    - app/(portal)/actions/content.ts
decisions:
  - "Used Sheet (sm:max-w-lg) instead of Dialog for the 7-field doctor form per UI-SPEC requirement"
  - "Availability days rendered as 7 toggle Buttons (Mon–Sun) with aria-pressed for multi-select UX"
  - "Zod is_active field typed z.boolean() (no .default) to keep inferred type boolean, matching Controller/Switch"
  - "Installed shadcn Switch component (not in codebase yet) via npx shadcn@latest add switch"
metrics:
  duration: "~20 minutes"
  completed: "2026-06-12"
  tasks_completed: 2
  files_changed: 5
---

# Phase 05 Plan 03: Doctors CRUD Summary

Portal doctors CRUD page — Sheet-based add/edit form with 7-day availability toggle, is_active Switch, and locale revalidation for both /en/doctors and /hi/doctors on every mutation.

## What Was Built

- `lib/db/doctors.ts`: Doctor interface + `getDoctors()` + `getActiveDoctors()` (public site utility)
- `app/(portal)/actions/content.ts`: Three doctor server actions appended (`createDoctorAction`, `updateDoctorAction`, `deleteDoctorAction`) each calling `revalidatePath('/en/doctors')` + `revalidatePath('/hi/doctors')` via `revalidateDoctors()` helper
- `app/(portal)/content/doctors/page.tsx`: Server Component with try/catch fetching doctors
- `app/(portal)/content/doctors/DoctorsClient.tsx`: Full CRUD UI — table (Full Name / Specialization / Active badge / Actions), Sheet with 7 form fields, day-toggle buttons, AlertDialog delete with correct copy ("Remove doctor profile?" / "Remove")
- `components/ui/switch.tsx`: shadcn Switch (was missing from codebase)

## Commits

- `0a2ba5f`: feat(05-03): doctor DB util + server actions with locale revalidation
- `24483dd`: feat(05-03): portal doctors page — Server Component + Sheet-based Client Component

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Missing shadcn Switch component**
- **Found during:** Task 2 — TypeScript reported `Cannot find module '@/components/ui/switch'`
- **Fix:** Ran `npx shadcn@latest add switch` to generate `components/ui/switch.tsx`
- **Files modified:** components/ui/switch.tsx (created)
- **Commit:** 0a2ba5f

**2. [Rule 1 - Bug] Zod boolean default causing TS type mismatch**
- **Found during:** Task 2 verification — `z.boolean().default(true)` infers `boolean | undefined` causing `zodResolver` type incompatibility
- **Fix:** Changed to `z.boolean()` and set `defaultValues: { is_active: true }` in useForm instead
- **Files modified:** DoctorsClient.tsx

## Known Stubs

None — all form fields wire to real DB actions.

## Threat Surface Scan

No new security surface beyond what is covered in the plan threat model. `requireCmsRole()` guards all three doctor actions (T-05-06 mitigated).

## Self-Check: PASSED

- lib/db/doctors.ts: FOUND
- app/(portal)/content/doctors/page.tsx: FOUND
- app/(portal)/content/doctors/DoctorsClient.tsx: FOUND
- app/(portal)/actions/content.ts contains revalidatePath('/en/doctors'): CONFIRMED
- app/(portal)/actions/content.ts contains revalidatePath('/hi/doctors'): CONFIRMED
- TypeScript: 0 errors (excluding pre-existing FacilitiesClient stub unrelated to this plan)
