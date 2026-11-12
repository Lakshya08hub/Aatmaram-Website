---
phase: 16
phase_name: portal-ux-upgrade
status: findings
review_depth: standard
focus: cleanup
files_reviewed: 19
files_reviewed_list:
  - app/(portal)/actions/appointments.ts
  - app/(portal)/actions/patients.ts
  - app/(portal)/appointments/page.tsx
  - app/(portal)/content/departments/DepartmentsClient.tsx
  - app/(portal)/content/doctors/DoctorsClient.tsx
  - app/(portal)/content/testimonials/TestimonialsClient.tsx
  - app/(portal)/dashboard/page.tsx
  - app/(portal)/staff/StaffClient.tsx
  - app/globals.css
  - components/portal/DashboardCharts.tsx
  - components/portal/InlineEditCell.tsx
  - components/portal/KanbanBoard.tsx
  - components/portal/KanbanCard.tsx
  - components/portal/KanbanColumn.tsx
  - components/portal/PatientClient.tsx
  - components/portal/Sidebar.tsx
  - components/ui/chart.tsx
  - components/ui/tooltip.tsx
  - lib/portal/roles.ts
findings:
  critical: 0
  warning: 8
  info: 9
  total: 17
---

# Phase 16: Code Review — Cleanup Pass

**Reviewed:** 2026-06-19
**Depth:** standard
**Focus:** Code quality and cleanliness (post-security-review pass)
**Files Reviewed:** 19
**Status:** issues_found

## Summary

The codebase is in good overall shape post-security-review. The most impactful cleanup targets are: (1) two duplicate `AppointmentStatus` type definitions that exist identically in three files, (2) duplicated `requireRole` boilerplate between the two actions files that could be collapsed into one shared helper, (3) a missing `useEffect` dependency that could silently suppress toast notifications, and (4) several inline `onSave` callbacks in table rows that recreate new function references on every render and cause every `InlineEditCell` to re-render unnecessarily when the parent table re-renders. The remaining items are minor quality and consistency issues.

---

## Warnings

### WR-01 — `AppointmentStatus` type defined in three separate files

**File:** `components/portal/KanbanBoard.tsx:9`, `components/portal/KanbanCard.tsx:25`, `components/portal/KanbanColumn.tsx:9`
**Issue:** The `type AppointmentStatus = 'pending' | 'contacted' | 'confirmed' | 'cancelled'` union is copy-pasted verbatim across all three Kanban files. The server action in `app/(portal)/actions/appointments.ts:8` also defines a fourth local copy. Any future status addition (e.g. `'no-show'`) must be updated in four places with no compiler guard that all copies are in sync.
**Fix:** Export the type once from `app/(portal)/actions/appointments.ts` (it already defines it at line 8), then import it into the three Kanban components. Alternatively centralise in `lib/portal/types.ts`.

```ts
// app/(portal)/actions/appointments.ts — already there, just export it:
export type AppointmentStatus = 'pending' | 'contacted' | 'confirmed' | 'cancelled'

// KanbanBoard.tsx, KanbanCard.tsx, KanbanColumn.tsx — replace local declaration with:
import type { AppointmentStatus } from '@/app/(portal)/actions/appointments'
```

---

### WR-02 — `requireRole` auth boilerplate duplicated between actions files

**File:** `app/(portal)/actions/appointments.ts:12-32`, `app/(portal)/actions/patients.ts:42-64` and `70-92`
**Issue:** `requireAppointmentRole`, `requirePatientWriteRole`, and `requireDoctorRole` all perform the same two-step pattern: `createClient()` → `supabase.auth.getUser()` → profile fetch → role check → redirect/throw. The only variation is the allowed role list and the error condition. Three copies of near-identical auth plumbing means any change to the pattern (error message, redirect target, profile select shape) must be made in three places.
**Fix:** Extract a shared helper to `lib/portal/auth.ts`:

```ts
// lib/portal/auth.ts
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { StaffRole } from '@/lib/portal/roles'

export async function requireRole(allowedRoles: StaffRole[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile, error } = await supabase
    .from('profiles').select('role').eq('user_id', user.id).single()

  if (error || !profile || !allowedRoles.includes(profile.role as StaffRole)) {
    throw new Error('Forbidden')
  }

  return { user, role: profile.role as StaffRole, supabase }
}
```

All three helpers collapse to a single `requireRole([...])` call.

---

### WR-03 — Missing `isEdit` and `onClose` in `useEffect` dependency array (stale closure risk)

**File:** `components/portal/PatientClient.tsx:133`
**Issue:** The `useEffect` in `ReceptionistSheetForm` has the dependency array `[state, isPending, submitted]`. The callback inside reads `isEdit` and calls `onSuccess`/`onClose` — neither is in the dep array. `isEdit` is derived from a prop (`editingRecord`) and `onSuccess`/`onClose` are function props. Because `isEdit` is a primitive derived from a stable prop it is practically safe, but `onSuccess` and `onClose` are arrow functions recreated by the parent on every render. React's exhaustive-deps rule would flag both. If the parent ever passes a different `onSuccess` while the effect is pending (unlikely but possible when the sheet is reused quickly), the stale closure fires the old callback.

The same pattern repeats in `DoctorSheetForm` at line 305: `[state, isPending, submitted]` — same missing deps.

**Fix:** Either wrap `onSuccess`/`onClose` in `useCallback` in the parent, or add them to the dep arrays and accept the React lint rule:

```ts
// PatientClient.tsx ReceptionistSheetForm
}, [state, isPending, submitted, isEdit, onSuccess]);
// DoctorSheetForm
}, [state, isPending, submitted, onSuccess]);
```

---

### WR-04 — Unstable `onSave` references cause all `InlineEditCell`s to re-render on every table paint

**File:** `components/portal/PatientClient.tsx:512-518`, `components/portal/PatientClient.tsx:530-535`, `app/(portal)/staff/StaffClient.tsx:352-357`, `app/(portal)/content/departments/DepartmentsClient.tsx:242-246`, `app/(portal)/content/doctors/DoctorsClient.tsx:282-287`, `app/(portal)/content/testimonials/TestimonialsClient.tsx:242-252`
**Issue:** In every data table, each `<InlineEditCell>` receives an `onSave` prop that is an inline `async (v) => { ... }` arrow function defined directly in the `.map()` body. A new function object is created for every cell on every parent render. `InlineEditCell` is not wrapped in `React.memo`, so this causes it to re-render on every table refresh (e.g. after `router.refresh()`). With 20+ patient rows and 3 inline-editable columns, that is 60+ unnecessary re-renders per data refresh cycle.

**Fix:** Either:
1. Wrap `InlineEditCell` in `React.memo` (low-risk, single change): `export const InlineEditCell = React.memo(function InlineEditCell(...) {...})`.
2. Or pass a stable `useCallback`-wrapped handler — impractical inside a `.map()` body, so option 1 is preferred.

```ts
// components/portal/InlineEditCell.tsx — add at export:
export const InlineEditCell = React.memo(function InlineEditCell({ value, onSave, className }: InlineEditCellProps) {
  // ... existing body unchanged
})
```

---

### WR-05 — `StaffRow` and `StaffTable` defined as inner function components (hooks-safety risk)

**File:** `app/(portal)/staff/StaffClient.tsx:344`, `app/(portal)/staff/StaffClient.tsx:423`
**Issue:** `StaffRow` and `StaffTable` are function components defined inside the body of `StaffClient`. React's rules of hooks prohibit calling hooks inside functions that are themselves defined conditionally or inside other components' render bodies. Neither `StaffRow` nor `StaffTable` call hooks, so there is no immediate crash, but:
1. React creates a new function object on every `StaffClient` render, so React cannot reconcile the component tree across renders — every row unmounts and remounts rather than updates, resetting any local state (including the `InlineEditCell` edit mode).
2. React DevTools shows an anonymous/unnamed component in the tree, making debugging difficult.

**Fix:** Lift `StaffRow` and `StaffTable` to module scope and pass the necessary callbacks as props:

```ts
// At module scope:
function StaffRow({ staff, togglingId, onEdit, onToggle, onDelete, onInlineSave }: StaffRowProps) { ... }
function StaffTable({ rows, ...callbacks }: StaffTableProps) { ... }
```

---

### WR-06 — `KanbanCard` imports `useRouter` but uses it only to call `router.refresh()`, duplicating the parent's refresh logic

**File:** `components/portal/KanbanCard.tsx:4`, `components/portal/KanbanCard.tsx:48`, `components/portal/KanbanCard.tsx:65`
**Issue:** `KanbanCard` holds its own `useRouter` instance and calls `router.refresh()` after saving notes (line 65). `KanbanBoard` (the parent) also calls `router.refresh()` after status updates (lines 29, 38). This is an inconsistency: notes-save triggers a refresh from the card directly, while status updates trigger a refresh from the board. There is no functional difference here, but the split ownership makes it harder to add optimistic UI or debounced refresh later (any such change must be made in two places).
**Fix:** Add an optional `onNotesChange?: () => void` callback to `KanbanCard`'s props interface, call it after a successful notes save, and pass `router.refresh` from `KanbanBoard`. Remove `useRouter` from `KanbanCard`.

---

### WR-07 — `Select` in Add Staff dialog uses `defaultValue` + `onValueChange` (uncontrolled pattern)

**File:** `app/(portal)/staff/StaffClient.tsx:573-575`, `app/(portal)/staff/StaffClient.tsx:654-656`
**Issue:** Both Role `<Select>` elements (add form and edit form) use `defaultValue={addForm.getValues('role')}` and `onValueChange` to imperatively call `setValue`. This is an uncontrolled pattern — `defaultValue` is only read on mount. If `addForm.reset(...)` is called (e.g. `openAddDialog`), the `<Select>` display will not reset to match the new form value because `defaultValue` is ignored after initial render. The actual `react-hook-form` field value resets correctly, but the Select trigger will continue displaying the previously selected role label.
**Fix:** Use a controlled `value` prop tied to the watched field value:

```tsx
// Add form Role select:
<Select
  value={addForm.watch('role')}
  onValueChange={(val) => addForm.setValue('role', val as 'admin' | 'doctor' | 'receptionist', { shouldValidate: true })}
>
```

---

### WR-08 — `globals.css` defines `--color-primary` and `--color-border` twice with different literal values

**File:** `app/globals.css:19-20`, `app/globals.css:40-49`
**Issue:** In the `@theme inline` block, `--color-primary` is first set to the literal `#1E40AF` (line 19), then overridden two declarations later to `var(--primary)` (line 49). Likewise `--color-border` is first set to `#E2E8F0` (line 20), then overridden to `var(--border)` (line 40). Tailwind v4 processes `@theme` declarations in order; the later declarations win, making the early literal values dead code. This is potentially confusing — a developer reading line 19 sees a brand blue that is silently overridden.
**Fix:** Remove the dead first declarations:

```css
/* Remove these two lines from the early brand token block: */
/* --color-primary: #1E40AF;   ← overridden later by var(--primary) */
/* --color-border: #E2E8F0;    ← overridden later by var(--border) */
```

---

## Info

### IN-01 — `KanbanColumn` type includes `'completed'` status not used anywhere

**File:** `components/portal/KanbanColumn.tsx:9`
**Issue:** The local `AppointmentStatus` type in `KanbanColumn.tsx` includes `'completed'` as a valid member, but neither the DB schema (`appointments.ts:8`), `KanbanBoard`, nor `KanbanCard` recognise this status. It is dead type information that will cause silent type widening if `KanbanColumn`'s `onAdvance` prop is used with the broader type.
**Fix:** Remove `'completed'` from the `AppointmentStatus` union in this file (or replace with the shared type per WR-01).

---

### IN-02 — `DashboardCharts` renders a `<p>` inside `<CardHeader>` which is invalid HTML

**File:** `components/portal/DashboardCharts.tsx:58`, `components/portal/DashboardCharts.tsx:87`
**Issue:** `<CardHeader>` renders a `<div>`, and inside it the component places `<CardTitle>` (renders `<h3>`) followed by a raw `<p className="text-muted-foreground text-sm">Last 30 days</p>`. The shadcn pattern for this is `<CardDescription>`, not a bare `<p>`. Using `CardDescription` keeps the styling consistent with the rest of the portal and uses the correct semantic element.
**Fix:** Replace the bare `<p>` tags with `CardDescription`:

```tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
// then:
<CardHeader>
  <CardTitle>Appointments</CardTitle>
  <CardDescription>Last 30 days</CardDescription>
</CardHeader>
```

---

### IN-03 — Trailing "Last 30 days" paragraph duplicated after the chart grid

**File:** `components/portal/DashboardCharts.tsx:135`
**Issue:** Line 135 renders `<p className="text-xs text-muted-foreground">Last 30 days</p>` beneath the four-card grid. The same text already appears as card sub-headers on the Appointments and Patient Admissions cards (lines 58, 87). The footer paragraph is redundant and visually confusing because the Staff and Payroll cards do not span 30 days.
**Fix:** Remove line 135.

---

### IN-04 — `updateAppointmentNotesAction` is a subset of `updateAppointmentStatusAction`

**File:** `app/(portal)/actions/appointments.ts:58-76`
**Issue:** `updateAppointmentNotesAction` updates only `notes`, while `updateAppointmentStatusAction` already accepts an optional `notes` parameter (`notes?: string`) and passes it to the same DB update. Any caller wanting to save notes with a status change calls `updateAppointmentStatusAction`. Any caller saving notes alone calls `updateAppointmentNotesAction`. This means there are two code paths to write to the same `notes` column, with no clear policy on which to use — the Kanban card (line 61) calls the notes-specific action, while the status action also silently supports notes. If the auth check or error path in one action ever diverges from the other, the behaviour becomes inconsistent.
**Fix:** Either (a) remove `notes?` from `updateAppointmentStatusAction` signature and always use the dedicated notes action, or (b) remove `updateAppointmentNotesAction` and pass `notes` to `updateAppointmentStatusAction` with a `null` status (requires a type change). The cleaner approach is (a): keep concerns separated so status-change and notes-change are distinct operations, matching how the UI already uses them.

---

### IN-05 — `createPatientAction`'s `clinical_notes` schema field is validated but never inserted

**File:** `app/(portal)/actions/patients.ts:25`, `app/(portal)/actions/patients.ts:120-127`
**Issue:** `receptionistPatientSchema` includes `clinical_notes: z.string().optional()` (line 25). The `createPatientAction` validates the form against this schema but then constructs the insert payload explicitly without `clinical_notes` (lines 120-127). The comment on line 101 documents this intent, so the omission is deliberate, but the schema field is dead validation — it is parsed and discarded. A reader of the schema reasonably expects every field in it to be used.
**Fix:** Remove `clinical_notes` from `receptionistPatientSchema` and define a separate `adminUpdateSchema` that extends the base schema with `clinical_notes`. This makes the schema accurately describe what each action accepts.

---

### IN-06 — `doctorId` cast to `string` is redundant given Supabase's return type

**File:** `app/(portal)/actions/patients.ts:217`
**Issue:** `const doctorId = doctorRow.id as string;` — `doctorRow` is typed by Supabase's generated types; the `.id` field is already `string`. The `as string` cast adds noise without providing type safety.
**Fix:** `const doctorId = doctorRow.id;`

---

### IN-07 — `InlineEditCell` error ring state is never cleared after `onBlur`-triggered error

**File:** `components/portal/InlineEditCell.tsx:62-69`
**Issue:** When `handleSave` results in an error, `ringState` is set to `'error'` (line 63). The only way to clear the error ring is to press Escape (line 93, which also reverts the value). There is no timeout to automatically dismiss the error ring, and the user cannot see the error message (it goes to a toast). The red ring persists until the user presses Escape or navigates away — which is confusing if the user wants to re-edit and try a different value, since the ring stays red while they type.
**Fix:** Reset `ringState` to `'idle'` when the user starts editing after an error:

```ts
onChange={(e) => {
  if (ringState === 'error') setRingState('idle');
  setLocalValue(e.target.value);
}}
```

---

### IN-08 — Magic number `8` in departments featured-count label

**File:** `app/(portal)/content/departments/DepartmentsClient.tsx:222`
**Issue:** `{featuredCount} of 8 featured` — the `8` is a hardcoded magic number with no named constant or comment explaining why 8 is the limit. `DoctorsClient.tsx:262` has `of 3 featured` similarly hardcoded. These limits are presumably UI layout constraints (homepage card grid), but they are invisible to the server action that enforces the real limit (if any).
**Fix:** Define named constants at the top of each file:

```ts
const MAX_FEATURED_DEPARTMENTS = 8;
const MAX_FEATURED_DOCTORS = 3;
// then in JSX:
{featuredCount} of {MAX_FEATURED_DEPARTMENTS} featured
```

---

### IN-09 — `useTransition` destructured with `_` placeholder but `startTransition` is used

**File:** `components/portal/PatientClient.tsx:392`
**Issue:** `const [, startTransition] = useTransition();` — the first element (the `isPending` boolean from the transition) is discarded with a blank comma. `startTransition` is used in `handleSuccess` (line 424). This is fine, but if the component ever adds a loading indicator for the navigation transition, the discarded boolean is already available — worth naming it even if currently unused: `const [_isNavigating, startTransition] = useTransition()`. This is a very minor style note.
**Fix:** `const [_isNavigating, startTransition] = useTransition();` — explicit underscore prefix signals intentional non-use.

---

_Reviewed: 2026-06-19_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard — cleanup focus_
