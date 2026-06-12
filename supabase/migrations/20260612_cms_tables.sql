-- Phase 5 CMS Tables Migration
-- Creates: departments, doctors, facilities, hospital_info
-- Includes: RLS SELECT policies for anon + authenticated, seed row for hospital_info

-- ============================================================
-- 1. departments
-- ============================================================
CREATE TABLE departments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text NOT NULL,
  image_url   text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. doctors
-- ============================================================
CREATE TABLE doctors (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name         text NOT NULL,
  specialization    text NOT NULL,
  qualification     text NOT NULL,
  photo_url         text,
  bio               text,
  availability_days text[],
  is_active         boolean NOT NULL DEFAULT true,
  staff_user_id     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. facility_category enum + facilities table
-- ============================================================
CREATE TYPE facility_category AS ENUM ('OPD', 'ICU', 'Diagnostics', 'Surgery', 'Other');

CREATE TABLE facilities (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text NOT NULL,
  category    facility_category NOT NULL DEFAULT 'Other',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 4. hospital_info (singleton table)
-- ============================================================
CREATE TABLE hospital_info (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  about_text       text NOT NULL DEFAULT '',
  opd_timings      text NOT NULL DEFAULT '',
  emergency_number text NOT NULL DEFAULT '',
  address_line1    text NOT NULL DEFAULT '',
  address_line2    text,
  city             text NOT NULL DEFAULT 'Kanpur',
  maps_embed_url   text,
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Seed exactly one row so UPDATE-based Server Actions always find a row.
INSERT INTO hospital_info DEFAULT VALUES;

-- ============================================================
-- 5. Enable RLS on all four tables
-- ============================================================
ALTER TABLE departments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors      ENABLE ROW LEVEL SECURITY;
ALTER TABLE facilities   ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospital_info ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 6. Public read policies (anon + authenticated)
-- ============================================================
CREATE POLICY "departments: public read"
  ON departments
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "doctors: public read"
  ON doctors
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "facilities: public read"
  ON facilities
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "hospital_info: public read"
  ON hospital_info
  FOR SELECT
  TO anon, authenticated
  USING (true);
