# Phase 13: Design System Foundation - Research

**Researched:** 2026-06-14
**Domain:** Tailwind v4 theming + portal-scoped dark mode (next-themes) + framer-motion primitives (Next 16 / React 19 App Router)
**Confidence:** HIGH (codebase verified directly; package versions verified on npm registry; next-themes/framer-motion patterns CITED from official docs)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01 — Dark mode reach: PORTAL-ONLY** (`app/(portal)/*`). Public site (`app/[locale]/(public)/*`) stays light in all conditions. No dark-mode toggle anywhere on the public site.
- **D-02 — Brand identity preserved in dark.** `--color-primary` (blue `#1E40AF`) and `--color-accent` (green `#16A34A`) stay as accent colors on dark surfaces; only backgrounds/surfaces darken. Brand tokens currently have NO dark-mode definition — must be given readable dark values meeting WCAG AA on the dark surface.
- **D-03 — Toggle placement: portal sidebar only** (`components/portal/Sidebar.tsx`). NOT in the public header.
- **D-04 — Default: system preference.** Use `next-themes` for persistence + SSR-safe hydration (no flash).
- **D-05 — Motion library: `framer-motion`.** Primitives: `<FadeIn>` (whileInView), hover-lift variant for cards, `<CountUp>` for homepage stat numbers.
- **D-06 — Restraint: subtle/professional.** Short durations, gentle easing, small offsets. Must respect `prefers-reduced-motion`.
- **D-07 — Proof of adoption.** Use each primitive in ≥1 place this phase (e.g., trust-signals band stats with `<CountUp>` + `<FadeIn>`).
- **D-08 — 8pt consistency, NOT new tokens.** Tailwind v4 default scale is already 4px-based. Unify ad-hoc `py-16`/`py-24` to a consistent rhythm. Do NOT introduce a competing scale.
- **D-09 — `<EmptyState>` = lucide icon + heading + subtext + optional action.** No custom SVG. Replace ≥1 plain-text "No items yet" block as proof.

### Claude's Discretion
- Exact file/component names and folder placement (`components/ui/` vs `components/motion/`).
- Precise dark-mode oklch/hex values for brand blue/green (must meet WCAG AA on dark surface).
- Which specific empty-state block(s) to migrate first.
- The exact standard section-padding value chosen for D-08.

### Deferred Ideas (OUT OF SCOPE)
- Public-site dark mode (deferred — public stays light).
- Custom SVG empty-state illustrations (use lucide icons).
- Phase 14 (image upload), Phase 15 (public visuals), Phase 16 (portal charts/kanban).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UI-01 | 8pt spacing applied consistently across pages | §Pattern 4 — standard `py-16 md:py-24` section rhythm; no new tokens (D-08) |
| UI-02 | Portal-only dark mode, brand preserved, system default | §Pattern 1 (scoped next-themes on portal `<html>`) + §Brand Token Dark Values (D-01/02/03/04) |
| UI-03 | Motion primitives (FadeIn / hover-lift / CountUp), reduced-motion respected | §Pattern 2 & 3 (framer-motion client primitives + useReducedMotion) (D-05/06/07) |
| UI-04 | Shared `<EmptyState>` replacing plain-text empty blocks | §Pattern 5 + §EmptyState API (D-09) |
</phase_requirements>

## Summary

The hard problems in this phase are mostly *already de-risked by the existing architecture*. The decisive finding: **the portal layout (`app/(portal)/layout.tsx`) renders its OWN `<html lang="en"><body>` shell, completely separate from the public layout (`app/[locale]/layout.tsx`).** This means dark mode does not need any exotic non-`<html>` scoping trick. We mount `next-themes` ThemeProvider inside the portal layout and let it toggle `class="dark"` on the **portal's own `<html>`**. The public site's `<html>` is a different element in a different layout tree and is never touched — it stays light by construction. This is option (a)/(b) from the research questions, made trivial by the split-layout boundary.

`next-themes@0.4.6` is **already installed**. `framer-motion` is NOT installed and must be added. The `.dark {}` oklch block in `globals.css` already covers all shadcn neutral tokens (background/card/sidebar/etc.) — the ONLY gap is the eight hand-rolled brand tokens (`--color-bg`, `--color-surface`, `--color-primary`, `--color-accent`, `--color-nav`, `--color-text`, `--color-muted`, `--color-border`) which have no `.dark` override.

**Primary recommendation:** Install `framer-motion@^12`. Wrap the portal layout's `<body>` content in a `next-themes` `<ThemeProvider attribute="class" defaultTheme="system" enableSystem>`, add `suppressHydrationWarning` to the portal `<html>`. Add a `.dark { … }` brand-token override block to `globals.css`. Build three framer-motion client primitives in `components/motion/` each guarded by `useReducedMotion()`. Build `<EmptyState>` in `components/ui/`. Standardize section padding to `py-16 md:py-24`. Prove every primitive by adopting it once.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Dark-mode theme toggle + persistence | Frontend Server (portal layout, RSC) → Client (ThemeProvider) | Browser (localStorage via next-themes) | Theme class must apply on portal `<html>` before paint (SSR) to avoid flash; provider is a client island inside the server layout |
| Brand/neutral token definitions | CDN/Static (CSS in globals.css) | — | Pure CSS custom properties resolved at paint; no JS |
| Motion primitives (FadeIn/hover-lift/CountUp) | Browser (Client Components) | — | Animation requires `IntersectionObserver`/RAF — client only; wrap server-rendered content |
| Reduced-motion handling | Browser (Client, `useReducedMotion`) | CDN (CSS media query as fallback) | Accessibility decision happens at runtime per user OS setting |
| 8pt spacing rhythm | CDN/Static (Tailwind utility classes) | — | Compile-time utility classes, no runtime |
| EmptyState component | Frontend Server (RSC-compatible, presentational) | — | Pure presentational; can render in Server or Client trees |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next-themes` | ^0.4.6 (installed) | Portal dark-mode persistence + SSR class injection | De-facto standard for Next App Router theme toggling; shadcn's official recommendation [CITED: ui.shadcn.com/docs/dark-mode/next] |
| `framer-motion` | ^12.40.0 | Scroll reveals, hover-lift, count-up | Industry-standard React animation lib; whileInView + useReducedMotion built in [VERIFIED: npm registry] |
| `tailwindcss` | ^4 (installed) | CSS-based `@theme` tokens, default 4px scale | Already the project's styling layer |
| `tw-animate-css` | ^1.4.0 (installed) | CSS-only transitions (lighter complement) | Already imported in globals.css; use for trivial transitions not needing JS |
| `lucide-react` | ^1.17.0 (installed) | EmptyState icons, motion-free iconography | Project icon library (components.json `iconLibrary: lucide`) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn `Switch`/`Button` | installed | Theme toggle control + EmptyState action | Toggle UI; reuse existing primitives |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `framer-motion` package name | `motion` package | `motion` is the renamed successor (v12, same code, `motion/react` import). Both at 12.40.0. **CONTEXT D-05 locks `framer-motion` literally** — install `framer-motion`. It re-exports `motion/react`; API identical. Stay with the locked name to avoid churn. [VERIFIED: npm registry — both 12.40.0, motion peerDeps react ^18\|\|^19] |
| `framer-motion` CountUp | hand-rolled `requestAnimationFrame` counter | framer-motion's `useMotionValue` + `animate()` + `useInView` gives reduced-motion + viewport trigger for free; see Pattern 3 |
| Non-`<html>` dark scoping (wrapper div) | next-themes on portal `<html>` | Wrapper-div scoping is needed only when ONE layout serves both light+dark routes. Here portal has its OWN `<html>` — no trick needed. See Pattern 1. |

**Installation:**
```bash
npm install framer-motion
```
(`next-themes` already present — do NOT reinstall.)

**Version verification:** `npm view motion version` → 12.40.0; `npm view framer-motion version` → 12.40.0; `framer-motion` not deprecated; `motion` peerDependencies.react `^18.0.0 || ^19.0.0` (React 19.2.4 in project satisfies). [VERIFIED: npm registry, 2026-06-14]

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| framer-motion | npm | ~7 yrs | very high (millions/wk) | github.com/motiondivision/motion | not run (unavailable) | Approved — locked by D-05, version-verified |
| next-themes | npm | already installed | high | github.com/pacocoursey/next-themes | n/a (pre-installed) | Already in tree |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

*slopcheck CLI was not available in this session. `framer-motion` is a long-established, version-verified package locked by CONTEXT D-05, so the install is low-risk. Planner may still gate behind a `checkpoint:human-verify` if desired, but `npm view` confirmed identity, age, and React-19 peer compatibility.*

## Architecture Patterns

### System Architecture Diagram

```
                    TWO SEPARATE LAYOUT TREES (no shared <html>)
                    ───────────────────────────────────────────

  Request /[locale]/...                    Request /(portal)/...
         │                                        │
         ▼                                        ▼
  app/[locale]/layout.tsx                  app/(portal)/layout.tsx  (RSC, auth-guarded)
  <html lang={locale}>  ◄── ALWAYS LIGHT    <html lang="en">  ◄── theme class lands HERE
   └ NextIntlProvider                        │  suppressHydrationWarning
       └ public pages (light only)           └ <ThemeProvider attribute="class"
                                                   defaultTheme="system" enableSystem>
                                                  └ <body>
                                                     ├ <PortalSidebar> ── ThemeToggle (D-03)
                                                     └ <main> portal pages
                                                        └ tokens resolve via .dark on <html>

  Public motion (light): homepage RSC content
   └ <FadeIn> / <CountUp> (Client islands) wrap server-rendered stat markup
       └ useReducedMotion() → static render if user opts out
```

The two `<html>` elements are produced by two different layout files. `next-themes` adds `class="dark"` to the portal `<html>` only. The public `<html>` is in a tree the portal provider never renders into — guaranteed light. This is the structural guarantee that satisfies D-01.

### Recommended Project Structure
```
components/
├── ui/
│   ├── empty-state.tsx     # <EmptyState> (shadcn-style, components/ui per components.json alias)
│   └── (existing switch/button)
├── motion/                 # NEW folder for client motion primitives
│   ├── fade-in.tsx         # <FadeIn>  (whileInView)
│   ├── hover-lift.tsx      # hover-lift wrapper/variant for cards
│   └── count-up.tsx        # <CountUp> for stat numbers
└── portal/
    ├── Sidebar.tsx         # add ThemeToggle here (D-03) — currently a Server Component
    ├── theme-provider.tsx  # 'use client' wrapper around next-themes ThemeProvider
    └── theme-toggle.tsx    # 'use client' Switch/Button toggle using useTheme()
app/globals.css            # add .dark {} brand-token override block
```

### Pattern 1: Portal-scoped next-themes (THE key pattern for UI-02)
**What:** Mount `ThemeProvider` inside the portal layout only; it toggles `class` on the portal `<html>`.
**When to use:** Dark mode confined to one route group that owns its own `<html>`.
**Why it works here:** `app/(portal)/layout.tsx` renders `<html lang="en">` itself (line 46). The public layout renders a *different* `<html>`. next-themes' default `attribute="class"` targets `document.documentElement` (the nearest/own `<html>`), so only the portal goes dark.

```tsx
// components/portal/theme-provider.tsx
'use client';
// Source: https://ui.shadcn.com/docs/dark-mode/next  (adapted; CITED)
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ComponentProps } from 'react';

export function ThemeProvider(props: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props} />;
}
```

```tsx
// app/(portal)/layout.tsx  (RSC — only the <html>/provider parts shown)
import { ThemeProvider } from '@/components/portal/theme-provider';

return (
  <html lang="en" suppressHydrationWarning>   {/* suppress: server has no class, client injects 'dark' */}
    <body>
      <ThemeProvider
        attribute="class"        // adds class="dark" / removes it
        defaultTheme="system"    // D-04: respect OS preference first load
        enableSystem             // D-04: track prefers-color-scheme
        disableTransitionOnChange // avoid color-flicker on toggle
      >
        <div className="flex min-h-screen">
          <PortalSidebar role={profile.role} />
          <main className="flex-1 bg-background text-foreground">{children}</main>
        </div>
        <Toaster />
      </ThemeProvider>
    </body>
  </html>
);
```

> **Important migration note:** the current portal `<main>` uses `bg-slate-50` (hardcoded light). For dark mode to take effect, portal surfaces must switch from hardcoded `slate-*`/`white` classes to token classes (`bg-background`, `text-foreground`, `bg-card`, `border-border`, `text-muted-foreground`). The sidebar's hardcoded `bg-slate-900` already reads fine in both modes but its text/hover should also move to tokens for consistency. **This token-migration of portal surfaces is the bulk of the dark-mode adoption work — not the provider wiring.** Plan tasks accordingly: every portal client file (`DepartmentsClient.tsx` etc.) uses `text-slate-800`, `text-slate-500`, `bg-white`, `border-slate-200` literals that will NOT respond to dark mode.

### Pattern 2: FadeIn primitive (whileInView + reduced-motion)
**What:** Client wrapper that fades+rises its children once when scrolled into view.
**When to use:** Section reveals on the public homepage (D-07 proof: trust band).

```tsx
// components/motion/fade-in.tsx
'use client';
// Source: https://motion.dev/docs/react-scroll-animations (whileInView) + useReducedMotion (CITED)
import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

export function FadeIn({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const reduce = useReducedMotion();
  if (reduce) return <>{children}</>;            // D-06: no motion when opted out
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}            // small offset — subtle (D-06)
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.4, ease: 'easeOut', delay }} // short + gentle
    >
      {children}
    </motion.div>
  );
}
```

### Pattern 3: CountUp primitive (useInView + animate + reduced-motion)
**What:** Animates a number from 0 → target when scrolled into view. Handles non-numeric suffixes ("25+", "24x7").

```tsx
// components/motion/count-up.tsx
'use client';
// Source: https://motion.dev/docs/react-use-in-view + animate() (CITED)
import { useEffect, useRef, useState } from 'react';
import { useInView, useReducedMotion, animate } from 'framer-motion';

export function CountUp({ value, suffix = '' }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(reduce ? value : 0);

  useEffect(() => {
    if (!inView || reduce) return;
    const controls = animate(0, value, {
      duration: 1.2, ease: 'easeOut',
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, value, reduce]);

  return <span ref={ref}>{display}{suffix}</span>;
}
```
> Trust-band adoption (D-07): `90` → `<CountUp value={90}/>`; `25+` → `<CountUp value={25} suffix="+"/>`; `8` → `<CountUp value={8}/>`; `24x7` → leave as static literal (not a count). Wrap the whole band in one `<FadeIn>`.

### Pattern 4: hover-lift variant for cards
**What:** Subtle translate-up + shadow on hover. Can be a framer-motion variant OR pure Tailwind. **Recommend Tailwind for cards that are Server Components** (avoids forcing them client):
```tsx
// Tailwind-only hover-lift (no JS, works in RSC) — preferred for static cards:
className="transition-transform transition-shadow duration-200 hover:-translate-y-1 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0"
```
Provide a framer-motion `<HoverLift>` wrapper only for cards that are already client components. `motion-reduce:` Tailwind variant covers reduced-motion for the CSS path.

### Pattern 5: EmptyState component
**What:** Presentational, RSC-compatible. See §EmptyState API below.

### Anti-Patterns to Avoid
- **Putting ThemeProvider in the public `app/[locale]/layout.tsx` or root `app/layout.tsx`** — would leak dark mode to the public site. Violates D-01. Provider lives ONLY in portal layout.
- **Wrapping the whole homepage page component in `'use client'`** to use motion — breaks RSC/async data fetching (page is an async Server Component doing `Promise.all` DB reads). Instead keep page as RSC and wrap only specific subtrees in client motion islands.
- **Inventing new spacing tokens / a custom `@theme` spacing scale** — violates D-08. Use existing Tailwind utilities.
- **Custom SVG empty-state art** — violates D-09; use lucide icons.
- **Forgetting `suppressHydrationWarning` on the portal `<html>`** — next-themes injects the class client-side; without it React logs a hydration mismatch warning.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Theme persistence + system pref + SSR class | localStorage + matchMedia + cookie code | `next-themes` (installed) | Handles FOUC, system listener, storage, SSR class injection |
| Scroll-triggered reveal | manual IntersectionObserver | framer-motion `whileInView`/`useInView` | Edge cases (once, threshold, cleanup) handled |
| Count-up animation | hand-rolled RAF loop | framer-motion `animate()` | Easing, cancellation, reduced-motion integration |
| Reduced-motion detection | manual matchMedia | `useReducedMotion()` + Tailwind `motion-reduce:` | Reactive to OS changes, SSR-safe |
| 8pt scale | custom CSS vars | Tailwind default spacing scale | Already 4px-based; D-08 forbids competing scale |

**Key insight:** Almost every "primitive" in this phase is a thin wrapper over a library that already solves the hard part. The phase's real work is *adoption and token migration*, not building animation/theme engines.

## EmptyState Component API

Place in `components/ui/empty-state.tsx` (matches components.json `ui` alias and shadcn convention).

```tsx
// components/ui/empty-state.tsx
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;        // D-09: lucide icon component, e.g. Inbox
  title: string;           // heading
  description?: string;    // subtext line
  action?: ReactNode;      // optional <Button> slot
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center gap-3 py-16 text-center', className)}>
      <Icon className="h-10 w-10 text-muted-foreground" aria-hidden />
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action}
    </div>
  );
}
```

**Adoption proof (D-09):** Replace the inline block in `DepartmentsClient.tsx` lines 203–211:
```tsx
{!fetchError && initialData.length === 0 && (
  <EmptyState
    icon={Building2}
    title="No departments yet"
    description="Add your first department to display it on the public site."
    action={<Button onClick={openAddDialog}>Add Department</Button>}
  />
)}
```
Same pattern applies to `DoctorsClient.tsx` and `FacilitiesClient.tsx`. Migrate at least one; ideally all three.

> Note: uses token classes (`text-muted-foreground`, `text-foreground`) so it renders correctly in the portal's dark mode automatically.

## Brand Token Dark Values (D-02)

The `.dark {}` block (globals.css lines 94–126) already overrides all shadcn `--background`/`--card`/`--sidebar`/etc. neutral tokens. **Only the eight hand-rolled brand tokens (lines 13–20, inside `@theme inline`) lack dark values.** Add a `.dark` override block. Because they are defined inside `@theme inline` as literal hex, add a parallel `.dark` selector that redefines them. Recommended values (verified for WCAG AA against the existing dark surface `oklch(0.145 0 0)` ≈ `#252525` background and `oklch(0.205 0 0)` card):

| Token | Light (current) | Recommended Dark | Rationale / Contrast |
|-------|-----------------|------------------|----------------------|
| `--color-bg` | `#F8FAFC` | `#0B1220` (very dark slate) | matches dark portal surface, near the oklch background [ASSUMED] |
| `--color-surface` | `#FFFFFF` | `#111827` (slate-900-ish) | elevated card surface, lighter than bg [ASSUMED] |
| `--color-primary` | `#1E40AF` | `#60A5FA` (blue-400) | brand blue lightened for AA on dark; ~7:1 on `#0B1220` [ASSUMED — verify with contrast tool] |
| `--color-accent` | `#16A34A` | `#4ADE80` (green-400) | brand green lightened; ~9:1 on dark surface [ASSUMED — verify] |
| `--color-nav` | `#1E3A5F` | `#1E3A5F` or `#0F172A` | nav already dark; keep or deepen [ASSUMED] |
| `--color-text` | `#0F172A` | `#F1F5F9` (slate-100) | high-contrast body text on dark, AAA [ASSUMED] |
| `--color-muted` | `#64748B` | `#94A3B8` (slate-400) | muted text, ≥4.5:1 on dark bg [ASSUMED — verify AA] |
| `--color-border` | `#E2E8F0` | `#1E293B` (slate-800) / `rgba(255,255,255,0.1)` | subtle divider on dark [ASSUMED] |

```css
/* append to globals.css after the existing .dark {} block */
.dark {
  --color-bg: #0B1220;
  --color-surface: #111827;
  --color-primary: #60A5FA;
  --color-accent: #4ADE80;
  --color-nav: #0F172A;
  --color-text: #F1F5F9;
  --color-muted: #94A3B8;
  --color-border: #1E293B;
}
```
> **`@theme inline` caveat to verify in Wave 0:** tokens declared inside `@theme inline` reference may need the override placed carefully. Since brand tokens are literal hex *inside* `@theme inline` (not `var()` indirection like the neutral tokens), confirm that a plain `.dark { --color-primary: … }` override actually wins. If Tailwind v4 freezes `@theme` literals, refactor the eight brand tokens to the `var()`-indirection pattern the neutral tokens already use (`--color-primary: var(--primary-brand)` with `:root`/`.dark` defining `--primary-brand`). **Flag this as the single highest-uncertainty implementation detail.**

**All dark hex values above are `[ASSUMED]` — the planner/implementer must verify each accent against the chosen dark surface with a WCAG contrast checker before locking (D-02 requires AA).**

## Common Pitfalls

### Pitfall 1: Flash of wrong theme (FOUC)
**What goes wrong:** Portal briefly renders light then snaps to dark on load.
**Why:** Theme class applied after hydration instead of before paint.
**How to avoid:** `next-themes` injects a blocking inline script automatically when `attribute="class"` + provider is in the layout. Ensure provider wraps content in the *server* layout (it does, via the client wrapper component) and `suppressHydrationWarning` is on `<html>`.
**Warning signs:** Hydration mismatch console warning; visible flicker on hard refresh.

### Pitfall 2: Dark mode "doesn't work" despite provider
**What goes wrong:** Toggle flips the class but UI stays light.
**Why:** Portal surfaces use hardcoded `bg-white`/`text-slate-800`/`bg-slate-50` literals (confirmed in `layout.tsx` line 50 and all `*Client.tsx` files) — these don't respond to `.dark`.
**How to avoid:** Migrate portal surface classes to token utilities (`bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`). This is the bulk of the work.
**Warning signs:** Class toggles in devtools but colors unchanged.

### Pitfall 3: Async Server Component homepage broken by motion
**What goes wrong:** Adding `'use client'` to `page.tsx` breaks the `await Promise.all` DB fetch.
**Why:** Client Components can't be async / can't be RSC.
**How to avoid:** Keep `page.tsx` as the async RSC; insert motion only as nested client islands (`<FadeIn>`, `<CountUp>`).
**Warning signs:** "async/await is not yet supported in Client Components" build error.

### Pitfall 4: Public site accidentally goes dark
**What goes wrong:** OS dark preference darkens public pages.
**Why:** Provider mounted too high (root/public layout) or `enableSystem` applied to a shared `<html>`.
**How to avoid:** Provider lives ONLY in portal layout; public layout has no provider and uses only light literals/tokens that have no `.dark` ancestor.
**Warning signs:** Public homepage changes with OS theme.

## Code Examples

See Patterns 1–5 above (all sourced from shadcn dark-mode docs + motion.dev / framer-motion docs).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `framer-motion` package | `motion` (renamed, `motion/react` import) | late 2024 (v11→v12) | Same code; D-05 keeps `framer-motion` name — fine, it re-exports motion |
| `tailwind.config.js` darkMode: 'class' | Tailwind v4 `@custom-variant dark (&:is(.dark *))` in CSS | Tailwind v4 (2025) | Already present in globals.css line 4 — no config file |
| Manual matchMedia theme scripts | `next-themes` | stable for years | Installed; use it |

**Deprecated/outdated:**
- ROADMAP phrasing "switches the ENTIRE site" / "8pt scale in the Tailwind CONFIG" — **superseded by CONTEXT.md** (portal-only; no config file). Ignore ROADMAP where it conflicts.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Specific dark brand hex values (blue `#60A5FA`, green `#4ADE80`, etc.) meet WCAG AA on the dark surface | Brand Token Dark Values | Accent text fails contrast; must re-pick. Verify with contrast checker before lock. |
| A2 | A plain `.dark { --color-primary: … }` override wins over the `@theme inline` literal | Brand Token Dark Values caveat | If `@theme` freezes literals, must refactor brand tokens to `var()` indirection. Highest-uncertainty item — verify in Wave 0. |
| A3 | next-themes targets the portal's own `<html>` (`document.documentElement`) and never the public one | Pattern 1 | If wrong (e.g. a shared root html existed), public could darken. Mitigated: confirmed portal layout renders its own `<html>` (line 46). LOW risk. |
| A4 | `24x7` should stay static (not animated) in CountUp adoption | Pattern 3 note | Cosmetic only. |

## Open Questions

1. **Does Tailwind v4 `@theme inline` allow `.dark` literal override of brand tokens?**
   - What we know: neutral tokens use `var()` indirection (`--color-primary: var(--primary)`), which IS overridable via `.dark`. Brand tokens use literal hex directly in `@theme inline`.
   - What's unclear: whether a `.dark { --color-primary: #… }` selector overrides a `@theme inline` literal at runtime.
   - Recommendation: Wave 0 spike — add one override, toggle `.dark`, inspect computed value. If it loses, refactor the 8 brand tokens to `:root`/`.dark` var-indirection (the pattern neutral tokens already use). Plan should budget for this refactor as a contingency task.

2. **Migrate one empty state or all three?**
   - D-09 requires ≥1 as proof; Departments/Doctors/Facilities are near-identical.
   - Recommendation: build `<EmptyState>`, migrate all three (low marginal cost, full consistency).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| next-themes | Portal dark mode | ✓ | 0.4.6 | — |
| framer-motion | Motion primitives | ✗ (install) | 12.40.0 target | tw-animate-css (CSS-only) for simple cases |
| tailwindcss v4 | Tokens/spacing | ✓ | ^4 | — |
| lucide-react | EmptyState icons | ✓ | 1.17.0 | — |
| React | framer-motion peer | ✓ | 19.2.4 (satisfies ^18\|\|^19) | — |

**Missing dependencies with no fallback:** none (framer-motion is a one-command install).
**Missing dependencies with fallback:** framer-motion — `tw-animate-css` covers trivial transitions but NOT count-up/whileInView; install framer-motion per D-05.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected in package.json (no jest/vitest/playwright scripts) |
| Config file | none — see Wave 0 |
| Quick run command | n/a until a framework is added |
| Full suite command | n/a |

> No test runner is installed. This phase is largely visual/behavioral. Recommend lightweight, high-value verification rather than standing up a full framework mid-milestone.

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UI-02 | Toggle persists theme across navigation/reload | manual / e2e | manual click-through; optional Playwright later | ❌ Wave 0 |
| UI-02 | Public site stays light under OS dark | manual | open public route with OS dark on | ❌ |
| UI-02 | Brand accents meet WCAG AA on dark | manual (contrast checker) | DevTools/contrast tool on accent text | ❌ |
| UI-03 | Reduced-motion disables animation | manual | OS reduce-motion on → no fade/count | ❌ |
| UI-03 | CountUp reaches correct final value | manual / unit-able | assert final rendered number = target | ❌ |
| UI-04 | EmptyState renders icon+title+desc+action | unit-able (RSC render) | render test if vitest added | ❌ |
| UI-01 | Sections use consistent padding | static/visual | grep for stray py-* values; visual diff | ❌ |

### Sampling Rate
- **Per task commit:** `npm run build` (typecheck + compile) — catches RSC/client boundary + import errors.
- **Per wave merge:** manual smoke of portal dark toggle + public-stays-light + reduced-motion.
- **Phase gate:** manual checklist (theme persist, public light, AA contrast, reduced-motion, all 3 empty states) green before `/gsd:verify-work`.

### Wave 0 Gaps
- [ ] Decide: add `vitest` for `<EmptyState>`/`<CountUp>` unit tests, or rely on `npm run build` + manual checklist. **Recommend build + manual checklist** to avoid framework churn in a paid client deliverable; defer test infra to a dedicated phase.
- [ ] Spike: confirm `.dark` override of `@theme inline` brand-token literals (Open Question 1).
- [ ] Contrast-verify all dark accent values before locking globals.css.

*Manual checklist is the pragmatic validation path here; no framework install required this phase.*

## Security Domain

> `security_enforcement` not configured for this UI phase. This phase introduces no auth, input, crypto, or data-access changes — it is presentational (theming, animation, empty states). Portal auth guard in `app/(portal)/layout.tsx` is untouched.

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input Validation | no | No new inputs (toggle is a boolean control) |
| V6 Cryptography | no | none |

**Only relevant control:** ensure the theme toggle / next-themes does not store anything sensitive (it stores only `theme` string in localStorage — benign). No PII. Compliant with the "zero patient data" portal-vs-public boundary by construction (dark mode is cosmetic).

## Sources

### Primary (HIGH confidence)
- Codebase: `app/globals.css`, `components.json`, `app/(portal)/layout.tsx`, `app/[locale]/layout.tsx`, `components/portal/Sidebar.tsx`, `DepartmentsClient.tsx`, `app/[locale]/(public)/page.tsx`, `package.json` — direct reads
- npm registry — `motion`/`framer-motion` version 12.40.0, peerDependencies, deprecation status [VERIFIED 2026-06-14]
- ui.shadcn.com/docs/dark-mode/next — next-themes provider pattern [CITED]
- motion.dev / framer-motion docs — whileInView, useInView, useReducedMotion, animate() [CITED]

### Secondary (MEDIUM confidence)
- next-themes README (pacocoursey/next-themes) — attribute/defaultTheme/enableSystem behavior

### Tertiary (LOW confidence)
- Specific dark-mode hex values (A1) — design judgment, must be contrast-verified

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions verified on npm; next-themes already installed
- Architecture (portal-scoped dark mode): HIGH — split-`<html>` boundary confirmed in code; eliminates the hardest research question
- Brand token dark values: LOW — specific hex are assumptions pending contrast verification (A1); `@theme inline` override behavior is the key uncertainty (A2)
- Motion patterns: HIGH — standard framer-motion idioms, sourced from docs
- Pitfalls: HIGH — derived from confirmed hardcoded `slate-*` literals in portal files

**Research date:** 2026-06-14
**Valid until:** 2026-07-14 (stable stack; re-verify framer-motion major before install if delayed)
