---
phase: 11-gemini-chat
plan: "02"
subsystem: gemini-chat-frontend
tags: [chat-widget, streaming, client-component, accessibility, shadcn]
dependency_graph:
  requires: [11-01]
  provides: [ChatWidget floating bubble, public layout integration]
  affects: [all public pages via app/[locale]/(public)/layout.tsx]
tech_stack:
  added: []
  patterns: [React Client Component streaming consumer, functional updater pattern, focus management, aria-live polite]
key_files:
  created:
    - components/public/ChatWidget.tsx
  modified:
    - app/[locale]/(public)/layout.tsx
decisions:
  - "Named export (not default export) for ChatWidget — matches plan requirement"
  - "Functional updater setMessages((prev) => ...) used in stream loop — prevents stale closure bug"
  - "Typing indicator rendered only when isStreaming=true AND last message content is empty string"
  - "FAB uses native <button> not shadcn Button — avoids conflict with fixed positioning and ref forwarding"
  - "Card/CardContent used for panel; plain div for header to avoid CardHeader default padding conflicts"
metrics:
  duration: "~20 minutes"
  completed: "2026-06-14"
  tasks_completed: 2
  files_created: 1
  files_modified: 1
requirements:
  - CHAT-01
  - CHAT-02
  - CHAT-03
  - CHAT-04
---

# Phase 11 Plan 02: ChatWidget Client Component Summary

**One-liner:** Floating chat bubble and 360x500px streaming panel Client Component mounted in public layout, consuming /api/chat with functional-updater stream loop and full accessibility attributes.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Build ChatWidget Client Component | 6178ed5 | components/public/ChatWidget.tsx |
| 2 | Mount ChatWidget in public layout | e5200bd | app/[locale]/(public)/layout.tsx |

## What Was Built

### components/public/ChatWidget.tsx

Named export `ChatWidget` — `'use client'` React component with:
- **FAB bubble:** `fixed bottom-8 right-12`, 56px circular, `bg-primary` (#1E40AF), `MessageCircle`/`X` icon toggles, `aria-expanded`, `aria-label`
- **Chat panel:** `fixed bottom-24 right-12`, 360×500px, `z-50`, shadcn `Card` with `role="dialog"` and `aria-label`
- **Panel header:** `#1E3A5F` nav color, 56px height, hospital name + X close button with ghost variant
- **Message list:** `aria-live="polite"`, auto-scroll via `messagesEndRef`, user bubbles right-aligned (`bg-primary`), bot bubbles left-aligned (`bg-slate-100`)
- **Typing indicator:** three staggered `animate-bounce` dots (0ms / 150ms / 300ms delay) shown when `isStreaming=true` and last message `content === ''`
- **Streaming consumer:** `fetch('/api/chat')` → `response.body.getReader()` loop with `TextDecoder` and **functional updater** `setMessages((prev) => ...)` — prevents stale closure (Plan research Pitfall 3)
- **Error handling:** catch block uses functional updater to set last message to error copy
- **Focus management:** `inputRef.current?.focus()` after 50ms on open; `bubbleRef.current?.focus()` on close
- **Send guard:** button disabled when `!input.trim() || isStreaming`; Enter key (without Shift) submits

No Supabase import. No GEMINI_API_KEY reference. No direct @google/genai import.

### app/[locale]/(public)/layout.tsx

Two-line addition: import of `ChatWidget` + `<ChatWidget />` rendered after `<Footer />`. No other changes.

## Deviations from Plan

**1. [Rule 1 - Implementation detail] Native `<button>` for FAB instead of shadcn `Button`**
- The plan specified `Button` element for the FAB bubble but the shadcn `Button` component has `asChild` patterns and default styling that conflict with `fixed` positioning and the `ref` forwarding needed for focus management.
- Used a native `<button>` element with equivalent Tailwind classes — behavior identical, all aria attributes preserved.
- No behavioral change; acceptance criteria fully met.

## Threat Model Compliance

| Threat | Mitigation Applied |
|--------|--------------------|
| T-11-05 Information Disclosure | Widget has zero @google/genai imports and zero GEMINI_API_KEY references — verified via grep |
| T-11-07 Tampering (XSS) | message.content rendered as React text node, not dangerouslySetInnerHTML |
| T-11-08 Mobile overlap | Bubble at right-12 (48px) and bottom-8 (32px) per UI-SPEC spacing contract |

## Known Stubs

None in this plan. (Phone number placeholder `+91-512-XXXXXXX` exists in lib/chat/hospital-knowledge.ts from Plan 01 — tracked in that plan's SUMMARY.)

## Threat Flags

None. No new network endpoints, auth paths, or schema changes introduced.

## Self-Check: PASSED

- components/public/ChatWidget.tsx: FOUND
- app/[locale]/(public)/layout.tsx: modified with ChatWidget import + render
- Commit 6178ed5 (Task 1): FOUND
- Commit e5200bd (Task 2): FOUND
- grep GEMINI_API_KEY ChatWidget.tsx: CLEAN (zero matches)
- grep setMessages.*prev ChatWidget.tsx: FOUND (lines 80, 90 — functional updater in stream loop and error handler)
- grep ChatWidget layout.tsx: TWO MATCHES (import line 5, JSX line 26)

## Checkpoint Pending

Plan is paused at `checkpoint:human-verify` (Task 3). Dev server smoke test required before this plan can be marked complete. See checkpoint details in the orchestrator response.
