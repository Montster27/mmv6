-- Sync legacy default_next_step_key column with the engine-canonical default_next_key.
--
-- History: The DB has two columns for the same concept:
--   default_next_step_key  — legacy, from the arc_steps era (migration 0089)
--   default_next_key       — current, added in 20260324100000_unify_tracks_and_storylets
--
-- Content Studio admin API was reading/writing default_next_step_key while the
-- engine reads default_next_key. This caused silent drift: edits in Content Studio
-- were invisible to the engine, and engine-side fixes (like the evening_choice
-- NULL fix in 20260402000003) didn't update the legacy column.
--
-- Fix: Copy default_next_key (the engine source of truth) into default_next_step_key
-- so both columns agree. Going forward, the admin API writes default_next_key directly.

-- 1. Sync: set legacy column = engine column everywhere
UPDATE public.storylets
SET default_next_step_key = default_next_key
WHERE default_next_step_key IS DISTINCT FROM default_next_key;

-- 2. Remove orphaned storylet s_d1_bench_glenn (no track_id, no chain references,
--    unreachable since the Day 1 content rewrite in 20260330000001)
DELETE FROM public.storylets
WHERE slug = 's_d1_bench_glenn';
