-- ============================================================
-- Backfill: ensure every programme has a matching result row
-- Run in the Supabase Dashboard (SQL Editor) after deploying
-- the code changes.
--
-- Idempotent: safe to run multiple times.
-- ============================================================

-- 1. Add isFinished column to results if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'results' AND column_name = 'isFinished'
  ) THEN
    ALTER TABLE results ADD COLUMN "isFinished" boolean DEFAULT false;
  END IF;
END $$;

-- 2. Add isFinished column to programmes if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'programmes' AND column_name = 'isFinished'
  ) THEN
    ALTER TABLE programmes ADD COLUMN "isFinished" boolean DEFAULT false;
  END IF;
END $$;

-- 3. Backfill: insert placeholder result rows for programmes that have no matching result
INSERT INTO results ("programmeId", name, "first", "second", "third", entries, "isFinished", locked, "updatedAt", "resultNo")
SELECT
  p.id,
  p.name,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  false,
  now(),
  NULL
FROM programmes p
LEFT JOIN results r ON r."programmeId" = p.id
WHERE r.id IS NULL;

-- 4. Sync: ensure result rows match their programme's isFinished status
UPDATE results r
SET "isFinished" = p."isFinished"
FROM programmes p
WHERE r."programmeId" = p.id
  AND r."isFinished" IS DISTINCT FROM p."isFinished";

-- 5. Sync: ensure result name matches programme name
UPDATE results r
SET name = p.name
FROM programmes p
WHERE r."programmeId" = p.id
  AND r.name IS DISTINCT FROM p.name;

-- Verify counts
SELECT
  (SELECT count(*) FROM programmes) AS programme_count,
  (SELECT count(*) FROM results) AS result_count,
  (SELECT count(*) FROM programmes p LEFT JOIN results r ON r."programmeId" = p.id WHERE r.id IS NULL) AS missing_results;
