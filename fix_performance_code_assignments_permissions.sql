-- ============================================================
-- Fix: performance_code_assignments missing GRANT statements
-- Run in the Supabase Dashboard (SQL Editor).
--
-- WHY: blind_grading_migration.sql created the table with RLS
-- policies but never ran GRANT statements. Supabase requires
-- both table-level GRANTs AND RLS policies. Without the GRANT,
-- PostgREST returns 403 even though the RLS policy allows access.
--
-- This migration adds the minimum required permissions following
-- the project's established pattern (see fix_admin_rls_audit.sql).
-- ============================================================

-- 1. SELECT: both anon and authenticated can read code assignments
--    (needed for judge panel, student views, and admin print)
GRANT SELECT ON TABLE public.performance_code_assignments TO anon, authenticated;

-- 2. INSERT/UPDATE/DELETE: only authenticated users (admins/judges)
--    can modify code assignments
GRANT INSERT, UPDATE, DELETE ON TABLE public.performance_code_assignments TO authenticated;

-- 3. Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
