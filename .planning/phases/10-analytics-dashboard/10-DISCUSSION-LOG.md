# Phase 10: Analytics Dashboard — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-13
**Phase:** 10-analytics-dashboard
**Areas discussed:** GA4 embed approach, Page layout, Date range controls, Data freshness

---

## GA4 Embed Approach

| Option | Description | Selected |
|--------|-------------|----------|
| iframe embed of GA4 dashboard | GA4 reporting URL embedded in an iframe. Zero custom dev, shows live GA UI. | ✓ |
| Link button to GA4 | 'View in Google Analytics' button opening new tab. Admin leaves portal. | |
| GA4 Data API + custom charts | Service account, API credentials, custom chart rendering. Most flexible but heavy. | |

**User's choice:** iframe embed
**Notes:** ANA-01 says "GA4 script tag" but iframe embed is what actually delivers visible traffic data.

**GA4 property status:**

| Option | Description | Selected |
|--------|-------------|----------|
| Already set up | Have a Measurement ID | |
| Not set up yet — create in this phase | Create property as part of Phase 10 | ✓ |

**User's choice:** Not set up yet — GA4 property creation is in scope for this phase.
**Notes:** User asked what GA4 property ID is — explained it. Confirmed creation is part of Phase 10 plan.

---

## Page Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Stacked full-width sections | GA4 iframe on top, 3 stat cards stacked below. Simple, readable. | ✓ |
| 2×2 grid | GA4 top-left, appointments top-right, staff bottom-left, patients bottom-right. | |
| GA4 prominent + 3 cards in a row | Wide iframe top, 3 stat cards in a single row below. | |

**User's choice:** Stacked full-width sections (recommended)

**GA4 iframe height:**

| Option | Description | Selected |
|--------|-------------|----------|
| 600px | Standard GA4 overview fits comfortably. | ✓ |
| 400px | Compact, admin may need to scroll inside iframe. | |
| Full viewport height | Maximises GA4 but pushes cards far below fold. | |

**User's choice:** 600px (recommended)

---

## Date Range Controls

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed periods only — This Week / This Month | Both counts displayed simultaneously. No picker. | ✓ |
| Toggle: This Week / This Month | Single toggle switches all stats. | |
| Date range picker | Calendar component, custom queries. Most flexible. | |

**User's choice:** Fixed periods only — both "this week" and "this month" displayed simultaneously per section.

**Appointment breakdown (ANA-02):**

| Option | Description | Selected |
|--------|-------------|----------|
| Counts + by-status breakdown | Total (week/month) + pending/confirmed/cancelled split + by-doctor table. | ✓ |
| By-doctor table only | Just a doctor → count table. | |
| All three: chart + status + doctor | Adds day-by-day chart requiring charting library. | |

**User's choice:** Counts + by-status breakdown (recommended). No charting library needed.

---

## Data Freshness

| Option | Description | Selected |
|--------|-------------|----------|
| Once on page load | Server Component fetch on navigate. Manual browser refresh for updates. | ✓ |
| Auto-refresh every N minutes | Silent re-fetch on interval. | |
| Manual refresh button | Explicit refresh button in UI. | |

**User's choice:** Once on page load (recommended). Consistent with payroll and appointments pages.

---

## Claude's Discretion

- Week boundary definition: rolling 7 days vs ISO week (Monday–Sunday) — left to Claude
- Stat card internal layout: label/value/badge arrangement within each section
- Whether to use shadcn Card or plain div for sections

## Deferred Ideas

- GA4 Data API custom charts — v2
- Date range picker — v2
- Auto-refresh / polling — v2
- Day-by-day appointment chart (requires recharts) — v2
