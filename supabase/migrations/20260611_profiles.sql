-- supabase/migrations/20260611_profiles.sql
-- Phase 4: minimal auth-only columns. Phase 6 adds name/phone/salary/join_date.

CREATE TYPE staff_role AS ENUM ('super_admin', 'admin', 'doctor', 'receptionist');

CREATE TABLE profiles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        staff_role NOT NULL,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- RLS: staff can only read their own profile
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles: own read"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Service role (used in Phase 6 admin actions) bypasses RLS automatically.
-- No INSERT policy needed in Phase 4 — accounts created via Supabase dashboard.

-- WR-02: allow super_admin and admin to update any profile row (e.g. deactivate staff).
-- Without this, a portal Server Action using the regular client gets a silent RLS denial
-- (zero rows updated, no error) when trying to set is_active = false.
CREATE POLICY "profiles: admin update"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
        AND p.role IN ('super_admin', 'admin')
    )
  );
