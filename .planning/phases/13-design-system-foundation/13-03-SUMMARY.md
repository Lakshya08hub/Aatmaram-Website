# Plan 13-03 Summary — framer-motion + motion primitives

**Status:** Complete
**Requirements:** UI-03
**Executed:** 2026-06-14 (inline, sequential)

## What was built

Installed `framer-motion` (human legitimacy checkpoint approved) and built three reusable motion
primitives in `components/motion/`, each a `'use client'` island that wraps Server Component children
without forcing parent pages client-side.

- **`<FadeIn>`** — fade-in-on-scroll via `whileInView` (opacity 0→1, y 16→0), 0.4s easeOut, `viewport once`.
  Optional `delay` for staggering.
- **`<HoverLift>`** — `whileHover={{ y: -4 }}`, 0.2s easeOut. Subtle/professional.
- **`<CountUp>`** — animates 0→`value` over 1.2s when scrolled into view (`useInView`, `animate`,
  `useMotionValue`/`useTransform` rounded). Supports `prefix`/`suffix` so non-pure-number stats can use it.

**prefers-reduced-motion is honored in every primitive** via `useReducedMotion()` — when set, each
renders its final state statically with NO animation (FadeIn/HoverLift render a plain `div`; CountUp
renders the final value).

## Package legitimacy (checkpoint — human-approved)
`framer-motion` v12.40.0 · ~7 years old · millions of downloads/week · repo `github.com/motiondivision/motion`
· React 19 compatible (`^18 || ^19`, project on 19.x) · not deprecated. Approved (batched with 13-01).

## Files
- `package.json`, `package-lock.json` — framer-motion dependency
- `components/motion/fade-in.tsx` (new)
- `components/motion/hover-lift.tsx` (new)
- `components/motion/count-up.tsx` (new)

## Verification
- `npm install framer-motion` exit 0 ✓
- `npm run build` exits 0 ✓ (all routes compiled)
- Each primitive guards `useReducedMotion` ✓

## Carry-forward
Adoption proof (homepage trust band CountUp + FadeIn) happens in Wave 2 (13-05).
