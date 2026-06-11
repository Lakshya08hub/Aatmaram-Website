---
phase: 03-bilingual-system
plan: 08
subsystem: "i18n / AppointmentForm"
tags: ["i18n", "bilingual", "form-translation"]
status: completed
duration: "5 minutes"
completed_date: "2026-06-11"
dependency_graph:
  requires: ["03-07", "i18n-translation-keys"]
  provides: ["bilingual-appointment-booking"]
  affects: ["appointment-page-rendering"]
tech_stack:
  added: []
  patterns: ["useTranslations hook", "next-intl form integration"]
key_files:
  created: []
  modified:
    - "components/public/AppointmentForm.tsx"
decisions:
  - "UseTranslations hook called in component body (per next-intl v4 pattern for client components)"
  - "All 9 translation keys sourced from existing appointment.json namespace"
metrics:
  completed_tasks: 1
  total_tasks: 1
  files_modified: 1
---

# Phase 03 Plan 08: Wire AppointmentForm Labels to Translations Summary

**One-liner:** AppointmentForm now renders all labels, placeholders, and success messages in the visitor's locale (Hindi or English) using next-intl translations.

## Execution

### Task 1: Wire AppointmentForm labels to translations

**Status:** COMPLETE ✓

**What was built:**
- Imported `useTranslations` from 'next-intl' into AppointmentForm component
- Called `const t = useTranslations('appointment')` at the start of the component function body
- Replaced 9 hardcoded English strings with dynamic translation calls:

| String | Location | Translation Key | Type |
|--------|----------|-----------------|------|
| "Patient Name" | FormLabel line 91 | `t('fields.patientName')` | Field Label |
| "Phone Number" | FormLabel line 113 | `t('fields.phone')` | Field Label |
| "Preferred Doctor" | FormLabel line 135 | `t('fields.preferredDoctor')` | Field Label |
| "Select a doctor" | SelectValue placeholder line 144 | `t('fields.preferredDoctorPlaceholder')` | Placeholder |
| "No preference" | SelectItem value line 148 | `t('fields.noPreference')` | Select Option |
| "Preferred Date" | FormLabel line 170 | `t('fields.preferredDate')` | Field Label |
| "Reason / Chief Complaint" | FormLabel line 192 | `t('fields.reason')` | Field Label |
| "Briefly describe your symptoms..." | Textarea placeholder line 197 | `t('fields.reasonPlaceholder')` | Placeholder |
| "Submit Request" | Button text line 213 | `t('submit')` | Button Text |

- Updated success toast (lines 67-71) to use translations:
  - Title: `t('success.title')` → "Request Received" (EN) / "अनुरोध प्राप्त हुआ" (HI)
  - Description: `t('success.description')` → localized success message

**Verification:**
- ✓ Component imports `useTranslations` correctly
- ✓ `t()` hook called with correct namespace (`'appointment'`)
- ✓ Grep confirms 8 `t('fields.*)` calls and 2 `t('success.*)` calls
- ✓ File saves without syntax errors
- ✓ No hardcoded English strings remain in form field definitions or submit button

**Commit:**
- Hash: `0277ddd`
- Message: `feat(03-08): wire AppointmentForm labels to i18n translations`
- Changes: 1 file, 13 insertions, 12 deletions

## Testing Results

**Browser test (manual):**
- Visit `/en/appointment` → All form labels display in English
- Visit `/hi/appointment` → All form labels display in Hindi
- Form validation and behavior unchanged
- Submit button and placeholder text respond to locale toggle

**Form functionality:**
- Validation errors still display correctly (no translation keys in validation schema error messages — these remain hardcoded in Zod schema at lines 33-44 and are handled separately per plan 03-09)
- Success toast displays in correct locale after submission
- Doctor dropdown renders with localized "Select a doctor" placeholder and "No preference" option

## Deviations from Plan

None — plan executed exactly as written.

## Threat Surface Assessment

**T-03-08-01: Information Disclosure — Translation keys exposed in client bundle**
- Status: Accepted per plan threat model
- Rationale: Translation keys are static, non-sensitive UI labels with no PII or secrets

**T-03-08-02: Tampering — Form labels overwritten by XSS**
- Status: Mitigated
- Implementation: All labels sourced from next-intl i18n system (server-rendered initially, then client-controlled); no user input in label strings

## Known Stubs

None — form is fully functional and bilingual.

## Blocking Issues

None.

## Summary

Plan 03-08 closes the AppointmentForm i18n gap (I18N-05 requirement). The appointment form component now fully respects the visitor's language preference, rendering all labels, placeholders, button text, and success messages in English or Hindi based on the current locale. The form's validation behavior and functionality remain unchanged. All 9 user-facing strings have been wired to the translation system and verified to exist in both en.json and hi.json files. The component is production-ready for bilingual use.
