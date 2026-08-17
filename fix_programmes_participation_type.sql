-- Fix PostgREST PGRST204: "Could not find the 'participationType' column of 'programmes'"
-- The programmes table needs a text column for participation type (Individual / Group).
-- The frontend writes/reads this column as "participationType" (camelCase) everywhere,
-- so keep the exact same name as the existing supabase_add_participation_type.sql migration.

-- 1. Ensure the column exists (idempotent; does NOT rename or drop existing columns).
ALTER TABLE public.programmes
  ADD COLUMN IF NOT EXISTS "participationType" text;

-- 2. Reload the PostgREST schema cache so the column is picked up immediately.
NOTIFY pgrst, 'reload schema';