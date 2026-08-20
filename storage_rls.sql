-- ============================================================
-- Storage bucket RLS: storage.objects policies for `photos`
-- Run in the Supabase Dashboard (SQL Editor).
--
-- WHY: uploads to `photos` (templates/, spotlight/, students/,
-- footers/) were returning HTTP 400 `new row violates row-level
-- security policy`. The `photos` bucket has RLS enabled in
-- `storage.objects` but no INSERT/UPDATE/DELETE policies cover
-- the app's upload paths.
--
-- Policies are ADDITIVE (a row passes if ANY policy allows it),
-- so existing dashboard-created candidates (e.g. earlier
-- spotlight-scoped policies) keep working. These add coverage
-- for every folder the app writes to, including the new
-- `templates/{id}/...` background image path.
--
-- Writes go to authenticated sessions (matches the app's
-- poster_templates / gallery_footers migrations); public anon
-- read matches same. Idempotent: safe to re-run.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Public read: anyone can view images in the photos bucket
--    (public URLs + <img> tags render for all visitors).
-- ------------------------------------------------------------
CREATE POLICY "public_read_photos"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'photos');

-- ------------------------------------------------------------
-- 2. Authenticated upload (INSERT) into any app folder of photos
-- ------------------------------------------------------------
CREATE POLICY "authenticated_insert_photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'photos'
    AND (storage.foldername(name))[1] IN ('templates', 'spotlight', 'students', 'footers')
  );

-- ------------------------------------------------------------
-- 3. Authenticated overwrite / replace (upsert uploads use
--    INSERT ON CONFLICT, which eveluates UPDATE too) and delete.
-- ------------------------------------------------------------
CREATE POLICY "authenticated_update_photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'photos'
    AND (storage.foldername(name))[1] IN ('templates', 'spotlight', 'students', 'footers')
  )
  WITH CHECK (
    bucket_id = 'photos'
    AND (storage.foldername(name))[1] IN ('templates', 'spotlight', 'students', 'footers')
  );

CREATE POLICY "authenticated_delete_photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'photos');

-- ------------------------------------------------------------
-- 4. Allow read/update of the bucket row itself so the client
--    (getPublicUrl / upload flow) is not blocked by auth checks.
-- ------------------------------------------------------------
CREATE POLICY "authenticated_read_photos_bucket"
  ON storage.buckets FOR SELECT
  TO authenticated
  USING (id = 'photos');

-- ------------------------------------------------------------
-- 5. Refresh PostgREST storage schema cache
-- ------------------------------------------------------------
NOTIFY pgrst, 'reload schema';