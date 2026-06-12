-- Phase 6: Staff Management — extend profiles schema + admin RLS

-- ============================================================
-- 1. Extend profiles with staff fields (deferred from Phase 4)
-- ============================================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS phone     text,
  ADD COLUMN IF NOT EXISTS salary    numeric(10,2),
  ADD COLUMN IF NOT EXISTS join_date date;

-- ============================================================
-- 2. Admin write policies on profiles
-- ============================================================

-- Helper: returns true when the requesting user is an active admin/super_admin
-- Used in WITH CHECK (INSERT) and USING (UPDATE/DELETE) clauses.

CREATE POLICY "profiles: admin insert"
  ON profiles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.user_id = auth.uid()
        AND p.role IN ('super_admin', 'admin')
        AND p.is_active = true
    )
  );

CREATE POLICY "profiles: admin update"
  ON profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.user_id = auth.uid()
        AND p.role IN ('super_admin', 'admin')
        AND p.is_active = true
    )
  );

CREATE POLICY "profiles: admin delete"
  ON profiles
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.user_id = auth.uid()
        AND p.role IN ('super_admin', 'admin')
        AND p.is_active = true
    )
  );
