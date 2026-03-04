-- Migration 0122: Mark one-shot storylets with max_total_runs: 1
--
-- These storylets represent unique, unrepeatable events (first class,
-- orientation fair, floor meeting, first encounter with Cal). Once seen,
-- they must never surface again regardless of how much time has passed.
--
-- selectStorylets.ts reads max_total_runs from requirements and cross-checks
-- against allTimeRunCounts built from a full-history recentRuns fetch.

UPDATE public.storylets
SET requirements = COALESCE(requirements, '{}'::jsonb) || '{"max_total_runs": 1}'::jsonb
WHERE slug IN (
  's7_first_class',       -- Prof Marsh's first lecture — a singular moment
  's8_floor_meeting',     -- RA Sandra's floor orientation — happens once
  's9_orientation_fair',  -- Clubs/activities fair — one-time event
  's11_cal_midnight'      -- First late-night encounter with Cal
);
