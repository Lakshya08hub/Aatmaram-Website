# Phase 5: Content Management — Validation Strategy

**Phase:** 05-content-management
**Created:** 2026-06-12

---

## Overview

No test framework (Jest/Vitest) is configured in this project. Phase 5 validation uses three complementary checks: a Next.js build smoke test, a TypeScript compile check, and grep-based structural verification of cache invalidation calls.

---

## Validation Steps

### 1. Build Smoke Test

Verifies that all four converted public pages and all new portal content pages compile without errors.

```bash
npx next build --no-lint
```

Pass criterion: Build completes with exit code 0. Any TypeScript error or import resolution failure surfaces here.

Run from: project root (`D:/Git Hub/Aatmaram Website`)

### 2. TypeScript Compile Check

Catches type errors that the build may not surface (e.g., incorrect Supabase return types, missing props).

```bash
npx tsc --noEmit
```

Pass criterion: No output (zero errors). Any output indicates a type error that must be fixed before the phase is considered complete.

### 3. Cache Invalidation Grep Check

Verifies that every Server Action mutation calls `revalidatePath` for both locale variants (CMS-04 requirement).

```bash
grep -n "revalidatePath" "D:/Git Hub/Aatmaram Website/app/(portal)/actions/content.ts"
```

Pass criterion: Every mutation function (create*, update*, delete*) has at least two `revalidatePath` calls — one for `/en/<segment>` and one for `/hi/<segment>`. A mutation with only one `revalidatePath` call is a bug.

Quick audit command (counts calls per locale):

```bash
grep -c "revalidatePath('/en/" "D:/Git Hub/Aatmaram Website/app/(portal)/actions/content.ts"
grep -c "revalidatePath('/hi/" "D:/Git Hub/Aatmaram Website/app/(portal)/actions/content.ts"
```

Both counts should be equal. If they differ, a locale is missing invalidation coverage.

### 4. Role Guard Verification

Verifies the content layout.tsx role-guard is wired correctly.

```bash
grep -c "getUser" "D:/Git Hub/Aatmaram Website/app/(portal)/content/layout.tsx"
grep -c "super_admin" "D:/Git Hub/Aatmaram Website/app/(portal)/content/layout.tsx"
grep -c "redirect" "D:/Git Hub/Aatmaram Website/app/(portal)/content/layout.tsx"
```

Pass criterion: Each command returns 1 or more (not 0).

---

## Manual Smoke Test (Portal)

After the build check passes, perform a manual portal walkthrough:

1. Log in as a `super_admin` user — confirm /portal/content/departments, /portal/content/doctors, /portal/content/facilities, /portal/content/hospital-info all load.
2. Add one department via the portal form — confirm it appears on /hi/departments and /en/departments after page refresh (CMS-04 check).
3. Edit and delete the test department.
4. Log in as a `receptionist` user — confirm direct navigation to /portal/content/departments redirects to /portal/dashboard (role guard check).

---

## Phase Completion Gate

Phase 5 is complete when ALL of the following are true:

- [ ] `npx next build --no-lint` exits 0
- [ ] `npx tsc --noEmit` produces no output
- [ ] `revalidatePath('/en/...')` and `revalidatePath('/hi/...')` call counts are equal in content.ts
- [ ] `app/(portal)/content/layout.tsx` contains getUser, super_admin check, and redirect calls
- [ ] Manual portal smoke test confirms CRUD works and public pages reflect changes immediately
