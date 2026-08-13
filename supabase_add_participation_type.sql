-- Add participation type column to programmes (Individual / Group)
ALTER TABLE public.programmes
  ADD COLUMN IF NOT EXISTS "participationType" text;
