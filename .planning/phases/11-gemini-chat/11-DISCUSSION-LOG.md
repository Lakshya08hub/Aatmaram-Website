# Phase 11: Gemini Chat - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-13
**Phase:** 11-gemini-chat
**Areas discussed:** Widget appearance, Conversation style, Response delivery, Knowledge base

---

## Widget Appearance

| Option | Description | Selected |
|--------|-------------|----------|
| Bottom-right bubble | Floating circular button in the bottom-right corner | ✓ |
| Bottom-center bar | A narrow bar pinned to the bottom center | |
| Fixed side panel | A slim tab on the right edge sliding open a full-height drawer | |

**Q: Open state panel style**

| Option | Description | Selected |
|--------|-------------|----------|
| Small card panel | ~360px wide × ~500px tall card floating above the bubble | ✓ |
| Full-screen on mobile, card on desktop | Expands to cover whole screen on mobile | |
| Sidebar drawer | Panel slides in from the right edge | |

**Q: Closed bubble appearance**

| Option | Description | Selected |
|--------|-------------|----------|
| Icon only | Circular button with a chat/message icon | ✓ |
| Icon + label | Bubble with icon and text like 'Ask us' | |
| You decide | Claude picks | |

---

## Conversation Style

| Option | Description | Selected |
|--------|-------------|----------|
| Multi-turn with history | Full conversation array sent each call; Gemini has context | ✓ |
| Single-turn stateless | Each question sent independently with system prompt only | |

**Q: Greeting message**

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — a friendly opener | Pre-set message setting scope on first open | ✓ |
| No — blank chat | User types first | |

---

## Response Delivery

| Option | Description | Selected |
|--------|-------------|----------|
| Stream tokens live | Words appear incrementally; requires ReadableStream client handling | ✓ |
| Show full response at once | Wait for completion, show spinner then full answer | |

---

## Knowledge Base

**Q: Storage location**

| Option | Description | Selected |
|--------|-------------|----------|
| Static file lib/chat/hospital-knowledge.ts | TypeScript constant, version-controlled | ✓ |
| Fetched from Supabase at request time | Dynamic but violates CHAT-03 | |
| Hardcoded inline in Route Handler | Works but unmaintainable | |

**Q: Content scope**

| Option | Description | Selected |
|--------|-------------|----------|
| Departments + specialties | All 9 departments with descriptions | ✓ |
| Doctors list | Names and specializations | ✓ |
| OPD timings + contact | Hours, address, phone | ✓ |
| Appointment booking info | How to book, no slot reservation | ✓ |

**Q: Response language**

| Option | Description | Selected |
|--------|-------------|----------|
| English only | Always English | |
| Match visitor's language | Gemini auto-matches EN/HI based on what visitor writes | ✓ |
| You decide | Claude picks | |

---

## Claude's Discretion

- Exact visual styling of bubble, panel, message bubbles (blue/white hospital brand)
- Bubble icon choice (MessageCircle or similar from lucide-react)
- Typing indicator implementation (animated dots)
- Exact wording of greeting message and system prompt instructions
- Gemini model name to use (gemini-1.5-flash or latest stable)

## Deferred Ideas

- Dynamic knowledge base from Supabase — violates CHAT-03; considered for Phase 12 revisit
- Hindi-only knowledge base variant — Gemini auto-match is sufficient for v1
- Chat history persistence across reloads/sessions — v2
