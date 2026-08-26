-- ============================================================
-- Fix: Complete Result Workflow + performance_code_assignments permissions
-- Run in the Supabase Dashboard (SQL Editor).
--
-- This migration introduces THREE independent states:
--   1. programme.isFinished  = "The event has ended"
--   2. result.locked         = "Judge has submitted the result"
--   3. programme.isPublished = "Admin has released result publicly"
--
-- It also fixes missing GRANTs on performance_code_assignments.
-- ============================================================

-- ============================================================
-- 1. Add isPublished to programmes table
-- ============================================================
ALTER TABLE programmes
  ADD COLUMN IF NOT EXISTS "isPublished" boolean DEFAULT false;

-- Backfill: any programme that was previously isFinished AND has a
-- locked result should be auto-published (preserves existing state).
UPDATE programmes p
SET "isPublished" = true
WHERE p."isFinished" = true
  AND EXISTS (
    SELECT 1 FROM results r
    WHERE r."programmeId" = p.id::text
      AND r.locked = true
  );

-- ============================================================
-- 2. Fix performance_code_assignments GRANTs
-- ============================================================
GRANT SELECT ON TABLE public.performance_code_assignments TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.performance_code_assignments TO authenticated;

-- ============================================================
-- 3. Refresh PostgREST schema cache
-- ============================================================
NOTIFY pgrst, 'reload schema';
