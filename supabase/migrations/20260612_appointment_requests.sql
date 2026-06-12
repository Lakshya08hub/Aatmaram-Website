-- Phase 7: Appointment Request System
-- Creates: appointment_status enum, appointment_requests table
-- Includes: indexes for portal tab queries; RLS disabled (service role access only per D-02)

-- ============================================================
-- 1. appointment_status enum
-- ============================================================
CREATE TYPE appointment_status AS ENUM (
  'pending',
  'contacted',
  'confirmed',
  'cancelled'
);

-- ============================================================
-- 2. appointment_requests table
-- ============================================================
CREATE TABLE appointment_requests (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_name     TEXT        NOT NULL,
  phone            TEXT        NOT NULL,
  preferred_doctor TEXT        NOT NULL,   -- stored as free-text name; "No Preference" allowed (D-06)
  preferred_date   DATE        NOT NULL,
  preferred_time   TEXT        NOT NULL,   -- 'morning' | 'afternoon' | 'evening' (validated by Server Action)
  reason           TEXT        NOT NULL,
  status           appointment_status NOT NULL DEFAULT 'pending',
  notes            TEXT,                  -- nullable; receptionist callback notes (D-08)
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. Indexes (primary access patterns: status tab filter, newest-first sort)
-- ============================================================
CREATE INDEX idx_appointment_requests_status     ON appointment_requests(status);
CREATE INDEX idx_appointment_requests_created_at ON appointment_requests(created_at DESC);

-- ============================================================
-- 4. RLS — disabled; all access via service role (D-02 / D-11)
-- ============================================================
ALTER TABLE appointment_requests DISABLE ROW LEVEL SECURITY;
