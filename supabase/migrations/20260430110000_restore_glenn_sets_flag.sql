-- T-1777564800228 — Restore sets_flag on head_to_evening choice of glenn_pastime_paradise.
--
-- The 04-17 migration (20260417100001_add_sets_flag_to_choices.sql) applied this same
-- patch, but a subsequent content mutation around 2026-04-23 dropped the field from
-- the live row. Without it, glenn_gave_direction never gets written to choice_log on
-- resolve, so terminal_first_visit (requires_flag: glenn_gave_direction) is never
-- served — breaking the entire Glenn → Terminal → Walk arc.
--
-- This migration is idempotent: it only updates rows where sets_flag is missing on
-- choices[0], so re-running on a healthy DB is a no-op.
--
-- The deeper question of WHY the 04-17 patch got clobbered (Content Studio overwrite?
-- broader UPDATE in another migration?) is filed as a follow-up; this migration
-- restores the load-bearing flag write.

UPDATE storylets
SET choices = jsonb_set(
  choices,
  '{0,sets_flag}',
  '["glenn_gave_direction"]'::jsonb
)
WHERE storylet_key = 'glenn_pastime_paradise'
  AND NOT (choices->0 ? 'sets_flag');
