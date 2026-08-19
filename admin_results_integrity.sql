-- ============================================================
-- Admin results-integrity RPC
-- Run in the Supabase Dashboard (SQL Editor).
--
-- Why: RLS on `results` deliberately keeps locked (judge-submitted)
-- rows immutable — there is no admin DELETE policy. The results-
-- integrity flows in AdminProgrammes need to remove ALL result rows
-- for a programme (locked placeholders and locked judge results) when
-- a programme is un-finished, deleted, or has its result cleared.
--
-- This SECURITY DEFINER function (owned by the table owner) bypasses
-- RLS the same way judge_reverify_edit() does, so it is the single
-- sanctioned delete path for result rows.
--
-- Idempotent: safe to run multiple times.
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_delete_results_for_programme(p_programme_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authorized');
  END IF;

  DELETE FROM public.results
  WHERE "programmeId" = p_programme_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN jsonb_build_object('ok', true, 'deleted', v_count);
END;
$$;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
