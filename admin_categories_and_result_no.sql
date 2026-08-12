-- ============================================================
-- Categories management + Admin result-number editing
-- Run in the Supabase Dashboard (SQL Editor).
--
-- Adds:
--   1. public.categories    (admin-managed category list)
--   2. is_admin() helper    (idempotent; matches judges_rls.sql)
--   3. admin_set_result_no()  (SECURITY DEFINER RPC: lets an admin
--      edit a programme's displayed result number even when the
--      latest result row is locked/judge-submitted)
-- ============================================================

-- ------------------------------------------------------------
-- 0. Admin role helper (idempotent with judges_rls.sql)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin';
$$;

-- ------------------------------------------------------------
-- 1. Categories table
--    name      : unique display name (e.g. "Minor", "General Cat-A")
--    sortOrder : where it appears in dropdowns / filters
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  "sortOrder" integer NOT NULL DEFAULT 0,
  "createdAt" timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_categories" ON public.categories;
CREATE POLICY "public_read_categories" ON public.categories
  FOR SELECT TO public USING (true);

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
-- 2. Seed the default categories (only when the table is empty)
-- ------------------------------------------------------------
INSERT INTO public.categories (name, "sortOrder")
SELECT name, sort_order
FROM (VALUES
  ('Minor',          1),
  ('HS',             2),
  ('Premier',        3),
  ('Sub Junior',     4),
  ('Junior',         5),
  ('General Cat-A',  6),
  ('General Cat-B',  7)
) AS seed(name, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.categories);

-- ------------------------------------------------------------
-- 3. admin_set_result_no() - edit a programme's result number
--    Only admins may call it. It updates ONLY the "resultNo"
--    (and "updatedAt") of the programme's latest result row, so
--    the number shown in the Admin Result List, Programmes list,
--    Judges panel and Print screens all stay in sync.
--    If no result row exists yet, it creates an unlocked
--    placeholder row the same way the "Add Programme" form did.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_set_result_no(
  p_programme_id text,
  p_programme_name text DEFAULT NULL,
  p_result_no integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('error', 'not_authorized');
  END IF;

  SELECT id INTO v_id
  FROM public.results
  WHERE "programmeId" = p_programme_id
  ORDER BY "updatedAt" DESC NULLS LAST
  LIMIT 1;

  IF v_id IS NULL THEN
    INSERT INTO public.results ("programmeId", name, "resultNo", "updatedAt", locked)
    VALUES (p_programme_id, COALESCE(p_programme_name, 'Programme'), p_result_no, now(), false);
  ELSE
    UPDATE public.results
    SET "resultNo" = p_result_no,
        "updatedAt" = now()
    WHERE id = v_id;
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ------------------------------------------------------------
-- 4. Refresh PostgREST schema cache
-- ------------------------------------------------------------
NOTIFY pgrst, 'reload schema';