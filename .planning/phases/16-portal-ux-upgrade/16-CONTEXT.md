# Phase 16: Portal UX Upgrade - Context

**Gathered:** 2026-06-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Upgrade four dimensions of the management portal so it feels like a real product:
1. **Analytics dashboard** — live charts using shadcn/ui Charts (Recharts-based) showing 4 metrics
2. **Kanban appointment queue** — visual columns with click-to-advance, replacing the existing tabbed table
3. **Inline editing** — click-to-edit with auto-save across content, staff, appointment notes, and patient record tables
4. **Dark mode + empty states** — full portal audit applying dark: Tailwind variants and the Phase 13 shared empty-state component to every section
5. **Tablet responsiveness** — collapsible icon-rail sidebar, horizontal-scroll tables, responsive kanban

No public-site changes. No new data models beyond what's already in Supabase. No drag-and-drop library.

</domain>

<decisions>
## Implementation Decisions

### Analytics Dashboard (Charts)
- **D-01:** Chart library is **shadcn/ui Charts** (built on Recharts). Zero additional visual friction — same Tailwind tokens as the rest of the portal. Run `npx shadcn@latest add chart` to install.
- **D-02:** Dashboard shows 4 metric cards + charts: (1) appointments over time, (2) patient admissions trend, (3) staff-on-duty count, (4) current-month payroll — **payroll card shows placeholder `₹0 (Payroll tracker coming soon)`** until Phase 9 ships. No payroll DB required in this phase.
- **D-03:** Default time range: **last 30 days**. No date picker in v1 — static 30-day window. Can be upgraded in Phase 10 (Analytics Dashboard).
- **D-04:** Dashboard is the **same for all roles** — all staff see the same 4 metrics. No role-gated views.

### Kanban Appointment Queue
- **D-05:** Interaction model: **visual columns with click-to-advance buttons** (no drag-and-drop, no dnd-kit dependency). 4 columns: Pending → Contacted → Confirmed → Cancelled/Completed.
- **D-06:** Card content: **compact** — patient name, phone (tappable `tel:` link), preferred date, preferred doctor. No reason/notes visible on the card.
- **D-07:** **Replaces** the existing tabbed table view entirely. The existing `components/portal/AppointmentsClient.tsx` gets replaced by a new `KanbanBoard.tsx`.
- **D-08:** Mobile/tablet layout: **horizontal scroll** with a one-shot CSS auto-scroll animation on load (marquee-style, plays once) to hint that more columns exist, then stops on interaction. Columns maintain fixed width ~280px.

### Inline Editing
- **D-09:** Scope — **all four sections**: content tables (departments, doctors, testimonials), staff table, appointment notes, patient record lightweight fields.
- **D-10:** Interaction pattern: **click-to-edit with auto-save on blur/Enter**. No save button — saving triggers immediately when the user leaves the field or presses Enter. Uses existing Server Actions.
- **D-11:** Inline-editable fields per section:
  - Departments/Doctors/Testimonials: `name`, `is_featured` toggle, `sort_order`
  - Staff: `name`, `role` (select), `is_active` toggle
  - Appointments: `notes` field on kanban card
  - Patients: `name`, `contact`, `notes`

### Dark Mode
- **D-12:** **Full portal audit** — systematically replace hardcoded color classes (`text-slate-800`, `bg-white`, `border-slate-200`, etc.) with Tailwind `dark:` variants or shadcn CSS variable tokens (`text-foreground`, `bg-background`, `border-border`) across every portal section.
- **D-13:** **Shared empty-state component from Phase 13 applied to all portal tables and list views** — appointments, patients, staff, departments, doctors, testimonials (every table/list that can render empty).

### Responsiveness
- **D-14:** Target: **tablet-first** (iPad-sized and above fully functional). Phone-sized is acceptable but not the primary target.
- **D-15:** Sidebar on tablet: **icon-only collapsed rail** (48px) on `md` screens. Hover or click expands to full width. Full sidebar visible on `lg` and above.
- **D-16:** Data tables: **horizontal scroll** with `overflow-x-auto` wrapper on small screens. No table-to-card transformation.
- **D-17:** Kanban on tablet: horizontal scroll (columns ~280px fixed width) with the one-shot auto-scroll animation on load (covered in D-08).

### Claude's Discretion
- Exact chart types per metric (bar vs. line vs. area) — use bar chart for appointments-over-time and admissions-trend, a single stat card for staff-on-duty count, and a stat card for payroll placeholder.
- Empty-state component copy — follow established portal tone (e.g., "No appointments yet — new requests will appear here when patients submit the form").
- Dark mode token mapping — use shadcn semantic tokens (`bg-background`, `text-foreground`, etc.) wherever possible; only use explicit `dark:` classes when semantic tokens don't cover the case.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Portal Appointments (to be replaced by Kanban)
- `components/portal/AppointmentsClient.tsx` — Current tabbed table implementation. KanbanBoard replaces this. Read to understand the status types, Server Action calls, and row state management pattern.
- `app/(portal)/appointments/page.tsx` — Server component that feeds appointments to the client.
- `app/(portal)/actions/appointments.ts` — `updateAppointmentStatusAction` — reuse as-is for kanban status transitions.

### Dashboard (bare placeholder to be upgraded)
- `app/(portal)/dashboard/page.tsx` — Current placeholder with role label. This gets replaced with the chart dashboard.

### Portal Sidebar (to gain collapse behavior)
- `components/portal/Sidebar.tsx` — Current sidebar. Add icon-only collapsed state on md breakpoint.

### Dark Mode Infrastructure (Phase 13)
- `components/portal/theme-provider.tsx` — ThemeProvider already wired.
- `components/portal/theme-toggle.tsx` — ThemeToggle button already exists.
- `app/(portal)/layout.tsx` — Portal root layout wraps everything in ThemeProvider.

### Inline Editing — Server Actions to Reuse
- `app/(portal)/actions/content.ts` — Existing Server Actions for departments, doctors, testimonials CRUD. Inline edits call the same `update*Action` functions.
- `app/(portal)/actions/appointments.ts` — `updateAppointmentStatusAction` (reuse for kanban) + notes update action (new).

### Content Tables (get inline editing)
- `app/(portal)/content/departments/DepartmentsClient.tsx` — Current Dialog-based CRUD pattern. Inline editing augments (not replaces) the Dialog — Dialog stays for full create/delete, inline handles quick edits.
- `app/(portal)/content/testimonials/TestimonialsClient.tsx` — Same pattern as departments.

### Phase 13 Design System (empty-state component)
- Check `components/` for the Phase 13 shared empty-state component. Look for `EmptyState` or `empty-state` naming.

### Requirements
- `PORTUI-01` through `PORTUI-04` in `.planning/REQUIREMENTS.md`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/ui/tabs.tsx` — Existing Tabs component. Kanban doesn't use tabs, but the TabBadge pattern (count badge on tab) can be adapted to column header count badges.
- `components/ui/badge.tsx` — StatusBadge in AppointmentsClient. Reuse the same badge colors on kanban cards.
- `components/ui/card.tsx` — Use for kanban cards and dashboard metric cards.
- `components/ui/select.tsx` — Existing select for inline editing of role/status fields.
- `components/ui/table.tsx` — Existing table primitives. Inline editing adds contentEditable or Input overlays inside TableCell.
- `sonner` (Toaster) — Already wired for toast feedback on inline save.

### Established Patterns
- Server Component page + Client Component receives props — all portal pages follow this. Dashboard fetches data server-side, passes to `DashboardCharts` client component.
- `requireCmsRole()` gate in Server Actions — inline edit save actions must respect this.
- `router.refresh()` after Server Action — triggers RSC revalidation without a full page reload. Inline edits use this to sync state.
- `revalidatePath` in Server Actions — already in use; inline edit actions call this on the portal route.

### Integration Points
- `app/(portal)/dashboard/page.tsx` — Replace with new chart-based dashboard. Queries: `appointment_requests` grouped by day (last 30d), `patients` grouped by admission day (last 30d), `profiles` WHERE `is_active = true` COUNT.
- `components/portal/Sidebar.tsx` — Add `collapsed` state + `md:w-12 lg:w-64` responsive classes + icon-only render when collapsed.
- Every portal `*Client.tsx` — Add `dark:` variants to hardcoded color classes. Use shadcn CSS variable tokens wherever possible.

</code_context>

<specifics>
## Specific Ideas

- Kanban column header design: column title + count badge (e.g., "Pending (3)") — reuse the TabBadge amber color for Pending, blue for Contacted, green for Confirmed, red-muted for Cancelled.
- Kanban one-shot auto-scroll animation on mobile: CSS `@keyframes scroll-hint` that translates ~60px left then snaps back, plays once on mount. `prefers-reduced-motion` must skip it.
- Dashboard payroll card: show a stat card with `₹—` and subtext "Payroll tracker — Phase 9" in muted text. Consistent with the other 3 metric cards.
- Inline edit UX: when a cell is in edit mode, show a subtle blue `ring-2 ring-blue-500` border around the input. On success, flash `ring-green-500` briefly (CSS transition). On error, `ring-red-500`.
- Sidebar collapsed state: show only shadcn Lucide icons (already used in Sidebar), hide label text. Tooltip on hover showing the nav label.

</specifics>

<deferred>
## Deferred Ideas

- Full mobile phone-optimized layout (tables as card lists, full-screen kanban on phone) — deferred, tablet-first is sufficient for hospital staff workflow.
- Date picker / time range filter on dashboard charts — deferred to Phase 10 (Analytics Dashboard).
- Drag-and-drop kanban (dnd-kit) — deferred; click-to-advance is simpler and sufficient for this use case.
- Real payroll data in dashboard — deferred until Phase 9 (Payroll Tracker) ships.
- Role-based dashboard views (doctors see only their patient count) — deferred; same dashboard for all roles for now.

</deferred>

---

*Phase: 16-portal-ux-upgrade*
*Context gathered: 2026-06-18*
