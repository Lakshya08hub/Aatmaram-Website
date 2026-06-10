<!-- GSD:project-start source:PROJECT.md -->
## Project

**Atmaram Child Care and Critical Care — Hospital Website + Management Portal**

A professional bilingual (EN/HI) hospital website for Atmaram Child Care and Critical Care, Kanpur, UP — a 90-bed super-specialty Ayushman Bharat PM-JAY empanelled hospital. The public site is the paid client deliverable (₹45-50K); the management portal (staff management, patient records, payroll, analytics) is a gift to the client built alongside the public site.

**Core Value:** A credible, professional online presence for the hospital that lets patients find information, request appointments, and get answers — while giving hospital staff a single portal to manage everything.

### Constraints

- **Tech Stack:** Next.js (App Router) + TypeScript + Tailwind + Supabase (Auth + Postgres) + Gemini API — decided
- **i18n:** next-intl with `[locale]` routing, default locale Hindi — decided
- **Portal routing:** Outside `[locale]` segment (English-only internal tool) — decided
- **Appointment booking:** Option B only (request form + staff callback) — no slot reservation in v1
- **Gemini chat:** Public site only, hospital info only, zero patient data access — compliance constraint
- **Payroll:** Monthly tracker only — no Indian compliance math (PF/ESI/TDS) — decided
- **Patient records:** Lightweight EMR only — no billing, lab results, insurance — decided
- **Budget:** ₹45-50K for public website; portal is unpaid gift — no budget creep possible
- **Timeline:** No hard deadline from client; realistic solo-dev estimate 10-14 weeks
<!-- GSD:project-end -->

<!-- GSD:stack-start source:STACK.md -->
## Technology Stack

Technology stack not yet documented. Will populate after codebase mapping or first phase.
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
