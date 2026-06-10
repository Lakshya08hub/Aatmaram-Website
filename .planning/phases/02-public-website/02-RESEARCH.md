# Phase 2: Public Website — Research

**Researched:** 2026-06-10
**Domain:** Next.js 16 App Router + Tailwind v4 + shadcn/ui + next-intl v4 — static public website
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Primary color `#1E40AF`. Accent `#16A34A`. Background `#F8FAFC`. Text `#0F172A`.
- **D-02:** Design finish is Clean & Minimal — white space, subtle shadows, rounded cards, no decorative gradients.
- **D-03:** Install **shadcn/ui** on top of Tailwind v4. Components live in `components/ui/`. Do not rebuild accessible primitives from scratch.
- **D-04:** Realistic seeded placeholder content — hospital name, departments (8), doctors (6), services, about stats (90 beds, 25+ doctors, 8 specialties). Address Naubasta / Kidwai Nagar, Kanpur-208021, UP.
- **D-05:** All content hardcoded in Phase 2. Phase 5 migrates to Supabase.
- **D-06:** Appointment form — client-side validation only + success toast. No Supabase write.
- **D-07:** Appointment form fields: patient name, phone, preferred doctor (select), preferred date (date picker), reason/chief complaint (textarea).

### Claude's Discretion

- Page-level SEO metadata per page — implement with sensible titles/descriptions.
- Mobile-first layout — standard practice.
- Font choice — use `--font-geist-sans` CSS variable (already in globals.css); no decorative fonts.
- Image placeholders — solid-color div with initials for doctor avatars; no external image service.
- Nav items — Home, About, Departments, Doctors, Services, Contact, Book Appointment (CTA).

### Deferred Ideas (OUT OF SCOPE)

- Full bilingual Hindi content — Phase 3
- Functional language toggle — Phase 3
- Content editable from portal — Phase 5
- Appointment form Supabase write — Phase 7
- Real doctor photos/logo — client content dependency
- Google Maps embed — API key not configured
- Gemini chat widget — Phase 11
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PUB-01 | Visitor can view Home page with hospital overview, key stats, and CTA | Hero + Trust Signals + Departments preview + Appointment CTA band |
| PUB-02 | Visitor can view About page with hospital history and mission | About page with founding story placeholder, stat cards |
| PUB-03 | Visitor can view Departments page listing all specialties with descriptions | Departments grid with 8 shadcn Cards + lucide icons |
| PUB-04 | Visitor can view Doctors page with name, specialization, and placeholder avatar | Doctors grid with 6 seeded cards + avatar initials pattern |
| PUB-05 | Visitor can view Services/Facilities page listing hospital capabilities | Services list + Ayushman Bharat section + Facilities grid |
| PUB-06 | Visitor can view Contact page with address, phone, OPD timings, map placeholder | Contact details + map placeholder div (no Google Maps API key) |
| PUB-07 | Visitor can view Appointment Request page with booking form | Appointment form with react-hook-form + Zod + shadcn components |
| PUB-08 | Ayushman Bharat PM-JAY badge displayed prominently | Hero placement + Footer small version + Services Ayushman section |
</phase_requirements>

---

## Summary

Phase 2 builds all 7 public-facing pages with seeded content on the existing Next.js 16 + Tailwind v4 + next-intl v4 scaffold from Phase 1. The central technical challenge is correctly installing shadcn/ui on top of an already-present Tailwind v4 project — shadcn CLI v4.11.0 (latest) fully supports this path and auto-detects Tailwind v4, injecting `@import "shadcn/tailwind.css"` and `@import "tw-animate-css"` into globals.css without requiring tailwind.config.js.

The appointment form (the only client component in this phase) uses react-hook-form + Zod for validation and the shadcn Sonner toast for success feedback. All other pages are server components that render hardcoded seeded content. next-intl v4's `getTranslations()` is already the correct pattern for server components; client components access translations via `useTranslations()` because `NextIntlClientProvider` is already in the locale layout.

One pre-existing gap must be fixed in Wave 0: the Geist font is referenced in `globals.css` as `--font-geist-sans` but is **never loaded via `next/font`** in any layout. The font variable resolves to nothing and the body falls back to Arial. This must be wired in `app/[locale]/layout.tsx` before component work begins.

**Primary recommendation:** Run `npx shadcn@latest init` (no canary flag needed), let it update globals.css, then add the project color tokens to the `@theme inline` block. Wire Geist font in locale layout. Build all pages as server components except `AppointmentForm` (client component). Use react-hook-form + Zod for form validation and `toast()` from `sonner` for success feedback.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Page rendering (7 pages) | Frontend Server (SSR) | — | Server components, static content — no client needed |
| Header / Footer | Frontend Server (SSR) | Browser (Sheet) | Server-rendered; mobile Sheet is client-side Radix |
| Appointment form validation | Browser / Client | — | `'use client'` — react-hook-form runs in browser |
| Success toast | Browser / Client | — | Sonner imperative API runs in browser |
| i18n / locale routing | Frontend Server (SSR) | Browser (provider) | next-intl middleware + server `getTranslations`; `NextIntlClientProvider` delivers messages to client |
| SEO metadata | Frontend Server (SSR) | — | Next.js `metadata` export — static per page |
| Seeded content | Frontend Server (SSR) | — | Hardcoded in `lib/data/` constants, imported into server components |
| Navigation (mobile drawer) | Browser / Client | — | shadcn Sheet + Radix handles focus trap and animation |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.2.9 (installed) | App Router framework | Already installed Phase 1 |
| Tailwind CSS v4 | ^4 (installed) | Utility CSS | Already installed Phase 1 |
| next-intl | ^4.13.0 (installed) | i18n routing + translations | Already installed Phase 1 |
| shadcn/ui CLI | 4.11.0 (latest) | Copy-paste component scaffolding | D-03 locked decision; auto-detects Tailwind v4 |
| tw-animate-css | 1.4.0 | Animation utilities for shadcn components | Replaces tailwindcss-animate in shadcn's v4 path |
| lucide-react | 1.17.0 | Icon library | Bundled with shadcn; used for all UI icons |

### Supporting (new installs this phase)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-hook-form | 7.78.0 | Appointment form state + validation orchestration | shadcn Form component requires it |
| @hookform/resolvers | 5.4.0 | Bridge between react-hook-form and Zod | Required for Zod schema integration |
| zod | 4.4.3 | Schema-based form validation | Phone regex, date min, required rules |
| sonner | 2.0.7 | Toast notification for form success | D-06 locked; shadcn `sonner` component wraps it |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-hook-form + Zod | Native React useState validation | hook-form avoids re-render on every keystroke; Zod gives schema reuse in Phase 7 |
| shadcn Sonner | shadcn legacy toast (`useToast`) | Sonner is current shadcn default for App Router; legacy toast has known RSC issues |
| Hardcoded seeded data in `lib/data/` | Data in component files | Constants file makes Phase 5 migration to Supabase a clean swap |

**Installation (new packages only):**

```bash
# shadcn init (auto-installs tw-animate-css, lucide-react, class-variance-authority, etc.)
npx shadcn@latest init

# shadcn components
npx shadcn@latest add button card badge input label textarea select sheet separator
npx shadcn@latest add sonner

# Form packages
npm install react-hook-form @hookform/resolvers zod
```

**Version verification:** Confirmed against npm registry on 2026-06-10.
`shadcn@4.11.0`, `react-hook-form@7.78.0`, `@hookform/resolvers@5.4.0`, `zod@4.4.3`, `sonner@2.0.7`, `tw-animate-css@1.4.0`, `lucide-react@1.17.0`. [VERIFIED: npm registry]

---

## Package Legitimacy Audit

> slopcheck v0.6.1 ran successfully on 2026-06-10. All packages rated [OK].

| Package | Registry | slopcheck | Disposition |
|---------|----------|-----------|-------------|
| react-hook-form | npm | [OK] | Approved |
| @hookform/resolvers | npm | [OK] | Approved |
| zod | npm | [OK] | Approved |
| sonner | npm | [OK] | Approved |
| tw-animate-css | npm | [OK] | Approved |

Note: `shadcn` CLI, `lucide-react`, `class-variance-authority`, `clsx`, `tailwind-merge` are installed by `npx shadcn@latest init` automatically. All are well-established packages in the shadcn/ui ecosystem. [ASSUMED] for auto-installed transitive deps not individually checked.

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
Browser Request
      |
      v
[proxy.ts middleware] — next-intl locale detection
      | (adds /hi/ or /en/ prefix if missing)
      v
[app/[locale]/layout.tsx]
      | (locale validated, messages loaded, NextIntlClientProvider wraps tree)
      v
[app/[locale]/(public)/layout.tsx]  ← Add Header + Footer here
      |
      +---> [page.tsx] Server Component
      |         | getTranslations() + seeded data from lib/data/
      |         | renders JSX with shadcn Cards, Buttons, etc.
      v
[Browser]
      | (hydration)
      +---> [AppointmentForm] 'use client'
                | useTranslations() via NextIntlClientProvider
                | react-hook-form + Zod
                | toast() via sonner
```

### Recommended Project Structure

```
app/
  layout.tsx                          # root layout (minimal, metadata only)
  globals.css                         # Tailwind v4 + shadcn theme variables
  [locale]/
    layout.tsx                        # locale layout — Geist font + NextIntlClientProvider
    (public)/
      layout.tsx                      # ← NEW: wraps children with <Header> + <Footer>
      page.tsx                        # Home page (replace smoke test)
      about/
        page.tsx
      departments/
        page.tsx
      doctors/
        page.tsx
      services/
        page.tsx
      contact/
        page.tsx
      appointment/
        page.tsx
components/
  ui/                                 # shadcn copy-paste components
    button.tsx
    card.tsx
    badge.tsx
    input.tsx
    label.tsx
    textarea.tsx
    select.tsx
    sheet.tsx
    separator.tsx
    sonner.tsx                        # Toaster wrapper
  layout/
    Header.tsx                        # sticky nav, mobile Sheet
    Footer.tsx                        # 3-col footer
  public/
    DepartmentCard.tsx
    DoctorCard.tsx
    AppointmentForm.tsx               # 'use client' — form + validation + toast
    PMJAYBadge.tsx                    # reusable badge component
    SectionHeading.tsx                # reusable h2 + underline pattern
lib/
  data/
    departments.ts                    # seeded department data (name, icon, description)
    doctors.ts                        # seeded doctor data (name, specialty, initials)
    services.ts                       # seeded services / facilities list
messages/
  en.json                             # Phase 2 adds nav, pages, form keys
  hi.json                             # Phase 3 fills Hindi values
```

### Pattern 1: Server Component Page with Seeded Data

**What:** All 6 new pages (and rewritten Home) are async Server Components. Seeded content lives in `lib/data/` TypeScript constants — not inline in components. This makes Phase 5 migration a clean `import { departments } from '@/lib/data/departments'` → `const departments = await supabase.from('departments').select()` swap.

**When to use:** All pages except AppointmentForm.

**Example:**
```typescript
// Source: [CITED: next-intl.dev/docs/environments/server-client-components]
// app/[locale]/departments/page.tsx
import { getTranslations } from 'next-intl/server';
import { setRequestLocale } from 'next-intl/server';
import { departments } from '@/lib/data/departments';
import DepartmentCard from '@/components/public/DepartmentCard';

export default async function DepartmentsPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);               // enables static rendering
  const t = await getTranslations('departments');

  return (
    <main>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {departments.map((dept) => (
          <DepartmentCard key={dept.id} department={dept} />
        ))}
      </div>
    </main>
  );
}

export function generateStaticParams() {
  return [{ locale: 'hi' }, { locale: 'en' }];
}
```

### Pattern 2: Client Component with Translations

**What:** `AppointmentForm` is `'use client'`. It accesses translations via `useTranslations()` — this works because `NextIntlClientProvider` already wraps the tree in `app/[locale]/layout.tsx`. No extra setup needed.

**When to use:** Any component that needs `useState`, `useEffect`, or event handlers.

**Example:**
```typescript
// Source: [CITED: next-intl.dev/docs/environments/server-client-components]
'use client';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const schema = z.object({
  patientName: z.string().min(2, 'This field is required.'),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number.'),
  preferredDoctor: z.string().min(1, 'This field is required.'),
  preferredDate: z.string().refine(
    (val) => new Date(val) >= new Date(new Date().toISOString().split('T')[0]),
    'Please select a date from today onwards.'
  ),
  reason: z.string().min(10, 'This field is required.'),
});

export default function AppointmentForm() {
  const t = useTranslations('appointment');
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema)
  });

  const onSubmit = () => {
    toast.success('Request Received', {
      description: 'Your appointment request has been received. Our team will call you shortly.',
      duration: 6000,
    });
  };

  return <form onSubmit={handleSubmit(onSubmit)}>{/* fields */}</form>;
}
```

### Pattern 3: shadcn/ui Init on Existing Tailwind v4 Project

**What:** `npx shadcn@latest init` detects Tailwind v4 (no tailwind.config.js present) and generates a Tailwind v4-compatible `components.json`. It updates `globals.css` by injecting `@import "tw-animate-css"` and `@import "shadcn/tailwind.css"` and a `:root` block with HSL CSS variables. The project's existing custom color tokens (`--color-primary`, etc.) must be **merged into** the shadcn-generated `@theme inline` block, not overwritten.

**When to use:** Wave 0 setup task — must run before any component is built.

**Key generated components.json for Tailwind v4:** [CITED: ui.shadcn.com/docs/tailwind-v4]
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

`"config": ""` is the Tailwind v4 signal — no tailwind.config.js path.

### Pattern 4: Header + Footer Placement

**What:** Header and Footer belong in `app/[locale]/(public)/layout.tsx`, NOT in `app/[locale]/layout.tsx`. The `[locale]` layout is also used by the portal (future phases) and any other route groups. The `(public)` route group layout ensures Header/Footer wrap only public pages.

**When to use:** Any shared UI that is public-site-specific.

**Example:**
```typescript
// app/[locale]/(public)/layout.tsx
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export default function PublicLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  );
}
```

### Pattern 5: Sonner Toaster Placement

**What:** The `<Toaster />` component from `@/components/ui/sonner` must be placed in `app/[locale]/layout.tsx` (inside the `NextIntlClientProvider`, inside the `<body>`) so it is available on every page. The `toast()` function is then imported from `"sonner"` directly in client components.

**When to use:** Place once in the locale layout. Call `toast()` anywhere in client components.

```typescript
// app/[locale]/layout.tsx addition
import { Toaster } from '@/components/ui/sonner';
// Inside body:
<NextIntlClientProvider messages={messages}>
  {children}
  <Toaster />
</NextIntlClientProvider>
```

### Anti-Patterns to Avoid

- **Putting Header/Footer in `app/[locale]/layout.tsx`:** This will wrap portal pages (Phase 4+) in the public nav. Use the `(public)` layout instead.
- **Calling `useTranslations()` in an async Server Component:** Use `await getTranslations()` in async server components; `useTranslations()` is for sync server components or client components only.
- **Skipping `setRequestLocale(locale)`:** Without this call in each page/layout, next-intl falls back to reading the `Accept-Language` header which opts the route into dynamic rendering (no static generation at build time).
- **Overwriting shadcn's generated CSS variables:** The `npx shadcn@latest init` command updates globals.css. After init, merge the project color tokens from the UI-SPEC's `@theme inline` block rather than overwriting the entire file.
- **Importing from `"sonner"` for the Toaster:** The `Toaster` component comes from `"@/components/ui/sonner"` (the shadcn wrapper). The `toast()` function comes from `"sonner"` (the package). These are different imports.
- **Hardcoding translated strings in components:** All user-facing text must go through `t('key')` from the start — even though Phase 2 is English-only. Phase 3 replaces values; if strings are hardcoded, Phase 3 breaks.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form validation | Custom validation functions + state | react-hook-form + Zod | Error state coordination, blur/submit modes, async validation support in Phase 7 |
| Modal/drawer nav | Custom overlay + focus trap | shadcn Sheet (Radix) | Focus trap, scroll lock, keyboard escape, a11y built-in |
| Toast notifications | Custom toast state + portal | sonner + shadcn Toaster | Animation, stacking, auto-dismiss, positioning, a11y announcements |
| Button accessible states | Custom button component | shadcn Button | Disabled state, focus ring, loading state via shadcn |
| Form labels + inputs | Plain HTML with manual ARIA | shadcn Label + Input | `htmlFor`/`id` pairing, error state classes, consistent styling |
| Select dropdown | Native `<select>` | shadcn Select (Radix) | Consistent cross-browser styling, keyboard navigation, accessible |
| Card layout | Plain `<div>` grids | shadcn Card | Semantic structure (CardHeader, CardContent, CardFooter) already matches Phase 2 and future CMS-driven content in Phase 5 |

**Key insight:** Every shadcn component wraps a Radix UI primitive. Radix handles the WCAG 2.1 AA accessibility requirements for interactive widgets. Building custom versions would re-solve problems Radix already solved correctly.

---

## Critical Pre-Execution Finding: Geist Font Not Wired

**What:** `globals.css` references `--font-sans: var(--font-geist-sans)` in the `@theme inline` block, but `--font-geist-sans` is never defined. The Geist font is **not loaded via `next/font`** anywhere in the project. The `app/layout.tsx` (root layout) imports `globals.css` but does not set up any font. The `app/[locale]/layout.tsx` renders `<html>` and `<body>` but has no font variable. The body falls back to Arial.

**Fix (Wave 0 task):** Load Geist font in `app/[locale]/layout.tsx` using `next/font/google`:
```typescript
// app/[locale]/layout.tsx
import { Geist } from 'next/font/google';

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
});
// ...
return (
  <html lang={locale} className={geist.variable}>
    <body>
      <NextIntlClientProvider ...>
        {children}
        <Toaster />
      </NextIntlClientProvider>
    </body>
  </html>
);
```

This wires `--font-geist-sans` as a CSS custom property so `globals.css`'s `@theme inline` mapping `--font-sans: var(--font-geist-sans)` resolves correctly. [VERIFIED: codebase grep + next.js docs pattern]

---

## Common Pitfalls

### Pitfall 1: shadcn Init Overwrites Custom CSS Variables

**What goes wrong:** Running `npx shadcn@latest init` on an existing project with a custom `@theme inline` block will rewrite `globals.css`. The project's color tokens (`--color-primary: #1E40AF`, `--color-accent: #16A34A`, etc. from UI-SPEC) are lost.

**Why it happens:** The CLI adds its own `:root` + `@theme inline` block. If run on an existing file, it merges but can clobber manual customizations.

**How to avoid:** Run `npx shadcn@latest init` first (Wave 0), then in the same Wave 0 task, manually add the UI-SPEC color tokens to `globals.css`. Document the exact CSS block to add in the plan.

**Warning signs:** Component colors default to gray instead of the custom Medical Blue palette.

### Pitfall 2: Sonner `toast()` Not Firing

**What goes wrong:** `toast()` is called but nothing appears on screen.

**Why it happens:** `<Toaster />` not placed in the component tree, OR placed outside `NextIntlClientProvider` which causes context issues, OR imported from wrong path.

**How to avoid:** Place `<Toaster />` inside the `NextIntlClientProvider` in `app/[locale]/layout.tsx`. Import `Toaster` from `@/components/ui/sonner`, import `toast` from `"sonner"`.

**Warning signs:** No toast appears; no console errors about missing provider.

### Pitfall 3: `setRequestLocale` Missing from New Pages

**What goes wrong:** Pages render correctly in dev but fail to pre-render at build time, causing full dynamic rendering for every page visit.

**Why it happens:** next-intl v4 with `localePrefix: 'always'` defaults to dynamic rendering unless `setRequestLocale(locale)` is called before `getTranslations()` in each page AND each layout.

**How to avoid:** Every new page file under `app/[locale]/` must call `setRequestLocale(locale)` as the first operation. Add `generateStaticParams()` that returns `[{ locale: 'hi' }, { locale: 'en' }]`. [CITED: next-intl.dev/docs/routing/setup]

**Warning signs:** `next build` output shows pages as `ƒ` (dynamic) instead of `○` (static).

### Pitfall 4: `await params` in Next.js 16

**What goes wrong:** TypeScript errors and runtime failures when accessing `params.locale` directly (not awaited).

**Why it happens:** Next.js 16 makes `params` a Promise. The existing `app/[locale]/layout.tsx` already uses `await params` correctly, but every new page needs the same pattern.

**How to avoid:** Always destructure params as:
```typescript
const { locale } = await params;
```
Never `params.locale` directly. [VERIFIED: existing codebase — layout.tsx line 13]

### Pitfall 5: Translation Keys Must Exist Before Pages Render

**What goes wrong:** Page renders a blank string or throws an error for any `t('key')` call where the key does not exist in `messages/en.json`.

**Why it happens:** next-intl does not silently fall back for missing keys — it logs a warning and returns an empty string or throws depending on config.

**How to avoid:** Add all translation keys to `messages/en.json` AND `messages/hi.json` (with English values for now) before building pages that use them. Structure keys by page namespace: `"nav"`, `"home"`, `"about"`, `"departments"`, `"doctors"`, `"services"`, `"contact"`, `"appointment"`. Phase 3 replaces only the values in `messages/hi.json`.

**Warning signs:** Blank text where translated content should appear; next-intl warnings in console.

### Pitfall 6: Smoke-Test Code in `page.tsx` Must Be Removed

**What goes wrong:** The existing `app/[locale]/(public)/page.tsx` contains Supabase connection test code and debug divs. These will render on the live homepage if not removed.

**Why it happens:** Phase 1 intentionally scaffolded a smoke-test page; Phase 2 must replace it entirely.

**How to avoid:** Wave 0 or Wave 1 task explicitly replaces `app/[locale]/(public)/page.tsx` with the real Home page. The plan must include this file as the target — not creating a new file alongside it.

---

## Code Examples

Verified patterns from official sources:

### Seeded Data Constants File Pattern

```typescript
// lib/data/departments.ts
// Source: [ASSUMED] — standard TypeScript module pattern
import { Baby, Scissors, Activity, Stethoscope, Bone, Heart, Pill, AlertCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface Department {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
}

export const departments: Department[] = [
  {
    id: 'paediatrics',
    name: 'Paediatrics & Neonatology',
    description: 'Comprehensive care for newborns, infants, and children up to 18 years.',
    icon: Baby,
  },
  {
    id: 'paediatric-surgery',
    name: 'Paediatric Surgery',
    description: 'Surgical care for children with congenital and acquired conditions.',
    icon: Scissors,
  },
  // ... remaining 6 departments
];
```

### shadcn Form + Zod Schema Pattern

```typescript
// Source: [CITED: ui.shadcn.com/docs/forms/react-hook-form]
'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const appointmentSchema = z.object({
  patientName: z.string().min(2, 'This field is required.'),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number.'),
  preferredDoctor: z.string().min(1, 'This field is required.'),
  preferredDate: z.string().refine(
    (val) => !val || new Date(val) >= new Date(new Date().toISOString().split('T')[0]),
    'Please select a date from today onwards.'
  ),
  reason: z.string().min(10, 'This field is required.'),
});

type AppointmentFormValues = z.infer<typeof appointmentSchema>;
```

### Next.js metadata export (per page)

```typescript
// Source: [CITED: nextjs.org/docs/app/getting-started/metadata]
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Departments | Atmaram Child Care and Critical Care',
  description: 'Explore 8 specialty departments including Paediatrics, Critical Care, Orthopaedics, and more.',
};
```

### next-intl static rendering pattern (every page)

```typescript
// Source: [CITED: next-intl.dev/docs/routing/setup]
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function SomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  // ... rest of page
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `unstable_setRequestLocale` | `setRequestLocale` (stable) | next-intl v3.22 | No more unstable prefix — stable API |
| `tailwindcss-animate` | `tw-animate-css` | shadcn CLI v4.x | Different import; shadcn init handles automatically |
| `npx shadcn@canary init` for v4 | `npx shadcn@latest init` | shadcn 4.x stable | Tailwind v4 support is now in the `latest` channel |
| `tailwind.config.js` for theme | `@theme inline` in CSS | Tailwind v4.0 | No config file; all theme in CSS |
| `useToast` / legacy toast | `sonner` | shadcn recent | `useToast` still works but Sonner is now shadcn default |
| `middleware.ts` | `proxy.ts` | Next.js 16 | Breaking rename — already handled in Phase 1 |

**Deprecated/outdated:**
- `npx shadcn-ui@latest` (old package name): replaced by `npx shadcn@latest` — the `shadcn-ui` package is unmaintained.
- Legacy `toast` component (`useToast` hook): still works but shadcn now recommends Sonner for App Router.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | shadcn auto-installed transitive deps (clsx, tailwind-merge, class-variance-authority) pass slopcheck | Package Legitimacy | Low — these are 5+ year old packages with 100M+ weekly downloads |
| A2 | Geist font is available via `next/font/google` in Next.js 16 | Critical Finding | Low — Geist has been in `next/font/google` since Next.js 14; confirmed in docs |
| A3 | `(public)` route group layout.tsx does not currently exist; needs to be created | Architecture Patterns | Low — confirmed by `ls` showing only `page.tsx` in `(public)/` |

**All other claims are VERIFIED via npm registry, official docs, or codebase inspection.**

---

## Open Questions

1. **shadcn baseColor selection during `npx shadcn@latest init`**
   - What we know: init prompts for baseColor (neutral, zinc, stone, etc.). This affects default button/card gray tones.
   - What's unclear: Whether to choose "neutral" or "zinc" — both are near-identical grays.
   - Recommendation: Choose "neutral". The project's primary and accent colors override the defaults anyway via custom CSS variables.

2. **Translation key structure for Phase 3 compatibility**
   - What we know: All strings go through `t('key')`. Phase 3 fills Hindi values without restructuring keys.
   - What's unclear: Exact namespace granularity (one namespace per page vs. shared namespace for nav/common).
   - Recommendation: Use one namespace per page (`'home'`, `'about'`, etc.) plus a `'common'` namespace for nav, footer, and shared copy. This matches next-intl's recommended pattern and keeps Phase 3 translation work isolated per page.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | npm installs | ✓ | (project running) | — |
| npm | Package installation | ✓ | (confirmed via package-lock.json) | — |
| Next.js dev server | Development verification | ✓ | 16.2.9 | — |
| Geist font (network) | next/font/google | ✓ | (Google Fonts CDN — self-hosted by Next.js at build) | next/font/local if offline |
| Supabase | NOT needed Phase 2 | ✓ | (Phase 1 verified) | — |

**Missing dependencies with no fallback:** None.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None configured (nyquist_validation: true — gaps exist) |
| Config file | none — Wave 0 must decide |
| Quick run command | `npm run build` (type-check + static analysis) |
| Full suite command | `npm run build && npm run lint` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PUB-01 | Home page renders without 404 | smoke | `npm run build` (static export check) | ❌ Wave 0 |
| PUB-02 | About page renders without 404 | smoke | `npm run build` | ❌ Wave 0 |
| PUB-03 | Departments page renders without 404 | smoke | `npm run build` | ❌ Wave 0 |
| PUB-04 | Doctors page renders without 404 | smoke | `npm run build` | ❌ Wave 0 |
| PUB-05 | Services page renders without 404 | smoke | `npm run build` | ❌ Wave 0 |
| PUB-06 | Contact page renders without 404 | smoke | `npm run build` | ❌ Wave 0 |
| PUB-07 | Appointment form renders all 5 fields | smoke | `npm run build` | ❌ Wave 0 |
| PUB-07 | Form validation fires on invalid phone | manual | visual inspection in browser | manual-only |
| PUB-07 | Success toast shows on valid submission | manual | visual inspection in browser | manual-only |
| PUB-08 | PM-JAY badge visible on homepage | manual | visual inspection in browser | manual-only |

**Note:** No unit/integration test framework is configured. `nyquist_validation: true` is set but this project has no `jest.config.*`, `vitest.config.*`, or test files. The practical validation strategy for this phase is: `npm run build` (TypeScript + route compilation = all pages exist and type-check), `npm run lint` (ESLint), and visual browser inspection for interactive behaviors (form validation, toast, mobile nav).

### Sampling Rate

- **Per task commit:** `npm run build` — confirms no TypeScript errors and all routes compile
- **Per wave merge:** `npm run build && npm run lint`
- **Phase gate:** Full build green + visual browser check of all 7 pages before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] No test framework installed — recommend adding only if timeline allows; `npm run build` is the primary gate for this phase
- [ ] `components.json` — created by `npx shadcn@latest init`
- [ ] `lib/utils.ts` — created by `npx shadcn@latest init` (contains `cn()` helper)
- [ ] `app/[locale]/(public)/layout.tsx` — Header + Footer wrapper (does not exist yet)

*(No existing test infrastructure — `npm run build` covers route existence and type safety for server components. Form validation and toast behavior are manual-only in Phase 2.)*

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No auth in Phase 2 — public pages only |
| V3 Session Management | no | No session in Phase 2 |
| V4 Access Control | no | No protected routes in Phase 2 |
| V5 Input Validation | yes (limited) | Zod schema on appointment form — client-side only; Phase 7 adds server-side |
| V6 Cryptography | no | No data storage in Phase 2 |

### Known Threat Patterns for Public Static Website

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Form spam (appointment form) | Tampering | Phase 2: client-side only, no persistence. Phase 7 adds rate limiting + honeypot. |
| XSS via seeded content | Tampering | React escapes JSX values by default — hardcoded strings are safe |
| Open redirect | Spoofing | next-intl middleware handles locale redirects — no custom redirect logic |

**Note:** Phase 2 has minimal security surface. The appointment form has no backend in this phase — form data is never stored or transmitted. The main security concern (server-side validation, rate limiting) lands in Phase 7 when the Supabase write is added.

---

## Sources

### Primary (HIGH confidence)

- `npm view <package> version` — confirmed latest versions for all 6 new packages on 2026-06-10
- Codebase inspection (`app/[locale]/layout.tsx`, `globals.css`, `package.json`, `i18n/routing.ts`) — verified existing infrastructure
- slopcheck v0.6.1 — all 5 new packages rated [OK]

### Secondary (MEDIUM confidence)

- [ui.shadcn.com/docs/tailwind-v4](https://ui.shadcn.com/docs/tailwind-v4) — Tailwind v4 init, components.json format, tw-animate-css migration
- [ui.shadcn.com/docs/components/sonner](https://ui.shadcn.com/docs/components/sonner) — Toaster placement, toast() usage
- [ui.shadcn.com/docs/forms/react-hook-form](https://ui.shadcn.com/docs/forms/react-hook-form) — Form + Zod pattern
- [next-intl.dev/docs/routing/setup](https://next-intl.dev/docs/routing/setup) — generateStaticParams, setRequestLocale pattern
- [next-intl.dev/docs/environments/server-client-components](https://next-intl.dev/docs/environments/server-client-components) — getTranslations vs useTranslations
- [next-intl.dev/blog/next-intl-4-0](https://next-intl.dev/blog/next-intl-4-0) — v4 breaking changes (ESM-only, locale required in getRequestConfig)

### Tertiary (LOW confidence)

- WebSearch results confirming shadcn@latest (not canary) supports Tailwind v4 — cross-referenced with official docs

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all package versions confirmed via npm registry; shadcn Tailwind v4 support confirmed via official docs
- Architecture: HIGH — patterns derived from existing codebase + official next-intl + shadcn docs
- Pitfalls: HIGH (Geist font gap, smoke test removal, setRequestLocale) — verified via codebase inspection; MEDIUM (CSS variable merge) — based on shadcn docs + community reports

**Research date:** 2026-06-10
**Valid until:** 2026-07-10 (shadcn CLI and next-intl are active projects — re-verify if delayed past 30 days)
