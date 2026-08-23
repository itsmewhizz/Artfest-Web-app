-- =============================================================
-- Blind grading: performance_code_assignments + entries column
-- Run this against your Supabase database before deploying the
-- updated Judges Panel.
-- =============================================================

-- 1. Create the code-assignment table (maps a participant to a
--    code letter per programme, used for blind grading).
CREATE TABLE IF NOT EXISTS performance_code_assignments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id text NOT NULL,
  participant_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  code_letter  text NOT NULL,
  created_at   timestamptz DEFAULT now(),
  UNIQUE (programme_id, code_letter)
);

-- 2. Add an `entries` JSONB column on the results table.
--    Each entry: { code: "A", studentId: "...", points: 8, grade: "A", prize: "" }
--    Old first/second/third columns are kept for backward compatibility.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'results' AND column_name = 'entries'
  ) THEN
    ALTER TABLE results ADD COLUMN entries jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- 3. Index for fast lookup of code assignments per programme.
CREATE INDEX IF NOT EXISTS idx_perf_code_assignments_programme
  ON performance_code_assignments (programme_id);

-- 4. RLS — allow authenticated users to read code assignments,
--    admins/judges to write.
ALTER TABLE performance_code_assignments ENABLE ROW LEVEL SECURITY;

-- Public read (needed for judge + student views)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'code_assignments_public_read'
  ) THEN
    CREATE POLICY code_assignments_public_read ON performance_code_assignments
      FOR SELECT USING (true);
  END IF;
END $$;

-- Authenticated insert/update/delete (admin / judge via service role)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'code_assignments_auth_write'
  ) THEN
    CREATE POLICY code_assignments_auth_write ON performance_code_assignments
      FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;
