---
phase: 13
slug: design-system-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-14
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> This phase is largely visual/behavioral; no test runner is installed (confirmed in RESEARCH.md).
> The pragmatic validation path is `npm run build` (typecheck/compile) + a manual checklist,
> rather than standing up a framework mid-milestone in a paid client deliverable.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None installed (no jest/vitest/playwright in package.json) |
| **Config file** | none — not added this phase (see Wave 0 decision) |
| **Quick run command** | `npm run build` (typecheck + compile — catches RSC/client boundary + import errors) |
| **Full suite command** | `npm run build` + manual smoke checklist |
| **Estimated runtime** | ~60–90 seconds (build) |

---

## Sampling Rate

- **After every task commit:** Run `npm run build`
- **After every plan wave:** Manual smoke — portal dark toggle works, public site stays light under OS dark, reduced-motion disables animation
- **Before `/gsd:verify-work`:** Manual checklist (below) fully green
- **Max feedback latency:** ~90 seconds (build)

---

## Per-Task Verification Map

| Req ID | Behavior | Test Type | Automated Command | Manual Check |
|--------|----------|-----------|-------------------|-------------|
| UI-01 | Sections use consistent padding (no stray ad-hoc `py-16`/`py-24`) | static/visual | `npm run build` + grep audit for stray `py-*` | visual diff of public pages |
| UI-02 | Toggle persists theme across navigation + reload | manual / e2e | `npm run build` | click toggle, navigate, reload — state holds |
| UI-02 | Public site stays light under OS dark mode | manual | — | open public route with OS dark on → still light |
| UI-02 | Brand accents meet WCAG AA on dark surface | manual (contrast) | — | DevTools/contrast tool on blue/green accent text |
| UI-03 | Reduced-motion disables animation | manual | `npm run build` | OS reduce-motion on → no fade/count animation |
| UI-03 | CountUp reaches correct final value | manual / unit-able | — | assert final rendered number = target (90, 25+, 8, 24x7) |
| UI-04 | EmptyState renders icon + title + desc + action | manual / unit-able | `npm run build` | render an empty portal table → component shows |

*Status legend: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] **Decision (locked by research):** Do NOT add a test framework this phase. Rely on
      `npm run build` + manual checklist. Defer unit-test infra (`vitest`) to a dedicated phase
      to avoid framework churn in the paid client deliverable.
- [ ] **Spike before locking globals.css:** Confirm `.dark` selector overrides the `@theme inline`
      brand-token literals (RESEARCH Open Question 1 / A2).
- [ ] **Contrast-verify** all dark-mode accent values (blue/green/nav) meet WCAG AA before committing.

*No framework install required this phase.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Theme persistence | UI-02 | No e2e runner installed | Toggle dark in portal, navigate between portal pages, reload browser — theme stays |
| Public-stays-light | UI-02 | Visual cross-route check | Enable OS dark mode, open any public `[locale]` route — must render light |
| WCAG AA contrast | UI-02 | Requires contrast tooling | Run a contrast checker on brand blue/green text against dark surface — ratio ≥ 4.5:1 (text) |
| Reduced-motion | UI-03 | OS-level setting | Enable OS reduce-motion, load homepage — FadeIn/CountUp render statically, no animation |
| Empty states | UI-04 | Requires empty data state | Trigger an empty portal content table — `<EmptyState>` shows icon + message + action |

---

## Validation Sign-Off

- [ ] Every task has `npm run build` as its quick verify (or a Wave 0 dependency)
- [ ] Sampling continuity: no 3 consecutive tasks without a build/manual verify
- [ ] Manual checklist covers all 5 manual-only behaviors above
- [ ] Dark accent contrast verified before globals.css commit
- [ ] `nyquist_compliant: true` set in frontmatter after sign-off

**Approval:** pending
