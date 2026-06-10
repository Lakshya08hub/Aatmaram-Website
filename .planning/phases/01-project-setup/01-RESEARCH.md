# Phase 1: Project Setup - Research

**Researched:** 2026-06-10
**Domain:** Next.js 16 + TypeScript + Tailwind CSS v4 + Supabase SSR + next-intl v4
**Confidence:** HIGH

---

## Summary

Phase 1 establishes the full foundational skeleton for the Atmaram hospital website and portal. This is not a "hello world" setup — the folder structure must anticipate three distinct routing zones: `app/[locale]/(public)/` for bilingual public pages, `app/(portal)/` for an English-only internal tool, and `app/api/` for API routes. All three zones must be wired on day one because later phases will drop files directly into them.

The two libraries with the sharpest setup complexity are **next-intl v4** and **@supabase/ssr**. Both have had significant API breaks relative to older documentation floating on the web. next-intl v4 (current: 4.13.0) now requires `proxy.ts` instead of `middleware.ts` (Next.js 16 rename), a mandatory `locale` return from `getRequestConfig`, and a required `NextIntlClientProvider` in the `[locale]` layout. @supabase/ssr 0.12+ dropped the `get/set/remove` cookie API in favor of `getAll/setAll`. Any tutorial older than mid-2024 teaching either of these will produce broken code.

Tailwind CSS v4 (current: 4.3.0) is what `create-next-app` now scaffolds by default. v4 eliminates `tailwind.config.js` — configuration lives in CSS with `@import "tailwindcss"` and a single `@tailwindcss/postcss` plugin. This is a significant mental model shift from v3 but is the correct baseline for new projects.

**Primary recommendation:** Bootstrap with `npx create-next-app@latest` (gets TypeScript, Tailwind v4, App Router, ESLint in one step), then hand-craft the folder structure and add `next-intl` + `@supabase/ssr` manually with the v4/0.12+ APIs documented below.

---

## Project Constraints (from CLAUDE.md)

The following directives are locked and must be honored in all planning and implementation:

- **Tech Stack:** Next.js (App Router) + TypeScript + Tailwind + Supabase (Auth + Postgres) + Gemini API — decided
- **i18n:** next-intl with `[locale]` routing, default locale Hindi — decided
- **Portal routing:** Outside `[locale]` segment (English-only internal tool) — decided
- **Appointment booking:** Option B only (request form + staff callback) — no slot reservation in v1
- **Gemini chat:** Public site only, hospital info only, zero patient data access — compliance constraint
- **Payroll:** Monthly tracker only — no Indian compliance math (PF/ESI/TDS)
- **Patient records:** Lightweight EMR only — no billing, lab results, insurance
- **GSD workflow enforcement:** No direct repo edits outside a GSD workflow unless user explicitly bypasses it

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Bilingual routing (`/hi/`, `/en/`) | Frontend Server (Next.js middleware/proxy.ts) | Browser (next-intl client navigation) | Locale negotiation from Accept-Language must happen at the edge/middleware layer before any component renders |
| Portal route protection | Frontend Server (Next.js middleware) | API (Supabase auth verify) | Middleware redirects unauthenticated users before any portal RSC renders; auth state from Supabase SSR |
| Supabase auth session | Frontend Server (SSR middleware cookie refresh) | Browser (createBrowserClient) | Server Components cannot write cookies — middleware must refresh and forward tokens |
| Public page rendering | Frontend Server (RSC, SSG) | CDN/Static | App Router RSCs render on server; public pages can be statically generated |
| Environment config | Build-time (.env.local) | — | Supabase URL/keys and Gemini placeholder are env vars injected at build/runtime |
| Tailwind CSS | Build-time (PostCSS/bundler) | Browser | v4 processes at build time via @tailwindcss/postcss; no runtime overhead |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next` | 16.2.9 | React framework (App Router, RSC, SSR) | [VERIFIED: npm registry] Project decision; industry standard for full-stack React |
| `typescript` | 6.0.3 | Type safety | [VERIFIED: npm registry] Project decision; required by CLAUDE.md |
| `tailwindcss` | 4.3.0 | Utility-first CSS | [VERIFIED: npm registry] Project decision; v4 is now create-next-app default |
| `@tailwindcss/postcss` | latest | Tailwind v4 PostCSS integration | [VERIFIED: tailwindcss.com/docs/guides/nextjs] Required for Next.js — v4 moved PostCSS plugin to separate package |
| `next-intl` | 4.13.0 | i18n routing, translations, middleware | [VERIFIED: npm registry] Project decision; locked in CLAUDE.md |
| `@supabase/supabase-js` | 2.108.1 | Supabase client SDK | [VERIFIED: npm registry] Official Supabase JS client; 3.3M+ weekly downloads |
| `@supabase/ssr` | 0.12.0 | SSR-compatible auth/cookie client | [VERIFIED: npm registry] Official Supabase package for Next.js SSR auth; project decision locked in CLAUDE.md |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `eslint` | bundled | Code quality | Auto-configured by create-next-app |
| `@types/node` | bundled | Node.js type definitions | Required for Next.js config types |
| `@types/react` | bundled | React type definitions | Required for TypeScript React code |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `next-intl` | `next-i18next` | next-i18next is Pages Router focused; LOCKED — project decision |
| `@supabase/ssr` | `@supabase/auth-helpers-nextjs` | Auth helpers package is deprecated; ssr is the current official path |
| Tailwind v4 | Tailwind v3 | v3 has tailwind.config.js; v4 is current create-next-app default; no reason to use v3 for new project |

**Installation:**

```bash
# Step 1: Scaffold project
npx create-next-app@latest atmaram-website --typescript --tailwind --eslint --app --import-alias "@/*"

# Step 2: Add i18n and Supabase
npm install next-intl @supabase/supabase-js @supabase/ssr
```

**Version verification (run before pinning in package.json):**

```bash
npm view next version                   # 16.2.9
npm view @supabase/supabase-js version  # 2.108.1
npm view @supabase/ssr version          # 0.12.0
npm view next-intl version              # 4.13.0
npm view tailwindcss version            # 4.3.0
npm view typescript version             # 6.0.3
```

---

## Package Legitimacy Audit

slopcheck CLI was not available in PATH at research time. Manual verification performed via npm registry + official documentation.

| Package | Registry | Age | Source Repo | Official Docs Verified | Disposition |
|---------|----------|-----|-------------|------------------------|-------------|
| `next` | npm | 15 yrs | github.com/vercel/next.js | vercel.com/nextjs | Approved [ASSUMED: slopcheck not run] |
| `typescript` | npm | 14 yrs | github.com/microsoft/TypeScript | typescriptlang.org | Approved [ASSUMED: slopcheck not run] |
| `tailwindcss` | npm | 9 yrs | github.com/tailwindlabs/tailwindcss | tailwindcss.com | Approved [ASSUMED: slopcheck not run] |
| `@tailwindcss/postcss` | npm | ~1 yr | github.com/tailwindlabs/tailwindcss | tailwindcss.com/docs/guides/nextjs | Approved [ASSUMED: slopcheck not run] |
| `next-intl` | npm | 6 yrs | github.com/amannn/next-intl | next-intl.dev | Approved [ASSUMED: slopcheck not run] |
| `@supabase/supabase-js` | npm | 6 yrs | github.com/supabase/supabase-js | supabase.com/docs | Approved [ASSUMED: slopcheck not run] |
| `@supabase/ssr` | npm | ~3 yrs | github.com/supabase/ssr | supabase.com/docs/guides/auth/server-side | Approved [ASSUMED: slopcheck not run] |

**Packages removed due to slopcheck [SLOP] verdict:** none

**Packages flagged as suspicious [SUS]:** none — all packages verified against official documentation and are from established organizations (Vercel, Microsoft, Tailwind Labs, Amann, Supabase). No postinstall scripts detected on any package.

**Note on [ASSUMED] tagging:** slopcheck could not be invoked as a CLI despite being installed via pip. All packages above are from well-known vendors verified through official documentation. The [ASSUMED] tag indicates the automated slopcheck scan did not run, not that these packages are suspicious.

---

## Architecture Patterns

### System Architecture Diagram

```
HTTP Request
     |
     v
[proxy.ts — Next.js 16 middleware]
     |— next-intl createMiddleware: locale negotiation, /hi → default, /en prefix
     |— Supabase SSR updateSession(): refresh auth cookie on every request
     |
     v
Routing decision:
     |
     |— /[locale]/* ──────────────────────────────────────────────────────┐
     |    app/[locale]/layout.tsx                                          |
     |    NextIntlClientProvider (locale + messages)                       |
     |    app/[locale]/(public)/* → public pages (RSC, SSG-eligible)       |
     |                                                                     |
     |— /portal/* ─────────────────────────────────────────────────────┐  |
     |    app/(portal)/layout.tsx                                       |  |
     |    Portal auth guard (check Supabase session via getUser())      |  |
     |    app/(portal)/dashboard, /staff, /patients, etc.              |  |
     |                                                                  |  |
     |— /api/* ────────────────────────────────────────────────────┐   |  |
          app/api/chat/route.ts (Gemini, Phase 11)                  |   |  |
          app/api/... (other API routes, Phase 4+)                  |   |  |
                                                                    |   |  |
External Services:                                                  |   |  |
  Supabase Postgres ←── Server Components (createServerClient) ────┘   |  |
  Supabase Auth    ←── Middleware (updateSession) ────────────────────┘  |
  Browser          ←── Client Components (createBrowserClient) ──────────┘
```

### Recommended Project Structure

```
atmaram-website/
├── app/
│   ├── [locale]/                    # All bilingual public routes
│   │   ├── layout.tsx               # Sets html lang, NextIntlClientProvider
│   │   ├── (public)/                # Route group — public pages
│   │   │   ├── page.tsx             # Home
│   │   │   ├── about/page.tsx
│   │   │   ├── departments/page.tsx
│   │   │   ├── doctors/page.tsx
│   │   │   ├── services/page.tsx
│   │   │   ├── contact/page.tsx
│   │   │   └── appointment/page.tsx
│   ├── (portal)/                    # Route group — English-only portal
│   │   ├── layout.tsx               # Portal shell, auth guard
│   │   ├── login/page.tsx
│   │   └── dashboard/page.tsx       # Placeholder for Phase 4+
│   ├── api/                         # API routes
│   │   └── .gitkeep
│   ├── globals.css                  # @import "tailwindcss"
│   └── layout.tsx                   # Root layout (minimal, no locale here)
├── i18n/
│   ├── routing.ts                   # defineRouting({ locales, defaultLocale })
│   └── request.ts                   # getRequestConfig — server-only config
├── messages/
│   ├── en.json                      # English translations
│   └── hi.json                      # Hindi translations
├── lib/
│   └── supabase/
│       ├── client.ts                # createBrowserClient (Client Components)
│       ├── server.ts                # createServerClient (RSC / Server Actions)
│       └── middleware.ts            # createServerClient for proxy.ts
├── proxy.ts                         # next-intl + Supabase middleware (Next.js 16)
├── next.config.ts                   # withNextIntl plugin wrapper
├── postcss.config.mjs               # @tailwindcss/postcss
├── tsconfig.json
└── .env.local                       # Supabase keys + Gemini placeholder
```

### Pattern 1: next-intl v4 Routing Configuration

**What:** Central routing config consumed by middleware and request config.
**When to use:** Always — this is the single source of truth for locale list and default.

```typescript
// i18n/routing.ts
// Source: next-intl.dev/docs/routing/configuration
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['hi', 'en'],
  defaultLocale: 'hi',       // Hindi is the project default (CLAUDE.md locked)
  localePrefix: 'as-needed'  // /hi is default, /en shows prefix — or use 'always'
});
```

> **Important:** `localePrefix: 'as-needed'` means default locale (`hi`) has no prefix (e.g., `/` not `/hi/`). There is a **known bug** in next-intl with `redirect()` and `as-needed` — if using `localePrefix: 'as-needed'`, use next-intl's own `redirect()` from `next-intl/navigation`, not Next.js's `redirect()`. See Pitfall 4 below. Using `'always'` avoids this bug but adds `/hi/` prefix to all default-locale URLs.

### Pattern 2: next-intl v4 Middleware (proxy.ts)

**What:** Locale detection and routing. In Next.js 16, this file is named `proxy.ts` not `middleware.ts`.
**When to use:** Every project using next-intl with App Router in Next.js 16.

```typescript
// proxy.ts  (← NOT middleware.ts in Next.js 16)
// Source: next-intl.dev/docs/routing/middleware
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Match all paths EXCEPT: /portal/*, /api/*, /_next/*, static files, favicons
  // This keeps the portal outside next-intl locale handling entirely
  matcher: [
    '/((?!portal|api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)'
  ]
};
```

> **Critical:** The matcher regex uses a negative lookahead to exclude `/portal`. Without this, next-intl would try to attach a locale prefix to `/portal/dashboard`, breaking portal routing. [CITED: github.com/amannn/next-intl/issues/1701]

### Pattern 3: Composing Supabase + next-intl in a Single Middleware

**What:** When Phase 4 (auth) is added, the Supabase session refresh must also run in middleware. Since Next.js 16 only supports a single `proxy.ts`, the two concerns must be composed.
**When to use:** Phase 4 will need this. Set up the composition architecture in Phase 1 even if Supabase logic is a no-op stub.

```typescript
// proxy.ts — composed version (prep for Phase 4)
// Source: [ASSUMED] — pattern from community discussions; verify at Phase 4
import createMiddleware from 'next-intl/middleware';
import { type NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';

const handleI18nRouting = createMiddleware(routing);

export async function middleware(request: NextRequest) {
  // Step 1: Let next-intl handle locale routing for public routes
  // Step 2: Supabase session refresh will be added here in Phase 4
  const response = handleI18nRouting(request);
  return response;
}

export const config = {
  matcher: [
    '/((?!portal|api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)'
  ]
};
```

### Pattern 4: next-intl Request Config (server-only)

**What:** Links translation messages to the current locale for Server Components.
**When to use:** Required — without this, `getTranslations()` in Server Components fails.

```typescript
// i18n/request.ts
// Source: next-intl.dev/docs/usage/configuration
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  // Validate locale against supported list
  if (!locale || !routing.locales.includes(locale as 'hi' | 'en')) {
    locale = routing.defaultLocale;
  }

  return {
    locale,  // ← REQUIRED in v4 — omitting causes "Unable to find next-intl locale" error
    messages: (await import(`../../messages/${locale}.json`)).default
  };
});
```

### Pattern 5: next.config.ts Plugin

```typescript
// next.config.ts
// Source: next-intl.dev/docs/getting-started/app-router
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  // project-specific config
};

export default withNextIntl(nextConfig);
```

### Pattern 6: [locale] Layout with NextIntlClientProvider

```typescript
// app/[locale]/layout.tsx
// Source: next-intl.dev/docs/getting-started/app-router
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;  // Next.js 16: params is a Promise
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as 'hi' | 'en')) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

> **Next.js 16 change:** `params` is now a `Promise` and must be awaited. Code from pre-16 tutorials that uses `params.locale` directly will break.

### Pattern 7: @supabase/ssr v0.12+ Client Setup

**What:** Three Supabase client variants needed for different contexts.
**When to use:** Every call to Supabase from browser, server, or middleware uses a different client.

```typescript
// lib/supabase/client.ts — Browser / Client Components
// Source: supabase.com/docs/guides/auth/server-side/creating-a-client
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

```typescript
// lib/supabase/server.ts — Server Components, Server Actions, Route Handlers
// Source: supabase.com/docs/guides/auth/server-side/nextjs
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();  // Next.js 16: cookies() returns a Promise

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // Server Components cannot write cookies — this is a no-op here
          // Middleware handles cookie writing
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        }
      }
    }
  );
}
```

```typescript
// lib/supabase/middleware.ts — Used in proxy.ts
// Source: supabase.com/docs/guides/auth/server-side/nextjs
import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Must write to both request and response
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        }
      }
    }
  );

  // IMPORTANT: Use getUser() not getSession() — getUser() re-validates with Supabase Auth server
  const { data: { user } } = await supabase.auth.getUser();

  return supabaseResponse;
}
```

### Pattern 8: Environment Variables

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Service role key — server-only, never exposed to browser
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Gemini API placeholder (Phase 11)
GEMINI_API_KEY=placeholder
```

### Pattern 9: Tailwind CSS v4 Setup

```css
/* app/globals.css */
@import "tailwindcss";

/* Custom theme tokens go here using @theme directive in v4 */
/* No tailwind.config.js needed */
```

```javascript
// postcss.config.mjs
// Source: tailwindcss.com/docs/guides/nextjs
export default {
  plugins: {
    '@tailwindcss/postcss': {}
  }
};
```

> **Note:** `create-next-app` generates this automatically with `--tailwind`. The `@tailwindcss/postcss` package must be installed separately if not scaffolded.

### Anti-Patterns to Avoid

- **Using `middleware.ts` in Next.js 16:** The file is now `proxy.ts`. If you name it `middleware.ts`, the middleware will silently fail to run in Next.js 16. [CITED: buildwithmatija.com/blog/next-intl-nextjs-16-proxy-fix]
- **Using `get/set/remove` cookie API with @supabase/ssr 0.12+:** The old three-method API is deprecated. Use `getAll/setAll` exclusively.
- **Omitting `locale` from `getRequestConfig` return:** In next-intl v4, returning `locale` is required. Without it: "Unable to find next-intl locale" error.
- **Not awaiting `params` in Next.js 16 layouts:** `params` is a Promise in Next.js 16. `params.locale` (no await) is `undefined`.
- **Calling `supabase.auth.getSession()` in middleware:** Not guaranteed to revalidate the token. Always use `getUser()`.
- **Portal routes inside `[locale]`:** Portal is English-only — placing it inside `[locale]` adds locale prefixes to every portal URL and runs unnecessary i18n logic on portal requests.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Locale detection from Accept-Language | Custom header parsing middleware | `next-intl createMiddleware` | Handles negotiation, cookie persistence, redirect logic — 200+ edge cases |
| Cookie-based auth sessions | Custom JWT cookie management | `@supabase/ssr createServerClient` | Handles token refresh, expiry, secure cookie attributes, XSS mitigations |
| TypeScript path aliases | Manual `require` path manipulation | `tsconfig.json` `paths` + Next.js `--import-alias` | `@/*` alias configured by create-next-app; use it everywhere |
| Translation file loading | Dynamic `import()` with manual caching | `getMessages()` from next-intl server | Handles RSC streaming, caching, and locale resolution |
| Environment variable validation | Runtime `if (!process.env.X)` checks | TypeScript non-null assertion + server-side validation in setup | Fail fast at startup, not at request time |

**Key insight:** next-intl and @supabase/ssr each solve problems that look simple on the surface (read a cookie, pick a language) but have 50+ edge cases in production (cookie SameSite, CSP, redirect loops, stale tokens, streaming RSC). Never replace them with custom code.

---

## Common Pitfalls

### Pitfall 1: middleware.ts vs proxy.ts in Next.js 16

**What goes wrong:** Developer names the file `middleware.ts` following every tutorial from before mid-2025. Locale routing silently stops working — no error, pages just don't redirect to locale prefix.
**Why it happens:** Next.js 16 renamed the interceptor file from `middleware.ts` to `proxy.ts`.
**How to avoid:** File must be named `proxy.ts` at the project root (same level as `app/`, not inside it).
**Warning signs:** `npx next dev` starts without errors but navigating to `/` doesn't redirect to `/en` or `/hi`. Locale-prefixed URLs return 404.

### Pitfall 2: Old @supabase/ssr Cookie API

**What goes wrong:** Copy-pasting tutorial code that uses `get`, `set`, `remove` cookie methods. TypeScript will show a type error, but if you ignore it the app may partially work and silently fail to refresh tokens.
**Why it happens:** @supabase/ssr changed the cookie API in v0.5 and again normalized it in v0.12. Most tutorials predate the change.
**How to avoid:** Use only `getAll()` and `setAll()`. The old API is deprecated as of v0.12.
**Warning signs:** TypeScript error `Property 'get' does not exist on type ...`. Session appears valid on first load but expires silently.

### Pitfall 3: Omitting `locale` from getRequestConfig Return

**What goes wrong:** `useTranslations()` works in development but throws "Unable to find next-intl locale" in some RSC scenarios or after upgrading next-intl.
**Why it happens:** In next-intl v4, the `locale` field in the return object of `getRequestConfig` is required. v3 code worked without it.
**How to avoid:** Always return `{ locale, messages }` from `getRequestConfig`, never just `{ messages }`.
**Warning signs:** Error "Unable to find next-intl locale" in server logs. Locale reads as `undefined`.

### Pitfall 4: next-intl `redirect()` with `localePrefix: 'as-needed'`

**What goes wrong:** Using Next.js's built-in `redirect()` from `next/navigation` when `localePrefix: 'as-needed'` causes redirects to the wrong locale (previously visited locale sticks).
**Why it happens:** Known bug in next-intl — the routing validation is global and Next.js's redirect bypasses the locale awareness. [CITED: github.com/amannn/next-intl/issues/1845]
**How to avoid:** Import `redirect` from `'next-intl/navigation'` (not `'next/navigation'`). Alternatively use `localePrefix: 'always'` to sidestep the bug entirely.
**Warning signs:** Language toggle works on first visit but breaks after the user has visited multiple locales.

### Pitfall 5: params Not Awaited in Next.js 16 Layouts

**What goes wrong:** `const { locale } = params` (no await) — `locale` is `undefined`. Layout renders with no locale, NextIntlClientProvider receives `undefined` messages.
**Why it happens:** Next.js 16 made `params` (and `searchParams`) in layouts/pages into Promises.
**How to avoid:** Always `const { locale } = await params` in any layout or page that receives params.
**Warning signs:** TypeScript error on `params.locale`; runtime `undefined` locale in non-TypeScript builds.

### Pitfall 6: Portal Routes Getting Locale Prefixed

**What goes wrong:** `/portal/dashboard` becomes `/hi/portal/dashboard` after next-intl middleware runs.
**Why it happens:** next-intl middleware matcher includes `/portal` paths.
**How to avoid:** The `proxy.ts` matcher must include `portal` in the negative lookahead: `/((?!portal|api|_next/static|...).*)`.
**Warning signs:** Any `/portal/*` URL redirects to `/hi/portal/*` or `/en/portal/*`.

### Pitfall 7: Missing NextIntlClientProvider in [locale] Layout

**What goes wrong:** `useTranslations()` in Client Components throws "Could not find NextIntl context".
**Why it happens:** In next-intl v4, `NextIntlClientProvider` is required — it was optional in some v3 setups. Client Components need provider context to access translations.
**How to avoid:** Wrap `children` in `<NextIntlClientProvider messages={messages}>` in `app/[locale]/layout.tsx`.
**Warning signs:** Server Components work fine; any `'use client'` component using `useTranslations()` throws at runtime.

---

## Code Examples

Verified patterns from official sources:

### next-intl v4 routing.ts

```typescript
// Source: next-intl.dev/docs/routing/configuration
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['hi', 'en'],
  defaultLocale: 'hi'
});
```

### @supabase/ssr v0.12+ getAll/setAll cookie pattern

```typescript
// Source: supabase.com/docs/guides/auth/server-side/nextjs
cookies: {
  getAll() {
    return cookieStore.getAll();
  },
  setAll(cookiesToSet) {
    cookiesToSet.forEach(({ name, value, options }) =>
      cookieStore.set(name, value, options)
    );
  }
}
```

### Tailwind v4 CSS import

```css
/* Source: tailwindcss.com/docs/guides/nextjs */
@import "tailwindcss";
```

### Next.js 16 params as Promise in layouts

```typescript
// Source: nextjs.org/docs/app (Next.js 16 breaking change)
export default async function Layout({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params;
  // ...
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `middleware.ts` | `proxy.ts` | Next.js 16 (late 2025) | Silent failure if not renamed |
| `@supabase/ssr` get/set/remove cookies | `getAll/setAll` | @supabase/ssr v0.5+ (normalized v0.12) | Old API deprecated, type errors |
| `tailwind.config.js` | CSS `@import "tailwindcss"` + `@theme` | Tailwind v4 (early 2025) | No more JS config file needed |
| `createNavigation` (v3 style) | `createNavigation` from `next-intl/routing` | next-intl v4 | Older APIs removed |
| `params.locale` (synchronous) | `await params` then `.locale` | Next.js 16 | Synchronous access returns undefined |
| `next-intl/middleware` direct export | `createMiddleware` named import | next-intl v4 | Import path change |

**Deprecated/outdated:**
- `@supabase/auth-helpers-nextjs`: Fully deprecated, replaced by `@supabase/ssr`
- `tailwind.config.js` for new projects: Superseded by CSS-native configuration in v4
- `next-intl` without `NextIntlClientProvider`: v4 requires provider for Client Components

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | All packages verified as legitimate based on official org ownership and documentation; slopcheck binary was not executable at research time | Package Legitimacy Audit | Low — all packages from Vercel, Microsoft, Tailwind Labs, Supabase, known individuals |
| A2 | `localePrefix: 'as-needed'` is the preferred config for this project (default locale `/` not `/hi/`) | Architecture Patterns — routing.ts | If wrong, switch to `'always'` — avoids the redirect bug at cost of `/hi/` prefix on all URLs |
| A3 | Supabase project does not yet exist — Phase 1 must include creation step | Architecture Patterns | Phase 1 plan must include "create Supabase project in dashboard" as an explicit step |
| A4 | Middleware composition pattern for Supabase + next-intl in proxy.ts | Pattern 3 | Functional pattern, Phase 1 only needs a stub; full composition implemented in Phase 4 |

**If this table is empty:** N/A — 4 assumptions logged above.

---

## Open Questions (RESOLVED)

1. **`localePrefix` setting: `'as-needed'` vs `'always'`** — **RESOLVED: `'always'`**
   - What we know: `'as-needed'` means `/` for Hindi (default), `/en/` for English. Has a known redirect bug with `redirect()`. `'always'` means `/hi/` and `/en/` but no redirect bug.
   - Decision: Use `localePrefix: 'always'` — simpler, bug-free. Plans implement this. Can revisit in Phase 3 if the client prefers `/` root URLs.

2. **Supabase project region** — **RESOLVED: `ap-south-1` (Mumbai)**
   - What we know: Hospital is in Kanpur, UP (India). Supabase has an `ap-south-1` (Mumbai) region.
   - Decision: Developer creates a new Supabase project in `ap-south-1` for lowest latency to Indian users. Plan 01-02 covers this as a manual human-action step.

3. **`src/` directory vs root `app/`** — **RESOLVED: root `app/` (no `--src-dir`)**
   - What we know: `create-next-app` offers `--src-dir` flag. With `src/`, app lives at `src/app/`; without, it lives at `app/`.
   - Decision: Use root-level `app/` via `--no-src-dir` flag for simpler path resolution with next-intl message imports. Plan 01-01 passes `--no-src-dir` to create-next-app.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js runtime | Assumed ✓ | Unknown | — |
| npm | Package installation | Assumed ✓ | Unknown | yarn/pnpm |
| Git | Version control | Assumed ✓ | Unknown | — |
| Supabase project (cloud) | Supabase keys in .env.local | Not yet created | — | Must create via supabase.com dashboard |
| Supabase CLI | DB migrations (Phase 4+) | Not checked | — | Skip for Phase 1 |

**Missing dependencies with no fallback:**
- Supabase cloud project must be created before `.env.local` can be populated with valid keys. Phase 1 plan must include this as an explicit manual step.

**Missing dependencies with fallback:**
- Supabase CLI: not needed for Phase 1 setup. Phase 4 (auth) will require it.

---

## Validation Architecture

nyquist_validation is enabled (key present and true in config.json).

### Test Framework

Phase 1 is infrastructure setup, not feature code. No test framework exists yet. The appropriate validation approach for Phase 1 is **smoke checks** via `npm run dev` and `npm run build`, not unit tests.

| Property | Value |
|----------|-------|
| Framework | None pre-existing — Phase 1 sets up the project from scratch |
| Config file | `jest.config.ts` or `vitest.config.ts` — will be created in Phase 1 or deferred to Phase 2 |
| Quick run command | `npm run build` (type-check + compile validation) |
| Full suite command | `npm run dev` then manual smoke test of dev server |

### Phase Requirements → Test Map

Phase 1 has no v1 REQ-IDs (foundational infra). Validation is against Phase 1 success criteria from ROADMAP.md:

| Success Criterion | Test Type | Method |
|-------------------|-----------|--------|
| `npm run dev` starts without errors on localhost | Smoke | Run `npm run dev`, confirm no startup errors |
| Supabase `.env.local` valid, test query returns | Manual smoke | Add test query in a Server Component, confirm response |
| Tailwind CSS renders styles correctly | Visual smoke | Render a page with a Tailwind class, visually verify |
| Folder structure matches App Router + `[locale]` + `(portal)` architecture | Structural | File system check — all required directories exist |

### Sampling Rate

- **Per task commit:** `npm run build` — catches type errors
- **Per wave merge:** `npm run dev` smoke check on localhost
- **Phase gate:** All 4 success criteria above confirmed before moving to Phase 2

### Wave 0 Gaps

No test files exist (new project). No pre-existing test infrastructure. Phase 1 does not require unit tests — structural and smoke validation is sufficient for infrastructure setup.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No (Phase 1 only sets up clients, not auth flows) | @supabase/ssr — implemented in Phase 4 |
| V3 Session Management | Partial (cookie setup) | @supabase/ssr `updateSession()` in proxy.ts |
| V4 Access Control | No | Implemented in Phase 4 |
| V5 Input Validation | No (Phase 1 has no user input) | zod — Phase 7 |
| V6 Cryptography | No (handled by Supabase internally) | Supabase manages JWT signing |

### Known Threat Patterns for This Stack (Phase 1 Relevant)

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| API keys in version control | Information Disclosure | `.env.local` in `.gitignore` (create-next-app default) — verify before first commit |
| `SUPABASE_SERVICE_ROLE_KEY` exposed to browser | Information Disclosure | Never prefix with `NEXT_PUBLIC_` — server-only env var |
| Gemini API key exposure | Information Disclosure | Never use `NEXT_PUBLIC_GEMINI_API_KEY` — call from `app/api/` route only |
| Supabase anon key misuse | Elevation of Privilege | Anon key is safe to expose (Row Level Security controls access) — but service role key must stay server-only |

**Security note for Phase 1:** The `.gitignore` generated by `create-next-app` includes `.env.local`. Verify this before the first `git commit`. The `SUPABASE_SERVICE_ROLE_KEY` and `GEMINI_API_KEY` must never have `NEXT_PUBLIC_` prefix.

---

## Sources

### Primary (HIGH confidence)

- `next-intl.dev/docs/getting-started/app-router` — App Router setup guide, v4
- `next-intl.dev/docs/routing/configuration` — defineRouting, locales, defaultLocale
- `next-intl.dev/docs/routing/middleware` — proxy.ts setup, matcher patterns
- `supabase.com/docs/guides/auth/server-side/nextjs` — createServerClient, createBrowserClient, middleware pattern
- `supabase.com/docs/guides/auth/server-side/creating-a-client` — v0.12 getAll/setAll API
- `tailwindcss.com/docs/guides/nextjs` — v4 PostCSS setup, @import pattern
- npm registry — version verification for all packages

### Secondary (MEDIUM confidence)

- `buildwithmatija.com/blog/next-intl-nextjs-16-proxy-fix` — proxy.ts rename confirmed against official docs
- `buildwithmatija.com/blog/nextjs-internationalization-guide-next-intl-2025` — v4 complete setup walkthrough
- `fixdevs.com/blog/next-intl-not-working/` — common pitfalls reference (cross-verified against official docs)

### Tertiary (LOW confidence)

- `github.com/amannn/next-intl/issues/1845` — `localePrefix: 'as-needed'` redirect bug (GitHub issue, not official docs)
- `github.com/amannn/next-intl/issues/1701` — matcher pattern for non-locale routes (GitHub issue)
- Community guidance on composing Supabase + next-intl in single proxy.ts (pattern verified conceptually, specific implementation marked [ASSUMED] in Pattern 3)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified against npm registry; official documentation confirmed for each library
- Architecture: HIGH — folder structure derived directly from next-intl and Next.js App Router official docs
- Pitfalls: MEDIUM-HIGH — most pitfalls cross-referenced between official docs and multiple community sources; Pitfall 4 (redirect bug) is a known GitHub issue

**Research date:** 2026-06-10
**Valid until:** 2026-07-10 (30 days — stack is stable but next-intl and @supabase/ssr release frequently)
