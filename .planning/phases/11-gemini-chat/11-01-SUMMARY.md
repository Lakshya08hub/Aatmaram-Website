---
phase: 11-gemini-chat
plan: "01"
subsystem: gemini-chat-backend
tags: [gemini, api, streaming, knowledge-base, route-handler]
dependency_graph:
  requires: []
  provides: [api/chat POST endpoint, HOSPITAL_KNOWLEDGE system prompt]
  affects: [components/public/ChatWidget.tsx (Plan 02)]
tech_stack:
  added: ["@google/genai@2.8.0"]
  patterns: [Next.js Route Handler streaming, ReadableStream piping, Gemini generateContentStream]
key_files:
  created:
    - lib/chat/hospital-knowledge.ts
    - app/api/chat/route.ts
  modified:
    - package.json
    - package-lock.json
decisions:
  - "Use gemini-2.5-flash — gemini-1.5-flash shut down June 1 2026 (D-11 updated in RESEARCH.md)"
  - "Knowledge base is pure static string constant — no imports, no Supabase, satisfies CHAT-03"
  - "Role mapping assistant->model applied in Route Handler before Gemini call"
  - "History sliced to last 20 turns per request to bound cost (T-11-03 mitigation)"
metrics:
  duration: "~15 minutes"
  completed: "2026-06-14"
  tasks_completed: 2
  files_created: 2
  files_modified: 2
requirements:
  - CHAT-02
  - CHAT-03
  - CHAT-04
---

# Phase 11 Plan 01: Gemini SDK Install + Knowledge Base + Route Handler Summary

**One-liner:** Streaming Gemini Route Handler at POST /api/chat using @google/genai v2.8.0 with static bilingual hospital knowledge base enforcing strict scope, phone-number fallback, and 20-turn history cap.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Install @google/genai + hospital knowledge base | fc58aa8 | lib/chat/hospital-knowledge.ts, package.json |
| 2 | Build streaming Gemini Route Handler | 2bff4d4 | app/api/chat/route.ts |

## What Was Built

### lib/chat/hospital-knowledge.ts
Single named export `HOSPITAL_KNOWLEDGE` — a string constant (~3500 chars) used as the Gemini system prompt. Covers:
- Behavioural instructions: bilingual auto-match (EN/HI), stay within knowledge base, phone number fallback, no fabrication, plain prose output
- 9 departments with brief descriptions (Paediatrics, Neonatology, Critical Care/ICU, General Medicine, General Surgery, Gynaecology & Obstetrics, Orthopaedics, ENT, Dermatology)
- Doctors section: redirects to phone rather than listing names (avoids stale data)
- OPD timings (Mon-Sat 9-2 and 5-8, Sunday emergency only) and contact
- Appointment booking: online form + callback model, no slot reservation, walk-ins welcome
- Ayushman Bharat PM-JAY empanelment note

No imports. No Supabase references. Pure string constant.

### app/api/chat/route.ts
POST streaming Route Handler:
- Parses and validates `{ messages: [{role, content}] }` — returns 400 on invalid
- Slices to last 20 messages (T-11-03 DoS / cost mitigation)
- Maps `assistant` → `model` role before Gemini call (Gemini rejects 'assistant')
- Calls `ai.models.generateContentStream({ model: 'gemini-2.5-flash', contents, config: { systemInstruction: HOSPITAL_KNOWLEDGE } })`
- Pipes chunks via `ReadableStream` with `TextEncoder`
- Returns `Content-Type: text/plain; charset=utf-8` with `X-Content-Type-Options: nosniff`
- Outer try/catch returns 500 on unhandled errors
- No Supabase import, no edge runtime export, no NEXT_PUBLIC env var

## Deviations from Plan

None — plan executed exactly as written. Task 0 (package legitimacy checkpoint) was pre-approved by human before this execution wave; skipped directly to Task 1 per prompt context.

## Threat Model Compliance

| Threat | Mitigation Applied |
|--------|--------------------|
| T-11-01 Prompt Injection | System prompt instructs Gemini to ignore scope-overriding instructions |
| T-11-02 Key Disclosure | GEMINI_API_KEY via process.env only (no NEXT_PUBLIC_); server-only Route Handler |
| T-11-03 Cost Amplification | messages.slice(-20) bounds history depth |
| T-11-04 Malformed Request | Array check + role/content field validation; returns 400 on invalid |

## Known Stubs

- Phone number placeholder: `+91-512-XXXXXXX` appears in HOSPITAL_KNOWLEDGE. This is intentional — real number must be substituted before launch. Client content not yet gathered (noted in STATE.md blockers).

## Self-Check: PASSED

- lib/chat/hospital-knowledge.ts: FOUND
- app/api/chat/route.ts: FOUND
- Commit fc58aa8: FOUND
- Commit 2bff4d4: FOUND
