-- 1. Add isFeatured column to spotlight
ALTER TABLE spotlight ADD COLUMN IF NOT EXISTS isFeatured BOOLEAN DEFAULT false;

-- 2. Function to auto-sync team totals from results (uses latest result per programme)
CREATE OR REPLACE FUNCTION sync_team_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  WITH latest_results AS (
    SELECT DISTINCT ON (r."programmeId") r.*
    FROM results r
    ORDER BY r."programmeId", r."updatedAt" DESC
  )
  UPDATE teams t
  SET "totalPoints" = (
    SELECT COALESCE(SUM(points), 0)
    FROM (
      SELECT (lr.first->>'points')::int AS points
      FROM latest_results lr
      JOIN students s ON s.id::text = (lr.first->>'studentId')
      WHERE s.team = t.id
      UNION ALL
      SELECT (lr.second->>'points')::int
      FROM latest_results lr
      JOIN students s ON s.id::text = (lr.second->>'studentId')
      WHERE s.team = t.id
      UNION ALL
      SELECT (lr.third->>'points')::int
      FROM latest_results lr
      JOIN students s ON s.id::text = (lr.third->>'studentId')
      WHERE s.team = t.id
    ) sub
  )
  WHERE true;
  RETURN NULL;
END;
$function$;

-- 3. Trigger on results table
DROP TRIGGER IF EXISTS trigger_sync_team_totals ON results;
CREATE TRIGGER trigger_sync_team_totals
AFTER INSERT OR UPDATE OR DELETE ON results
FOR EACH STATEMENT
EXECUTE FUNCTION sync_team_totals();

-- 4. One-time sync: set current totals based on existing results (latest per programme only)
WITH latest_results AS (
  SELECT DISTINCT ON (r."programmeId") r.*
  FROM results r
  ORDER BY r."programmeId", r."updatedAt" DESC
)
UPDATE teams t
SET "totalPoints" = (
  SELECT COALESCE(SUM(points), 0)
  FROM (
    SELECT (lr.first->>'points')::int AS points
    FROM latest_results lr
    JOIN students s ON s.id::text = (lr.first->>'studentId')
    WHERE s.team = t.id
    UNION ALL
    SELECT (lr.second->>'points')::int
    FROM latest_results lr
    JOIN students s ON s.id::text = (lr.second->>'studentId')
    WHERE s.team = t.id
    UNION ALL
    SELECT (lr.third->>'points')::int
    FROM latest_results lr
    JOIN students s ON s.id::text = (lr.third->>'studentId')
    WHERE s.team = t.id
  ) sub
)
WHERE true;

-- 5. Add resultNo column for display numbering
ALTER TABLE results ADD COLUMN IF NOT EXISTS "resultNo" INTEGER DEFAULT 0;

-- Set resultNo for existing results (ordered by updatedAt)
UPDATE results r
SET "resultNo" = sub.seq
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "updatedAt") AS seq
  FROM results
) sub
WHERE r.id = sub.id AND r."resultNo" = 0;

-- 6. Add album column to spotlight for gallery grouping (e.g. "Inauguration Ceremony", "Day 1", "Day 2", "Mass Gala")
ALTER TABLE spotlight ADD COLUMN IF NOT EXISTS album TEXT;
