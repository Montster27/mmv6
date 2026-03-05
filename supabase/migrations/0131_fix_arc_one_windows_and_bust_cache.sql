-- Migration 0131: Fix Arc One day-window gaps and force content-stamp cache bust
--
-- Problems fixed:
--
-- 1. s5_roommate_tension (max_day_index: 5) and s6_day2_consequence
--    (max_day_index: 5) could surface as late as day 5.  s6 is contextually
--    titled "Day 2 Consequence" — showing it on day 5 is jarring.
--    Fix: tighten s5 to max_day_index 3 (a day 1-2 arc beat) and give s6
--    a proper min_day_index 2 / max_day_index 4 window so it always arrives
--    the day after the tension and expires before day 5.
--
-- 2. Migrations 0122 (max_total_runs on s7-s9/s11) and 0127
--    (max_total_runs + max_day_index on s1-s6/s10) updated the requirements
--    JSONB column but did NOT change updated_at.  The client-side storylet
--    catalog cache (localStorage, keyed on MAX(storylets.updated_at)) therefore
--    never detected a change, so players with a warm cache continued to see
--    stale storylets without the max_total_runs guard — causing one-shot
--    events (the room wake, orientation fair, etc.) to cycle back after the
--    7-day recentIds suppression window cleared.
--    Fix: touch updated_at = NOW() on every arc_one_core storylet so the
--    content stamp changes and every client cache is invalidated on next load.

-- ============================================================
-- 1. Tighten s5: roommate tension (Day 1-2 beat, not a day 5 event)
-- ============================================================
UPDATE public.storylets
SET
  requirements = (COALESCE(requirements, '{}'::jsonb) - 'max_day_index')
    || '{"max_day_index": 3}'::jsonb,
  updated_at   = NOW()
WHERE slug = 's5_roommate_tension';

-- ============================================================
-- 2. Tighten s6: day 2 consequence (should appear day 2-4 only)
-- ============================================================
UPDATE public.storylets
SET
  requirements = (COALESCE(requirements, '{}'::jsonb) - 'max_day_index')
    || '{"min_day_index": 2, "max_day_index": 4}'::jsonb,
  updated_at   = NOW()
WHERE slug = 's6_day2_consequence';

-- ============================================================
-- 3. Touch updated_at on all remaining arc_one_core storylets
--    so the content-stamp cache invalidates for every client.
--    (s5 and s6 are already touched above.)
-- ============================================================
UPDATE public.storylets
SET updated_at = NOW()
WHERE
  tags && ARRAY['arc_one_core']::text[]
  AND slug NOT IN ('s5_roommate_tension', 's6_day2_consequence');
