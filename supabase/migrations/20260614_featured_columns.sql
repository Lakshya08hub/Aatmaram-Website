-- Phase 12 Featured Columns Migration
-- Adds is_featured and featured_order to departments, doctors, and facilities.
-- All statements are idempotent and safe to re-run.

-- ============================================================
-- departments
-- ============================================================
ALTER TABLE departments ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS featured_order INTEGER NOT NULL DEFAULT 0;

-- ============================================================
-- doctors
-- ============================================================
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS featured_order INTEGER NOT NULL DEFAULT 0;

-- ============================================================
-- facilities
-- ============================================================
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS featured_order INTEGER NOT NULL DEFAULT 0;
