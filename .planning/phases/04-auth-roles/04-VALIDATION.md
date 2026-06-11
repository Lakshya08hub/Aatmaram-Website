---
phase: 4
slug: auth-roles
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-11
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | none — verify via build + curl/grep commands |
| **Config file** | none |
| **Quick run command** | `npm run build 2>&1 | tail -5` |
| **Full suite command** | `npm run build && npx tsc --noEmit` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run build 2>&1 | tail -5`
- **After every plan wave:** Run `npm run build && npx tsc --noEmit`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|--------|
| 04-xx-01 | TBD | 1 | AUTH-01 | T-04-01 | Unauthenticated portal access redirects to /login | shell | `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/portal/dashboard` → 302 | ⬜ pending |
| 04-xx-02 | TBD | 1 | AUTH-02 | T-04-02 | Login with valid credentials returns session cookie | shell | `npm run build && npx tsc --noEmit` | ⬜ pending |
| 04-xx-03 | TBD | 2 | AUTH-03 | T-04-03 | Pending account cannot access portal after login | manual | Navigate to /portal/* logged in as pending user — expect redirect | ⬜ pending |
| 04-xx-04 | TBD | 2 | AUTH-04 | — | Role column in profiles table is enforced at layout level | shell | `grep -r "profile.role" app/portal` | ⬜ pending |
| 04-xx-05 | TBD | 3 | AUTH-05 | T-04-04 | Admin can promote pending user to active role | manual | Admin UI flow — mark pending user as active | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements:
- `@supabase/ssr` already installed (Phase 1)
- `lib/supabase/client.ts`, `server.ts`, `middleware.ts` already exist
- `react-hook-form` + `zod` already installed (Phase 2)
- shadcn/ui Button, Input, Form already installed

*No new packages needed. No Wave 0 install tasks required.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Pending account blocked after login | AUTH-03 | Requires live Supabase DB + active test account | 1. Create account via signup form. 2. Do not approve in admin panel. 3. Attempt portal login — expect redirect or access-denied page. |
| Role-based section visibility | AUTH-05 | Requires 4 test accounts with different roles | Login as each role; verify sidebar/nav shows only permitted sections |
| Admin approval flow UI | AUTH-04 | Requires live DB + two accounts | Login as Admin, navigate to pending users list, approve one account |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
