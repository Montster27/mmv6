-- Merge "current segment" state into daily_states so it becomes the single
-- canonical row for "where is the player right now" (day + segment + hours).
-- player_day_state remains as historical log, indexed by (user_id, day_index).
--
-- Columns added:
--   current_segment  text  'morning'|'afternoon'|'evening'|'night', default 'morning'
--   hours_remaining  int   0..16, default 16
--   hours_committed  int   0..16, default 0

ALTER TABLE daily_states
  ADD COLUMN current_segment text NOT NULL DEFAULT 'morning'
    CHECK (current_segment IN ('morning','afternoon','evening','night')),
  ADD COLUMN hours_remaining integer NOT NULL DEFAULT 16
    CHECK (hours_remaining BETWEEN 0 AND 16),
  ADD COLUMN hours_committed integer NOT NULL DEFAULT 0
    CHECK (hours_committed BETWEEN 0 AND 16);

-- Backfill from the player_day_state row matching daily_states.day_index.
-- This captures each user's "right now" state at migration time.
UPDATE daily_states ds
SET
  current_segment = pds.current_segment,
  hours_remaining = pds.hours_remaining,
  hours_committed = COALESCE(pds.hours_committed, 0)
FROM player_day_state pds
WHERE pds.user_id = ds.user_id
  AND pds.day_index = ds.day_index;

COMMENT ON COLUMN daily_states.current_segment IS
  'Current segment for the player. Single source of truth; player_day_state holds historical per-day records but segment info is derived from here.';
COMMENT ON COLUMN daily_states.hours_remaining IS
  'Hours remaining in the current segment/day. Decremented by /api/time/advance.';
COMMENT ON COLUMN daily_states.hours_committed IS
  'Hours committed to the current day''s allocation. Unused during Chapter One; reserved for routine-week mode.';
