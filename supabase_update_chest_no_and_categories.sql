-- Migration: Add Chest No to students and update General category to General Cat-A

-- 1. Add chestNo column to students table
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS "chestNo" text;

-- 2. Rename existing "General" category in programmes table to "General Cat-A"
UPDATE public.programmes SET category = 'General Cat-A' WHERE category = 'General';

-- 3. Ask PostgREST to reload its schema cache immediately after this migration
NOTIFY pgrst, 'reload schema';
