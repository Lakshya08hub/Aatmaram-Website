# Phase 3: Bilingual System - Pattern Map

**Mapped:** 2026-06-11
**Files analyzed:** 6 (2 new, 4 modify)
**Analogs found:** 6 / 6

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `i18n/navigation.ts` | utility/config | request-response | `i18n/routing.ts` | role-match |
| `components/layout/LanguageToggle.tsx` | component | event-driven | `components/layout/MobileNav.tsx` + `components/ui/sonner.tsx` | role-match |
| `components/layout/Header.tsx` | component | request-response | `components/layout/Header.tsx` (self — modify) | exact (self) |
| `components/layout/MobileNav.tsx` | component | event-driven | `components/layout/MobileNav.tsx` (self — modify) | exact (self) |
| `app/globals.css` | config | — | `app/globals.css` (self — modify) | exact (self) |
| `messages/hi.json` | config/data | — | `messages/en.json` | exact (structural mirror) |

---

## Pattern Assignments

### `i18n/navigation.ts` (utility, request-response)

**Analog:** `i18n/routing.ts`

**Imports + full file pattern** (`i18n/routing.ts` lines 1–7):
```typescript
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['hi', 'en'],
  defaultLocale: 'hi',
  localePrefix: 'always'
});
```

**New file pattern to copy** — same structure: import from `next-intl`, import `routing`, re-export named exports:
```typescript
// i18n/navigation.ts
import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

export const { Link, useRouter, usePathname, redirect, permanentRedirect, getPathname } =
  createNavigation(routing);
```

**Key constraint:** This is the ONLY change to the `i18n/` directory. Do NOT modify `routing.ts` or `request.ts`.

---

### `components/layout/LanguageToggle.tsx` (component, event-driven) — NEW FILE

**Analog 1:** `components/layout/MobileNav.tsx` — 'use client' component with event handlers and Sheet state

**'use client' + named export pattern** (`MobileNav.tsx` lines 1–12, 23):
```typescript
'use client';

import Link from 'next/link';
import { Menu } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetClose,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

export function MobileNav() {
```

**Analog 2:** `components/ui/sonner.tsx` — 'use client' component using a hook for reactive state (`useTheme`)

**Hook-driven render pattern** (`sonner.tsx` lines 1–7):
```typescript
"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()
```

**New file pattern to build** — combine 'use client' directive (from both analogs), named export (from MobileNav), hooks pattern (from sonner), conditional className (from MobileNav's SheetTrigger/SheetClose usage):
```typescript
// components/layout/LanguageToggle.tsx
'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';

export function LanguageToggle() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname(); // returns path WITHOUT locale prefix, e.g. '/about'

  const otherLocale = locale === 'hi' ? 'en' : 'hi';

  function handleSwitch() {
    router.push(pathname, { locale: otherLocale });
  }

  return (
    <div className="flex items-center gap-1 text-sm font-medium">
      <span
        className={locale === 'hi' ? 'text-white' : 'text-white/40 cursor-pointer hover:text-white/70'}
        onClick={locale !== 'hi' ? handleSwitch : undefined}
        onKeyDown={locale !== 'hi' ? (e) => e.key === 'Enter' && handleSwitch() : undefined}
        role={locale !== 'hi' ? 'button' : undefined}
        tabIndex={locale !== 'hi' ? 0 : undefined}
      >
        HI
      </span>
      <span className="text-white/40">|</span>
      <span
        className={locale === 'en' ? 'text-white' : 'text-white/40 cursor-pointer hover:text-white/70'}
        onClick={locale !== 'en' ? handleSwitch : undefined}
        onKeyDown={locale !== 'en' ? (e) => e.key === 'Enter' && handleSwitch() : undefined}
        role={locale !== 'en' ? 'button' : undefined}
        tabIndex={locale !== 'en' ? 0 : undefined}
      >
        EN
      </span>
    </div>
  );
}
```

---

### `components/layout/Header.tsx` (component, request-response) — MODIFY

**Self-analog** — current state read from `components/layout/Header.tsx` lines 1–75.

**Current import to replace** (line 1–3):
```typescript
// TODO Phase 3: Replace hrefs with locale-aware Link from next-intl/navigation

import Link from 'next/link';
```

**Replace with:**
```typescript
import { Link } from '@/i18n/navigation';
import { LanguageToggle } from './LanguageToggle';
```

**Current logo link to fix** (lines 25–30) — `href="/hi"` causes double-prefix bug:
```typescript
<Link
  href="/hi"
  className="text-lg font-semibold text-white hover:text-white/90 transition-colors flex-shrink-0"
>
  Atmaram Child Care
</Link>
```

**Replace `href="/hi"` with `href="/"` only** — locale-aware Link handles prefix:
```typescript
<Link
  href="/"
  className="text-lg font-semibold text-white hover:text-white/90 transition-colors flex-shrink-0"
>
  Atmaram Child Care
</Link>
```

**Current toggle placeholder to replace** (lines 48–55):
```typescript
{/* Language toggle placeholder — Phase 3 */}
<span
  className="text-sm text-white/60 cursor-not-allowed select-none"
  title="Language toggle coming soon"
>
  EN/HI
</span>
```

**Replace with:**
```typescript
<LanguageToggle />
```

**Nav links to keep as-is** (lines 8–15) — only the `Link` import changes, not the href values:
```typescript
const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'About Us', href: '/about' },
  { label: 'Departments', href: '/departments' },
  { label: 'Our Doctors', href: '/doctors' },
  { label: 'Services', href: '/services' },
  { label: 'Contact', href: '/contact' },
];
```

**Note on nav labels:** Header is a Server Component. Nav labels are currently hardcoded English strings. Phase 3 should also wire `getTranslations` so nav labels use `t('nav.home')` etc. Use the `setRequestLocale` pattern already in pages (async function + await params). However, Header currently receives no props/params. Add `locale` prop from parent layout, or convert to async and use `getLocale()` from `next-intl/server`.

---

### `components/layout/MobileNav.tsx` (component, event-driven) — MODIFY

**Self-analog** — current state read from `components/layout/MobileNav.tsx` lines 1–74.

**Current import to replace** (line 3):
```typescript
import Link from 'next/link';
```

**Replace with:**
```typescript
import { Link } from '@/i18n/navigation';
import { LanguageToggle } from './LanguageToggle';
```

**SheetClose + Link render prop pattern to preserve** (lines 42–52) — swap only the Link import, not the structure:
```typescript
<SheetClose
  render={
    <Link
      href={link.href}
      className="flex items-center w-full px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 rounded-md transition-colors min-h-[44px]"
    />
  }
>
  {link.label}
</SheetClose>
```

**Add LanguageToggle to mobile drawer** — add inside `<div className="p-4 border-t border-slate-100">` below the Book Appointment button, or as a separate row above it:
```typescript
<div className="p-4 border-t border-slate-100">
  <div className="flex justify-center mb-3">
    <LanguageToggle />
  </div>
  <SheetClose
    render={
      <Link
        href="/appointment"
        className={cn(
          buttonVariants({ variant: 'default' }),
          'w-full bg-green-600 hover:bg-green-700 text-white text-sm font-semibold min-h-[44px]'
        )}
      />
    }
  >
    Book Appointment
  </SheetClose>
</div>
```

**Note:** LanguageToggle is a 'use client' component. MobileNav is already 'use client' (line 1), so importing LanguageToggle works without any boundary change.

---

### `app/globals.css` (config) — MODIFY

**Self-analog** — current state read from `app/globals.css` line 9.

**Current `--font-sans` line** (`globals.css` line 9):
```css
--font-sans: var(--font-geist-sans);
```

**Replace with** (one-line change in `@theme inline` block):
```css
--font-sans: var(--font-geist-sans), 'Noto Sans Devanagari', 'Nirmala UI', system-ui;
```

**Context — surrounding lines** (lines 6–12) for safe edit targeting:
```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);           ← change this line only
  --font-mono: var(--font-geist-mono);
  --font-heading: var(--font-geist-sans);
```

---

### `messages/hi.json` (data/config) — MODIFY (full rewrite)

**Analog:** `messages/en.json` — structural mirror; same 10 namespaces, same ~177 keys, only values differ.

**Current hi.json state:** Only `site.title` and `site.tagline` are translated (lines 3–4). All other 175 values are English placeholders identical to `en.json`.

**Full translated content to write** — complete structural mirror of `en.json` with Hindi values per the Phase 3 glossary. Already-translated values (lines 3–4 of current hi.json) are correct and must be preserved:
```json
{
  "site": {
    "title": "आत्माराम चाइल्ड केयर एंड क्रिटिकल केयर",
    "tagline": "कानपुर में करुणामय स्वास्थ्य सेवा"
  }
}
```

**Translation glossary reference** (from RESEARCH.md — apply to all remaining keys):

| English key value | Hindi translation |
|-------------------|-------------------|
| Home | होम |
| About Us | हमारे बारे में |
| Departments | विभाग |
| Our Doctors | हमारे डॉक्टर |
| Services | सेवाएं |
| Contact | संपर्क |
| Book Appointment | अपॉइंटमेंट बुक करें |
| Request an Appointment | अपॉइंटमेंट अनुरोध करें |
| Quality Care for Every Child and Family | हर बच्चे और परिवार के लिए गुणवत्तापूर्ण देखभाल |
| Kanpur's trusted super-specialty hospital | कानपुर का विश्वसनीय सुपर-स्पेशलिटी अस्पताल |
| Learn about our services → | हमारी सेवाओं के बारे में जानें → |
| Beds | बेड |
| Doctors | डॉक्टर |
| Specialties | विशेषताएं |
| Emergency | आपातकाल |
| Our Departments | हमारे विभाग |
| Ready to visit us? | हमसे मिलने के लिए तैयार हैं? |
| Our team is here to help. Request an appointment today. | हमारी टीम आपकी मदद के लिए यहाँ है। आज ही अपॉइंटमेंट अनुरोध करें। |
| About Us (pageTitle) | हमारे बारे में |
| Caring for Kanpur Since Day One | शुरू से कानपुर की सेवा में |
| Our Mission | हमारा मिशन |
| Patient-First Care | रोगी-प्रथम देखभाल |
| Clinical Safety | नैदानिक सुरक्षा |
| Community Trust | सामुदायिक विश्वास |
| Our Departments (pageTitle) | हमारे विभाग |
| Expert care across 8 medical specialties | 8 चिकित्सा विशेषताओं में विशेषज्ञ देखभाल |
| Paediatrics & Neonatology | बाल रोग एवं नवजात विज्ञान |
| Paediatric Surgery | बाल शल्य चिकित्सा |
| Critical Care & ICU | गहन चिकित्सा एवं ICU |
| General Surgery | सामान्य शल्य चिकित्सा |
| Orthopaedics | हड्डी रोग |
| Obstetrics & Gynaecology | प्रसूति एवं स्त्री रोग |
| General Medicine | सामान्य चिकित्सा |
| Emergency & Trauma | आपातकाल एवं आघात |
| Our Doctors (pageTitle) | हमारे डॉक्टर |
| Services & Facilities | सेवाएं एवं सुविधाएं |
| Comprehensive care for every patient | हर रोगी के लिए व्यापक देखभाल |
| Our Facilities | हमारी सुविधाएं |
| Contact Us | संपर्क करें |
| Address | पता |
| Phone | फ़ोन |
| OPD Timings | OPD समय |
| 24x7 Emergency | 24x7 आपातकाल |
| Map loading... | मानचित्र लोड हो रहा है... |
| Request an Appointment (pageTitle) | अपॉइंटमेंट अनुरोध करें |
| Patient Name | रोगी का नाम |
| Phone Number | फ़ोन नंबर |
| Preferred Doctor | पसंदीदा डॉक्टर |
| Select a doctor | डॉक्टर चुनें |
| No preference | कोई प्राथमिकता नहीं |
| Preferred Date | पसंदीदा तिथि |
| Reason / Chief Complaint | कारण / मुख्य शिकायत |
| Submit Request | अनुरोध सबमिट करें |
| Request Received | अनुरोध प्राप्त हुआ |
| This field is required. | यह फ़ील्ड आवश्यक है। |

**Keys that STAY in English** (proper nouns per D-01): `Ayushman Bharat PM-JAY`, `Atmaram Child Care and Critical Care`, `ICU`, `OPD`, `Kanpur`, `Uttar Pradesh`, `Naubasta`, `Kidwai Nagar`, all `Dr.` names, `PM-JAY`, `Pradhan Mantri Jan Arogya Yojana`. Numerals (90, 25+, 8, 24x7) stay as-is.

**Structure rule:** `hi.json` must be a byte-for-byte structural mirror of `en.json` — same namespaces, same keys, same nesting depth. Only leaf string values differ.

---

## Shared Patterns

### 'use client' Client Component Declaration
**Source:** `components/layout/MobileNav.tsx` line 1, `components/ui/sonner.tsx` line 1
**Apply to:** `components/layout/LanguageToggle.tsx`
```typescript
'use client';
```
Must be the first line of any component using `useLocale()`, `useRouter()`, `usePathname()`.

### Named Export (not default export) for Layout Components
**Source:** `components/layout/MobileNav.tsx` line 23
```typescript
export function MobileNav() {
```
**Apply to:** `components/layout/LanguageToggle.tsx` — use `export function LanguageToggle()`, not `export default function`.

### Path Alias `@/` Import Convention
**Source:** `components/layout/MobileNav.tsx` line 5–11, `components/layout/Header.tsx` line 4
```typescript
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
```
**Apply to:** `LanguageToggle.tsx` import of navigation module:
```typescript
import { useRouter, usePathname } from '@/i18n/navigation';
```

### Tailwind Opacity Modifier for Muted Text on Dark Background
**Source:** `components/layout/Header.tsx` lines 39, 53
```typescript
className="text-sm font-semibold text-white/80 hover:text-white transition-colors"
className="text-sm text-white/60 cursor-not-allowed select-none"
```
**Apply to:** `LanguageToggle.tsx` — active locale = `text-white`, inactive locale = `text-white/40 hover:text-white/70`.

### SheetClose render-prop Pattern (do not break)
**Source:** `components/layout/MobileNav.tsx` lines 42–52
```typescript
<SheetClose
  render={
    <Link
      href={link.href}
      className="..."
    />
  }
>
  {link.label}
</SheetClose>
```
**Apply to:** MobileNav modification — keep this pattern exactly. Swap only the `Link` import, not the render-prop structure.

---

## No Analog Found

All files in Phase 3 have close analogs. No gaps.

---

## Metadata

**Analog search scope:** `i18n/`, `components/layout/`, `components/ui/`, `app/`, `messages/`, `proxy.ts`
**Files scanned:** 11 (routing.ts, request.ts, proxy.ts, Header.tsx, MobileNav.tsx, globals.css, en.json, hi.json, sonner.tsx, button.tsx, sheet.tsx)
**Pattern extraction date:** 2026-06-11
