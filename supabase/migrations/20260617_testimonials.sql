-- Phase 15: Testimonials migration
-- Creates the testimonials table for the homepage patient testimonials strip.
-- Portal CRUD allows admins to add/edit/delete/toggle active testimonials.

CREATE TABLE IF NOT EXISTS testimonials (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_name  text          NOT NULL,
  quote         text          NOT NULL,
  designation   text,
  is_active     boolean       NOT NULL DEFAULT true,
  sort_order    integer       NOT NULL DEFAULT 0,
  created_at    timestamptz   NOT NULL DEFAULT now(),
  updated_at    timestamptz   NOT NULL DEFAULT now()
);

ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

-- Public read: anyone (anon or authenticated) can read testimonials
CREATE POLICY "testimonials: public read"
  ON testimonials
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Admin write: only super_admin or admin roles with active accounts can mutate
CREATE POLICY "testimonials: admin write"
  ON testimonials
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role IN ('super_admin', 'admin')
        AND profiles.is_active = true
    )
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
        BEFORE UPDATE ON testimonials
        FOR EACH ROW
        EXECUTE FUNCTION moddatetime(updated_at);
    $t$;
  ELSE
    EXECUTE $t$
      CREATE OR REPLACE FUNCTION update_testimonials_updated_at()
        RETURNS TRIGGER AS $fn$
        BEGIN
          NEW.updated_at = now();
          RETURN NEW;
        END;
        $fn$ LANGUAGE plpgsql;
    $t$;

    EXECUTE $t$
      CREATE TRIGGER set_updated_at
        BEFORE UPDATE ON testimonials
        FOR EACH ROW
        EXECUTE FUNCTION update_testimonials_updated_at();
    $t$;
  END IF;
END;
$$;
