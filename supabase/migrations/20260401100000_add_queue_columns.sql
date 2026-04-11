-- Engine queue migration: pool-based storylet selection
--
-- Adds two columns to track_progress:
--   resolved_storylet_keys  — keys of storylets the user has already resolved on this track
--   next_key_override       — when set, serve this storylet next (bypasses pool scan)
--
-- Backward-compat strategy for existing rows:
--   1. Populate resolved_storylet_keys from choice_log.step_key (which stores
--      the storylet_key of each resolved storylet).
--   2. Set next_key_override = current_storylet_key for all ACTIVE rows so the
--      in-progress chain pointer is preserved as an explicit override.

ALTER TABLE track_progress
  ADD COLUMN IF NOT EXISTS resolved_storylet_keys text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS next_key_override text DEFAULT NULL;

-- Populate resolved_storylet_keys from existing choice_log history.
-- choice_log.step_key is written by the resolve route as progressRow.current_storylet_key
-- (the key of the storylet that was just resolved).
UPDATE track_progress tp
SET resolved_storylet_keys = subq.keys
FROM (
  SELECT
    cl.user_id,
    cl.track_id,
    array_agg(DISTINCT cl.step_key) AS keys
  FROM choice_log cl
  WHERE cl.event_type = 'STORYLET_RESOLVED'
    AND cl.step_key IS NOT NULL
    AND cl.step_key != ''
  GROUP BY cl.user_id, cl.track_id
) subq
WHERE tp.user_id = subq.user_id
  AND tp.track_id = subq.track_id;

-- Set next_key_override = current_storylet_key for all ACTIVE rows.
-- This preserves the existing chain pointer as an explicit override so that
-- in-progress players continue exactly where they left off.
UPDATE track_progress
SET next_key_override = current_storylet_key
WHERE state = 'ACTIVE'
  AND current_storylet_key IS NOT NULL
  AND current_storylet_key != '';
