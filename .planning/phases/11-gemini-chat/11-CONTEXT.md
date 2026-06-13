# Phase 11: Gemini Chat - Context

**Gathered:** 2026-06-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a floating Gemini-powered chat widget to every public page. The widget answers visitor questions about the hospital using only a static system prompt — no Supabase queries, no patient data. When a question is out of scope, the bot gives the hospital phone number.

**In scope:**
- Floating chat bubble (bottom-right corner, icon only when closed)
- Chat panel card (~360×500px) that opens above the bubble
- Gemini API Route Handler (`app/api/chat/route.ts`) — server-side, streaming
- Static knowledge base file (`lib/chat/hospital-knowledge.ts`)
- Multi-turn conversation history maintained in client state
- Greeting message shown on widget open
- Language auto-detection: Gemini responds in the language the visitor writes in
- Widget mounted globally in `app/[locale]/(public)/layout.tsx`

**Out of scope:**
- Supabase queries from chat — system prompt is static (CHAT-03)
- Patient or staff data to Gemini API (compliance constraint)
- Syncing knowledge base from DB dynamically (Phase 12 territory)
- Charting, file upload, voice
- Portal chat or staff-facing AI assistant

</domain>

<decisions>
## Implementation Decisions

### Widget Appearance
- **D-01:** Floating bubble positioned bottom-right corner. Icon only when closed (no label text). Standard FAB pattern.
- **D-02:** Opens as a small card panel floating above the bubble — approximately 360px wide × 500px tall. Has: header row (hospital name + close ✕ button), scrollable message list, text input at the bottom with a send button.
- **D-03:** Widget is a Client Component (`'use client'`) — needs state for open/closed, message list, input value, loading indicator.

### Conversation Style
- **D-04:** Multi-turn with history. Each API call sends the full `messages` array (role: user / assistant) so Gemini has context of the conversation. History lives in React state for the session — not persisted across page reloads.
- **D-05:** Greeting message shown immediately when the widget opens — a pre-set assistant message (not a Gemini API call). Something like: "Hello! I'm here to help with information about Atmaram Child Care and Critical Care. Ask me about our departments, doctors, timings, or how to book an appointment."

### Response Delivery
- **D-06:** Streaming. The Route Handler calls Gemini with streaming enabled and pipes the response via a `ReadableStream`. The client reads the stream and appends tokens to the last message incrementally. Shows a typing indicator while the first token hasn't arrived yet.

### Knowledge Base
- **D-07:** Static file at `lib/chat/hospital-knowledge.ts` — exports a `HOSPITAL_KNOWLEDGE` string constant. Imported by the Route Handler and set as the Gemini system prompt on every request.
- **D-08:** Knowledge base includes all four topic areas:
  1. **Departments + specialties** — all 9 departments with brief descriptions
  2. **Doctors list** — doctor names and specializations (hardcoded for now; static snapshot)
  3. **OPD timings + contact** — OPD hours, hospital address (Naubasta/Kidwai Nagar, Kanpur-208021), phone numbers
  4. **Appointment booking** — how to book (call or fill the online form), what happens next (staff calls back), clarify that online slot reservation is not available
- **D-09:** System prompt instructs Gemini to: respond in the same language the visitor writes in (EN/HI auto-match), stay strictly within the knowledge base, give the hospital phone number for out-of-scope questions, never make up information about doctors or procedures not listed.

### API Architecture
- **D-10:** Route Handler at `app/api/chat/route.ts` — POST endpoint. Receives `{ messages: [{role, content}] }` from the client. Uses `GEMINI_API_KEY` from env (server-side only, already in `.env.local`). Returns a streaming `Response` with `Content-Type: text/plain; charset=utf-8`.
- **D-11:** Gemini model: `gemini-1.5-flash` — fast and cheap for this use case. Claude's call to confirm latest stable model name.

### Claude's Discretion
- Exact styling of the chat bubble, panel, and message bubbles — keep it professional and consistent with the hospital's blue/white brand
- Bubble icon choice (MessageCircle or similar from lucide-react)
- Typing indicator implementation (animated dots)
- Exact wording of the greeting message and system prompt instructions

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §"Public Site — Gemini Chat" — CHAT-01 through CHAT-04 (all four requirements)

### Existing Public Site Patterns
- `app/[locale]/(public)/layout.tsx` — where the widget Client Component is mounted (import + render at root of layout)
- `app/[locale]/(public)/page.tsx` — example of a public page to verify widget appears on all pages
- `components/public/AppointmentForm.tsx` — existing Client Component on public site; follows same pattern as widget will

### Portal API Route Pattern (if any exists)
- Check `app/api/` for any existing Route Handler to follow the pattern

### Environment
- `.env.local` — `GEMINI_API_KEY` already present (server-side only, not NEXT_PUBLIC_)

### Phase Context
- `.planning/ROADMAP.md` §Phase 11 — success criteria and dependencies

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/ui/card.tsx` — Card/CardContent/CardHeader for the chat panel container
- `components/ui/button.tsx` — Send button and close button
- `components/ui/input.tsx` — Text input field for the message composer
- `components/public/SectionHeading.tsx` — Not needed; header is custom in the chat panel

### Established Patterns
- Client Components on the public site use `'use client'` and live in `components/public/` — the chat widget follows this pattern
- `GEMINI_API_KEY` is server-side only; API calls must go through a Route Handler, not client-side fetch to Gemini directly
- Public layout (`app/[locale]/(public)/layout.tsx`) is the right mount point — adding the widget here puts it on all 7 public pages without touching each page individually

### Integration Points
- Widget Client Component renders in `app/[locale]/(public)/layout.tsx` — below the `<Footer />`, before `</body>`
- Route Handler at `app/api/chat/route.ts` is a new file — no existing chat routes
- `lib/chat/hospital-knowledge.ts` is a new file — no existing knowledge base

</code_context>

<specifics>
## Specific Ideas

- Greeting message should mention departments, doctors, timings, and booking — sets the scope for the visitor immediately
- System prompt must explicitly instruct Gemini to give the hospital phone number for anything outside its knowledge — satisfies CHAT-04
- Widget should not obstruct the header or the appointment CTA button — bottom-right corner avoids the main CTA area

</specifics>

<deferred>
## Deferred Ideas

- **Dynamic knowledge base from Supabase** — pulling departments, doctors, hospital_info from DB and building the system prompt on each request. More accurate but violates CHAT-03. Could be revisited in Phase 12 if admin wants portal edits to reflect in chat without a code deploy.
- **Hindi-only knowledge base variant** — separate HI-language system prompt. Current approach (Gemini auto-matches language) is sufficient for v1.
- **Chat history persistence** — saving conversation across page reloads or sessions. Not needed for v1; stateless per browser session is fine.

</deferred>

---

*Phase: 11-Gemini Chat*
*Context gathered: 2026-06-13*
