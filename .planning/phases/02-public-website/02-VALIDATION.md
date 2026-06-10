---
phase: 2
slug: public-website
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-06-10
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None configured — `npm run build` is the primary gate |
| **Config file** | none — no jest/vitest in project |
| **Quick run command** | `npm run build` |
| **Full suite command** | `npm run build && npm run lint` |
| **Estimated runtime** | ~15–30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run build` — confirms no TypeScript errors and all routes compile
- **After every plan wave:** Run `npm run build && npm run lint`
- **Before `/gsd:verify-work`:** Full build green + visual browser check of all 7 pages
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| shadcn-init | 02-01 | 1 | PUB-01–08 | — | N/A | smoke | `npm run build` | ❌ Wave 0 | ⬜ pending |
| geist-font | 02-01 | 1 | PUB-01–08 | — | N/A | smoke | `npm run build` | ❌ Wave 0 | ⬜ pending |
| public-layout | 02-01 | 1 | PUB-01–08 | — | N/A | smoke | `npm run build` | ❌ Wave 0 | ⬜ pending |
| home-page | 02-02 | 2 | PUB-01, PUB-08 | — | XSS: React escapes JSX values | smoke | `npm run build` | ❌ Wave 0 | ⬜ pending |
| about-page | 02-02 | 2 | PUB-02 | — | N/A | smoke | `npm run build` | ❌ Wave 0 | ⬜ pending |
| departments-page | 02-02 | 2 | PUB-03 | — | N/A | smoke | `npm run build` | ❌ Wave 0 | ⬜ pending |
| doctors-page | 02-02 | 2 | PUB-04 | — | N/A | smoke | `npm run build` | ❌ Wave 0 | ⬜ pending |
| services-page | 02-03 | 2 | PUB-05 | — | N/A | smoke | `npm run build` | ❌ Wave 0 | ⬜ pending |
| contact-page | 02-03 | 2 | PUB-06 | — | N/A | smoke | `npm run build` | ❌ Wave 0 | ⬜ pending |
| appointment-form | 02-04 | 3 | PUB-07 | T-02-01 | Client-side Zod validation; no data storage Phase 2 | smoke + manual | `npm run build` + browser | ❌ Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `components.json` — created by `npx shadcn@latest init`
- [ ] `lib/utils.ts` — created by `npx shadcn@latest init` (contains `cn()` helper)
- [ ] `app/[locale]/(public)/layout.tsx` — Header + Footer wrapper (does not exist yet; must be created before page work begins)

*No test framework needed for Phase 2 — `npm run build` covers route existence and type safety. Form validation and toast behavior are manual-only.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Form validation fires on invalid phone | PUB-07 | Requires browser interaction with react-hook-form | Navigate to `/hi/appointment`, enter invalid phone, submit — expect inline error "Enter a valid 10-digit Indian mobile number." |
| Success toast appears on valid submit | PUB-07 | Requires browser interaction + Sonner toast timing | Submit valid form — expect toast "Your appointment request has been received. Our team will call you shortly." at bottom-right |
| PM-JAY badge visible and prominent on homepage | PUB-08 | Visual placement in hero section | Navigate to `/hi/` — expect green pill badge below tagline in hero section |
| Mobile nav drawer opens/closes | PUB-01 | Requires responsive viewport + Sheet interaction | Open at 375px width — expect hamburger icon; tap to open Sheet drawer from right |
| All 7 pages reachable without 404 | PUB-01–08 | Build verifies compilation but not runtime routing | Visit `/hi/`, `/hi/about`, `/hi/departments`, `/hi/doctors`, `/hi/services`, `/hi/contact`, `/hi/appointment` — all return 200 |

---

## Threat Model

| Pattern | STRIDE | Mitigation in Phase 2 |
|---------|--------|-----------------------|
| Form spam (appointment form) | Tampering | Client-side only — no data stored or transmitted in Phase 2; Phase 7 adds rate limiting + honeypot |
| XSS via seeded content | Tampering | React escapes JSX values by default — hardcoded strings are safe |
| Open redirect | Spoofing | next-intl middleware handles locale redirects — no custom redirect logic added |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
