# Phase 13: Design System Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-14
**Phase:** 13-Design System Foundation
**Areas discussed:** Dark mode reach & brand identity, Motion library & restraint, Theme toggle UX, Empty-state style

---

## Dark Mode Reach & Brand Identity

| Option | Description | Selected |
|--------|-------------|----------|
| Portal-only, keep brand accents | Dark only in staff portal; public stays light; brand blue/green kept as accents | ✓ |
| Both sites, keep brand accents | Dark on public + portal; brand colors as accents | |
| Both sites, fully neutral dark | Dark everywhere; brand colors muted to gray | |
| Portal-only, neutral dark | Dark in portal only; brand colors neutralized | |

**User's choice:** Portal-only, keep brand accents
**Notes:** Public site is the paid deliverable — light medical aesthetic is the safe first impression. Brand blue (#1E40AF) and green (#16A34A) currently have no dark-mode definition in globals.css; must be given readable dark values (WCAG AA).

---

## Motion Library & Restraint

| Option | Description | Selected |
|--------|-------------|----------|
| framer-motion, subtle/professional | Install framer-motion; restrained, trustworthy motion | ✓ (Claude's recommendation, user delegated) |
| framer-motion, lively | More energetic animation | |
| CSS-only (tw-animate-css) | No new dep; CSS + Intersection Observer | |

**User's choice:** "your recommendation" → framer-motion, subtle/professional
**Notes:** Scroll-fade and count-up are awkward in CSS-only; framer-motion gives clean `whileInView`. Restraint keeps it credible for a hospital. `prefers-reduced-motion` is a hard requirement.

---

## Theme Toggle UX

| Option | Description | Selected |
|--------|-------------|----------|
| Header (public) + sidebar (portal), default = system | Toggle in both; respects OS first | |
| Toggle, default = light always | Same placement; always start light | |
| Portal sidebar only | Toggle only in portal | ✓ (Claude's recommendation, user delegated) |

**User's choice:** "your recommendation" → Portal sidebar only, default = system preference
**Notes:** Coherent with portal-only dark mode — no toggle on public site at all. Default = system so night-shift staff get dark automatically. Use next-themes for SSR-safe persistence (no flash).

---

## Empty-State Component Style

| Option | Description | Selected |
|--------|-------------|----------|
| Lucide icon + message + action button | Icon, heading, subtext, optional CTA | ✓ (Claude's recommendation, user delegated) |
| Custom SVG illustrations | Hand-made illustrations per state | |
| Minimal text + icon only | Muted icon + one line | |

**User's choice:** "your recommendation" → Lucide icon + message + action button
**Notes:** Reuses lucide library already in the project; zero new assets. Replace at least one current "No items yet" block as proof of adoption.

## Claude's Discretion

- Exact component/file names and folder placement.
- Precise dark-mode hex/oklch values for brand blue/green (meet WCAG AA).
- Which empty-state block(s) to migrate first.
- The exact standard section-padding value for the 8pt consistency pass.

## Deferred Ideas

- Public-site dark mode — revisit post-launch only.
- Custom SVG empty-state illustrations — future polish pass.
