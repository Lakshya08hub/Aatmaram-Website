-- Add Hindi translation columns to all public-facing content tables.
-- All columns are nullable so existing data is unaffected and admins
-- can fill in translations progressively.

ALTER TABLE departments
  ADD COLUMN IF NOT EXISTS name_hi TEXT,
  ADD COLUMN IF NOT EXISTS description_hi TEXT;

ALTER TABLE doctors
  ADD COLUMN IF NOT EXISTS full_name_hi TEXT,
  ADD COLUMN IF NOT EXISTS specialization_hi TEXT,
  ADD COLUMN IF NOT EXISTS qualification_hi TEXT,
  ADD COLUMN IF NOT EXISTS bio_hi TEXT;

ALTER TABLE facilities
  ADD COLUMN IF NOT EXISTS name_hi TEXT,
  ADD COLUMN IF NOT EXISTS description_hi TEXT;

ALTER TABLE hospital_info
  ADD COLUMN IF NOT EXISTS about_text_hi TEXT,
  ADD COLUMN IF NOT EXISTS opd_timings_hi TEXT;

ALTER TABLE testimonials
  ADD COLUMN IF NOT EXISTS patient_name_hi TEXT,
  ADD COLUMN IF NOT EXISTS quote_hi TEXT,
  ADD COLUMN IF NOT EXISTS designation_hi TEXT;
