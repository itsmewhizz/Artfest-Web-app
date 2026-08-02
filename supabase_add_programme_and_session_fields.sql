-- Add programme type and student session tracking columns
ALTER TABLE public.programmes
  ADD COLUMN IF NOT EXISTS "programmeType" text;

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS "sessionActive" boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS "sessionExpiresAt" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "sessionToken" text;
