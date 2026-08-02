-- Remove anonymous team update access
-- The DB trigger (SECURITY DEFINER) handles team totals automatically
-- so the client no longer needs direct write access to teams
DROP POLICY IF EXISTS "anon_update_teams" ON teams;
