-- ============================================================
-- Fix: Categories table 403 / "permission denied for table
-- Run in the Supabase Dashboard (SQL Editor).
--
-- The private.table_policies rows alone are NOT enough. A freshly
-- created table has NO privileges for the `anon` / `authenticated`
-- roles, so PostgREST returns 42501 BEFORE RLS is even consulted.
--
-- This mirrors the `programmes` / `students` / `teams` pattern:
--   * SELECT for everyone (anon + authenticated) — categories are
--     read on public + judge-facing pages (filters/dropdowns).
--   * INSERT / UPDATE / DELETE for the admin role only via RLS
--     (matching judges_rls.sql, which is_admin()-gates the other
--     admin-managed tables).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Role helper (idempotent with judges_rls.sql)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin';
$$;

-- ------------------------------------------------------------
-- 2. Table-level privileges
-- ------------------------------------------------------------
GRANT SELECT ON TABLE public.categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.categories TO authenticated;

-- ------------------------------------------------------------
-- 3. Row Level Security
-- ------------------------------------------------------------
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Everyone may read category names (public + judge-facing pages)
DROP POLICY IF EXISTS "public_read_categories" ON public.categories;
CREATE POLICY "public_read_categories" ON public.categories
  FOR SELECT TO public USING (true);

-- Only admins may manage them
DROP POLICY IF EXISTS "admin_write_categories" ON public.categories;
CREATE POLICY "admin_write_categories" ON public.categories
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_write_categories_update" ON public.categories;
CREATE POLICY "admin_write_categories_update" ON public.categories
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_write_categories_delete" ON public.categories;
CREATE POLICY "admin_write_categories_delete" ON public.categories
  FOR DELETE TO authenticated USING (public.is_admin());

-- ------------------------------------------------------------
-- 4. Refresh PostgREST schema cache
-- ------------------------------------------------------------
NOTIFY pgrst, 'reload schema';