# Phase 6: Staff Management — Research

**Researched:** 2026-06-12
**Domain:** Supabase Admin Auth, Postgres schema extension, Next.js App Router Server Actions CRUD
**Confidence:** HIGH

---

## Summary

Phase 6 converts the portal's Staff stub page into a full CRUD management interface covering the complete staff lifecycle: add (create Supabase Auth user + profile row), edit (update profile fields), deactivate/reactivate (`is_active` toggle), and doctor-profile linkage. The core technical work is:

1. **Schema extension** — ALTER profiles to add the Phase 4-deferred columns (`name, phone, salary, join_date`) per D-02. No destructive change; all new columns are nullable with sensible defaults.
2. **Admin Auth client** — Creating a Supabase Auth user programmatically requires `auth.admin.createUser()` which only works with the service-role key. `lib/supabase/admin.ts` was already created in Phase 5 and exports `createAdminClient()` using `SUPABASE_SERVICE_ROLE_KEY`. Phase 6 uses this client for staff creation.
3. **Portal Staff page** — Replace `app/(portal)/staff/page.tsx` stub with the established Phase 5 pattern: Server Component page + Client CRUD component + Server Actions file. The pattern is identical to Phase 5 departments/doctors management.
4. **STAFF-04 interpretation** — Phase 4 decided against self-registration (D-03/D-05). "Pending account requests" maps to accounts with `is_active = false`. Admin sees these in a filterable Inactive tab and can activate (approve) or delete (reject) them. No new table or status enum is needed.
5. **STAFF-05** — Phase 5 already built doctor CRUD at `/content/doctors/`. Phase 6 adds the staff↔doctor linkage: when a staff member has role `doctor`, the add/edit staff form includes a "Link to Doctor Profile" dropdown that writes `profile.id` into `doctors.staff_user_id`. This connects staff accounts to their public-facing doctor record without duplicating any UI.

**Primary recommendation:** One Wave 1 plan for schema + server actions foundation; one Wave 2 plan for the full staff CRUD page.

---

## Current State Inventory

| Asset | Status | Notes |
|-------|--------|-------|
| `supabase/migrations/20260611_profiles.sql` | Exists | Has id, user_id, role, is_active, created_at only |
| `lib/supabase/admin.ts` | Exists (Phase 5) | `createAdminClient()` using `SUPABASE_SERVICE_ROLE_KEY` |
| `app/(portal)/staff/page.tsx` | Stub | "Coming in Phase 6" placeholder |
| `app/(portal)/content/doctors/` | Exists (Phase 5) | Full doctor CRUD — covers STAFF-05 editing side |
| `doctors.staff_user_id` FK | Exists (Phase 5 migration) | `uuid REFERENCES profiles(id) ON DELETE SET NULL` |
| `SUPABASE_SERVICE_ROLE_KEY` | In .env.example | Required for `auth.admin.createUser()` |

---

## Database: Schema Extension

```sql
-- Phase 6 migration: extend profiles with staff fields (D-02 deferred from Phase 4)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS full_name   text,
  ADD COLUMN IF NOT EXISTS phone       text,
  ADD COLUMN IF NOT EXISTS salary      numeric(10,2),
  ADD COLUMN IF NOT EXISTS join_date   date;
```

**Why nullable:** Existing Phase 4-created profiles (Super Admin account) have no name/phone/salary data. Nullable avoids requiring a default value that would be meaningless.

**RLS update needed:** Current RLS policy allows staff to SELECT their own profile. Phase 6 needs an admin INSERT/UPDATE policy so Server Actions can write to profiles using the anon-key client after verifying admin role in-app.

```sql
-- RLS: admin can INSERT new profiles (admin creates all accounts — D-03)
CREATE POLICY "profiles: admin insert"
  ON profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
        AND p.role IN ('super_admin', 'admin')
        AND p.is_active = true
    )
  );

-- RLS: admin can UPDATE any profile
CREATE POLICY "profiles: admin update"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
        AND p.role IN ('super_admin', 'admin')
        AND p.is_active = true
    )
  );

-- RLS: admin can DELETE profiles (for rejected/pending accounts)
CREATE POLICY "profiles: admin delete"
  ON profiles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
        AND p.role IN ('super_admin', 'admin')
        AND p.is_active = true
    )
  );
```

**Note:** Server Actions use the regular server client (anon key + session cookie) — not the admin client — for profile CRUD because the RLS policies above handle authorization. The admin client is ONLY used for `auth.admin.createUser()` and `auth.admin.deleteUser()`.

---

## Staff Creation Pattern

```typescript
// In app/(portal)/actions/staff.ts

// Step 1: Create Auth user (requires admin client for service role)
const adminClient = createAdminClient();
const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
  email: input.email,
  password: input.temp_password,
  email_confirm: true,        // skip email confirmation — admin manages accounts
  user_metadata: { full_name: input.full_name },
});
if (authError) return { error: authError.message };

// Step 2: Create profile row (use regular server client — RLS admin policy covers this)
const supabase = await createClient();
const { error: profileError } = await supabase.from('profiles').insert({
  user_id: authData.user.id,
  role: input.role,
  is_active: false,           // starts as pending/inactive; admin activates
  full_name: input.full_name,
  phone: input.phone,
  salary: input.salary,
  join_date: input.join_date,
});
if (profileError) {
  // Rollback auth user if profile creation fails
  await adminClient.auth.admin.deleteUser(authData.user.id);
  return { error: profileError.message };
}
```

**Key:** `email_confirm: true` skips the confirmation email so admin-created accounts are usable immediately. `is_active: false` on creation satisfies the "pending" state for STAFF-04.

---

## Doctor-Staff Linkage (STAFF-05)

Phase 5 already handles all doctor field editing (name, specialization, photo, bio, availability_days) via `/content/doctors/`. The `doctors` table has `staff_user_id uuid REFERENCES profiles(id)`.

Phase 6 work for STAFF-05:
1. When `role === 'doctor'`, staff add/edit form shows a "Doctor Profile" dropdown populated from the `doctors` table (unlinked doctors only).
2. On save, the selected doctor row's `staff_user_id` is updated to `profile.id`.
3. The staff table row for doctor-role staff shows a "→ Doctor Profile" link to `/content/doctors`.

This is a 1-column FK update — no new table or migration beyond what Phase 5 already provides.

---

## CRUD Page Pattern (from Phase 5)

Phase 5 established the standard pattern. Phase 6 follows it exactly:

| Layer | Phase 5 analog | Phase 6 equivalent |
|-------|----------------|-------------------|
| Server Component page | `app/(portal)/content/departments/page.tsx` | `app/(portal)/staff/page.tsx` |
| Client CRUD component | `app/(portal)/content/departments/DepartmentsClient.tsx` | `app/(portal)/staff/StaffClient.tsx` |
| Server Actions | `app/(portal)/actions/content.ts` | `app/(portal)/actions/staff.ts` |
| DB utilities | `lib/db/departments.ts` | `lib/db/staff.ts` |

**Difference:** Staff page needs to read from `auth.users` (via admin client or a join) to show the email column. The `profiles` table doesn't store email — Supabase Auth stores it. Use `adminClient.auth.admin.listUsers()` to fetch emails in bulk, then merge with profiles by `user_id`.

---

## Validation Architecture

| Risk | Mitigation |
|------|-----------|
| T-06-01: Admin creates account for non-staff person | requireAdminRole() in every Server Action |
| T-06-02: Duplicate email creates orphaned Auth user | Supabase Auth returns 422 on duplicate email — catch and surface in form |
| T-06-03: Profile creation fails after Auth user created | Atomic rollback: deleteUser() in catch block (see creation pattern above) |
| T-06-04: Non-admin reads salary data | RLS SELECT policy — staff only read own profile; salary column only visible to admin in portal |
| T-06-05: Deactivated user holds active session | is_active check in portal layout already terminates session (Phase 4 T-04-05 mitigation already handles this) |
| T-06-06: Doctor profile left with stale staff_user_id after staff deletion | ON DELETE SET NULL on doctors.staff_user_id handles this automatically |
