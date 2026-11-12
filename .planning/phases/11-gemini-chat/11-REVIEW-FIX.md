---
phase: 11
fixed_at: 2026-06-20T00:00:00Z
review_path: .planning/phases/11-gemini-chat/11-REVIEW.md
iteration: 1
findings_in_scope: 7
fixed: 7
skipped: 0
status: all_fixed
---

# Phase 11: Code Review Fix Report

**Fixed at:** 2026-06-20
**Source review:** .planning/phases/11-gemini-chat/11-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 7
- Fixed: 7
- Skipped: 0

## Fixed Issues

### CR-001: No rate limiting on `/api/chat`

**Files modified:** `app/api/chat/route.ts`
**Commit:** 8c66792
**Applied fix:** Added in-memory `rateLimitMap` (Map-based sliding window, 20 req/min per IP). Reads IP from `x-forwarded-for` / `x-real-ip` headers with `127.0.0.1` fallback. Returns 429 if limit exceeded. Added periodic `setInterval` cleanup (every 5 min) to prevent unbounded memory growth.

---

### CR-002: `messages` array length unbounded before iteration

**Files modified:** `app/api/chat/route.ts`
**Commit:** 9c16a2b
**Applied fix:** Added `if (messages.length > 50) return Response.json({ error: 'Too many messages' }, { status: 400 })` immediately after the `Array.isArray` check and before the `for` loop.

---

### CR-003: No CORS restriction on the chat API

**Files modified:** `app/api/chat/route.ts`
**Commit:** cf2ef8f
**Applied fix:** Added `ALLOWED_ORIGINS` array (from `NEXT_PUBLIC_APP_URL` env var + localhost:3000), `isAllowedOrigin()` helper, origin check at start of `POST` handler returning 403 on mismatch, and an `OPTIONS` export for CORS preflight that returns correct `Access-Control-Allow-*` headers.

---

### WR-001: Client sends oversized input without local feedback

**Files modified:** `components/public/ChatWidget.tsx`
**Commit:** 16d9a68
**Applied fix:** Added `MAX_INPUT_LENGTH = 2000` constant. In `sendMessage`, added a guard before clearing input — if `userText.length > MAX_INPUT_LENGTH`, pushes an inline assistant error message and returns early. Added a character-countdown paragraph below the input that appears when `input.length > 1800`. Restructured the input footer div to accommodate the countdown row.

---

### WR-002 + WR-004: Unstable streaming index and index-based React keys

**Files modified:** `components/public/ChatWidget.tsx`
**Commit:** 5ee9256
**Applied fix:**
- Added `id: string` field to `Message` type (WR-004).
- All message creation sites now call `crypto.randomUUID()` for the `id` field.
- Changed `key={idx}` to `key={msg.id}` in the message render loop (WR-004).
- Added `assistantIndexRef = useRef<number>(-1)` (WR-002). The placeholder insertion now happens inside a `setMessages` callback that captures the index into `assistantIndexRef.current` atomically. Streaming updates use `assistantIndexRef.current` to address the correct slot, not `updated.length - 1`.

---

### WR-003: `aria-live` region floods screen readers during streaming

**Files modified:** `components/public/ChatWidget.tsx`
**Commit:** 3c287c5
**Applied fix:** Removed `aria-live="polite"` from the `CardContent` scrolling container. Added a dedicated `<div aria-live="polite" aria-atomic="true" className="sr-only">` above the message list that renders `lastCompletedMessage` state. Added `lastCompletedMessage` state (string, default `''`). In the `finally` block of `sendMessage`, reads the completed assistant message from state via a `setMessages` callback and calls `setLastCompletedMessage` — this fires only once per response, not on every streaming token.

---

## Skipped Issues

None — all findings were fixed.

---

_Fixed: 2026-06-20_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
