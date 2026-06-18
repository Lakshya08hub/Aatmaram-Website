# Phase 16: Portal UX Upgrade - Pattern Map

**Mapped:** 2026-06-18
**Files analyzed:** 8 new/modified files
**Analogs found:** 8 / 8

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `components/portal/KanbanBoard.tsx` | component | request-response | `components/portal/AppointmentsClient.tsx` | exact |
| `components/portal/KanbanColumn.tsx` | component | request-response | `components/portal/AppointmentsClient.tsx` (AppointmentTable sub-component) | role-match |
| `components/portal/KanbanCard.tsx` | component | request-response | `components/portal/AppointmentsClient.tsx` (TableRow rendering) | role-match |
| `components/portal/DashboardCharts.tsx` | component | request-response | `components/portal/AppointmentsClient.tsx` (client wrapper pattern) | role-match |
| `components/portal/InlineEditCell.tsx` | component | request-response | `app/(portal)/content/departments/DepartmentsClient.tsx` (order input blur-save) | exact |
| `components/portal/Sidebar.tsx` | component | request-response | `components/portal/Sidebar.tsx` (self — modify in place) | exact |
| `app/(portal)/dashboard/page.tsx` | page (Server Component) | CRUD | `app/(portal)/appointments/page.tsx` | exact |
| `app/(portal)/actions/appointments.ts` | server action | CRUD | `app/(portal)/actions/appointments.ts` (self — add notes action) | exact |

---

## Pattern Assignments

### `components/portal/KanbanBoard.tsx` (component, request-response)

**Analog:** `components/portal/AppointmentsClient.tsx`

**Imports pattern** (lines 1-27):
```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { AppointmentRequest } from '@/lib/db/appointment_requests'
import { updateAppointmentStatusAction } from '@/app/(portal)/actions/appointments'
```

**Status type + filtering pattern** (lines 28-31, 186-189):
```typescript
type AppointmentStatus = 'pending' | 'contacted' | 'confirmed' | 'cancelled'

// Filter appointments into columns by status:
const pending   = appointments.filter((a) => a.status === 'pending')
const contacted = appointments.filter((a) => a.status === 'contacted')
const confirmed = appointments.filter((a) => a.status === 'confirmed')
const cancelled = appointments.filter((a) => a.status === 'cancelled')
```

**Server Action call + router.refresh pattern** (lines 205-224):
```typescript
async function handleSaveStatus(id: string) {
  const rowState = rowStates.get(id)
  if (!rowState) return
  try {
    const result = await updateAppointmentStatusAction(
      id,
      rowState.status,
      rowState.notes || undefined
    )
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Status updated')
      updateRowState(id, { dirty: false })
      router.refresh()
    }
  } catch {
    toast.error('Failed to update. Try again.')
  }
}
```

**Column count badge pattern** (lines 58-65) — reuse TabBadge amber color logic for column headers:
```typescript
function TabBadge({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
      {count}
    </span>
  )
}
```

**Kanban container layout** — replace the Tabs wrapper with a horizontal-scroll flex container:
```typescript
// Instead of <Tabs>, use:
<div className="overflow-x-auto">
  <div className="flex gap-4 min-w-max p-1 kanban-scroll-hint">
    {/* KanbanColumn × 4, each min-w-[280px] */}
  </div>
</div>
```

---

### `components/portal/KanbanColumn.tsx` (component, request-response)

**Analog:** `components/portal/AppointmentsClient.tsx` (TabContent + EmptyState sub-pattern)

**Column header with badge** (derive from TabBadge + StatusBadge patterns):
```typescript
// Column header color mapping — derive from StatusBadge config (lines 48-55):
const COLUMN_HEADER_COLORS: Record<AppointmentStatus, string> = {
  pending:   'bg-amber-100 text-amber-800',
  contacted: 'bg-blue-100 text-blue-800',
  confirmed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}
```

**EmptyState per column** (lines 67-78 — adapt from existing EmptyState pattern):
```typescript
// Existing inline EmptyState pattern used in AppointmentsClient:
<div className="py-12 text-center text-sm text-muted-foreground">
  <p className="font-semibold">No {tabLabel} appointments</p>
  <p className="mt-1">
    {tabValue === 'pending'
      ? 'New requests will appear here when patients submit the appointment form.'
      : 'No appointments in this status.'}
  </p>
</div>
// Phase 16: Replace with shared EmptyState component from components/ui/empty-state.tsx
```

---

### `components/portal/KanbanCard.tsx` (component, request-response)

**Analog:** `components/portal/AppointmentsClient.tsx` (TableRow rendering + StatusBadge)

**Card data fields** (lines 116-135 — compact subset):
```typescript
// Fields to show on kanban card (from TableRow rendering):
row.patient_name          // font-semibold
row.phone                 // <a href={`tel:${row.phone}`} className="text-blue-600 underline">
row.preferred_date        // new Date(row.preferred_date).toLocaleDateString('en-IN')
row.preferred_doctor
// row.reason is NOT shown on card (D-06)
```

**StatusBadge** (lines 47-56 — copy verbatim to KanbanCard):
```typescript
function StatusBadge({ status }: { status: AppointmentStatus }) {
  const config: Record<AppointmentStatus, { className: string; label: string }> = {
    pending:   { className: 'bg-amber-100 text-amber-800 font-semibold', label: 'Pending' },
    contacted: { className: 'bg-blue-100 text-blue-800 font-semibold', label: 'Contacted' },
    confirmed: { className: 'bg-green-100 text-green-800 font-semibold', label: 'Confirmed' },
    cancelled: { className: 'bg-red-100 text-red-800 font-semibold', label: 'Cancelled' },
  }
  const { className, label } = config[status]
  return <Badge className={className}>{label}</Badge>
}
```

**Advance button → calls updateAppointmentStatusAction** (lines 205-224 pattern, simplified):
```typescript
// Click-to-advance: no dirty state needed — advance to next status directly
async function handleAdvance() {
  const result = await updateAppointmentStatusAction(appointment.id, nextStatus)
  if (result.error) { toast.error(result.error) }
  else { toast.success('Status updated'); router.refresh() }
}
```

---

### `components/portal/DashboardCharts.tsx` (component, request-response)

**Analog:** `components/portal/AppointmentsClient.tsx` (Client Component that receives Server Component props)

**Client wrapper import pattern** (derive from AppointmentsClient lines 1-26):
```typescript
'use client'

import { useRouter } from 'next/navigation'
// Add shadcn chart imports:
import { BarChart, Bar, XAxis, CartesianGrid } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
```

**Props interface pattern** (lines 36-39 — adapt for dashboard):
```typescript
interface Props {
  appointments: { created_at: string }[]
  patients: { created_at: string }[]
  staffCount: number
}
```

**Metric stat card** — use `components/ui/card.tsx`:
```typescript
<Card>
  <CardHeader><CardTitle>Staff On Duty</CardTitle></CardHeader>
  <CardContent>
    <p className="text-4xl font-bold">{staffCount}</p>
    <p className="text-sm text-muted-foreground">Active staff members</p>
  </CardContent>
</Card>
```

---

### `components/portal/InlineEditCell.tsx` (component, request-response)

**Analog:** `app/(portal)/content/departments/DepartmentsClient.tsx` (sort_order blur-save pattern, lines 265-284)

**Closest real pattern in codebase — order input onBlur auto-save** (lines 265-284):
```typescript
<input
  type="number"
  value={fs.order}
  className="w-14 border rounded px-1 text-sm"
  onChange={(e) => {
    const val = Number(e.target.value)
    if (e.target.value === '' || isNaN(val)) return
    setFeaturedState((prev) => ({
      ...prev,
      [dept.id]: { ...prev[dept.id], order: val },
    }))
  }}
  onBlur={async (e) => {
    if (e.target.value === '') return
    const val = Number(e.target.value)
    if (isNaN(val) || val === (dept.featured_order ?? 0)) return
    await setFeaturedOrder('departments', dept.id, val)
  }}
/>
```

**Generalise into InlineEditCell** — the RESEARCH.md pattern (lines 254-316) is the target implementation. Key differences from the analog:
- Generic `value: string` + `onSave: (newValue: string) => Promise<{ error?: string }>` props
- Ring-state visual feedback: `ring-2 ring-blue-500` → `ring-green-500` (success flash) → `ring-red-500` (error)
- Revert on Escape: `setLocalValue(value); setEditing(false)`
- Uses `<Input>` from `@/components/ui/input` (already in DepartmentsClient imports, line 26)

**Import pattern** (from DepartmentsClient lines 1-11, extract subset):
```typescript
'use client'
import { useState, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
```

**Error handling** (DepartmentsClient lines 156-168 pattern — adapt):
```typescript
const result = await onSave(localValue)
if (result.error) {
  toast.error(result.error)
  setRingState('error')
} else {
  setRingState('success')
  setTimeout(() => setRingState('idle'), 600)
  setEditing(false)
}
```

---

### `components/portal/Sidebar.tsx` (component, request-response) — MODIFY IN PLACE

**Analog:** `components/portal/Sidebar.tsx` (self)

**Current structure** (lines 13-60 — full file, small):
- Server Component (no `'use client'` directive)
- Props: `{ role: StaffRole }`
- Renders `ALL_SECTIONS` filtered by `ROLE_SECTIONS[role]`
- Nav items are `<Link>` — no icons

**What to add:**

1. Extend `SectionConfig` in `lib/portal/roles.ts` (line 7-11):
```typescript
import type { LucideIcon } from 'lucide-react'

export interface SectionConfig {
  key: string;
  label: string;
  href: string;
  icon?: LucideIcon;  // NEW — optional, add to each ALL_SECTIONS entry
}
```

2. Convert Sidebar to Client Component for `collapsed` state:
```typescript
'use client'
import { useState } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
```

3. Collapsed rail layout (new):
```typescript
<aside className={cn(
  'flex flex-col min-h-screen transition-all duration-200',
  collapsed ? 'w-12' : 'w-56',
  'bg-sidebar text-sidebar-foreground'
)}>
```

4. Nav item with Tooltip for collapsed state (from RESEARCH.md lines 427-439):
```typescript
<Tooltip>
  <TooltipTrigger asChild>
    <Link href={section.href} className="flex items-center px-3 py-2 ...">
      {section.icon && <section.icon className="h-5 w-5 shrink-0" />}
      <span className={cn('ml-3', collapsed && 'hidden')}>{section.label}</span>
    </Link>
  </TooltipTrigger>
  {collapsed && (
    <TooltipContent side="right">{section.label}</TooltipContent>
  )}
</Tooltip>
```

---

### `app/(portal)/dashboard/page.tsx` (Server Component page, CRUD) — REPLACE

**Analog:** `app/(portal)/appointments/page.tsx` (exact same RSC → Client Component handoff)

**RSC data-fetch + handoff pattern** (appointments/page.tsx lines 1-17):
```typescript
import { getSomeData } from '@/lib/db/...'
import ClientComponent from '@/components/portal/...'

export const dynamic = 'force-dynamic'

export default async function SomePage() {
  let data = []
  let fetchError = false
  try {
    data = await getSomeData()
  } catch {
    fetchError = true
  }
  return <ClientComponent data={data} fetchError={fetchError} />
}
```

**Dashboard-specific Supabase queries** — adapt from current dashboard/page.tsx (lines 22-35):
```typescript
const supabase = await createClient()
// Auth already enforced by layout — just fetch data:
const { data: apptData } = await supabase
  .from('appointment_requests')
  .select('created_at')
  .gte('created_at', thirtyDaysAgo)

const { data: patientData } = await supabase
  .from('patients')
  .select('created_at')
  .gte('created_at', thirtyDaysAgo)

const { count: staffCount } = await supabase
  .from('profiles')
  .select('*', { count: 'exact', head: true })
  .eq('is_active', true)
```

**Note:** Current dashboard/page.tsx (lines 39-48) uses hardcoded `text-slate-800`, `bg-white`, `border-slate-200` — do NOT copy those; use semantic tokens (`text-foreground`, `bg-background`, `border-border`) in the replacement.

---

### `app/(portal)/actions/appointments.ts` (server action, CRUD) — ADD notes action

**Analog:** `app/(portal)/actions/appointments.ts` (self — append new export)

**Existing Server Action structure to replicate** (lines 34-53):
```typescript
export async function updateAppointmentStatusAction(
  id: string,
  status: AppointmentStatus,
  notes?: string
): Promise<{ error?: string }> {
  try {
    await requireAppointmentRole()

    const { error } = await createAdminClient()
      .from('appointment_requests')
      .update({ status, notes: notes ?? null })
      .eq('id', id)

    if (error) throw new Error(error.message)

    return {}
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
```

**New action to add** — same shape, notes field only:
```typescript
export async function updateAppointmentNotesAction(
  id: string,
  notes: string
): Promise<{ error?: string }> {
  try {
    await requireAppointmentRole()

    const { error } = await createAdminClient()
      .from('appointment_requests')
      .update({ notes })
      .eq('id', id)

    if (error) throw new Error(error.message)

    return {}
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
```

---

## Shared Patterns

### Auth Guard (requireRole pattern)
**Source:** `app/(portal)/actions/appointments.ts` lines 12-32
**Apply to:** `updateAppointmentNotesAction` (new) and any other new Server Actions
```typescript
async function requireAppointmentRole() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile, error } = await supabase
    .from('profiles').select('role').eq('user_id', user.id).single()
  if (error || !profile || !APPOINTMENT_ROLES.includes(profile.role as StaffRole)) {
    throw new Error('Forbidden')
  }
  return supabase
}
```
**Rule:** Never use `getSession()` — always `getUser()`. New Server Actions must call the role guard before any DB mutation.

### Error Handling (Server Action return shape)
**Source:** `app/(portal)/actions/appointments.ts` lines 38-53
**Apply to:** All new Server Actions
```typescript
// Always return { error?: string } — never throw to the client
try {
  // ... mutation
  return {}
} catch (err) {
  return { error: err instanceof Error ? err.message : 'Unknown error' }
}
```

### Toast + router.refresh Pattern
**Source:** `components/portal/AppointmentsClient.tsx` lines 205-224
**Apply to:** KanbanBoard, KanbanCard, InlineEditCell
```typescript
if (result.error) {
  toast.error(result.error)
} else {
  toast.success('...')
  router.refresh()  // triggers RSC revalidation
}
```
**Rule:** Call `router.refresh()` exactly once per save — not inside loops or per-column.

### Dark Mode Token Rule
**Source:** `app/(portal)/layout.tsx` line 55 — `bg-background text-foreground` on `<main>`
**Apply to:** All new and modified components
- Use `bg-background`, `text-foreground`, `bg-card`, `text-card-foreground`, `border-border`, `text-muted-foreground` as first choice
- Only use explicit `dark:` classes when a semantic token doesn't exist for the use case
- Do NOT use: `bg-white`, `text-slate-800`, `text-slate-500`, `border-slate-200`, `bg-gray-*` — these break dark mode

### EmptyState Component
**Source:** `components/ui/empty-state.tsx` lines 1-37
**Apply to:** KanbanColumn (per-column empty state), and any portal table that can render empty
```typescript
import { EmptyState } from '@/components/ui/empty-state'
// Usage:
<EmptyState
  icon={CalendarX}
  title="No pending appointments"
  description="New requests will appear here when patients submit the appointment form."
/>
```
**Interface:** `{ icon: LucideIcon, title: string, description?: string, action?: ReactNode, className?: string }`

### Optimistic Toggle Pattern
**Source:** `app/(portal)/content/departments/DepartmentsClient.tsx` lines 248-259
**Apply to:** InlineEditCell (optimistic value display), KanbanCard advance button
```typescript
// Optimistic: update local state first, then call Server Action
// On error: revert local state + toast.error
setLocalState(newValue)
const result = await someAction(id, newValue)
if (result.error) {
  toast.error(result.error)
  setLocalState(originalValue)  // revert
}
```

---

## No Analog Found

All files have close codebase analogs. No entries in this section.

---

## Dark Mode Audit Scope

Files requiring `dark:` / semantic token audit (not new files — existing files to be modified):

| File | Hardcoded colors to replace | Pattern source |
|---|---|---|
| `app/(portal)/dashboard/page.tsx` | `text-slate-800`, `text-slate-500`, `text-slate-700`, `border-slate-200`, `bg-white` (lines 40-48) | `bg-background`, `text-foreground`, `border-border` |
| `app/(portal)/content/departments/DepartmentsClient.tsx` | `text-slate-800`, `text-slate-500`, `text-slate-700`, `border-slate-200`, `bg-white`, `bg-red-50`, `border-red-200` | Semantic tokens; `bg-destructive/10` for error banners |
| `components/portal/AppointmentsClient.tsx` | `bg-red-50`, `border-red-200`, `text-red-700` (fetch error banner) | Audit all hardcoded colors |

Run before audit task: `grep -r "bg-white\|text-slate-\|border-slate-\|text-gray-\|bg-gray-" app/\(portal\)/ components/portal/`

---

## Metadata

**Analog search scope:** `components/portal/`, `app/(portal)/`, `components/ui/`, `lib/portal/`
**Files scanned:** 8 (AppointmentsClient.tsx, appointments/page.tsx, actions/appointments.ts, dashboard/page.tsx, Sidebar.tsx, DepartmentsClient.tsx, empty-state.tsx, roles.ts)
**Pattern extraction date:** 2026-06-18
