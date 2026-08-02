-- Enable RLS on all tables
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE programmes ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE spotlight ENABLE ROW LEVEL SECURITY;

-- Public read access for all tables
CREATE POLICY "public_read_students" ON students FOR SELECT TO public USING (true);
CREATE POLICY "public_read_programmes" ON programmes FOR SELECT TO public USING (true);
CREATE POLICY "public_read_results" ON results FOR SELECT TO public USING (true);
CREATE POLICY "public_read_teams" ON teams FOR SELECT TO public USING (true);
CREATE POLICY "public_read_spotlight" ON spotlight FOR SELECT TO public USING (true);

-- Admin read access remains public for preview screens.
-- Results are judge-write only: admins may preview, but cannot mutate rows.
CREATE POLICY "admin_write_students" ON students FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "admin_write_students_update" ON students FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_write_students_delete" ON students FOR DELETE TO authenticated USING (true);

CREATE POLICY "admin_write_programmes" ON programmes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "admin_write_programmes_update" ON programmes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_write_programmes_delete" ON programmes FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "judge_insert_results" ON results;
DROP POLICY IF EXISTS "judge_update_results" ON results;
DROP POLICY IF EXISTS "judge_delete_results" ON results;

CREATE POLICY "judge_insert_results" ON results FOR INSERT TO authenticated
  WITH CHECK (public.is_judge() AND COALESCE(locked, false) = true);

CREATE POLICY "judge_update_results" ON results FOR UPDATE TO authenticated
  USING (public.is_judge() AND NOT COALESCE(locked, false))
  WITH CHECK (public.is_judge() AND NOT COALESCE(locked, false));

CREATE POLICY "judge_delete_results" ON results FOR DELETE TO authenticated
  USING (public.is_judge() AND NOT COALESCE(locked, false));

CREATE POLICY "admin_write_teams" ON teams FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "admin_write_teams_update" ON teams FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_write_teams_delete" ON teams FOR DELETE TO authenticated USING (true);

CREATE POLICY "admin_write_spotlight" ON spotlight FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "admin_write_spotlight_update" ON spotlight FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_write_spotlight_delete" ON spotlight FOR DELETE TO authenticated USING (true);
