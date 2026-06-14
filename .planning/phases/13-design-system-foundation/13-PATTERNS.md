# Phase 13: Design System Foundation - Pattern Map

**Mapped:** 2026-06-14
**Files analyzed:** 11 (4 new, 7 modified)
**Analogs found:** 11 / 11

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `components/ui/empty-state.tsx` (new) | component (ui/presentational) | request-response (static render) | `components/ui/badge.tsx` | role-match (shadcn ui presentational) |
| `components/motion/fade-in.tsx` (new) | component (client primitive) | event-driven (scroll/IntersectionObserver) | `components/public/ChatWidget.tsx` | partial (`'use client'` + lucide/motion boundary) |
| `components/motion/count-up.tsx` (new) | component (client primitive) | event-driven (scroll + RAF) | `components/public/ChatWidget.tsx` | partial (`'use client'` + hooks) |
| `components/motion/hover-lift.tsx` (new, optional) | component (client primitive) | event-driven (hover) | `components/ui/button.tsx` (cva pattern) / Tailwind-only | role-match |
| `components/portal/theme-provider.tsx` (new) | provider (client wrapper) | request-response | `components/ui/sonner.tsx` (thin client ui wrapper) | role-match |
| `components/portal/theme-toggle.tsx` (new) | component (client control) | event-driven (toggle) | `components/layout/LanguageToggle.tsx` | exact (client toggle control) |
| `app/globals.css` (modify) | config (design tokens) | n/a (static CSS) | existing `.dark {}` block + `@theme inline` | self (extend existing token format) |
| `app/(portal)/layout.tsx` (modify) | layout (RSC) | request-response | self (mount provider into own `<html>`) | self |
| `components/portal/Sidebar.tsx` (modify) | component (RSC nav) | request-response | self (mount toggle + token migration) | self |
| `app/[locale]/(public)/page.tsx` (modify) | route (async RSC) | request-response | self (spacing pass + CountUp/FadeIn islands) | self |
| `app/(portal)/content/{departments,doctors,facilities}/*Client.tsx` (modify) | component (client CRUD) | CRUD | `DepartmentsClient.tsx` (the canonical one) | exact |

---

## Shared Patterns

### shadcn `components/ui/*` file convention
**Source:** `components/ui/badge.tsx`, `components/ui/button.tsx`
**Apply to:** `empty-state.tsx`, `hover-lift.tsx` (if cva), any new `ui/` component

Conventions to copy exactly:
- Imports: `import { cn } from "@/lib/utils"` (cn = `twMerge(clsx(inputs))` per `lib/utils.ts`).
- Components are **plain functions** (NOT `forwardRef`) in this base-nova preset — `function Badge({ className, variant = "default", ...props })`.
- Variants use `cva` from `class-variance-authority` with `VariantProps<typeof xVariants>`; export both component and `xVariants`.
- Class strings use **token utilities**: `bg-primary text-primary-foreground bg-muted text-muted-foreground border-border text-foreground` — never hardcoded `slate-*`/`white`. This is what makes a component dark-mode-correct automatically.
- `data-slot="..."` attribute on the root element (see button.tsx line 51).

```tsx
// components/ui/button.tsx (lines 1-5, 43-56) — the convention skeleton
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
const buttonVariants = cva("...", { variants: {...}, defaultVariants: {...} })
function Button({ className, variant = "default", ...props }) {
  return <ButtonPrimitive data-slot="button" className={cn(buttonVariants({ variant, className }))} {...props} />
}
export { Button, buttonVariants }
```

> EmptyState (per RESEARCH §EmptyState API) is presentational with no variants — it does NOT need cva, but MUST follow the plain-function + `cn()` + token-class conventions above. Place at `components/ui/empty-state.tsx` (alias `ui` → `@/components/ui` per components.json).

### `'use client'` boundary convention
**Source:** `components/public/ChatWidget.tsx` (lines 1-7), `app/(portal)/content/departments/DepartmentsClient.tsx` (lines 1-11)
**Apply to:** all `components/motion/*`, `theme-provider.tsx`, `theme-toggle.tsx`

```tsx
'use client';
import { useState, useRef, useEffect, useCallback } from 'react';   // hooks at top
import { MessageCircle, X } from 'lucide-react';                     // lucide named imports
import { Button } from '@/components/ui/button';                     // ui via @/ alias
```
- `'use client'` is the literal first line.
- Hooks imported from `react`; framer-motion hooks (`useReducedMotion`, `useInView`, `animate`, `motion`) imported the same way from `'framer-motion'`.
- Motion primitives are **client islands** that wrap server-rendered children. They do NOT make their parent client — `page.tsx` stays an async RSC (confirmed: no `'use client'` in `app/[locale]/(public)/page.tsx`).

### Design-token CSS convention (`app/globals.css`)
**Source:** `app/globals.css` lines 6-26 (`@theme inline`) + lines 94-126 (`.dark {}`)
**Apply to:** the brand-token dark override block

CRITICAL FINDING (confirms RESEARCH A2 / Open Question 1): the eight brand literals at lines 13-20
(`--color-bg`, `--color-surface`, `--color-primary`, `--color-accent`, `--color-nav`, `--color-text`,
`--color-muted`, `--color-border`) are **partially re-aliased LATER in the same `@theme inline` block**:
- line ~36 `--color-border: var(--border);`
- line ~38 `--color-accent: var(--accent);`
- line ~44 `--color-primary: var(--primary);`

So `--color-primary`, `--color-accent`, `--color-border` already resolve to the shadcn neutral `var()` tokens (which DO flip in `.dark`), while `--color-bg`, `--color-surface`, `--color-nav`, `--color-text`, `--color-muted` keep their literal hex. This means:
- The literal-hex brand tokens (`--color-bg/surface/nav/text/muted`) are the ones that genuinely need a `.dark` override and the Wave-0 spike must confirm a `.dark { --color-bg: ... }` selector wins over the `@theme inline` literal.
- The pattern to follow for the override is the existing `.dark {}` block format (lines 94-126): a flat `.dark { --token: value; }` list appended after the existing block.

```css
/* existing .dark {} block format to mirror — globals.css lines 94-126 */
.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  /* ...neutral tokens... */
}
```

---

## Pattern Assignments

### `components/ui/empty-state.tsx` (new — ui/presentational)

**Analog:** `components/ui/badge.tsx` (file convention) + RESEARCH §EmptyState API (exact spec)

- Plain function, `cn()` from `@/lib/utils`, token classes only (`text-muted-foreground`, `text-foreground`).
- Props per UI-SPEC §EmptyState Anatomy: `{ icon: LucideIcon; title: string; description?: string; action?: ReactNode; className?: string }`.
- Container: `flex flex-col items-center gap-3 py-16 text-center`; icon `h-10 w-10 text-muted-foreground` + `aria-hidden`; title `text-base font-semibold text-foreground`; description `text-sm text-muted-foreground max-w-sm`.
- No cva (no variants). No `'use client'` (RSC-compatible presentational).

### `components/motion/fade-in.tsx` (new — client primitive)

**Analog:** `components/public/ChatWidget.tsx` (`'use client'` + lucide/hook import boundary)
- RESEARCH Pattern 2: `useReducedMotion()` guard returns `<>{children}</>`; else `motion.div` with `initial={{opacity:0,y:16}}` / `whileInView` / `viewport={{once:true,amount:0.3}}` / `transition={{duration:0.4,ease:'easeOut',delay}}`.
- Timing locked by UI-SPEC Motion Contract: reveal 0.4s, offset 16px, easeOut.

### `components/motion/count-up.tsx` (new — client primitive)

**Analog:** `ChatWidget.tsx` (client hooks pattern: `useState/useRef/useEffect`)
- RESEARCH Pattern 3: `useInView(ref,{once:true,amount:0.5})` + `useReducedMotion()` + `animate(0, value, {duration:1.2, ease:'easeOut', onUpdate})`. Renders final value immediately when reduced-motion. Supports `suffix` for `"25+"`.

### `components/motion/hover-lift.tsx` (new — optional)

**Analog:** `components/ui/button.tsx` (cva pattern IF a wrapper variant is needed)
- UI-SPEC Motion Contract **prefers Tailwind-only** for RSC cards: `transition-transform transition-shadow duration-200 hover:-translate-y-1 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0`. Only build a `<HoverLift>` framer-motion wrapper for already-client cards.

### `components/portal/theme-provider.tsx` (new — client wrapper)

**Analog:** `components/ui/sonner.tsx` (thin `'use client'` wrapper re-exporting a lib component)
- RESEARCH Pattern 1: `'use client'`; wrap `next-themes` `ThemeProvider`, pass through `ComponentProps`. Mounted in portal layout with `attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange`.

### `components/portal/theme-toggle.tsx` (new — client control)

**Analog:** `components/layout/LanguageToggle.tsx` (existing client toggle control pattern — exact role match) + reuse `components/ui/switch.tsx` or `button.tsx`
- `'use client'`; `useTheme()` from next-themes; toggle between `'light'`/`'dark'`. `aria-label="Toggle theme"` (UI-SPEC Copywriting). 44px min hit area (UI-SPEC spacing exception). Mount in `Sidebar.tsx`.

### `app/globals.css` (modify — tokens)

**Analog:** self — extend existing `.dark {}` block (lines 94-126) and `@theme inline` (lines 6-26).
- Append `.dark` overrides for the literal-hex brand tokens (`--color-bg/surface/nav/text/muted`) using UI-SPEC §Color dark values (`#0B1220`, `#111827`, `#0F172A`, `#F1F5F9`, `#94A3B8`) — all `[ASSUMED]`, WCAG-AA-verify before lock.
- Wave-0 spike (A2): confirm `.dark` literal override wins; if not, refactor to `:root`/`.dark` var-indirection.

### `app/(portal)/layout.tsx` (modify — RSC layout)

**Analog:** self (lines 45-55). Add `suppressHydrationWarning` to `<html lang="en">`, wrap `<body>` content in `<ThemeProvider>`. Migrate `<main className="flex-1 bg-slate-50">` → `bg-background text-foreground` so dark mode takes effect (RESEARCH Pitfall 2).

### `components/portal/Sidebar.tsx` (modify — RSC nav)

**Analog:** self (lines 16-54). Mount `<ThemeToggle>` (likely near sign-out block, lines 43-52). Token-migrate hardcoded `bg-slate-900`/`text-white/80`/`hover:bg-white/10` to sidebar tokens (`bg-sidebar text-sidebar-foreground hover:bg-sidebar-accent`) for dark consistency. Note: Sidebar is a Server Component, so the toggle (client) is imported as a child island.

### `app/[locale]/(public)/page.tsx` (modify — async RSC)

**Analog:** self. Spacing pass (UI-01): unify `py-16`/`py-24`/`py-8` section padding to `py-16 md:py-24` (sections at lines 45, 78, 106, 125, 151, 170). Motion proof (D-07): wrap trust band (lines 78-103) in one `<FadeIn>`; replace stat literals — `90`→`<CountUp value={90}/>` (line 83), `25+`→`<CountUp value={25} suffix="+"/>` (line 88), `8`→`<CountUp value={8}/>` (line 93), `24x7` stays static (line 98). Page remains async RSC; motion are nested client islands. PUBLIC = LIGHT ONLY (no theme provider here).

### `app/(portal)/content/{departments,doctors,facilities}/*Client.tsx` (modify — client CRUD)

**Analog:** `DepartmentsClient.tsx` (canonical; doctors/facilities are near-identical).
- Replace the inline empty-state block (DepartmentsClient lines 202-211) with `<EmptyState icon={Building2} title="No departments yet" description="Add your first department to display it on the public site." action={<Button onClick={openAddDialog}>Add Department</Button>} />` (RESEARCH §EmptyState adoption, UI-SPEC Copywriting).
- The current block uses `text-slate-700`/`text-slate-500` literals; EmptyState's token classes fix dark mode automatically.
- (Dark-mode adoption, separate from EmptyState) these files also use `bg-white`/`border-slate-200`/`text-slate-*` literals throughout that need token migration for full portal dark mode.

---

## No Analog Found

None. Every new file maps to an existing shadcn-ui convention, an existing client-component boundary, or an existing toggle-control pattern; every modified file is its own analog.

## Metadata

**Analog search scope:** `components/ui/`, `components/portal/`, `components/public/`, `components/layout/`, `app/(portal)/`, `app/[locale]/(public)/`, `app/globals.css`, `lib/utils.ts`, `components.json`
**Files scanned:** ~14 read directly
**Pattern extraction date:** 2026-06-14
