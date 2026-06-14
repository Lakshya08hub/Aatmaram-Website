# Plan 13-01 Summary — Dark brand-token override

**Status:** Complete
**Requirements:** UI-02
**Executed:** 2026-06-14 (inline, sequential — subagent hit session limit; orchestrator completed)

## What was built

Refactored the 5 literal-hex brand tokens in `app/globals.css` to `var()`-indirection so
portal dark mode actually flips them.

## Spike verdict (Task 1)

**REFACTOR PATH TAKEN — a direct `.dark { --color-bg: … }` override LOSES.**

Reason (Tailwind v4 semantics, definitive — no dev-server probe needed): `@theme inline`
inlines a token's *literal* value into the generated utility at build time. So `bg-bg`
compiled to `background-color: #F8FAFC`, and a `.dark { --color-bg: … }` override could never
affect it (the utility never references the variable). The shadcn neutral tokens work only
because they are declared as `var(--background)` etc. — the inlined value is itself a `var()`.

**Fix:** the 5 literal-hex brand tokens (`--color-bg`, `--color-surface`, `--color-nav`,
`--color-text`, `--color-muted`) now reference private vars (`--brand-bg`, `--brand-surface`,
`--brand-nav`, `--brand-text`, `--brand-muted`) declared in `:root` (light) and overridden in
`.dark`. This mirrors the existing line-36/39/45 aliasing pattern. `--color-primary/accent/border`
were left as-is — they are re-aliased to the shadcn neutrals later in the `@theme inline` block
and already flip in dark.

## Contrast verdict (Task 2 — human-approved)

All pairings verified ≥ WCAG AA against the dark surface (`#0B1220` bg / `#111827` card):

| Pairing | Ratio | Grade |
|---------|-------|-------|
| text `#F1F5F9` on bg `#0B1220` | ~16:1 | AAA |
| muted `#94A3B8` on bg `#0B1220` | ~7:1 | AA |
| accent blue `#60A5FA` on surface `#111827` | ~7:1 | AA |
| accent green `#4ADE80` on surface `#111827` | ~10:1 | AA |

Final dark values locked in `app/globals.css`. Human checkpoint approved (batched with 13-03).

## Files
- `app/globals.css` — `:root` private brand vars, `@theme inline` var-indirection, `.dark` overrides

## Verification
- `npm run build` exits 0 ✓ (full production build, all routes compiled)

## Carry-forward for Wave 1/2
Portal dark mode flips via `--brand-*` private vars + the shadcn neutral block. 13-04's slate→token
migration should target the shadcn neutral tokens (`bg-background`, `text-foreground`, sidebar tokens),
which already have `.dark` values.
