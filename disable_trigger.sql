-- Re-create the trigger (was disabled due to old buggy function)
-- Run supabase_migration.sql first to update the function, then this creates the trigger
DROP TRIGGER IF EXISTS trigger_sync_team_totals ON results;
CREATE TRIGGER trigger_sync_team_totals
AFTER INSERT OR UPDATE OR DELETE ON results
FOR EACH STATEMENT
EXECUTE FUNCTION sync_team_totals();
