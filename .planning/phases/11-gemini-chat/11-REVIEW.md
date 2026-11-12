---
phase: 11
phase_name: gemini-chat
status: issues_found
review_depth: standard
files_reviewed: 4
files_reviewed_list:
  - app/[locale]/(public)/layout.tsx
  - app/api/chat/route.ts
  - components/public/ChatWidget.tsx
  - lib/chat/hospital-knowledge.ts
findings:
  critical: 3
  warning: 4
  info: 3
  total: 10
---

# Phase 11: Gemini Chat — Code Review Report

**Reviewed:** 2026-06-20T00:00:00Z
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

Reviewed the Gemini-powered Nidhi chat widget spanning API route, knowledge prompt, client widget, and public layout. The knowledge base is appropriately scoped and contains no sensitive internal data. The client widget correctly renders AI responses as text (no `dangerouslySetInnerHTML`), so XSS from AI output is not present. However, three critical issues exist: no rate limiting on the API route (enabling cost-amplification and denial-of-service), the `messages` array length cap does not bound the total payload size (only individual messages), and no authentication or CORS restriction prevents the public `/api/chat` endpoint from being called by anyone on the internet at will. Four warnings cover input length not enforced on the client side, missing ARIA live region atomicity, a race condition in streaming that leaves orphaned empty messages, and the history depth cap being applied after per-message validation (reversible ordering that wastes cycles).

---

## Critical Issues

### CR-001 — No rate limiting on `/api/chat` — unrestricted API cost amplification

**Severity:** Critical
**File:** `app/api/chat/route.ts:11`
**Issue:** The POST handler has no rate limiting whatsoever. Any actor who discovers the endpoint can send an unlimited number of requests per second, each triggering a paid Gemini API call. With `messages.slice(-20)` keeping up to 20 messages of 2000 chars each (40 KB per request), a single script can exhaust the project's Gemini quota and generate unexpected billing in minutes. This is the highest-impact security gap in the implementation — cost-based denial of service against a production healthcare site with a fixed budget.
**Fix:** Add IP-based rate limiting using the `Upstash Ratelimit` + `@upstash/redis` package (free tier sufficient) or Next.js middleware. A simple sliding-window limit of 20 requests per IP per minute is appropriate for a hospital chat.

```typescript
// middleware.ts (or at the top of route.ts using a lightweight in-memory store for dev)
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(20, '1 m'),
});

// In the POST handler, before calling Gemini:
const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1';
const { success } = await ratelimit.limit(ip);
if (!success) {
  return new Response(JSON.stringify({ error: 'Too many requests. Please wait a moment.' }), {
    status: 429,
    headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
  });
}
```

---

### CR-002 — Total conversation payload unbounded — `messages` array length cap does not prevent oversized requests

**Severity:** Critical
**File:** `app/api/chat/route.ts:17`
**Issue:** The per-message length cap (2000 chars) is validated before `messages.slice(-20)`, but the `messages` array itself is never length-checked before iteration. An attacker can send an array of 100,000 short messages — each under 2000 chars — forcing the server to iterate all 100,000 entries in the validation loop before `slice(-20)` discards them. This is a CPU-time amplification attack requiring no Gemini quota. Additionally, the total payload is only loosely bounded: 20 messages × 2000 chars = 40,000 chars per Gemini call, which is within model limits but no explicit total-token guard exists.
**Fix:** Reject requests where `messages.length` exceeds a reasonable cap (e.g., 50) before iterating:

```typescript
if (!Array.isArray(messages) || messages.length > 50) {
  return new Response(JSON.stringify({ error: 'Invalid request' }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });
}
```

Place this check immediately after the `Array.isArray` check, before the `for` loop.

---

### CR-003 — No CORS restriction — endpoint callable cross-origin by any website

**Severity:** Critical
**File:** `app/api/chat/route.ts:11`
**Issue:** The route sets no `Access-Control-Allow-Origin` header and no `OPTIONS` preflight handler. While Next.js App Router defaults to same-origin for browser clients, there is no server-side enforcement preventing direct cross-origin `fetch()` calls with `mode: 'no-cors'` or `mode: 'cors'` (depending on browser behaviour) or any server-to-server call. Any malicious third-party website can embed a script that silently sends requests to `https://atmaram.example.com/api/chat` using the visitor's IP, burning through quota while circumventing per-IP rate limits if rate limiting is keyed only on origin. More importantly, the absence of an explicit `Origin` allowlist means there is no defence-in-depth layer if rate limiting is later misconfigured.
**Fix:** Add an explicit origin check and CORS headers:

```typescript
const allowedOrigin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://yoursite.com';
const origin = request.headers.get('origin') ?? '';

// For cross-origin preflight
// Add export async function OPTIONS() returning 204 with CORS headers

// In POST, reject non-matching origins in production:
if (process.env.NODE_ENV === 'production' && origin !== allowedOrigin) {
  return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
}
```

---

## Warnings

### WR-001 — Client-side input length not enforced — 2000-char cap only on server

**Severity:** Warning
**File:** `components/public/ChatWidget.tsx:177`
**Issue:** `sendMessage` calls `text.trim()` and checks for empty string but does not enforce any character limit before transmitting. A user (or bot) can paste a 100,000-character message into the input field; the client sends it and the server rejects it with a 400, but the user gets the generic error handler's "Something went wrong" fallback (line 207) with no informative feedback. This creates a confusing UX and wastes a round-trip.
**Fix:** Enforce the same 2000-char limit on the client before `fetch`:

```typescript
const MAX_INPUT = 2000;
async function sendMessage(text: string) {
  if (text.trim() === '' || isStreaming) return;
  if (text.trim().length > MAX_INPUT) {
    // Show inline error rather than sending
    setMessages((prev) => [...prev, {
      role: 'assistant',
      content: `Please keep your message under ${MAX_INPUT} characters.`,
    }]);
    return;
  }
  // ... rest of function
```

---

### WR-002 — Streaming race condition leaves orphaned empty assistant message on error

**Severity:** Warning
**File:** `components/public/ChatWidget.tsx:181`
**Issue:** At line 181, an empty assistant message placeholder `{ role: 'assistant', content: '' }` is appended to state before the fetch. If `res.ok` is false (line 189 throws), the `catch` block replaces the last message with an error string — but only if `updated[updated.length - 1]` is still the placeholder. If the user triggers another state update between the `setMessages` at line 181 and the `catch` block executing, the wrong message index gets overwritten. More concretely: if `setIsStreaming(false)` triggers a re-render that somehow reorders state (unlikely but possible in React concurrent mode with interruptions), the catch block corrupts a user message instead of the placeholder.

More importantly: if the stream errors mid-way (line 73 in route.ts `controller.error(err)`), `reader.read()` rejects, the catch fires, and the partially-streamed content in the last assistant message is discarded and replaced with the generic error. This is correct behaviour, but the issue is that `controller.error(err)` in the route causes the response stream to emit an error chunk that `TextDecoder.decode` may include as garbled bytes in the streamed content before the reader throws — depending on browser implementation.
**Fix:** Use a message ID or index captured at send-time rather than relying on `updated.length - 1`:

```typescript
const placeholderIndex = newMessages.length; // index in the about-to-be-set array
// Then in the catch/update callbacks, use that captured index instead of prev.length - 1
```

---

### WR-003 — `aria-live="polite"` on `CardContent` — screen reader may not announce streaming text chunks

**Severity:** Warning
**File:** `components/public/ChatWidget.tsx:263`
**Issue:** The `aria-live="polite"` region wraps the entire message list container. Screen readers with live regions only re-announce when DOM content changes within the live region. Because streaming appends characters to the last child's text node rather than replacing the element, some screen readers (particularly NVDA + Firefox) may announce every token independently creating an incomprehensible flood of announcements, or may batch and miss mid-stream content entirely. Additionally, `aria-live` without `aria-atomic="false"` and `aria-relevant="additions text"` gives the AT no guidance on what to re-announce.
**Fix:** Add explicit ARIA attributes and move the live region to a visually-hidden announcement buffer updated only on message completion:

```tsx
{/* Announce completed messages only */}
<div
  aria-live="polite"
  aria-atomic="true"
  className="sr-only"
  aria-relevant="additions"
>
  {!isStreaming && messages.length > 0
    ? messages[messages.length - 1].content
    : ''}
</div>
```

Remove `aria-live` from `CardContent`.

---

### WR-004 — `key={idx}` used for message list — causes stale renders during streaming

**Severity:** Warning
**File:** `components/public/ChatWidget.tsx:269`
**Issue:** React message list uses array index as `key`. When streaming updates the last message's content, React diffs by key and re-renders only the last item — which is correct for performance. However, if a message is ever deleted or inserted at a non-tail position (e.g., the error-replacement in catch replaces the last message), React reconciles by index and may reuse DOM nodes incorrectly, potentially preserving stale `ref`s or animation state from prior messages. This is a latent bug that will surface if message editing or deletion is added later; it also means the typing indicator (`showTyping`) is keyed to an index that changes meaning mid-stream.
**Fix:** Assign a stable `id` to each `Message` object at creation time:

```typescript
type Message = { id: string; role: 'user' | 'assistant'; content: string };
// When creating: { id: crypto.randomUUID(), role: ..., content: ... }
// In JSX: key={msg.id}
```

---

## Info

### IN-001 — Phone number placeholder left in production knowledge base

**Severity:** Info
**File:** `lib/chat/hospital-knowledge.ts:8,49`
**Issue:** The phone number is `+91-512-XXXXXXX` in three places (lines 8, 40, 49). If deployed to production with this placeholder, every user who asks for the hospital's phone number will receive a dummy number. This is not a code bug but it is a data correctness issue that will cause real patient harm (inability to reach the hospital in an emergency).
**Fix:** Replace `XXXXXXX` with the actual hospital phone number before going live, or add a build-time assertion:

```typescript
if (process.env.NODE_ENV === 'production' && HOSPITAL_KNOWLEDGE.includes('XXXXXXX')) {
  throw new Error('Hospital phone number placeholder not replaced before production build.');
}
```

---

### IN-002 — `GEMINI_API_KEY` accessed with non-null assertion — no startup validation

**Severity:** Info
**File:** `app/api/chat/route.ts:5`
**Issue:** `process.env.GEMINI_API_KEY!` with a non-null assertion suppresses TypeScript's undefined warning. If the environment variable is missing, `GoogleGenAI` will receive `undefined` cast to string, which will either throw at construction time (caught by the outer try/catch and returned as 500) or cause an auth error on first Gemini call. Neither gives the developer a clear startup-time signal.
**Fix:** Add an explicit check at module initialisation:

```typescript
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error('GEMINI_API_KEY environment variable is not set.');
const ai = new GoogleGenAI({ apiKey });
```

---

### IN-003 — `setRequestLocale` return value not awaited — potential locale setting race

**Severity:** Info
**File:** `app/[locale]/(public)/layout.tsx:19`
**Issue:** `setRequestLocale(locale)` is called without `await`. The next-intl documentation marks this as a synchronous call in the current API, but if the implementation changes in a minor version, the locale may not be committed before `children` renders, causing localisation to fall back to the default locale silently. This is low risk with the current next-intl version but worth pinning.
**Fix:** No code change required if on current next-intl; add a comment confirming this is intentionally synchronous, and lock the next-intl version in `package.json` with an exact version pin.

---

_Reviewed: 2026-06-20T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
