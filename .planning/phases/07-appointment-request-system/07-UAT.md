---
status: complete
phase: 07-appointment-request-system
source: 07-01-PLAN.md, 07-02-PLAN.md
started: 2026-06-12T00:00:00Z
updated: 2026-06-13T00:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Public form renders with all fields
expected: Visit /en/appointment (or /hi/appointment). The form card renders with: Patient Name, Phone Number, Preferred Doctor (Select), Preferred Date (date picker), Preferred Time (Select with 3 OPD slots — Morning/Afternoon/Evening OPD), Reason/Chief Complaint (textarea), an hCaptcha widget, and a "Submit Request" button that is initially disabled (greyed out).
result: pass

### 2. Doctor dropdown shows live DB records
expected: Open the Preferred Doctor Select. It should list "No preference" plus any doctors added via the portal (from the live database). It should NOT show placeholder names like "dr-sharma" or any static mock data.
result: issue
reported: "Missing sitekey - hCaptcha has failed to initialize. Also: Base UI uncontrolled/controlled Select warning on preferredTime."
severity: major

### 3. Preferred Time slot options
expected: Open the Preferred Time Select. It shows exactly three options: "Morning OPD (9am–12pm)", "Afternoon OPD (12–3pm)", "Evening OPD (3–6pm)". No other options present.
result: pass

### 4. Submit blocked without hCaptcha
expected: Fill in all required fields correctly. Without completing the hCaptcha, the Submit button stays disabled (cannot be clicked). Attempting to submit programmatically or via keyboard shows an error toast "Please complete the captcha before submitting." and no DB insert happens.
result: pass

### 5. Successful form submission inserts DB record
expected: Fill all fields, complete the hCaptcha (click the checkbox — dev test key auto-passes), click "Submit Request". A success toast appears: "Request Received — Your appointment request has been received. Our team will call you shortly." The form resets to empty. In Supabase Dashboard → Table Editor → appointment_requests, a new row appears with status = pending, the correct patient_name, phone, preferred_doctor (as text name, not UUID), preferred_date, preferred_time (morning/afternoon/evening), and reason.
result: issue
reported: "toast description text not clearly visible (low contrast)"
severity: cosmetic

### 6. Portal appointments page renders 4 tabs
expected: Log into the portal as admin or receptionist. Navigate to /appointments. The page shows "Appointment Requests" heading and 4 tabs: Pending, Contacted, Confirmed, Cancelled. The Pending tab is active by default. The submitted test record from Test 5 appears in the Pending tab table with columns: Patient Name, Phone (as tel: link), Preferred Doctor, Date & Time, Reason, Status badge (amber "Pending"), and an Actions column.
result: pass

### 7. Status update with notes
expected: In the Pending tab, find the test record. In its Actions column, change the Select from "Pending" to "Contacted". A notes textarea and "Save Status" button appear below the Select. Type a short note (e.g. "Called patient, confirmed appointment"). Click "Save Status". A success toast "Status updated" appears. The row disappears from the Pending tab and reappears in the Contacted tab with the updated badge (blue "Contacted"). In Supabase, the row's status = contacted and notes = the text you entered.
result: pass

### 8. Empty tab state
expected: Click on the Confirmed tab. Since no appointments are confirmed, it shows the empty state: "No confirmed appointments" with a message "No appointments in this status."
result: pass

### 9. Any-to-any status transitions
expected: In the Contacted tab, change the status of the record back to "Pending" and save. The record moves back to the Pending tab. Then change it to "Cancelled". The record appears in the Cancelled tab with a red "Cancelled" badge. No hard delete occurs — the row is still visible in the Cancelled tab.
result: pass

## Summary

total: 9
passed: 8
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "hCaptcha widget initializes and form renders without console errors"
  status: failed
  reason: "User reported: Missing sitekey error + hCaptcha failed to initialize. Also uncontrolled→controlled Select warning on preferredTime."
  severity: major
  test: 2
  root_cause: "Two causes: (1) NEXT_PUBLIC_HCAPTCHA_SITE_KEY missing from .env.local — user setup required. (2) preferredTime defaultValues used undefined causing Radix Select controlled/uncontrolled switch — fixed in AppointmentForm.tsx by using '' as unknown as 'morning' cast."
  artifacts:
    - path: "components/public/AppointmentForm.tsx"
      issue: "preferredTime defaultValues fixed (code fix applied)"
  missing:
    - "User must add NEXT_PUBLIC_HCAPTCHA_SITE_KEY and HCAPTCHA_SECRET to .env.local"
