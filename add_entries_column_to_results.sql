-- ============================================================
-- ARTFEST WEB APP - SUPABASE DATABASE MIGRATION
-- File: add_entries_column_to_results.sql
-- Description: Adds 'entries' JSONB column to public.results table
--              to store ALL candidate records (1 to N).
-- ============================================================

-- 1. Add the entries column to public.results if it does not exist
ALTER TABLE public.results 
ADD COLUMN IF NOT EXISTS entries jsonb DEFAULT '[]'::jsonb;

-- 2. Populate entries for historical records that only have top-3 (first, second, third)
UPDATE public.results
SET entries = (
  SELECT jsonb_strip_nulls(jsonb_agg(elem))
  FROM (
    SELECT first AS elem FROM public.results r2 WHERE r2.id = public.results.id AND first IS NOT NULL AND first != 'null'::jsonb
    UNION ALL
    SELECT second AS elem FROM public.results r2 WHERE r2.id = public.results.id AND second IS NOT NULL AND second != 'null'::jsonb
    UNION ALL
    SELECT third AS elem FROM public.results r2 WHERE r2.id = public.results.id AND third IS NOT NULL AND third != 'null'::jsonb
  ) sub
)
WHERE (entries IS NULL OR entries = '[]'::jsonb)
  AND (first IS NOT NULL OR second IS NOT NULL OR third IS NOT NULL);

-- 3. Ensure proper RLS security policies and permissions
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users & anon users to read results
DROP POLICY IF EXISTS "Public results select policy" ON public.results;
CREATE POLICY "Public results select policy" ON public.results 
FOR SELECT USING (true);

-- Allow authenticated users & judges to insert/update results
DROP POLICY IF EXISTS "Authenticated write results policy" ON public.results;
CREATE POLICY "Authenticated write results policy" ON public.results 
FOR ALL USING (true) WITH CHECK (true);

-- Grant full table access to authenticated, anon, and service_role
GRANT ALL ON public.results TO authenticated, anon, service_role;

-- 4. Reload PostgREST schema cache so 'entries' is immediately recognized by the API
NOTIFY pgrst, 'reload schema';
