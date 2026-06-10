---
phase: 02-public-website
plan: "06"
subsystem: public-website
tags:
  - appointment-form
  - react-hook-form
  - zod
  - sonner
  - server-component
dependency_graph:
  requires:
    - 02-01
    - 02-03
    - 02-04
    - 02-05
  provides:
    - appointment-page
    - appointment-form-component
    - shadcn-form-shim
  affects:
    - components/public/
    - components/ui/
    - app/[locale]/(public)/
tech_stack:
  added:
    - react-hook-form (v7.78.0) — form state and validation
    - '@hookform/resolvers/zod' — Zod resolver for react-hook-form
    - zod (v4.4.3) — schema validation
    - sonner (v2.0.7) — toast notifications
  patterns:
    - Client component isolation (AppointmentForm is 'use client'; page is Server Component)
    - Zod schema defined outside component to avoid re-creation on render
    - shadcn Form shim built without @radix-ui/react-label (project uses @base-ui/react)
    - FormControl uses cloneElement for Input/Textarea, asWrapper for Select
key_files:
  created:
    - components/ui/form.tsx — Manual shadcn Form wrapper (Form, FormField, FormItem, FormLabel, FormControl, FormMessage)
    - components/public/AppointmentForm.tsx — Appointment request form client component
    - app/[locale]/(public)/appointment/page.tsx — Appointment request page (Server Component)
  modified: []
decisions:
  - "Built form.tsx as manual shim instead of npx shadcn add form — project uses @base-ui/react, not @radix-ui, so the shadcn registry form component cannot be installed; created equivalent wrapper using react-hook-form's Controller, FormProvider, and React context"
  - "FormControl uses asWrapper=true for Select field to avoid cloneElement conflict with base-ui compound component"
  - "Toast uses sonner's toast.success() — NOT useToast() from legacy shadcn toast; Toaster is already mounted in app/[locale]/layout.tsx"
metrics:
  duration: ~15 minutes
  completed: 2026-06-10T00:00:00Z
  tasks_completed: 2
  tasks_total: 3
  files_created: 3
  files_modified: 0
---

# Phase 02 Plan 06: Appointment Form and Page Summary

**One-liner:** 5-field appointment request form with Zod validation and Sonner toast success feedback, wrapped in a Server Component page for both locales.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | AppointmentForm client component + form.tsx shim | 7687fcf | components/public/AppointmentForm.tsx, components/ui/form.tsx |
| 2 | Appointment page server component + build verification | 4603261 | app/[locale]/(public)/appointment/page.tsx |
| 3 | Human verification checkpoint | — | (pending — checkpoint reached) |

## What Was Built

### Task 1: AppointmentForm Client Component

**`components/public/AppointmentForm.tsx`** — `'use client'` directive, react-hook-form + zodResolver + Zod schema:

- **5 fields in order:**
  1. Patient Name — text input, min 2 chars
  2. Phone Number — tel input, regex `/^[6-9]\d{9}$/` → error: "Enter a valid 10-digit Indian mobile number."
  3. Preferred Doctor — base-ui Select (controlled via Controller), "No preference" + 6 doctors from `lib/data/doctors.ts`
  4. Preferred Date — date input, min = today's date dynamically computed
  5. Reason / Chief Complaint — Textarea, min 10 chars

- **On valid submit:** `toast.success('Request Received', { description: 'Your appointment request has been received. Our team will call you shortly.', duration: 6000 })` then `form.reset()`
- **No API calls** or Supabase imports; TODO comment marks Phase 7 wiring point
- Submit button: "Submit Request", full-width, `bg-blue-800 hover:bg-blue-900 min-h-[44px]`

**`components/ui/form.tsx`** — Manual shadcn Form shim built without `@radix-ui/react-label` (project uses `@base-ui/react`):
- Exports: `Form` (= FormProvider), `FormField` (= Controller wrapper), `FormItem`, `FormLabel`, `FormControl`, `FormMessage`
- `FormControl` has `asWrapper` prop for compound components (Select) where cloneElement is not appropriate

### Task 2: Appointment Page Server Component

**`app/[locale]/(public)/appointment/page.tsx`** — No `'use client'`:
- `generateStaticParams` returns `[{locale:'hi'}, {locale:'en'}]`
- `metadata` export with SEO title "Request an Appointment | Atmaram Child Care and Critical Care"
- Two sections: page header (breadcrumb + h1 + subtitle) + form section (max-w-lg centered card)
- Imports and renders `<AppointmentForm />`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] shadcn `add form` silently fails — no @radix-ui/react-label installed**

- **Found during:** Task 1, Step 1 (install shadcn form component)
- **Issue:** `npx shadcn@latest add form --yes` completed silently without installing `form.tsx`. The project uses `@base-ui/react` (not `@radix-ui`), and the shadcn form component requires `@radix-ui/react-label` which is not in `node_modules`. The shadcn registry command silently skipped the install.
- **Fix:** Built `components/ui/form.tsx` manually as an equivalent wrapper using only `react-hook-form` (already installed), React context, and the existing `Label` component. The API is identical to the shadcn form: `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage`.
- **Files modified:** `components/ui/form.tsx` (created)
- **Commits:** 7687fcf

**2. [Rule 3 - Build blocker] Next.js Turbopack build fails from worktree — no node_modules**

- **Found during:** Task 2 build verification
- **Issue:** Running `npm run build` from the worktree directory failed because `node_modules` only exists in the main repo root. Turbopack could not find `next/package.json`.
- **Fix:** Temporarily modified `next.config.ts` to set `turbopack.root` to the main repo path, ran the build successfully (8 routes, 0 errors), then reverted `next.config.ts` to its original state. TypeScript check (`tsc --noEmit`) confirmed 0 errors from worktree context.
- **Files modified:** None (next.config.ts was reverted after build verification)

## Known Stubs

None — the AppointmentForm is fully functional for Phase 2 scope (client-side validation + toast). The Supabase write is intentionally deferred to Phase 7 with a `// TODO Phase 7` comment.

## Threat Surface Scan

No new security surface introduced beyond what the plan's threat model documents:
- Form submits to no endpoint (T-02-01 accepted)
- All user input validated client-side via Zod before onSubmit fires (T-02-INPUT mitigated by React JSX escaping)
- No dangerouslySetInnerHTML used

## Self-Check

- `components/public/AppointmentForm.tsx` — FOUND (7687fcf)
- `components/ui/form.tsx` — FOUND (7687fcf)
- `app/[locale]/(public)/appointment/page.tsx` — FOUND (4603261)
- Commit 7687fcf — FOUND
- Commit 4603261 — FOUND
- TypeScript: 0 errors
- Build: 8 public routes compiled successfully (verified with modified turbopack root)
- ESLint: 0 errors

## Self-Check: PASSED

## Checkpoint Reached: Task 3 — Human Verification

Tasks 1 and 2 are complete and committed. Task 3 requires manual browser verification of the appointment form behavior.
