-- ============================================================
-- Judges panel migration
-- Run this in the Supabase Dashboard (SQL Editor).
--
-- PREREQUISITES (Dashboard -> Authentication -> Users -> Add user):
--   1. Create EACH judge account below and give each a password
--      (never stored in the frontend source).
--   2. Set the judge emails below (single place to edit).
--
-- After running this file, EXISTING ADMINS AND THE JUDGES MUST LOG OUT
-- AND LOG IN AGAIN so their token includes the new role.
-- ============================================================

-- ------------------------------------------------------------
-- 0. Judges' emails — EDIT THE LIST BELOW ONLY
--    Add or remove emails as needed, separated by commas.
-- ------------------------------------------------------------
DO $$
DECLARE judge_emails text[] := ARRAY['judgehere1@fest.com','judgehere2@fest.com'];
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
  WHERE NOT (email = ANY(judge_emails)) OR email IS NULL;

  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role":"judge"}'::jsonb
  WHERE email = ANY(judge_emails);
END $$;

-- ------------------------------------------------------------
-- 1. results.locked: a submitted result is immutable
-- ------------------------------------------------------------
ALTER TABLE results ADD COLUMN IF NOT EXISTS locked boolean DEFAULT false;

-- Lock existing results that already have placements (real results)
UPDATE results SET locked = true WHERE first IS NOT NULL OR second IS NOT NULL OR third IS NOT NULL;

-- Keep admin placeholder rows (no placements) unlocked so programme numbers stay editable
UPDATE results SET locked = false WHERE first IS NULL AND second IS NULL AND third IS NULL;

-- ------------------------------------------------------------
-- 2. Role helpers (read from the JWT app_metadata)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin';
$$;

CREATE OR REPLACE FUNCTION public.is_judge() RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'judge';
$$;

-- ------------------------------------------------------------
-- 4. RESULTS:
--    - Judges submit real results (must be locked=true)
--    - Admins create/manage placeholder rows (no placements, not locked)
--    - Locked rows (real results) can never be updated or deleted
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "admin_write_results" ON results;
DROP POLICY IF EXISTS "admin_write_results_update" ON results;
DROP POLICY IF EXISTS "admin_write_results_delete" ON results;

CREATE POLICY "judge_insert_results" ON results FOR INSERT TO authenticated
  WITH CHECK (is_judge() AND COALESCE(locked, false) = true);

CREATE POLICY "admin_insert_result_placeholders" ON results FOR INSERT TO authenticated
  WITH CHECK (is_admin() AND NOT COALESCE(locked, false) AND first IS NULL AND second IS NULL AND third IS NULL);

CREATE POLICY "judge_update_results" ON results FOR UPDATE TO authenticated
  USING (NOT COALESCE(locked, false))
  WITH CHECK (NOT COALESCE(locked, false) AND (is_judge() OR (is_admin() AND first IS NULL AND second IS NULL AND third IS NULL)));

-- (public SELECT on results remains via "public_read_results")

-- ------------------------------------------------------------
-- 5. Everything else: admins only (students can no longer write)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "admin_write_students" ON students;
DROP POLICY IF EXISTS "admin_write_students_update" ON students;
DROP POLICY IF EXISTS "admin_write_students_delete" ON students;
CREATE POLICY "admin_write_students" ON students FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "admin_write_students_update" ON students FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "admin_write_students_delete" ON students FOR DELETE TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "admin_write_programmes" ON programmes;
DROP POLICY IF EXISTS "admin_write_programmes_update" ON programmes;
DROP POLICY IF EXISTS "admin_write_programmes_delete" ON programmes;
CREATE POLICY "admin_write_programmes" ON programmes FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "admin_write_programmes_update" ON programmes FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "admin_write_programmes_delete" ON programmes FOR DELETE TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "admin_write_teams" ON teams;
DROP POLICY IF EXISTS "admin_write_teams_update" ON teams;
DROP POLICY IF EXISTS "admin_write_teams_delete" ON teams;
CREATE POLICY "admin_write_teams" ON teams FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "admin_write_teams_update" ON teams FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "admin_write_teams_delete" ON teams FOR DELETE TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "admin_write_spotlight" ON spotlight;
DROP POLICY IF EXISTS "admin_write_spotlight_update" ON spotlight;
DROP POLICY IF EXISTS "admin_write_spotlight_delete" ON spotlight;
CREATE POLICY "admin_write_spotlight" ON spotlight FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "admin_write_spotlight_update" ON spotlight FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "admin_write_spotlight_delete" ON spotlight FOR DELETE TO authenticated USING (is_admin());
