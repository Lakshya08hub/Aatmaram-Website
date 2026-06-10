---
phase: 3
slug: bilingual-system
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-11
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None installed — no jest/vitest/playwright found |
| **Config file** | none |
| **Quick run command** | `npm run dev` + manual browser check |
| **Full suite command** | Manual 5-step protocol below |
| **Estimated runtime** | ~5 minutes (manual) |

---

## Sampling Rate

- **After every task commit:** Run `npm run dev`, visit `/hi` and `/en`, verify no broken strings
- **After every plan wave:** Run full 5-step manual test protocol
- **Before `/gsd:verify-work`:** Full protocol must pass on both locales
- **Max feedback latency:** ~5 minutes (manual browser cycle)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 3-01-01 | 01 | 1 | I18N-01 | — | N/A | manual | — | ❌ Wave 0 | ⬜ pending |
| 3-01-02 | 01 | 1 | I18N-04 | — | N/A | manual | — | ❌ Wave 0 | ⬜ pending |
| 3-02-01 | 02 | 1 | I18N-02 | — | N/A | manual | — | ❌ Wave 0 | ⬜ pending |
| 3-02-02 | 02 | 1 | I18N-03 | — | N/A | manual | — | ❌ Wave 0 | ⬜ pending |
| 3-02-03 | 02 | 1 | I18N-05 | — | N/A | manual | — | ❌ Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

No test framework to install. Phase 3 is verified entirely via manual browser testing.

*Existing infrastructure covers no automated i18n tests — manual protocol is the substitute.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| All strings in hi.json are Hindi (not English placeholders) | I18N-01 | No i18n test runner installed | Visit `/hi` in dev server — scan every visible string on each page; none should be English placeholder text |
| Hindi browser preference triggers Hindi locale | I18N-02 | Requires browser locale simulation | Chrome DevTools → Sensors → Locale → set `hi-IN` → clear cookies → visit `localhost:3000/` → should redirect to `/hi` |
| Toggle switches locale and cookie persists across sessions | I18N-03 | Requires cookie inspection + browser restart | Toggle to EN → close tab → reopen `localhost:3000` → should land on `/en` (NEXT_LOCALE cookie persists) |
| Nav links navigate to correct locale path (no double-prefix) | I18N-04 | Requires checking URL structure | On `/hi/about`, click EN toggle → should navigate to `/en/about` NOT `/en/hi/about` |
| Devanagari script renders legibly | I18N-05 | Font rendering requires visual inspection | Visit `/hi` → inspect all Hindi text; zoom to 200%; no boxes/fallback glyphs; check on Windows (Nirmala UI) and mobile if available |

---

## Validation Sign-Off

- [ ] All tasks have manual verify instructions
- [ ] Sampling continuity: manual check per task commit
- [ ] Wave 0: no framework install needed (manual-only phase)
- [ ] No watch-mode flags
- [ ] Feedback latency < 5 minutes (manual browser cycle)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
