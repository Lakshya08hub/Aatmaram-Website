-- Phase 14: Media Infrastructure
-- Applies: manually via the Supabase dashboard SQL editor
-- Run this entire file in one paste — all blocks are idempotent where noted.

-- ============================================================
-- 1. Add missing image columns to existing tables
--    (idempotent — IF NOT EXISTS prevents duplicate-column errors)
-- ============================================================
ALTER TABLE hospital_info ADD COLUMN IF NOT EXISTS hero_image_url text;
ALTER TABLE facilities    ADD COLUMN IF NOT EXISTS image_url text;

-- ============================================================
-- 2. Create the media Storage bucket
--    public = true means objects can be read via the public URL
--    ON CONFLICT (id) DO NOTHING makes this safe to re-run
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. Storage RLS policies on storage.objects
--    NOTE: CREATE POLICY does not support IF NOT EXISTS.
--    If you re-run this file and the policies already exist,
--    Postgres will raise "policy already exists" errors — that
--    is safe to ignore, or DROP the old policies first.
-- ============================================================

-- Policy A: public read — any visitor (anon or logged-in) may view media objects
DO $$ BEGIN
  CREATE POLICY "media: public read"
    ON storage.objects
    FOR SELECT
    TO anon, authenticated
    USING (bucket_id = 'media');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Policy B: admin write — only super_admin / admin roles may upload
DO $$ BEGIN
  CREATE POLICY "media: admin write"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'media'
      AND (
        auth.jwt() -> 'user_metadata' ->> 'role' IN ('super_admin', 'admin')
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE user_id = auth.uid()
            AND role IN ('super_admin', 'admin')
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Policy C: admin delete — only super_admin / admin roles may delete objects
DO $$ BEGIN
  CREATE POLICY "media: admin delete"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'media'
      AND (
        auth.jwt() -> 'user_metadata' ->> 'role' IN ('super_admin', 'admin')
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE user_id = auth.uid()
            AND role IN ('super_admin', 'admin')
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
