# Phase 13: Design System Foundation - Context

**Gathered:** 2026-06-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Build a reusable design layer that the rest of the UI-overhaul milestone (Phases 14–16) consumes:
1. A unified **8pt spacing system** applied consistently across existing pages (the tokens already
   exist in Tailwind v4's default 4px-based scale — this is about *consistent application*, not new tokens).
2. **Dark mode** in the **staff portal only** (not the public site), with the brand identity preserved.
3. **Motion primitives** (framer-motion) — reusable fade-in-on-scroll, hover-lift, count-up components.
4. A shared **`<EmptyState>`** component replacing plain-text "No items yet" blocks.

This phase ships the primitives and proves each by adopting it in at least one place. It does NOT
overhaul the public site visuals (Phase 15) or build portal charts/kanban (Phase 16) — those phases
consume what this phase produces.

**Out of scope:** Public-site dark mode, hero/testimonials/PM-JAY work (Phase 15), dashboard charts
and kanban (Phase 16), image upload (Phase 14).

</domain>

<decisions>
## Implementation Decisions

### Dark Mode
- **D-01 — Reach: portal-only.** Dark mode applies ONLY to the staff portal (`app/(portal)/*`).
  The public site (`app/[locale]/(public)/*`) stays light in all conditions — it is the paid client
  deliverable and a light, clean medical aesthetic is the safe first impression. No dark-mode toggle
  appears anywhere on the public site.
- **D-02 — Brand identity preserved in dark.** The hospital brand accents — `--color-primary` (blue
  `#1E40AF`) and `--color-accent` (green `#16A34A`) — are kept as accent colors on dark surfaces.
  Only backgrounds/surfaces darken. These brand tokens currently have NO dark-mode definition in
  `app/globals.css` and must be given readable dark-mode values (the existing `.dark {}` block only
  covers the shadcn oklch neutral tokens, not the hand-rolled brand tokens). Verify WCAG AA contrast
  for blue/green accents on the dark surface color.
- **D-03 — Toggle placement: portal sidebar only.** The dark-mode toggle lives in the portal sidebar
  (`app/(portal)` sidebar/layout). It does NOT appear in the public header next to the language toggle.
- **D-04 — Default: system preference.** On first load the portal respects the OS color-scheme
  preference (night-shift staff get dark automatically). User's manual choice persists across
  navigation and sessions. Use `next-themes` for persistence + SSR-safe hydration (no flash).

### Motion
- **D-05 — Library: framer-motion.** Install `framer-motion`. It is needed for scroll-triggered
  reveals and count-up that are awkward to do cleanly with the already-installed `tw-animate-css`
  (CSS-only). Provide reusable primitives as components: `<FadeIn>` (fade-in-on-scroll via
  `whileInView`), a hover-lift utility/variant for cards, and a `<CountUp>` for the homepage stat
  numbers (90 beds, 25+ doctors, etc.).
- **D-06 — Restraint: subtle / professional.** Motion is restrained and trustworthy — appropriate
  for a hospital. Short durations, gentle easing, small offsets. No bouncy/playful or attention-
  grabbing animation. All motion must respect `prefers-reduced-motion` (no animation when set).
- **D-07 — Proof of adoption.** Use the primitives in at least one place this phase (e.g., wrap the
  homepage trust-signals band stats with `<CountUp>` and a `<FadeIn>`), so Phase 15 inherits a
  working, proven pattern rather than untested components.

### Spacing
- **D-08 — 8pt consistency, not new tokens.** Tailwind v4's default spacing scale is already 4px-based
  (8pt-compatible). The work is to UNIFY application: replace ad-hoc section padding (the homepage
  mixes `py-16` and `py-24`) with a consistent rhythm. Define a small set of section-level spacing
  conventions (e.g., a standard vertical section padding) and apply them across the existing public
  pages so spacing reads as intentional. Do not introduce a competing custom scale.

### Empty State
- **D-09 — `<EmptyState>` = lucide icon + heading + subtext + optional action.** A shared component
  in `components/` (or `components/ui/`) taking props for a lucide icon, a heading, a subtext line,
  and an optional action slot (button). No custom SVG illustrations — reuse the existing lucide
  library already in the project. Replace at least one current plain-text "No items yet" block
  (e.g., in the portal content tables) as proof of adoption.

### Claude's Discretion
- Exact file/component names and folder placement (`components/ui/` vs `components/motion/`).
- The precise dark-mode oklch/hex values for brand blue/green — pick values meeting WCAG AA on the
  dark surface; researcher/planner decide specifics.
- Which specific empty-state block(s) to migrate first as proof.
- The exact standard section-padding value chosen for D-08.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design Tokens & Theming (the file to modify)
- `app/globals.css` — Tailwind v4 `@theme inline` config. Already contains `@custom-variant dark`,
  a full `.dark {}` oklch token block, and `@import "tw-animate-css"`. The hand-rolled brand tokens
  (`--color-primary`, `--color-accent`, `--color-nav`, etc., lines ~13-20) have NO dark-mode override
  — this is the gap D-02 must close (portal-scoped).
- `components.json` — shadcn config (style `base-nova`, baseColor neutral, cssVariables true). New
  components follow this.

### Portal Surfaces (dark mode + empty state targets)
- `app/(portal)/` layout + sidebar — where the theme toggle (D-03) mounts and where dark mode applies.
- `app/(portal)/content/departments/DepartmentsClient.tsx`,
  `app/(portal)/content/doctors/DoctorsClient.tsx`,
  `app/(portal)/content/facilities/FacilitiesClient.tsx` — contain the current plain-text empty
  states ("No items yet") and table UIs that are candidates for `<EmptyState>` adoption.

### Public Surfaces (spacing + motion proof targets — light mode only)
- `app/[locale]/(public)/page.tsx` — homepage with inconsistent `py-16`/`py-24` section padding
  (D-08) and the trust-signals stats band (count-up proof target, D-07).
- `app/[locale]/layout.tsx` — provides `html`/`body`/`lang`; relevant to where a theme provider would
  mount IF it were public (it is NOT — portal-only). Confirm provider scoping keeps public site light.

### Milestone Context
- `.planning/ROADMAP.md` §"UI Overhaul Milestone (Phases 13–16)" — phase boundaries and the
  dependency graph (13 → 14∥16 → 15). Phase 13 primitives are consumed by 15 (motion) and 16
  (dark mode + empty states).

### External Libraries
- `framer-motion` — to be installed (D-05). Latest stable.
- `next-themes` — to be installed for portal theme persistence (D-04).
- `tw-animate-css` — ALREADY installed/imported in `globals.css`; available as a lighter complement.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app/globals.css` dark token block — dark mode is ~50% done at the CSS layer; the shadcn neutral
  tokens already have `.dark` values. Missing pieces are provider + toggle + brand-token dark values.
- `tw-animate-css` already imported — usable for simple CSS transitions without touching framer-motion.
- lucide-react icon library already in use across the portal — the `<EmptyState>` icon prop draws from it.
- shadcn `Switch` / `Button` components exist — usable for the theme toggle and empty-state action.

### Established Patterns
- Tailwind v4 CSS-based config (`@theme inline` in `globals.css`) — NO `tailwind.config.js`. All token
  work happens in `globals.css`.
- `.dark` class strategy via `@custom-variant dark (&:is(.dark *))` — class-based, so a provider must
  add/remove `.dark` on a portal-scoped root element (not `<html>` globally, to keep public light).
- Portal routes live under `app/(portal)/` OUTSIDE the `[locale]` segment — clean boundary for
  scoping dark mode to the portal only.

### Integration Points
- Theme provider must be scoped so it does NOT apply `.dark` to public routes. Options the planner
  should weigh: a provider mounted in the portal layout that toggles `.dark` on the portal wrapper,
  vs `next-themes` with a portal-only root. Public `app/[locale]/layout.tsx` must remain unaffected.
- framer-motion components are Client Components (`'use client'`) — they wrap Server-Component content
  on the public homepage; plan the client/server boundary so SSR/force-dynamic still works.
- `prefers-reduced-motion` handling is a hard requirement (accessibility) for every motion primitive.

</code_context>

<specifics>
## Specific Ideas

- Brand palette to preserve in dark mode: primary blue `#1E40AF`, accent green `#16A34A`,
  nav `#1E3A5F` (from `globals.css`).
- Count-up proof target: the homepage trust band — 90 (beds), 25+ (doctors), 8 (specialties), 24x7.
- Motion feel: short durations, gentle easing, small translate offsets — "calm and credible," not flashy.

</specifics>

<deferred>
## Deferred Ideas

- **Public-site dark mode** — explicitly deferred. Could be revisited post-launch if the client wants it,
  but it is out of scope for this milestone (public site stays light).
- Custom SVG empty-state illustrations — deferred in favor of lucide icons (could be a future polish pass).

</deferred>

---

*Phase: 13-Design System Foundation*
*Context gathered: 2026-06-14*
