-- ============================================================
-- Fix: Unlock result rows that are locked but have no data.
--
-- These are orphaned rows where locked=true was set but no
-- actual placements (first/second/third/entries) were saved.
-- They should be unlocked so judges can submit results normally.
--
-- Run in the Supabase Dashboard (SQL Editor).
-- ============================================================

-- Unlock any result row where locked=true but all placements are null/empty
UPDATE results
SET locked = false, "updatedAt" = now()
WHERE locked = true
  AND first IS NULL
  AND second IS NULL
  AND third IS NULL
  AND (entries IS NULL OR entries = '[]'::jsonb OR entries = 'null'::jsonb);

-- Verify: show any remaining locked rows without data (should be 0)
SELECT id, "programmeId", name, locked, first, second, third, entries
FROM results
WHERE locked = true
  AND first IS NULL
  AND second IS NULL
  AND third IS NULL
  AND (entries IS NULL OR entries = '[]'::jsonb OR entries = 'null'::jsonb);
