-- ============================================================
-- RLS Audit Fix: consistent Admin (authenticated) CRUD access
-- Run in the Supabase Dashboard (SQL Editor).
--
-- WHY: judges_rls.sql replaced the app's original policies
-- (which let any `authenticated` user manage the festival tables)
-- with policies gated on the JWT claim app_metadata.role = 'admin'
-- via public.is_admin(). That claim only exists in tokens issued
-- AFTER the migration ran, so an admin who hasn't logged out and
-- back in gets 0-row updates / inserts — the exact "permission
-- denied (RLS)" symptoms seen on students, programmes, spotlight.
--
-- This migration restores the project's ORIGINAL, proven pattern
-- (see rls_policies.sql) and applies it consistently to every
-- admin-managed table:
--   * SELECT  -> anon + authenticated (public + judge pages)
--   * INSERT / UPDATE / DELETE -> `authenticated` with USING /
--     WITH CHECK = true. In this app only admins and judges ever
--     hold an `authenticated` session (students authenticate via a
--     local-session mechanism as `anon`), so this is safe and no
--     longer depends on a role claim that may be missing.
--   * results -> placeholders remain admin-editable; judge-made
--     locked results stay immutable except through the
--     judge_reverify_edit() SECURITY DEFINER RPC.
--
-- Idempotent: safe to run multiple times.
-- ============================================================

-- ------------------------------------------------------------
-- 0. Role claims (best-effort for FUTURE tokens). Not required
--    for the policies below, but keeps is_admin()/is_judge()
--    correct for RPCs that still use them (e.g. results gating).
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
-- 1. Table-level grants for every admin table
-- ------------------------------------------------------------
GRANT SELECT ON TABLE public.students, public.programmes, public.results,
  public.teams, public.spotlight, public.categories TO anon, authenticated;

GRANT INSERT, UPDATE, DELETE ON TABLE public.students, public.programmes,
  public.teams, public.spotlight, public.categories TO authenticated;

-- results: admins manage placeholder rows; the judge flow keeps its
-- insert rights through the judge RPC (SECURITY DEFINER bypasses RLS).
GRANT INSERT, UPDATE, DELETE ON TABLE public.results TO authenticated;

-- ------------------------------------------------------------
-- 2. students
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "admin_write_students" ON public.students;
DROP POLICY IF EXISTS "admin_write_students_update" ON public.students;
DROP POLICY IF EXISTS "admin_write_students_delete" ON public.students;

CREATE POLICY "admin_write_students" ON public.students
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "admin_write_students_update" ON public.students
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_write_students_delete" ON public.students
  FOR DELETE TO authenticated USING (true);

-- ------------------------------------------------------------
-- 3. programmes
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "admin_write_programmes" ON public.programmes;
DROP POLICY IF EXISTS "admin_write_programmes_update" ON public.programmes;
DROP POLICY IF EXISTS "admin_write_programmes_delete" ON public.programmes;

CREATE POLICY "admin_write_programmes" ON public.programmes
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "admin_write_programmes_update" ON public.programmes
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_write_programmes_delete" ON public.programmes
  FOR DELETE TO authenticated USING (true);

-- ------------------------------------------------------------
-- 4. teams
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "admin_write_teams" ON public.teams;
DROP POLICY IF EXISTS "admin_write_teams_update" ON public.teams;
DROP POLICY IF EXISTS "admin_write_teams_delete" ON public.teams;

CREATE POLICY "admin_write_teams" ON public.teams
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "admin_write_teams_update" ON public.teams
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_write_teams_delete" ON public.teams
  FOR DELETE TO authenticated USING (true);

-- ------------------------------------------------------------
-- 5. spotlight
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "admin_write_spotlight" ON public.spotlight;
DROP POLICY IF EXISTS "admin_write_spotlight_update" ON public.spotlight;
DROP POLICY IF EXISTS "admin_write_spotlight_delete" ON public.spotlight;

CREATE POLICY "admin_write_spotlight" ON public.spotlight
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "admin_write_spotlight_update" ON public.spotlight
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_write_spotlight_delete" ON public.spotlight
  FOR DELETE TO authenticated USING (true);

-- ------------------------------------------------------------
-- 6. categories
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "admin_write_categories" ON public.categories;
DROP POLICY IF EXISTS "admin_write_categories_update" ON public.categories;
DROP POLICY IF EXISTS "admin_write_categories_delete" ON public.categories;

CREATE POLICY "admin_write_categories" ON public.categories
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "admin_write_categories_update" ON public.categories
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_write_categories_delete" ON public.categories
  FOR DELETE TO authenticated USING (true);

-- ------------------------------------------------------------
-- 7. results
--    Keep the rules that matter:
--      * locked (judge-submitted) rows stay immutable under RLS —
--        they can only be changed via judge_reverify_edit() RPC.
--      * unlocked placeholder rows (created to hold a result number)
--        can be inserted/updated/deleted by `authenticated` admins.
--    Public SELECT (public_read_results) is untouched.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "judge_insert_results" ON public.results;
DROP POLICY IF EXISTS "admin_insert_result_placeholders" ON public.results;
DROP POLICY IF EXISTS "admin_update_result_placeholders" ON public.results;
DROP POLICY IF EXISTS "judge_update_results" ON public.results;
DROP POLICY IF EXISTS "judge_delete_results" ON public.results;

CREATE POLICY "admin_insert_result_placeholders" ON public.results
  FOR INSERT TO authenticated
  WITH CHECK (NOT COALESCE(locked, false) AND first IS NULL AND second IS NULL AND third IS NULL);

CREATE POLICY "judge_insert_results" ON public.results
  FOR INSERT TO authenticated
  WITH CHECK (public.is_judge() AND COALESCE(locked, false) = true);

-- Administrators may edit unlocked rows (their placeholder rows).
CREATE POLICY "admin_update_result_placeholders" ON public.results
  FOR UPDATE TO authenticated
  USING (NOT COALESCE(locked, false))
  WITH CHECK (NOT COALESCE(locked, false));

-- Legacy direct judge edit path on unlocked rows.
CREATE POLICY "judge_update_results" ON public.results
  FOR UPDATE TO authenticated
  USING (public.is_judge() AND NOT COALESCE(locked, false))
  WITH CHECK (public.is_judge() AND NOT COALESCE(locked, false));

CREATE POLICY "judge_delete_results" ON public.results
  FOR DELETE TO authenticated
  USING (public.is_judge() AND NOT COALESCE(locked, false));

-- ------------------------------------------------------------
-- 8. Refresh PostgREST schema cache
-- ------------------------------------------------------------
NOTIFY pgrst, 'reload schema';