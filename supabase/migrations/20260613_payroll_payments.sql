-- Phase 9: payroll_payments migration
-- One row per staff member per calendar month they were marked paid.

CREATE TABLE IF NOT EXISTS payroll_payments (
  id             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id     uuid          NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  payment_month  date          NOT NULL,
  amount_paid    numeric(10,2) NOT NULL DEFAULT 0,
  paid_at        timestamptz   NOT NULL DEFAULT now(),
  paid_by        uuid          REFERENCES profiles(id) ON DELETE SET NULL,
  CONSTRAINT payroll_payments_unique_month UNIQUE (profile_id, payment_month)
);

ALTER TABLE payroll_payments ENABLE ROW LEVEL SECURITY;
