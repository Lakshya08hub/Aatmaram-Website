# Phase 11: Gemini Chat - Pattern Map

**Mapped:** 2026-06-13
**Files analyzed:** 4 (3 new, 1 modified)
**Analogs found:** 3 / 4 (1 new file type with no codebase analog — Route Handler)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `app/api/chat/route.ts` | route handler | streaming / request-response | `lib/actions/submitAppointmentAction.ts` | partial (same server-side async + try/catch; different transport) |
| `lib/chat/hospital-knowledge.ts` | utility / config | static constant | none | no analog — first constant file of this kind |
| `components/public/ChatWidget.tsx` | component | event-driven / streaming | `components/public/AppointmentForm.tsx` | role-match (both `'use client'`, shadcn/ui, fetch to server action) |
| `app/[locale]/(public)/layout.tsx` | layout | request-response | self (modify existing) | exact — read current structure below |

---

## Pattern Assignments

### `app/api/chat/route.ts` (route handler, streaming)

**Analog:** `lib/actions/submitAppointmentAction.ts` — closest server-side async pattern in codebase; no existing Route Handler exists (`app/api/` directory is empty).

**Server action input validation pattern** (`lib/actions/submitAppointmentAction.ts` lines 5-16):
```typescript
const VALID_TIMES = ['morning', 'afternoon', 'evening'] as const
type PreferredTime = typeof VALID_TIMES[number]

export async function submitAppointmentAction(input: {
  // ...typed input shape...
}): Promise<{ error?: string }> {
```
Copy this pattern for the Route Handler: validate the `messages` array shape before passing to Gemini SDK, return `{ error }` or a `Response` with 400 status on invalid input.

**Error handling pattern** (`lib/actions/submitAppointmentAction.ts` lines 55-57):
```typescript
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }
```
Route Handler equivalent: wrap the Gemini SDK call in try/catch; on error return `new Response('Error calling Gemini', { status: 500 })`.

**Full Route Handler pattern** (from RESEARCH.md Pattern 1 — no codebase analog; use research pattern directly):
```typescript
// app/api/chat/route.ts
import { GoogleGenAI } from '@google/genai';
import { HOSPITAL_KNOWLEDGE } from '@/lib/chat/hospital-knowledge';
import { NextRequest } from 'next/server';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function POST(req: NextRequest) {
  const { messages } = await req.json();

  // Validate input — copy guard pattern from submitAppointmentAction.ts lines 33-35
  if (!Array.isArray(messages)) {
    return new Response('Invalid request body', { status: 400 });
  }

  // Map client roles → Gemini roles (RESEARCH.md Pattern 3)
  const contents = messages.map((m: { role: string; content: string }) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  try {
    const stream = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',   // NOT gemini-1.5-flash — shut down June 1 2026
      contents,
      config: { systemInstruction: HOSPITAL_KNOWLEDGE },
    });

    const readable = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of stream) {
            const text = chunk.text;
            if (text) controller.enqueue(encoder.encode(text));
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
  } catch (err) {
    return new Response(
      err instanceof Error ? err.message : 'Unknown error',
      { status: 500 }
    );
  }
}
// DO NOT add: export const runtime = 'edge'  — @google/genai needs Node.js runtime
```

---

### `lib/chat/hospital-knowledge.ts` (utility, static constant)

**Analog:** None — first constant/config file in `lib/`. No analog in codebase.

**Pattern:** Use a plain TypeScript module exporting a single named string constant. No imports needed.

```typescript
// lib/chat/hospital-knowledge.ts
export const HOSPITAL_KNOWLEDGE = `
You are a helpful assistant for Atmaram Child Care and Critical Care...
`.trim();
```

Key instructions the string must contain (from CONTEXT.md D-09):
- Respond in the same language the visitor writes in (EN/HI)
- Stay strictly within the knowledge base below
- For out-of-scope questions, give the hospital phone number and suggest calling
- Never fabricate information about doctors, procedures, or timings not listed

Knowledge sections required (CONTEXT.md D-08):
1. Departments + specialties (all 9)
2. Doctors list with specializations
3. OPD timings + hospital address (Naubasta/Kidwai Nagar, Kanpur-208021) + phone numbers
4. Appointment booking instructions (call or fill online form; staff calls back; no online slot reservation in v1)

---

### `components/public/ChatWidget.tsx` (component, event-driven + streaming)

**Analog:** `components/public/AppointmentForm.tsx`

**`'use client'` + imports pattern** (`AppointmentForm.tsx` lines 1-29):
```typescript
'use client'

import { useRef, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
```
Copy this import style exactly: `'use client'` on line 1, then React hooks, then `@/components/ui/*` shadcn imports. ChatWidget will also import `CardHeader` and icons from `lucide-react`.

**shadcn Card usage pattern** (`AppointmentForm.tsx` lines 170-173):
```typescript
  return (
    <Card className="shadow-sm border border-slate-200 rounded-xl">
      <CardContent className="p-8">
```
For the chat panel, use `Card` as the container with `shadow-xl` (floating panel needs more elevation than an inline form). Use `CardHeader` for the title row.

**Button pattern** (`AppointmentForm.tsx` lines 335-343):
```typescript
<Button
  type="submit"
  size="lg"
  disabled={!captchaToken || form.formState.isSubmitting}
  className="w-full bg-blue-800 hover:bg-blue-900 text-white font-semibold min-h-[44px]"
>
```
Brand color is `bg-blue-800 hover:bg-blue-900`. FAB bubble and send button should use this color. `min-h-[44px]` is the project's touch-target minimum — apply to the FAB bubble (`w-14 h-14` satisfies this automatically).

**Input pattern** (`AppointmentForm.tsx` lines 189-193):
```typescript
<Input
  type="text"
  placeholder="Your full name"
  {...field}
/>
```
For the message composer, use `<Input>` from `@/components/ui/input` with `onKeyDown` handler for Enter-to-send.

**Async fetch + error handling pattern** (`AppointmentForm.tsx` lines 141-168 — `onSubmit`):
```typescript
const result = await submitAppointmentAction({ ... })
if (result.error) {
  toast.error(result.error)
  return
}
```
Adapt for streaming: replace Server Action call with `fetch('/api/chat', { method: 'POST', ... })`, check `res.ok`, then use `res.body.getReader()` loop (see RESEARCH.md Pattern 2).

**Functional state updater for stream append** (RESEARCH.md Pattern 2 — no codebase analog):
```typescript
setMessages((prev) => {
  const updated = [...prev];
  updated[updated.length - 1] = {
    role: 'assistant',
    content: updated[updated.length - 1].content + chunk,
  };
  return updated;
});
```
This MUST use the functional updater form `(prev) => ...` — direct `setMessages([...messages, ...])` inside the async reader loop causes stale closure bugs (RESEARCH.md Pitfall 3).

**Full component skeleton** (from RESEARCH.md Code Examples + analog patterns):
```typescript
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
  const bottomRef = useRef<HTMLDivElement>(null);

  const handleOpen = () => {
    setIsOpen(true);
    if (messages.length === 0) {
      setMessages([{ role: 'assistant', content: GREETING }]);
    }
  };

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(userText: string) {
    const newMessages = [...messages, { role: 'user' as const, content: userText }];
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
            ...updated[updated.length - 1],
            content: updated[updated.length - 1].content + chunk,
          };
          return updated;
        });
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: 'Sorry, something went wrong. Please call us at [phone].',
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  }

  return (
    <>
      {isOpen && (
        <Card className="fixed bottom-24 right-6 w-[360px] max-w-[calc(100vw-48px)] h-[500px] z-50 flex flex-col shadow-xl border border-slate-200">
          {/* Header */}
          <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b">
            <span className="font-semibold text-sm text-blue-800">Atmaram Hospital</span>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          {/* Messages */}
          <CardContent className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`rounded-lg px-3 py-2 text-sm max-w-[80%] ${m.role === 'user' ? 'bg-blue-800 text-white' : 'bg-slate-100 text-slate-800'}`}>
                  {m.content || (isStreaming && i === messages.length - 1 ? '...' : '')}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </CardContent>
          {/* Input */}
          <div className="p-3 border-t flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !isStreaming && input.trim()) { sendMessage(input.trim()); setInput(''); } }}
              placeholder="Ask about departments, doctors, timings..."
              disabled={isStreaming}
              className="flex-1 text-sm"
            />
            <Button
              size="icon"
              disabled={isStreaming || !input.trim()}
              onClick={() => { sendMessage(input.trim()); setInput(''); }}
              className="bg-blue-800 hover:bg-blue-900 text-white"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      )}
      {/* FAB Bubble */}
      <Button
        onClick={isOpen ? () => setIsOpen(false) : handleOpen}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-blue-800 hover:bg-blue-900 text-white z-50 shadow-lg"
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </Button>
    </>
  );
}
```

---

### `app/[locale]/(public)/layout.tsx` (layout, modify existing)

**Analog:** Self — current file is the target.

**Current structure** (`app/[locale]/(public)/layout.tsx` lines 1-27 — full file):
```typescript
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { Header } from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function PublicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  );
}
```

**Modification:** Add two lines — one import at the top, one render call after `<Footer />`:

```typescript
// Add to imports (line 4, after Footer import):
import { ChatWidget } from '@/components/public/ChatWidget';

// Add to JSX (after </Footer>, before </>):
<ChatWidget />
```

Note: `PublicLayout` is an `async` Server Component (`async function`). Adding a Client Component import here is valid — Next.js App Router allows Server Components to import and render Client Components. `ChatWidget` will be rendered on the server as a shell and hydrated on the client.

---

## Shared Patterns

### Brand Color
**Source:** `components/public/AppointmentForm.tsx` line 338
**Apply to:** FAB bubble button, send button, user message bubbles in ChatWidget
```typescript
className="bg-blue-800 hover:bg-blue-900 text-white"
```

### Error Handling (server-side)
**Source:** `lib/actions/submitAppointmentAction.ts` lines 55-57
**Apply to:** `app/api/chat/route.ts` catch block
```typescript
} catch (err) {
  return { error: err instanceof Error ? err.message : 'Unknown error' }
}
// Route Handler equivalent:
} catch (err) {
  return new Response(err instanceof Error ? err.message : 'Unknown error', { status: 500 });
}
```

### Touch Target Minimum
**Source:** `components/public/AppointmentForm.tsx` line 339
**Apply to:** FAB bubble button
```typescript
// Submit button uses min-h-[44px]; FAB uses w-14 h-14 = 56px — exceeds minimum
className="... min-h-[44px]"
```

### shadcn/ui Card + shadcn/ui Button + shadcn/ui Input — import path convention
**Source:** `components/public/AppointmentForm.tsx` lines 10-28
**Apply to:** `components/public/ChatWidget.tsx`
```typescript
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
```
All shadcn imports use the `@/components/ui/` alias path. Never import from `shadcn/ui` directly.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `lib/chat/hospital-knowledge.ts` | utility | static constant | No existing `lib/` constant files; first knowledge base file in project |
| `app/api/chat/route.ts` | route handler | streaming | No existing Route Handlers in `app/api/` — directory is empty; use RESEARCH.md Pattern 1 as the primary reference |

---

## Metadata

**Analog search scope:** `app/`, `components/public/`, `lib/actions/`, `app/api/`
**Files read:** 4 (`layout.tsx`, `AppointmentForm.tsx`, `submitAppointmentAction.ts`, plus planning docs)
**Pattern extraction date:** 2026-06-13
