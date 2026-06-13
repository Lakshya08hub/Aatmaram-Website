# Phase 8: Patient Records — Discussion Log

**Date:** 2026-06-13
**Participants:** Lakshya + Claude

---

## Areas Discussed

### Visit Model

**Q: One record per patient or one per visit?**
- Options: One per visit / One per patient (lifetime)
- Selected: One per visit
- Notes: Simpler schema, no sub-table needed. Returning patients get a fresh record each visit.

**Q: Returning patient — lookup or always manual?**
- Options: Always fill manually / Search by name to pre-fill
- Selected: Always fill manually (v1)
- Notes: Pre-fill deferred to v2.

---

### Clinical Notes Format

**Q: What does a doctor's note look like?**
- Options: Single free-text textarea / Structured fields (diagnosis, medications, etc.)
- Selected: Single free-text textarea
- Notes: Flexible, fast to build. Doctor writes whatever is relevant.

**Q: Editable or append-only?**
- Options: Single editable note per visit / Append-only log
- Selected: Single editable note per visit
- Notes: Simpler; last-saved value is canonical. No version history in v1.

---

### Patient List UX

**Q: How should receptionist/admin find records?**
- Options: Search by name or phone / Plain list sorted by date
- Selected: Search by name or phone
- Notes: Essential for a 90-bed hospital with growing record volume.

**Q: Tabs by date range or single list?**
- Options: All records in one list / Tabs by date range
- Selected: All records in one list
- Notes: Search handles filtering. Tabs deferred.

---

### Record Editing

**Q: Can receptionist edit after creation?**
- Options: Yes, edit all fields except clinical notes / No, create only
- Selected: Yes — edit all fields except clinical notes
- Notes: Clinical notes are doctor-only. Receptionist can fix typos, reassign doctor.

**Q: Can assigned doctor be changed?**
- Options: Yes, receptionist can reassign / No, locked at creation
- Selected: Yes — receptionist can reassign
- Notes: Old doctor loses visibility; new doctor gains it.

---

## Pre-discussion Notes

User clarified before area selection: "all receptionist does will be given as a follow up to super admin and admin both and to that particular doctors as well (not all doctors)" — confirms PAT-02/PAT-04/PAT-05 role visibility: admin/super_admin see all; doctor sees only their assigned patients.

## Deferred Ideas

- Lifetime patient profile (one patient, multiple visits linked)
- Returning patient lookup / pre-fill
- Structured clinical notes (diagnosis, medications fields)
- Today's visits / date-range tabs
