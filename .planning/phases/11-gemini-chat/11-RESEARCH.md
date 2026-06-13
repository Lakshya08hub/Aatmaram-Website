# Phase 11: Gemini Chat - Research

**Researched:** 2026-06-13
**Domain:** Gemini API (Node.js SDK), Next.js App Router streaming Route Handlers, React streaming client
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Floating bubble positioned bottom-right corner. Icon only when closed (no label text). Standard FAB pattern.
- **D-02:** Opens as a small card panel ~360px wide × 500px tall. Has: header row (hospital name + close ✕ button), scrollable message list, text input with send button.
- **D-03:** Widget is a Client Component (`'use client'`) — needs state for open/closed, message list, input value, loading indicator.
- **D-04:** Multi-turn with history. Each API call sends the full `messages` array (role: user / assistant). History lives in React state — not persisted across page reloads.
- **D-05:** Greeting message shown immediately when widget opens — a pre-set assistant message, not a Gemini API call.
- **D-06:** Streaming. Route Handler calls Gemini with streaming enabled and pipes via a `ReadableStream`. Client reads stream and appends tokens incrementally. Shows typing indicator while first token hasn't arrived.
- **D-07:** Static file at `lib/chat/hospital-knowledge.ts` exports a `HOSPITAL_KNOWLEDGE` string constant. Imported by Route Handler and set as Gemini system prompt on every request.
- **D-08:** Knowledge base includes: departments + specialties, doctors list, OPD timings + contact, appointment booking instructions.
- **D-09:** System prompt instructs Gemini to: respond in same language the visitor writes in (EN/HI auto-match), stay within knowledge base, give hospital phone number for out-of-scope questions, never fabricate info.
- **D-10:** Route Handler at `app/api/chat/route.ts` — POST endpoint. Receives `{ messages: [{role, content}] }`. Uses `GEMINI_API_KEY` from env (server-side only). Returns streaming `Response` with `Content-Type: text/plain; charset=utf-8`.
- **D-11:** Gemini model: `gemini-1.5-flash` — fast and cheap. Claude's call to confirm latest stable model name. ⚠️ **CRITICAL UPDATE: gemini-1.5-flash is SHUT DOWN as of June 1, 2026. Use `gemini-2.5-flash` instead.**

### Claude's Discretion
- Exact styling of chat bubble, panel, and message bubbles — professional, consistent with hospital's blue/white brand
- Bubble icon choice (MessageCircle or similar from lucide-react)
- Typing indicator implementation (animated dots)
- Exact wording of greeting message and system prompt instructions

### Deferred Ideas (OUT OF SCOPE)
- Dynamic knowledge base from Supabase
- Hindi-only knowledge base variant
- Chat history persistence across page reloads
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CHAT-01 | Floating chat widget visible on all public pages | Widget mounted in `app/[locale]/(public)/layout.tsx`; confirmed pattern from existing public layout |
| CHAT-02 | Chat answers visitor questions about departments, timings, services, doctors, and how to book | Gemini `systemInstruction` + static knowledge base in `lib/chat/hospital-knowledge.ts` |
| CHAT-03 | Chat has no access to Supabase — responds only from system prompt containing public hospital info | Route Handler uses only `GEMINI_API_KEY` + static knowledge constant; no Supabase client imported |
| CHAT-04 | Chat falls back to phone number when question is out of scope | System prompt explicitly instructs fallback behavior; confirmed pattern with Gemini instruction following |
</phase_requirements>

---

## Summary

Phase 11 adds a floating Gemini-powered chat widget to every public page of the hospital site. The widget is a self-contained Client Component that maintains conversation history in React state and streams responses from a Next.js Route Handler. The Route Handler calls the Gemini API server-side using the `@google/genai` npm package (the current, actively maintained SDK), with a static system prompt baked into `lib/chat/hospital-knowledge.ts`.

**Critical finding:** The model specified in CONTEXT.md D-11 (`gemini-1.5-flash`) was **shut down on June 1, 2026**. All Gemini 1.x and 2.0 Flash models are offline. The correct current model is `gemini-2.5-flash`. [VERIFIED: WebSearch via Google Developers Blog + Google Cloud Blog]

The implementation involves three new files: the Route Handler (`app/api/chat/route.ts`), the knowledge base constant (`lib/chat/hospital-knowledge.ts`), and the widget Client Component (`components/public/ChatWidget.tsx`). The widget is mounted once in the public layout, giving it coverage on all 7 public pages.

**Primary recommendation:** Install `@google/genai` (v2.8.0, the new unified Google Gen AI SDK), use `ai.models.generateContentStream()` with `config.systemInstruction` for streaming, and consume the stream client-side via `fetch` + `response.body.getReader()`.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Chat widget UI (bubble, panel, messages) | Browser / Client | — | Needs React state for open/closed, message list, streaming append; must be `'use client'` |
| Gemini API call + streaming | API / Backend (Route Handler) | — | `GEMINI_API_KEY` must never reach the browser; server-side only per CLAUDE.md |
| System prompt / knowledge base | API / Backend | — | Static constant imported by Route Handler; never sent to client directly |
| Stream piping | API / Backend | Browser (consumer) | Route Handler creates ReadableStream; client reads it with `getReader()` |
| Conversation history | Browser / Client | — | React state only; not persisted; sent to Route Handler on each request |
| Widget mount point | Frontend Server (SSR layout) | — | `app/[locale]/(public)/layout.tsx` is a Server Component; widget is imported and rendered there |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@google/genai` | 2.8.0 | Gemini API client for Node.js — streaming, chat history, system instructions | Current official Google Gen AI JS/TS SDK; replaced deprecated `@google/generative-ai`; updated June 2026 |

> **Note:** The older `@google/generative-ai` (v0.24.1) is on npm but is the **deprecated** predecessor. [VERIFIED: npm registry — both packages exist; `@google/genai` is the current replacement per Google's official SDK repo]

### Supporting (already installed — no new installs needed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `lucide-react` | ^1.17.0 | Chat bubble icon (MessageCircle), close button (X), send button (Send) | Already installed |
| `components/ui/card.tsx` | — | Chat panel container (Card, CardHeader, CardContent) | Already installed via shadcn |
| `components/ui/button.tsx` | — | Send button, close button, FAB bubble button | Already installed via shadcn |
| `components/ui/input.tsx` | — | Message composer text input | Already installed via shadcn |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@google/genai` | `@google/generative-ai` | Older SDK — deprecated, missing newer model support, no longer receiving features |
| Custom ReadableStream | `ai` (Vercel AI SDK) | Vercel AI SDK adds abstraction layer; overkill for a single streaming endpoint; `@google/genai` streams natively |
| `response.body.getReader()` | Server-Sent Events (SSE) | SSE needs `text/event-stream` and EventSource; plain text stream via fetch is simpler for this use case |

### Installation

```bash
npm install @google/genai
```

---

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `@google/genai` | npm | ~1 yr (active) | High (official Google SDK) | github.com/googleapis/js-genai | [ASSUMED — slopcheck unavailable] | Approved — official Google org, confirmed on npm registry |

**Packages removed due to slopcheck [SLOP] verdict:** none

**Packages flagged as suspicious [SUS]:** none

**slopcheck availability:** slopcheck was not available in this environment. Package is tagged `[ASSUMED]` but confidence is HIGH — `@google/genai` is published under the `googleapis` GitHub organization, which is Google's official open-source org. The npm scope `@google` is Google-controlled. Registry existence confirmed: `npm view @google/genai version` → `2.8.0`, modified `2026-06-03`. [VERIFIED: npm registry for existence; source org legitimacy is HIGH-confidence assumption]

---

## Architecture Patterns

### System Architecture Diagram

```
Visitor browser
  │
  ├─ Renders <ChatWidget /> (Client Component)
  │    ├─ State: isOpen, messages[], inputValue, isStreaming
  │    ├─ On open: prepends greeting message (no API call)
  │    └─ On send:
  │         ├─ Appends user message to state
  │         └─ POST /api/chat  ──────────────────────────────────────►  Route Handler
  │              { messages: [{role, content}, ...] }                    app/api/chat/route.ts
  │                                                                         │
  │                                                                         ├─ Reads GEMINI_API_KEY (env)
  │                                                                         ├─ Imports HOSPITAL_KNOWLEDGE
  │                                                                         └─ ai.models.generateContentStream({
  │                                                                               model: 'gemini-2.5-flash',
  │                                                                               contents: messages,  ──────────► Gemini API (Google)
  │                                                                               config: { systemInstruction }
  │                                                                            })
  │                                                                         │
  │◄── streaming Response (text/plain; charset=utf-8) ────────────────────── ReadableStream of text chunks
  │
  └─ getReader() loop → appends tokens to last message in state → re-renders
```

### Recommended Project Structure

```
app/
└── api/
    └── chat/
        └── route.ts          # POST handler — Gemini call, streaming response

lib/
└── chat/
    └── hospital-knowledge.ts # HOSPITAL_KNOWLEDGE string constant (system prompt content)

components/
└── public/
    └── ChatWidget.tsx        # 'use client' — floating bubble + panel + message list
```

Widget mounted in:
```
app/[locale]/(public)/layout.tsx  # Add <ChatWidget /> below <Footer />
```

### Pattern 1: Route Handler with Gemini Streaming

**What:** POST Route Handler that receives conversation history, prepends system instruction, calls Gemini with streaming, and pipes chunks as plain text.

**When to use:** Any time `GEMINI_API_KEY` must stay server-side and the client needs streaming tokens.

```typescript
// Source: @google/genai npm docs + googleapis/js-genai GitHub [ASSUMED — pattern verified via WebSearch]
// app/api/chat/route.ts
import { GoogleGenAI } from '@google/genai';
import { HOSPITAL_KNOWLEDGE } from '@/lib/chat/hospital-knowledge';
import { NextRequest } from 'next/server';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function POST(req: NextRequest) {
  const { messages } = await req.json();

  // Convert client message format {role, content} → Gemini format {role, parts: [{text}]}
  // Note: Gemini uses 'model' for assistant role, not 'assistant'
  const contents = messages.map((m: { role: string; content: string }) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const stream = await ai.models.generateContentStream({
    model: 'gemini-2.5-flash',
    contents,
    config: {
      systemInstruction: HOSPITAL_KNOWLEDGE,
    },
  });

  const readable = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const chunk of stream) {
          const text = chunk.text;
          if (text) {
            controller.enqueue(encoder.encode(text));
          }
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
```

### Pattern 2: Client-Side Stream Consumption in React

**What:** Fetch streaming response, read chunks in a loop, append to the last message in state.

**When to use:** Any Client Component that consumes a streaming text/plain Route Handler.

```typescript
// Source: Next.js App Router streaming patterns [ASSUMED — standard Web Streams API]
// Inside ChatWidget.tsx sendMessage handler

async function sendMessage(userText: string) {
  const newMessages = [...messages, { role: 'user', content: userText }];
  setMessages([...newMessages, { role: 'assistant', content: '' }]);
  setIsStreaming(true);

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: newMessages }),
    });

    if (!res.ok || !res.body) throw new Error('Stream failed');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: updated[updated.length - 1].content + chunk,
        };
        return updated;
      });
    }
  } finally {
    setIsStreaming(false);
  }
}
```

### Pattern 3: Gemini Role Name Mapping

**What:** Gemini API uses `'model'` for assistant turns, not `'user'`/`'assistant'`. The client stores messages as `{ role: 'user' | 'assistant', content: string }`, but the Route Handler must map `'assistant'` → `'model'` before sending to Gemini.

```typescript
// CORRECT Gemini content format [VERIFIED: WebSearch via @google/genai docs]
{ role: 'user', parts: [{ text: 'What are the OPD timings?' }] }
{ role: 'model', parts: [{ text: 'OPD is open Monday–Saturday 9am–2pm.' }] }

// WRONG — Gemini rejects 'assistant' as a role name
{ role: 'assistant', parts: [{ text: '...' }] }
```

### Anti-Patterns to Avoid

- **Calling Gemini from the client component directly:** `GEMINI_API_KEY` would be exposed in the browser. CLAUDE.md and CONTEXT.md both mandate server-side-only API key usage. All Gemini calls must go through the Route Handler.
- **Using `NEXT_PUBLIC_GEMINI_API_KEY`:** Any `NEXT_PUBLIC_` env var is embedded in the client bundle. Never use this prefix for the API key.
- **Using the deprecated `@google/generative-ai` package:** It is v0.24.1 and no longer receives updates. The new SDK is `@google/genai`.
- **Mutating state directly in the stream loop:** Always use the functional form of `setMessages((prev) => ...)` inside the reader loop to avoid stale closure bugs when appending chunks.
- **Sending `role: 'assistant'` to Gemini:** Gemini rejects this — use `role: 'model'` for assistant turns.
- **Assuming `gemini-1.5-flash` is available:** It was shut down June 1, 2026. Requests will fail. Use `gemini-2.5-flash`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Streaming text chunks to client | Custom chunked transfer encoding | `ReadableStream` + Web Streams API (built into Next.js Route Handlers) | Native Web Streams API is stable in Node.js 18+; Next.js 16 fully supports it |
| Gemini API integration | Raw `fetch` to Gemini REST endpoint | `@google/genai` SDK | SDK handles auth, retries, typed responses, streaming iteration, and content format |
| Chat history management | Custom DB or localStorage sync | React `useState` array | In-scope requirement (CHAT-04) explicitly rules out persistence; session-only is correct |
| Markdown rendering in chat | Custom regex parser | Not needed — keep responses plain text | System prompt should instruct Gemini to avoid markdown in chat context; plain text is safer for bilingual rendering |

**Key insight:** The Web Streams API + `@google/genai` covers 100% of the streaming pipeline. There is nothing to hand-roll.

---

## Common Pitfalls

### Pitfall 1: Using a Deprecated or Shut-Down Model
**What goes wrong:** Route Handler throws `404` or `400` from Gemini API; all requests fail silently or with opaque errors.
**Why it happens:** `gemini-1.5-flash` and all Gemini 1.x / 2.0 Flash models were shut down June 1, 2026.
**How to avoid:** Use `gemini-2.5-flash` as the model string.
**Warning signs:** `Error: 404 models/gemini-1.5-flash is not found` in server logs.

### Pitfall 2: Wrong Gemini Role Name
**What goes wrong:** Gemini API returns a `400 Bad Request` because the `contents` array contains `role: 'assistant'`.
**Why it happens:** Gemini's API uses `'user'` and `'model'` — not `'assistant'`. The client-side convention (`'user'`/`'assistant'`) differs from Gemini's convention.
**How to avoid:** Map `role: 'assistant'` → `role: 'model'` in the Route Handler before calling the SDK.
**Warning signs:** `Error: Invalid role: assistant` in API response.

### Pitfall 3: Stale Closure When Appending Stream Chunks
**What goes wrong:** Messages appear to overwrite each other instead of accumulating; final message is only one chunk long.
**Why it happens:** `setMessages([...messages, ...])` inside an async `while` loop captures `messages` at the time the closure was created (stale).
**How to avoid:** Use the functional updater form: `setMessages((prev) => { const u = [...prev]; u[u.length-1] = { ...u[u.length-1], content: u[u.length-1].content + chunk }; return u; })`.
**Warning signs:** Chat shows only the last received token, not the full accumulated response.

### Pitfall 4: Edge Runtime Incompatibility
**What goes wrong:** Route Handler fails with `DynamicServerError` or Node.js API not available.
**Why it happens:** `@google/genai` uses Node.js APIs. If the Route Handler is set to Edge Runtime (via `export const runtime = 'edge'`), Node.js APIs are unavailable.
**How to avoid:** Do NOT add `export const runtime = 'edge'` to `app/api/chat/route.ts`. Leave it as default (Node.js runtime). [VERIFIED: Next.js App Router default runtime is Node.js]
**Warning signs:** `ReferenceError: process is not defined` or SDK import errors in the route.

### Pitfall 5: Widget Covering Mobile Content
**What goes wrong:** The floating bubble overlaps tap targets on mobile (especially "Book Appointment" CTAs).
**Why it happens:** Fixed bottom-right positioning at small viewports.
**How to avoid:** Use `bottom-6 right-6` (24px offsets per UI-SPEC) and ensure the panel does not extend off-screen on mobile. Add `max-w-[calc(100vw-48px)]` on the panel.
**Warning signs:** User reports on mobile: can't tap submit or CTA buttons.

### Pitfall 6: GEMINI_API_KEY Leaking to Client
**What goes wrong:** API key exposed in browser JavaScript bundle.
**Why it happens:** Using `process.env.NEXT_PUBLIC_GEMINI_API_KEY` (which is intentionally bundled for client use).
**How to avoid:** Use `process.env.GEMINI_API_KEY` (no `NEXT_PUBLIC_` prefix) exclusively in `app/api/chat/route.ts` (a server-only file). Never import the route file from a Client Component.
**Warning signs:** Key appears in browser DevTools → Sources → _app chunk.

---

## Code Examples

### Knowledge Base File Structure

```typescript
// Source: CONTEXT.md D-07 / D-08 [ASSUMED — file doesn't exist yet; pattern is standard TS constant]
// lib/chat/hospital-knowledge.ts

export const HOSPITAL_KNOWLEDGE = `
You are a helpful assistant for Atmaram Child Care and Critical Care hospital in Kanpur, UP.
Respond in the same language the visitor uses (English or Hindi).
Only answer questions based on the information below. If a question is outside this knowledge,
give the hospital phone number: +91-XXXXXXXXXX and suggest the visitor call for assistance.
Never fabricate information about doctors, procedures, or timings not listed here.

HOSPITAL INFORMATION:
...departments...
...doctors...
...OPD timings...
...appointment booking...
`.trim();
```

### Widget Component Skeleton

```typescript
// Source: CONTEXT.md D-01 through D-06 + UI-SPEC [ASSUMED — new file]
// components/public/ChatWidget.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardContent } from '@/components/ui/card';

const GREETING = "Hello! I'm here to help with information about Atmaram Child Care and Critical Care. Ask me about our departments, doctors, timings, or how to book an appointment.";

type Message = { role: 'user' | 'assistant'; content: string };

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  // On open: inject greeting if no messages yet
  const handleOpen = () => {
    setIsOpen(true);
    if (messages.length === 0) {
      setMessages([{ role: 'assistant', content: GREETING }]);
    }
  };

  // sendMessage implementation as shown in Pattern 2 above
  // ...

  return (
    <>
      {/* Panel */}
      {isOpen && (
        <Card className="fixed bottom-24 right-6 w-[360px] h-[500px] z-50 flex flex-col shadow-xl">
          {/* Header, message list, input */}
        </Card>
      )}
      {/* FAB Bubble */}
      <Button
        onClick={isOpen ? () => setIsOpen(false) : handleOpen}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary z-50 shadow-lg"
      >
        {isOpen ? <X /> : <MessageCircle />}
      </Button>
    </>
  );
}
```

### Public Layout Mount Point

```typescript
// Source: app/[locale]/(public)/layout.tsx (existing file) [VERIFIED: codebase grep]
// Add ChatWidget below Footer:

import { ChatWidget } from '@/components/public/ChatWidget';

export default async function PublicLayout({ children, params }) {
  // ...existing code...
  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
      <ChatWidget />   {/* ← add this line */}
    </>
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@google/generative-ai` package | `@google/genai` package | 2024–2025 | Old package is deprecated; new SDK has unified Gemini + Vertex AI support |
| `gemini-1.5-flash` model | `gemini-2.5-flash` model | June 1, 2026 (shutdown) | CONTEXT.md D-11 specifies the old model — **must be updated to `gemini-2.5-flash`** |
| `GoogleGenerativeAI` class | `GoogleGenAI` class | Package migration | Constructor and method names differ between old and new SDK |

**Deprecated/outdated:**
- `gemini-1.5-flash`: Shut down June 1, 2026. Requests return 404. Replaced by `gemini-2.5-flash`.
- `gemini-2.0-flash`: Also shut down June 1, 2026.
- `@google/generative-ai`: Deprecated npm package (v0.24.1). Still on registry but no new features. Replaced by `@google/genai`.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `@google/genai` `generateContentStream` API signature: `{ model, contents, config: { systemInstruction } }` | Code Examples / Pattern 1 | Route Handler fails with bad request; fix is reading SDK docs more carefully |
| A2 | `chunk.text` is the correct property to access streamed text on each iteration chunk | Code Examples / Pattern 1 | No text appears in the stream; fix is checking actual chunk shape |
| A3 | Gemini 2.5 Flash supports `systemInstruction` in the same call as `generateContentStream` | Standard Stack | System prompt is silently ignored; fix is separating system init from generation |
| A4 | `@google/genai` package legitimacy (not slopcheck-verified) | Package Legitimacy Audit | Low risk — published under `@google` scope by `googleapis` GitHub org |

---

## Open Questions

1. **Exact `@google/genai` v2.8.0 TypeScript types for `generateContentStream` config**
   - What we know: WebSearch shows `config: { systemInstruction: string }` pattern
   - What's unclear: Whether `systemInstruction` is a `string` or a `Content` object type in this SDK version
   - Recommendation: Check TypeScript types after `npm install @google/genai` — hover types in IDE will confirm; fallback is passing a plain string (SDK coerces it)

2. **`gemini-2.5-flash` availability confirmation**
   - What we know: WebSearch from Google Developers Blog + Cloud Blog confirms GA status as of mid-2025, continued in 2026
   - What's unclear: Exact model string — could be `gemini-2.5-flash` or `gemini-2.5-flash-latest`
   - Recommendation: Test with `gemini-2.5-flash` first; if 404, try `gemini-2.5-flash-latest`; check `ai.google.dev/gemini-api/docs/models` at implementation time

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `@google/genai` | Route Handler | ✗ (not installed) | — | Install: `npm install @google/genai` |
| `GEMINI_API_KEY` | Route Handler | ✓ (per CONTEXT.md) | — | — |
| Node.js runtime (not Edge) | `@google/genai` | ✓ (Next.js default) | Next.js 16.2.9 | Do not set `export const runtime = 'edge'` |
| shadcn Card, Button, Input | ChatWidget.tsx | ✓ (confirmed in package.json) | — | — |
| lucide-react | ChatWidget.tsx | ✓ (v1.17.0 in package.json) | — | — |

**Missing dependencies with no fallback:**
- `@google/genai` must be installed before any code is written (Wave 0)

**Missing dependencies with fallback:** None — all other deps are present.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Not yet detected (no jest.config.* or vitest.config.* found in codebase) |
| Config file | None — Wave 0 must address |
| Quick run command | TBD — depends on framework chosen |
| Full suite command | TBD |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CHAT-01 | Widget renders on public pages | smoke / manual | Visual check on localhost | ❌ Wave 0 |
| CHAT-02 | Chat responds correctly to department/timing questions | integration (manual) | Manual — requires live Gemini API key | ❌ manual-only |
| CHAT-03 | Route Handler has no Supabase import | unit (static analysis) | `grep -r "supabase" app/api/chat/` exits 1 | ❌ can be scripted |
| CHAT-04 | System prompt includes phone number fallback instruction | unit | `grep "phone" lib/chat/hospital-knowledge.ts` | ❌ Wave 0 |

**Note:** No automated test framework was found in the repo. Given the nature of this phase (UI widget + live API integration), tests are primarily manual smoke tests. The planner should include a Wave 0 smoke test checklist.

### Wave 0 Gaps
- [ ] No test framework configured — planner should add manual smoke test checklist as a Wave 0 task
- [ ] `GEMINI_API_KEY` must be in `.env.local` (confirmed present per CONTEXT.md — verify before first run)

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Chat is anonymous public feature |
| V3 Session Management | no | No session — history in React state only |
| V4 Access Control | yes | `GEMINI_API_KEY` must never reach browser; enforced by Route Handler pattern |
| V5 Input Validation | yes | Validate `messages` array shape before passing to Gemini SDK |
| V6 Cryptography | no | No crypto needed |

### Known Threat Patterns for Chat + Gemini Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Prompt injection via user input | Tampering | System prompt instructs Gemini to ignore instructions from user; static knowledge base limits scope |
| API key exposure | Information Disclosure | `GEMINI_API_KEY` in `.env.local` only (no `NEXT_PUBLIC_` prefix); Route Handler is server-only |
| Cost amplification (large history) | Denial of Service | Limit `messages` array to last N turns (e.g., 20) before sending to Gemini; truncate in Route Handler |
| Malformed request body | Tampering | Validate `messages` is an array; each item has `role` in `['user','assistant']` and `content` is string; return 400 on invalid |

---

## Sources

### Primary (HIGH confidence)
- WebSearch: Google Developers Blog — Gemini 2.5 Flash GA announcement confirming model shutdown dates
- WebSearch: Google Cloud Blog — Gemini 2.5 Flash/Pro GA on Vertex AI
- `npm view @google/genai` — confirmed package exists at v2.8.0, last modified 2026-06-03

### Secondary (MEDIUM confidence)
- WebSearch: [@google/genai npm page](https://www.npmjs.com/package/@google/genai) — package description, SDK patterns
- WebSearch: [googleapis/js-genai GitHub](https://github.com/googleapis/js-genai) — official SDK repo
- WebSearch: Next.js App Router streaming Route Handler patterns — multiple consistent sources

### Tertiary (LOW confidence)
- WebSearch: `generateContentStream` API shape with `config.systemInstruction` — pattern appears in multiple blog posts but not confirmed against official API reference in this session

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — `@google/genai` is on npm, current, from Google's official org; model name change is VERIFIED via Google's own announcements
- Architecture: HIGH — pattern follows confirmed Next.js streaming Route Handler conventions
- Pitfalls: MEDIUM — role name mapping and stale closure issues are well-known; streaming edge runtime incompatibility is well-documented
- API call shape: MEDIUM — `config.systemInstruction` pattern from WebSearch; TypeScript types confirm at install time

**Research date:** 2026-06-13
**Valid until:** 2026-07-13 (model names and SDK APIs move fast — recheck if > 30 days old)
