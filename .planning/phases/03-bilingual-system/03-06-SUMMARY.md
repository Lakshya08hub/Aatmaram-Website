---
phase: 03-bilingual-system
plan: 06
subsystem: departments + doctors pages, seeded constants, card components
status: complete
completed_date: 2026-06-11
duration_minutes: 45
tasks_completed: 2
files_modified: 8
commits: 3
---

# Phase 03 Plan 06: Departments & Doctors Pages I18n Migration Summary

Migrated the Departments and Doctors pages and their card components to render fully translated content. Department and doctor names, specialties, and page headings now resolve from i18n keys instead of hardcoded English literals.

## Completed Tasks

| Task | Name | Status | Files | Commit |
|------|------|--------|-------|--------|
| 1 | Add translationKey to seeded constants and refactor cards to accept resolved props | Complete | lib/data/departments.ts, lib/data/doctors.ts, components/public/DepartmentCard.tsx, components/public/DoctorCard.tsx | 060aa1b |
| 2 | Migrate Departments and Doctors pages to pass translated strings into cards | Complete | app/[locale]/(public)/departments/page.tsx, app/[locale]/(public)/doctors/page.tsx, app/[locale]/(public)/page.tsx | edb57e0, 966a166 |

## Changes Made

### Task 1: Seeded Constants & Card Components

#### lib/data/departments.ts
- Added `translationKey: string` field to Department interface
- Set translationKey for all 8 departments:
  - `paediatrics` → 'paediatrics'
  - `paediatric-surgery` → 'paediatricSurgery'
  - `critical-care` → 'criticalCare'
  - `general-surgery` → 'generalSurgery'
  - `orthopaedics` → 'orthopaedics'
  - `obstetrics` → 'obstetrics'
  - `general-medicine` → 'generalMedicine'
  - `emergency` → 'emergency'
- Kept English name/description as fallback (not deleted per plan)

#### lib/data/doctors.ts
- Added `specialtyKey: string` field to Doctor interface
- Set specialtyKey for all 6 doctors mapping to department translation keys
- Retained specialty string as English fallback

#### components/public/DepartmentCard.tsx
- Changed props from `{ department: Department }` to `{ name: string; description: string; icon: LucideIcon }`
- Card now receives already-resolved translation strings instead of reading from department object
- Kept all styling and layout unchanged

#### components/public/DoctorCard.tsx
- Changed props from `{ doctor: Doctor }` to `{ name: string; initials: string; specialty: string; bookLabel: string }`
- Updated import: `Link` now from '@/i18n/navigation' (locale-aware) instead of 'next/link'
- Removed hardcoded "Book Appointment" button label; now uses `bookLabel` prop
- Kept doctor name as proper English noun (per D-01 constraint)

### Task 2: Page-Level Translation Resolution

#### app/[locale]/(public)/departments/page.tsx
- Called `getTranslations('departments')` as `t` and `getTranslations('nav')` as `tNav`
- Updated breadcrumb: "Home › Departments" → `{tNav('home')} › {t('pageTitle')}`
- Updated page heading: "Our Departments" → `{t('pageTitle')}`
- Updated SectionHeading: title and subtitle now resolve from `t('pageTitle')` and `t('pageSubtitle')`
- Updated DepartmentCard props to pass resolved strings:
  ```tsx
  <DepartmentCard
    key={dept.id}
    icon={dept.icon}
    name={t(`${dept.translationKey}.name`)}
    description={t(`${dept.translationKey}.description`)}
  />
  ```

#### app/[locale]/(public)/doctors/page.tsx
- Changed import: `Link` now from '@/i18n/navigation'
- Called `getTranslations('doctors')`, `getTranslations('departments')`, and `getTranslations('nav')`
- Updated breadcrumb: "Home › Our Doctors" → `{tNav('home')} › {t('pageTitle')}`
- Updated page heading and SectionHeading to use translations
- Updated DoctorCard props:
  ```tsx
  <DoctorCard
    key={doc.id}
    name={doc.name}
    initials={doc.initials}
    specialty={tDept(`${doc.specialtyKey}.name`)}
    bookLabel={t('bookAppointment')}
  />
  ```
- Updated CTA link: "Have questions? Contact us →" → `{t('cta')}`

#### app/[locale]/(public)/page.tsx
- Changed import: `Link` now from '@/i18n/navigation'
- Updated DepartmentCard rendering to pass resolved props from `tDept`
- Updated DoctorCard rendering to pass resolved props and specialty from `tDept`

## Verification Results

### Build
- `npm run build` exits 0 with no missing-key warnings
- Static page generation successful for all 19 routes

### Coverage Checklist
- [x] departments.ts carries translationKey for all 8 departments
- [x] doctors.ts carries specialtyKey for all 6 doctors
- [x] DepartmentCard receives and renders resolved name/description/icon props
- [x] DoctorCard receives and renders resolved specialty and bookLabel props
- [x] DoctorCard imports Link from '@/i18n/navigation'
- [x] departments/page.tsx fully migrated to i18n
- [x] doctors/page.tsx fully migrated to i18n
- [x] home/page.tsx updated to pass resolved props to cards
- [x] All page headings, subtitles, breadcrumbs resolve from translations
- [x] Doctor proper names preserved in English
- [x] No hardcoded English text remains in rendered output (except numerals and separators)

## Deviations from Plan

None — plan executed exactly as written.

## Key Design Decisions

1. **Props-based translation resolution:** Cards receive already-resolved translation strings from pages rather than resolving themselves. This keeps cards as pure presentational components and avoids making them client components.

2. **Stable translation keys in constants:** The seeded constants now carry explicit `translationKey` and `specialtyKey` fields instead of deriving them from id values. This is more explicit and maintainable.

3. **Locale-aware Link in cards:** Updated both card components to use `Link` from '@/i18n/navigation' so the appointment link respects the current locale (e.g., `/hi/appointment` when on Hindi, `/en/appointment` when on English).

## Testing Notes

The implementation was verified by:
1. Building the production bundle with `npm run build` (success)
2. Scanning all modified files for expected translation calls and prop signatures
3. Verifying no hardcoded English literals remain in component output
4. Confirming all 8 department keys and 6 doctor keys are present and correctly mapped

## Next Steps

- Plan 03-07 (Services page migration) should follow the same pattern
- Doctor profile pages (future) will inherit the specialtyKey pattern for consistent i18n

## Tech Stack Impact

- No new dependencies added
- Follows existing next-intl patterns from Plan 03-01 and 03-02
- Consistent with Server Component render flow and getTranslations usage
