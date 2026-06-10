---
plan: 01-01
phase: 01-project-setup
status: complete
completed: 2026-06-10
commits:
  - 66cd905
  - 7b86fc3
---

# Plan 01-01 Summary: Scaffold Next.js 16 Project

## What Was Built

Scaffolded the complete Next.js 16 project with three-zone routing architecture, Tailwind CSS v4, next-intl v4, and Supabase SSR clients. Every subsequent phase has a correct folder structure to drop files into.

## Key Files Created

### key-files.created
- proxy.ts — Next.js 16 middleware with next-intl locale routing, portal-excluding matcher
- next.config.ts — withNextIntl plugin wrapper, turbopack.root set to project root
- i18n/routing.ts — defineRouting({ locales: ['hi', 'en'], defaultLocale: 'hi', localePrefix: 'always' })
- i18n/request.ts — getRequestConfig returning locale + messages (v4 mandatory fields)
- messages/en.json — English translations stub
- messages/hi.json — Hindi translations stub
- app/layout.tsx — Minimal root layout (html/body owned by [locale] layout)
- app/[locale]/layout.tsx — Locale layout: html lang, NextIntlClientProvider, await params
- app/[locale]/(public)/page.tsx — Placeholder home with Tailwind v4 smoke test div
- app/(portal)/layout.tsx — Portal layout stub (auth guard Phase 4)
- app/(portal)/login/page.tsx — Portal login placeholder
- app/(portal)/dashboard/page.tsx — Portal dashboard placeholder
- app/api/.gitkeep — API routes directory marker
- lib/supabase/client.ts — createBrowserClient for Client Components
- lib/supabase/server.ts — createServerClient with getAll/setAll cookie API
- lib/supabase/middleware.ts — updateSession using getUser() (not getSession())
- package.json — next-intl@4.13.0, @supabase/supabase-js@2.108.1, @supabase/ssr@0.12.0

## Must-Haves Verification

- [x] `npm run build` exits 0 — TypeScript compiles clean (verified: 5 static + 1 dynamic route)
- [x] proxy.ts at project root (not middleware.ts) — Next.js 16 filename
- [x] Tailwind v4: `@import "tailwindcss"` in globals.css, `@tailwindcss/postcss` in postcss.config.mjs
- [x] Three routing zones: app/[locale]/(public)/, app/(portal)/, app/api/
- [x] i18n/routing.ts: localePrefix 'always', defaultLocale 'hi'
- [x] i18n/request.ts: returns locale (required by next-intl v4)
- [x] app/[locale]/layout.tsx: `await params` (Next.js 16 Promise params), NextIntlClientProvider
- [x] lib/supabase/server.ts: getAll/setAll only, no get/set/remove
- [x] lib/supabase/middleware.ts: getUser() not getSession()
- [x] .gitignore: .env* covered

## Deviations

1. **Scaffold via subdirectory**: `create-next-app` does not accept directory names with spaces or capital letters as package names. Scaffolded to `atmaram-website/` subdirectory, then moved files to project root. Package name in package.json is `atmaram-website`.

2. **messages import path**: RESEARCH.md documented `../../messages/` (written assuming `src/i18n/` path). Corrected to `../messages/` since we're using root-level `i18n/` with `--no-src-dir`.

3. **turbopack.root**: Added `turbopack.root: __dirname` to next.config.ts to suppress Turbopack warning about detecting multiple lockfiles in parent directories.

## Self-Check: PASSED

All acceptance criteria from the plan verified. npm run build exits 0. Three zones confirmed in build output: `/[locale]` (dynamic), `/dashboard` (static), `/login` (static).
