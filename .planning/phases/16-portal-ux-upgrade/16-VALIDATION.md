# Phase 16: Portal UX Upgrade — Validation

**Phase:** 16-portal-ux-upgrade
**Created:** 2026-06-18
**Source:** RESEARCH.md Validation Architecture

---

## Automated Gates

### Per-task (every task commit)

```bash
npx tsc --noEmit
```

TypeScript must compile with zero errors after each task before moving to the next.

### Per-wave merge

```bash
npx tsc --noEmit && npx next build 2>&1 | tail -20
```

Both type-checking and Next.js build must pass before beginning the next wave.

### Phase gate (before /gsd:verify-work)

```bash
npx tsc --noEmit && npx next build
```

Full build green. No type errors, no build errors.

---

## Manual Verification Steps

### PORTUI-01 — Dashboard Charts

- [ ] Navigate to `/portal/dashboard` — page loads without error
- [ ] Four metric cards visible: appointments count, patient admissions count, staff on duty count, payroll placeholder (shows `₹—` + "Payroll tracker coming in a later phase")
- [ ] Two bar charts render: appointments over time (last 30 days) and patient admissions trend
- [ ] Charts show real data (not empty) if records exist in DB; show graceful empty state if no records
- [ ] All cards and charts render correctly in dark mode (toggle theme — no bg-white flash, no invisible text)

### PORTUI-02 — Kanban Appointment Board

- [ ] Navigate to `/portal/appointments` — 4 columns render: Pending, Contacted, Confirmed, Cancelled
- [ ] Each column header shows appointment count badge
- [ ] Each card shows: patient name, phone as tappable tel: link, preferred date, preferred doctor
- [ ] Each card shows a notes field (inline editable); clicking it activates InlineEditCell or textarea
- [ ] Advance button present on Pending (→ Contacted), Contacted (→ Confirmed), Confirmed (→ Completed) cards
- [ ] Cancelled/Completed cards have no advance button
- [ ] Cancel confirm dialog appears on Pending and Contacted cards; "Yes, cancel" moves card to Cancelled column
- [ ] Empty state component shown per column when no appointments in that status
- [ ] On narrow viewport (tablet): board scrolls horizontally; scroll-hint animation plays once on load
- [ ] Animation does NOT play when OS has prefers-reduced-motion enabled

### PORTUI-03 — Inline Editing

- [ ] Departments table: clicking a name cell activates inline input (blue ring); Enter saves; Escape reverts
- [ ] Testimonials table: same inline edit behavior for name field
- [ ] Doctors table: same inline edit behavior for name field; is_featured toggle works; sort_order editable
- [ ] Staff table: name field inline editable; role select saves on change; is_active toggle works
- [ ] Patients table: name, contact, and notes fields are inline editable
- [ ] Saving an unchanged value performs no network call (no-op)
- [ ] Saving empty name shows error ring + toast "Could not save — please try again."
- [ ] Success ring flashes green briefly (~600ms) then returns to idle
- [ ] Error ring stays red until user re-edits
- [ ] Existing create/delete Dialogs still open from their buttons (not removed)

### PORTUI-04 — Dark Mode + Shared EmptyState

- [ ] Toggle dark mode — all portal pages render correctly (no white boxes, no invisible text)
- [ ] All new components (KanbanCard, KanbanColumn, KanbanBoard, DashboardCharts, InlineEditCell) use semantic tokens only
- [ ] Phase 13 EmptyState component used consistently in tables and kanban columns
- [ ] Sidebar collapses to icon-only rail (48px) on md screens; full sidebar on lg and above
- [ ] Collapsed sidebar shows tooltips on icon hover
- [ ] All data tables have horizontal scroll wrapper (no overflow cut-off on tablet)

---

## Wave 0 Pre-flight Checks

- [ ] `npx tsc --noEmit` passes on clean checkout (baseline)
- [ ] `components/ui/tooltip.tsx` exists — if not, run `npx shadcn@latest add tooltip` before Plan 05
- [ ] `components/ui/chart.tsx` exists — if not, run `npx shadcn@latest add chart` before Plan 02

---

## Requirement Coverage

| Req ID | Plans | Validated By |
|--------|-------|-------------|
| PORTUI-01 | 16-02 | Dashboard manual check + build gate |
| PORTUI-02 | 16-03 | Kanban manual check + tsc |
| PORTUI-03 | 16-04 | Inline edit manual check + tsc |
| PORTUI-04 | 16-05 | Dark mode manual toggle + sidebar visual |
