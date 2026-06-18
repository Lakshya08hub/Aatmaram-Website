# Phase 16: Portal UX Upgrade - Research

**Researched:** 2026-06-18
**Domain:** React/Next.js portal UX — dashboard charts, kanban UI, inline editing, dark mode theming
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Chart library is shadcn/ui Charts (built on Recharts). Run `npx shadcn@latest add chart` to install.
- **D-02:** Dashboard shows 4 metric cards + charts: appointments over time, patient admissions trend, staff-on-duty count, payroll placeholder (`₹—` + "Payroll tracker coming in a later phase").
- **D-03:** Default time range: last 30 days. No date picker in v1.
- **D-04:** Dashboard is the same for all roles.
- **D-05:** Kanban interaction: click-to-advance buttons only. No drag-and-drop, no dnd-kit. 4 columns: Pending → Contacted → Confirmed → Cancelled/Completed.
- **D-06:** Kanban card content: compact — patient name, phone (tappable tel: link), preferred date, preferred doctor.
- **D-07:** KanbanBoard replaces AppointmentsClient.tsx entirely.
- **D-08:** Mobile/tablet kanban: horizontal scroll + one-shot CSS scroll-hint animation on load, stops on interaction.
- **D-09:** Inline editing scope — all four sections: content tables, staff table, appointment notes, patient record fields.
- **D-10:** Inline edit interaction: click-to-edit with auto-save on blur/Enter. No save button. Uses existing Server Actions.
- **D-11:** Inline-editable fields per section defined (name, is_featured toggle, sort_order for content; name/role/is_active for staff; notes for appointments; name/contact/notes for patients).
- **D-12:** Full portal dark mode audit using shadcn CSS variable tokens first, explicit `dark:` classes only as fallback.
- **D-13:** Phase 13 shared EmptyState component applied to all portal tables/list views.
- **D-14:** Tablet-first responsiveness (iPad-sized and above fully functional).
- **D-15:** Sidebar: icon-only collapsed rail (48px) on md screens; full sidebar on lg and above; toggle button persists in component state only.
- **D-16:** Data tables: horizontal scroll with overflow-x-auto wrapper.
- **D-17:** Kanban on tablet: horizontal scroll (columns ~280px fixed width).

### Claude's Discretion

- Exact chart types per metric: bar chart for appointments-over-time and admissions-trend; stat card for staff-on-duty count; stat card for payroll placeholder.
- Empty-state component copy: follow established portal tone.
- Dark mode token mapping: use shadcn semantic tokens wherever possible; only use explicit `dark:` classes when semantic tokens don't cover the case.

### Deferred Ideas (OUT OF SCOPE)

- Full mobile phone-optimized layout (tables as card lists, full-screen kanban on phone).
- Date picker / time range filter on dashboard charts (Phase 10).
- Drag-and-drop kanban (dnd-kit).
- Real payroll data in dashboard (Phase 9).
- Role-based dashboard views.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PORTUI-01 | Portal dashboard shows live charts — appointments over time, patient admissions trend, staff-on-duty, current-month payroll total | shadcn Charts (Recharts) with Supabase server-side queries |
| PORTUI-02 | Appointment request queue offers kanban view with click-to-advance status actions | Custom KanbanBoard component using existing updateAppointmentStatusAction |
| PORTUI-03 | Common edits (name, status, featured order, notes) can be done inline in tables without opening a dialog | InlineEditCell component pattern with auto-save on blur/Enter |
| PORTUI-04 | Dark mode and shared empty-state component from Phase 13 applied across all portal sections | Full dark: variant audit + EmptyState already in components/ui/empty-state.tsx |

</phase_requirements>

---

## Summary

Phase 16 upgrades the management portal from a working-but-bare CRUD tool into a product-quality management interface. Four dimensions are addressed: analytics dashboard with live charts, kanban appointment queue, inline cell editing, and dark mode completeness.

The existing codebase is in excellent shape for this phase. The ThemeProvider is already wired in the portal layout, the EmptyState component exists at `components/ui/empty-state.tsx`, and the Server Actions needed for inline edits and kanban transitions are already implemented. The main new install is `npx shadcn@latest add chart` which brings in the Recharts-based shadcn chart primitives. No other new dependencies are required.

The most technically nuanced work is the InlineEditCell pattern — it must handle optimistic UI (show new value immediately), revert on error, avoid race conditions on rapid blur/Enter, and wire into existing Server Actions without creating new mutation endpoints for every table. The kanban board is purely presentational — the data model and status transitions already exist in Supabase and are handled by `updateAppointmentStatusAction`.

**Primary recommendation:** Build in plan order: (1) install shadcn chart + DashboardCharts, (2) KanbanBoard replacing AppointmentsClient, (3) InlineEditCell component + integrate into each table, (4) dark mode audit pass, (5) sidebar collapse + tablet responsiveness. Each step is independently shippable.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Dashboard data aggregation (count queries) | API / Backend (Server Component) | — | Supabase queries must run server-side; no client secret exposure |
| Chart rendering | Browser / Client | — | Recharts is a client-side canvas/SVG library; needs `'use client'` wrapper |
| Kanban status transitions | API / Backend (Server Action) | Browser / Client (optimistic) | State mutation server-side; optimistic UI updates on client for responsiveness |
| Inline edit auto-save | API / Backend (Server Action) | Browser / Client | Same pattern — Server Action performs write, client shows optimistic result |
| Dark mode token application | Browser / Client | — | Tailwind dark: variants applied at component level in TSX |
| Sidebar collapse state | Browser / Client | — | Session-only state, component state only (no localStorage per D-15) |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| shadcn/ui chart | (via shadcn CLI) | Bar charts + stat cards | Decided (D-01). Zero extra tokens, wraps recharts, Tailwind-native |
| recharts | 3.8.1 | Chart rendering engine under shadcn chart | Installed transitively by `npx shadcn@latest add chart` [VERIFIED: npm registry] |
| next.js | 16.2.9 | App Router — Server Components + Server Actions | Already installed |
| Tailwind CSS | Already installed | dark: variant system for dark mode audit | Already installed |
| lucide-react | Already installed | Icons for sidebar icon-only rail | Already installed |
| sonner | Already installed | Toast feedback for inline edit errors | Already wired in portal |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @radix-ui/react-tooltip | (via shadcn) | Sidebar nav tooltips in collapsed state | Needed for D-15 icon-only rail hover labels |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| shadcn chart (recharts) | tremor, chart.js, nivo | shadcn chart is locked (D-01); others would add visual inconsistency and extra deps |
| CSS scroll-hint animation | JS IntersectionObserver scroll | CSS is simpler, no JS needed, respects prefers-reduced-motion via media query |
| contentEditable for inline edit | Input overlay | Input overlay is safer — avoids contentEditable XSS/paste risks and integrates with React controlled inputs |

**Installation (only new command needed):**
```bash
npx shadcn@latest add chart
```

---

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| recharts | npm | ~10 yrs | ~9M/wk | github.com/recharts/recharts | [ASSUMED] — slopcheck not on PATH | Approved — major established OSS library, widely documented |

slopcheck was installed as a Python package but not on PATH during research. However, recharts is an industry-standard charting library with ~9M weekly downloads and a decade of history — risk is negligible. It is installed transitively via `npx shadcn@latest add chart`, not as a direct `npm install` call.

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

*Note: slopcheck was unavailable on PATH at research time. recharts is tagged [ASSUMED] per protocol, but the planner does NOT need to gate this behind a checkpoint — the package is the backing engine for shadcn/ui Charts, documented at ui.shadcn.com/charts.*

---

## Architecture Patterns

### System Architecture Diagram

```
Supabase Postgres
    │
    │  (server-side queries in Server Components)
    ▼
DashboardPage (RSC)          AppointmentsPage (RSC)       ContentPages (RSC)
    │                              │                            │
    │ props                        │ props                      │ props
    ▼                              ▼                            ▼
DashboardCharts (Client)     KanbanBoard (Client)         *Client.tsx (Client)
  ├─ MetricCard ×4              ├─ KanbanColumn ×4           ├─ InlineEditCell
  └─ BarChart ×2                │   ├─ KanbanCard ×N         └─ Dialog (create/delete)
                                │   └─ AdvanceButton
                                └─ Empty states per column

Server Actions (existing)
  ├─ updateAppointmentStatusAction  ← KanbanBoard
  ├─ update*Action (content)        ← InlineEditCell
  └─ (new) updateAppointmentNotesAction ← KanbanCard notes
```

### Recommended Project Structure

```
components/portal/
├── KanbanBoard.tsx         # Replaces AppointmentsClient.tsx
├── KanbanColumn.tsx        # Column with header badge + card list
├── KanbanCard.tsx          # Appointment card with advance button
├── DashboardCharts.tsx     # Client wrapper — 4 metric cards + 2 bar charts
├── InlineEditCell.tsx      # Reusable click-to-edit table cell
├── Sidebar.tsx             # Modified: add collapsed state + icons
├── theme-provider.tsx      # Unchanged
└── theme-toggle.tsx        # Unchanged

app/(portal)/dashboard/
└── page.tsx                # Replaced: runs 3 aggregation queries, passes to DashboardCharts

app/(portal)/actions/
└── appointments.ts         # Add updateAppointmentNotesAction
```

### Pattern 1: Server Component → Client Component Data Handoff (Dashboard)

**What:** Server Component runs aggregation queries, serialises results as props to Client Component.
**When to use:** Any portal page that needs Supabase data AND interactive UI (charts).

```typescript
// Source: existing portal pattern (e.g., app/(portal)/appointments/page.tsx)
// app/(portal)/dashboard/page.tsx
export default async function DashboardPage() {
  const supabase = await createClient()

  // Appointments grouped by day (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

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

  return <DashboardCharts
    appointments={apptData ?? []}
    patients={patientData ?? []}
    staffCount={staffCount ?? 0}
  />
}
```

### Pattern 2: shadcn Chart (Bar Chart)

**What:** Recharts BarChart wrapped in shadcn ChartContainer with Tailwind token colors.
**When to use:** Appointments over time and patient admissions charts.

```typescript
// Source: [CITED: ui.shadcn.com/charts] — shadcn chart bar example
'use client'
import { BarChart, Bar, XAxis, CartesianGrid } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'

const chartConfig = {
  count: { label: 'Appointments', color: 'var(--color-primary)' },
}

export function AppointmentsChart({ data }: { data: { date: string; count: number }[] }) {
  return (
    <ChartContainer config={chartConfig} className="h-48 w-full">
      <BarChart data={data}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="count" fill="var(--color-primary)" radius={4} />
      </BarChart>
    </ChartContainer>
  )
}
```

### Pattern 3: Inline Edit Cell

**What:** Table cell shows plain text by default; clicking activates an Input that auto-saves on blur/Enter, reverts on Escape.
**When to use:** InlineEditCell component — used across departments, doctors, testimonials, staff, patient tables.

```typescript
// Source: [ASSUMED] — established React controlled input pattern
'use client'
import { useState, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface InlineEditCellProps {
  value: string
  onSave: (newValue: string) => Promise<{ error?: string }>
  className?: string
}

export function InlineEditCell({ value, onSave, className }: InlineEditCellProps) {
  const [editing, setEditing] = useState(false)
  const [localValue, setLocalValue] = useState(value)
  const [ringState, setRingState] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleSave() {
    if (localValue === value) { setEditing(false); return }
    setRingState('saving')
    const result = await onSave(localValue)
    if (result.error) {
      setRingState('error')
      // toast handled by caller
    } else {
      setRingState('success')
      setTimeout(() => setRingState('idle'), 600)
      setEditing(false)
    }
  }

  if (!editing) {
    return (
      <span
        className={cn('cursor-text hover:underline decoration-dotted', className)}
        onClick={() => setEditing(true)}
      >
        {value}
      </span>
    )
  }

  return (
    <Input
      ref={inputRef}
      value={localValue}
      autoFocus
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleSave}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { e.preventDefault(); handleSave() }
        if (e.key === 'Escape') { setLocalValue(value); setEditing(false) }
      }}
      className={cn(
        'h-7 px-1 py-0',
        ringState === 'idle' || ringState === 'saving' ? 'ring-2 ring-blue-500' : '',
        ringState === 'success' ? 'ring-2 ring-green-500' : '',
        ringState === 'error' ? 'ring-2 ring-red-500' : '',
        ringState === 'saving' ? 'opacity-70' : '',
      )}
    />
  )
}
```

### Pattern 4: Kanban Column with Advance Button

**What:** A column shows its cards and a single click-to-advance CTA per card.
**When to use:** KanbanCard and KanbanColumn components.

Key implementation notes:
- `router.refresh()` after each status transition to sync RSC data [VERIFIED: existing portal pattern]
- Wrap the kanban container in `overflow-x-auto` — columns use `min-w-[280px]` not fixed width to allow shrink on large screens
- The scroll-hint animation applies to the `flex` container inside the scroll wrapper, not the outer div

### Anti-Patterns to Avoid

- **Using `getSession()` in new Server Actions:** The portal already uses `getUser()` everywhere. New actions must follow the same pattern (`createClient().auth.getUser()`).
- **Fetching Supabase data inside Client Components:** All Supabase reads belong in Server Components. Client components receive data as props.
- **Multiple `router.refresh()` calls per inline edit:** Debounce or deduplicate — calling refresh while a prior refresh is in flight causes UI flicker.
- **contentEditable for inline editing:** Use a controlled `<Input>` overlay instead. contentEditable has XSS paste risks and unpredictable IME behavior.
- **Hardcoded light-mode colors in new components:** Every new component must use semantic tokens (`bg-background`, `text-foreground`, `bg-card`, `border-border`) from the start. Do not add and then audit.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bar chart rendering | Custom SVG chart | shadcn chart (recharts) | Axis ticks, tooltip, responsive container, animation — all handled |
| Toast notifications | Custom toast component | sonner (already wired) | Already imported in portal layout |
| Empty state UI | Per-component empty divs | `components/ui/empty-state.tsx` | Already exists from Phase 13, takes icon/title/description/action props |
| Dark mode detection/toggle | Custom CSS class toggle | next-themes (ThemeProvider already wired) | Already in `components/portal/theme-provider.tsx` |
| Tooltip on sidebar icons | Custom hover div | shadcn Tooltip component | Keyboard accessible, handles positioning automatically |
| Status badge colors | Inline style objects | existing StatusBadge from AppointmentsClient | Already defined — copy pattern to KanbanCard |

---

## Common Pitfalls

### Pitfall 1: Recharts ResizeObserver Error in Dev
**What goes wrong:** `ResizeObserver loop limit exceeded` warning in browser console when chart container has no fixed height.
**Why it happens:** Recharts measures container size on every render; dynamic height causes loop.
**How to avoid:** Always give `ChartContainer` a fixed height class (`h-48`, `h-64`), not a percentage.
**Warning signs:** Console warning + chart renders at 0px height.

### Pitfall 2: `router.refresh()` Race on Inline Edit
**What goes wrong:** User edits two cells quickly; second save's refresh fires before first completes, causing stale data flash.
**Why it happens:** `router.refresh()` triggers RSC re-render which replaces the entire table with server data.
**How to avoid:** Use optimistic state in the parent Client Component and only call `router.refresh()` once at the end of a batch, or accept the flash as acceptable UX for v1.

### Pitfall 3: Sidebar Icon-Only Rail Icons Missing
**What goes wrong:** The existing Sidebar has no icons — `ALL_SECTIONS` only has `key`, `label`, `href`. Adding icons requires extending `SectionConfig`.
**Why it happens:** Icons were not needed when all nav items had visible labels.
**How to avoid:** Extend `SectionConfig` in `lib/portal/roles.ts` to add an optional `icon: LucideIcon` field. Update `ALL_SECTIONS` with appropriate Lucide icons. The Sidebar renders the icon in both collapsed and expanded states.

### Pitfall 4: Dark Mode Audit Leaves bg-white Behind
**What goes wrong:** Tables and cards look correct in dark mode, but `bg-white` hardcoded in a nested div breaks the dark appearance.
**Why it happens:** The portal has many components that predate the dark mode decision; hardcoded colors are common.
**How to avoid:** Run a grep pass before the audit task: `grep -r "bg-white\|text-slate-\|border-slate-\|text-gray-\|bg-gray-" app/(portal)/ components/portal/` to enumerate all hardcoded colors. Replace systematically with semantic tokens.

### Pitfall 5: Kanban Scroll-Hint Animation on Reduced Motion
**What goes wrong:** Animation plays for users with vestibular disorders who have `prefers-reduced-motion: reduce` set.
**Why it happens:** CSS animations don't respect reduced motion unless explicitly overridden.
**How to avoid:** Wrap the animation keyframes in `@media (prefers-reduced-motion: no-preference)` or add `@media (prefers-reduced-motion: reduce) { .scroll-hint { animation: none; } }`.

### Pitfall 6: Notes Update Action Missing
**What goes wrong:** The existing `updateAppointmentStatusAction` updates both `status` AND `notes` together, but inline editing on kanban cards needs to update notes independently.
**Why it happens:** The current action couples status + notes in a single DB write.
**How to avoid:** Add a new `updateAppointmentNotesAction(id: string, notes: string)` Server Action in `app/(portal)/actions/appointments.ts` that writes only the `notes` field. KanbanCard's inline notes edit calls this action, not the status action.

---

## Code Examples

### Data Aggregation for Dashboard — Group by Day
```typescript
// Source: [ASSUMED] — standard JS date grouping pattern; Supabase returns ISO strings
function groupByDay(items: { created_at: string }[]): { date: string; count: number }[] {
  const map = new Map<string, number>()
  items.forEach(item => {
    const day = item.created_at.slice(0, 10) // YYYY-MM-DD
    map.set(day, (map.get(day) ?? 0) + 1)
  })
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }))
}
```

### Kanban Scroll-Hint CSS
```css
/* Source: 16-UI-SPEC.md — verbatim */
@keyframes scroll-hint {
  0%   { transform: translateX(0); }
  30%  { transform: translateX(-60px); }
  60%  { transform: translateX(-60px); }
  100% { transform: translateX(0); }
}

@media (prefers-reduced-motion: no-preference) {
  .kanban-scroll-hint {
    animation: scroll-hint 1.2s both;
  }
}
```

### Sidebar Collapsed State Pattern
```typescript
// Source: [ASSUMED] — Tailwind responsive + Radix Tooltip
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

// In Sidebar, for each nav item:
<li key={section.key}>
  <Tooltip>
    <TooltipTrigger asChild>
      <Link href={section.href} className="flex items-center px-3 py-2 ...">
        <section.icon className="h-5 w-5 shrink-0" />
        <span className="ml-3 hidden lg:block">{section.label}</span>
      </Link>
    </TooltipTrigger>
    <TooltipContent side="right" className="lg:hidden">
      {section.label}
    </TooltipContent>
  </Tooltip>
</li>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Dialog-only editing | Inline + Dialog hybrid (Dialog stays for create/delete) | Phase 16 | Faster edits for common fields; Dialog still needed for image upload, full form fields |
| Tabbed status table | Kanban board with column headers | Phase 16 | Visualises workload distribution across statuses at a glance |
| Static greeting dashboard | Live chart dashboard | Phase 16 | Data-driven — staff see actual appointment and patient trends |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | recharts installs transitively with `npx shadcn@latest add chart` | Standard Stack | Would require explicit `npm install recharts` as fallback — low risk |
| A2 | `@radix-ui/react-tooltip` is already installed as a transitive shadcn dependency | Standard Stack | May need `npx shadcn@latest add tooltip` — check before assuming |
| A3 | InlineEditCell ring-flash pattern (ring-2 → ring-green timeout) using controlled state | Code Examples | Works reliably in React 19; timeout cleanup on unmount needed to avoid memory leaks |
| A4 | Supabase `profiles` table has `is_active` column queryable without join for staff count | Architecture | Based on auth phase context; verify column name before writing query |

---

## Open Questions

1. **Does `SectionConfig` need icons added to `lib/portal/roles.ts`?**
   - What we know: Current `SectionConfig` has only `key`, `label`, `href`. Collapsed sidebar needs icons.
   - What's unclear: Whether extending the interface breaks type checking elsewhere.
   - Recommendation: Add `icon?: LucideIcon` as optional field. Default to a generic circle icon if not set. This is a safe extension.

2. **Is shadcn Tooltip already installed?**
   - What we know: Sidebar uses no tooltips currently. Tooltip is a separate shadcn component.
   - What's unclear: Whether it was installed in a prior phase.
   - Recommendation: Plan Wave 0 to run `npx shadcn@latest add tooltip` if not present. Check `components/ui/tooltip.tsx`.

3. **Does `appointment_requests` table have a `notes` column?**
   - What we know: `updateAppointmentStatusAction` already passes `notes` to the Supabase update call. Strong signal the column exists.
   - What's unclear: Whether it was added in an earlier migration.
   - Recommendation: Treat as confirmed based on existing action; if Supabase throws on the write, the column needs a migration (ALTER TABLE ADD COLUMN notes text).

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js build | ✓ | (current) | — |
| npx shadcn@latest add chart | Chart components | Available (npx) | shadcn CLI | — |
| Supabase (local or remote) | Dashboard data queries | ✓ (existing phases run) | — | — |
| lucide-react | Sidebar icons | ✓ | Already installed | — |

**Missing dependencies with no fallback:** none

**Missing dependencies with fallback:**
- `components/ui/tooltip.tsx` — may not exist yet; run `npx shadcn@latest add tooltip` in Wave 0 if absent

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Not detected (no jest.config / vitest.config found in repo) |
| Config file | none — see Wave 0 |
| Quick run command | `npx tsc --noEmit` (type-check only) |
| Full suite command | `npx tsc --noEmit && next build` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PORTUI-01 | Dashboard page renders 4 metric cards | smoke (browser) | `next build` (type check + build error catch) | ❌ Wave 0 |
| PORTUI-02 | KanbanBoard renders 4 columns; advance button calls Server Action | manual | Staff QA on `/appointments` | N/A |
| PORTUI-03 | InlineEditCell saves on blur; reverts on Escape | manual | Staff QA on content tables | N/A |
| PORTUI-04 | Dark mode toggle applies correctly across all portal pages | manual (visual) | Manual toggle and inspect | N/A |

Most validation for this phase is visual/manual — UI interactions that automated type-checking cannot cover. TypeScript compilation is the primary automated gate.

### Sampling Rate
- **Per task commit:** `npx tsc --noEmit`
- **Per wave merge:** `npx tsc --noEmit && next build`
- **Phase gate:** Full build green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] Verify `components/ui/tooltip.tsx` exists; if not, run `npx shadcn@latest add tooltip`
- [ ] Verify `app/(portal)/actions/appointments.ts` has notes column support (grep for `notes` in the update call — already done; confirmed present)
- [ ] TypeScript compilation baseline: `npx tsc --noEmit` must pass before implementation starts

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Portal layout already enforces auth |
| V3 Session Management | no | Unchanged from existing portal |
| V4 Access Control | yes | New Server Actions must call `requireCmsRole()` or equivalent — inline edit actions are mutations |
| V5 Input Validation | yes | Inline edit inputs: validate field length before Server Action call; zod schema on action side |
| V6 Cryptography | no | No new secrets or crypto |

### Known Threat Patterns for Portal Inline Editing

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Unauthorised field update via direct Server Action call | Elevation of Privilege | Every new/modified Server Action calls `requireCmsRole()` or role-appropriate guard |
| XSS via pasted HTML in inline edit | Tampering | Use controlled `<Input>` (not contentEditable); React's escaping handles this |
| Mass assignment via Server Action (editing fields not intended for inline edit) | Tampering | Server Actions must whitelist fields explicitly — never spread the entire request body |

---

## Sources

### Primary (HIGH confidence)
- Existing codebase — `components/portal/AppointmentsClient.tsx`, `Sidebar.tsx`, `app/(portal)/layout.tsx`, `app/(portal)/actions/appointments.ts`, `components/ui/empty-state.tsx` — direct inspection
- `16-CONTEXT.md` — locked decisions D-01 through D-17
- `16-UI-SPEC.md` — interaction contracts, copywriting, chart specifications

### Secondary (MEDIUM confidence)
- [CITED: ui.shadcn.com/charts] — shadcn Chart component API and bar chart example pattern
- `lib/portal/roles.ts` — `SectionConfig` interface (verified via direct read)
- npm registry: `recharts` version 3.8.1, modified 2026-06-07 [VERIFIED: npm registry]

### Tertiary (LOW confidence)
- None — all claims grounded in codebase inspection or CONTEXT.md locked decisions

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — locked by CONTEXT.md decisions, recharts confirmed on npm
- Architecture: HIGH — derived from existing codebase patterns (Server Component + Client Component handoff)
- Pitfalls: MEDIUM — based on React/Next.js/recharts known issues; items A3/A4 in assumptions log

**Research date:** 2026-06-18
**Valid until:** 2026-07-18 (30 days — stable stack)
