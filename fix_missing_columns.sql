-- Fix: missing columns that the frontend already writes to
--
-- 1. students.chestNo  -> Admin Add/Edit Student sends `chestNo` on every
--    insert/update ("Student update failed: Could not find the 'chestNo'
--    column of 'students' in the schema cache"). Type `text` so chest
--    numbers may include leading zeros / letters as display codes.
-- 2. spotlight.album    -> Gallery album grouping (Part 2 feature). Type
--    `text` to tag images by event/day.
--
-- Run this in the Supabase Dashboard (SQL Editor) or via your migration runner.
-- `NOTIFY pgrst, 'reload schema'` forces PostgREST to refresh its schema cache
-- so the new columns are usable immediately, without a manual reload.

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS "chestNo" text;

ALTER TABLE public.spotlight
  ADD COLUMN IF NOT EXISTS "album" text;

-- Ask PostgREST to reload its schema cache right away
NOTIFY pgrst, 'reload schema';
