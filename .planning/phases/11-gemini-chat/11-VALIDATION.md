---
phase: 11-gemini-chat
status: defined
created: 2026-06-14
---

# Phase 11: Gemini Chat — Validation Plan

## What this phase must prove

Phase 11 succeeds when all four CHAT requirements are verifiably met:

| Req | Claim | How validated |
|-----|-------|---------------|
| CHAT-01 | Widget visible on every public page without obstructing navigation | Human smoke test (Wave 2 checkpoint, step 13) |
| CHAT-02 | Visitor receives accurate answers about departments, timings, services, and booking | Human smoke test (Wave 2 checkpoint, steps 7–10) |
| CHAT-03 | Chat makes zero Supabase queries — static system prompt only | Static grep: `grep -r "supabase\|createClient" components/public/ChatWidget.tsx app/api/chat/route.ts` must return zero matches |
| CHAT-04 | Out-of-scope questions return the hospital phone number, not hallucinations | Human smoke test (Wave 2 checkpoint, step 10) |

---

## Validation Architecture

### Static Analysis (automated, in-plan verify steps)

These run inline during execution — no separate test file needed.

**CHAT-03 — No Supabase in chat path:**
```bash
grep -r "supabase\|createClient\|NEXT_PUBLIC_SUPABASE" \
  components/public/ChatWidget.tsx app/api/chat/route.ts
# Must return zero matches
```

**Secret isolation — GEMINI_API_KEY never reaches the client:**
```bash
grep -r "GEMINI_API_KEY\|NEXT_PUBLIC" components/public/ChatWidget.tsx
# Must return zero matches
```

**Functional updater pattern — no stale closure in stream loop:**
```bash
grep "setMessages" components/public/ChatWidget.tsx
# Must show `(prev) =>` form, never direct state reference
```

**TypeScript compile check:**
```bash
npx tsc --noEmit 2>&1 | grep -E "ChatWidget|api/chat|hospital-knowledge"
# Must return zero errors
```

### Human Smoke Tests (Wave 2 blocking checkpoint)

All 13 steps in the Wave 2 checkpoint are blocking. The phase does not complete until the executor sees "approved" from the human verifier.

Key assertions:
1. Bubble visible on public pages → CHAT-01
2. OPD timing answer streams correctly → CHAT-02
3. Department list returned from knowledge base → CHAT-02
4. Out-of-scope question returns phone number → CHAT-04
5. No `GEMINI_API_KEY` in DevTools network headers → CHAT-03 (runtime confirmation)
6. Bubble present on a second public page (departments, doctors) → CHAT-01

### What is NOT validated here

- Hindi language auto-matching is verified informally during smoke test (type in Hindi, confirm response is Hindi) — not a blocking criterion in v1
- Multi-turn context is verified by the follow-up question in step 8 of the checkpoint
- No automated test file is written for this phase — the static grep checks + human smoke test provide sufficient confidence for a v1 chat widget

---

## Nyquist Coverage Check

| Failure mode | Covered? | How |
|--------------|----------|-----|
| GEMINI_API_KEY leaks to client | ✓ | grep check in Wave 1 verify + DevTools step in Wave 2 |
| Supabase called from chat path | ✓ | grep CHAT-03 check |
| Stale closure overwrites messages | ✓ | grep functional updater check |
| Widget missing on non-home pages | ✓ | Smoke test step 13 |
| Streaming fails / tokens not appended | ✓ | Smoke test steps 6–8 (visual token-by-token confirmation) |
| Out-of-scope hallucination | ✓ | Smoke test step 10 |
| TypeScript errors | ✓ | `tsc --noEmit` in each plan's verify block |
