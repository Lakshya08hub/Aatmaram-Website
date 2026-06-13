-- Phase 8: Patient Records migration
-- Creates the patient_records table for the lightweight EMR portal.
-- One row per visit; returning patients have multiple rows.

CREATE TABLE IF NOT EXISTS patient_records (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_name        text          NOT NULL,
  age                 integer       NOT NULL CHECK (age >= 0 AND age <= 150),
  phone               text          NOT NULL,
  reason              text          NOT NULL,
  assigned_doctor_id  uuid          REFERENCES doctors(id) ON DELETE SET NULL,
  visit_date          date          NOT NULL DEFAULT CURRENT_DATE,
  clinical_notes      text,
  created_at          timestamptz   NOT NULL DEFAULT now(),
  updated_at          timestamptz   NOT NULL DEFAULT now()
);

-- Auto-update updated_at on row modification.
-- Try moddatetime extension first; fall back to a local trigger function.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'moddatetime'
  ) THEN
    EXECUTE $t$
      CREATE TRIGGER set_updated_at
        BEFORE UPDATE ON patient_records
        FOR EACH ROW
        EXECUTE FUNCTION moddatetime(updated_at);
    $t$;
  ELSE
    EXECUTE $t$
      CREATE OR REPLACE FUNCTION update_patient_records_updated_at()
        RETURNS TRIGGER AS $fn$
        BEGIN
          NEW.updated_at = now();
          RETURN NEW;
        END;
        $fn$ LANGUAGE plpgsql;
    $t$;

    EXECUTE $t$
      CREATE TRIGGER set_updated_at
        BEFORE UPDATE ON patient_records
        FOR EACH ROW
        EXECUTE FUNCTION update_patient_records_updated_at();
    $t$;
  END IF;
END;
$$;
