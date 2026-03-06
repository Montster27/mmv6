-- Migration 0127: Fix missing gates on early Arc One storylets
--
-- Problem: s1-s6 (arc_one_core Day 1-2 chain) and s10 (first parent call,
-- Day 3-4) were never given max_total_runs: 1 or max_day_index caps.
-- After the 7-day recentIds suppression window expires these storylets
-- re-enter the eligible pool and surface again on Day 5+ (confirmed bug).
--
-- Migration 0122 already protected s7, s8, s9, s11 as one-shots.
-- This migration closes the remaining gaps.
--
-- Strategy:
--   max_total_runs: 1   -- hard lifetime cap; once played, never again
--   max_day_index: N    -- belt-and-suspenders: also locks them to their
--                          natural window so they cannot appear late even
--                          if a player somehow has no run record.

-- ============================================================
-- s1: Dorm Wake / Dislocation (Day 1 opening -- unrepeatable)
-- ============================================================
UPDATE public.storylets
SET requirements = COALESCE(requirements, '{}'::jsonb)
  || '{"max_total_runs": 1, "max_day_index": 3}'::jsonb
WHERE slug = 's1_dorm_wake_dislocation';

-- ============================================================
-- s2: Hall Phone (Day 1 -- first call moment, unrepeatable)
-- ============================================================
UPDATE public.storylets
SET requirements = COALESCE(requirements, '{}'::jsonb)
  || '{"max_total_runs": 1, "max_day_index": 3}'::jsonb
WHERE slug = 's2_hall_phone';

-- ============================================================
-- s3: Dining Hall (Day 1 -- first meal, unrepeatable)
-- ============================================================
UPDATE public.storylets
SET requirements = COALESCE(requirements, '{}'::jsonb)
  || '{"max_total_runs": 1, "max_day_index": 4}'::jsonb
WHERE slug = 's3_dining_hall';

-- ============================================================
-- s4: Midday Choice (Day 1 -- bookstore/walk/room fork, unrepeatable)
-- ============================================================
UPDATE public.storylets
SET requirements = COALESCE(requirements, '{}'::jsonb)
  || '{"max_total_runs": 1, "max_day_index": 4}'::jsonb
WHERE slug = 's4_midday_choice';

-- ============================================================
-- s5: Roommate Tension (Day 1-2 -- first tension beat, unrepeatable)
-- ============================================================
UPDATE public.storylets
SET requirements = COALESCE(requirements, '{}'::jsonb)
  || '{"max_total_runs": 1, "max_day_index": 5}'::jsonb
WHERE slug = 's5_roommate_tension';

-- ============================================================
-- s6: Day 2 Consequence (Day 2 -- consequence beat, unrepeatable)
-- ============================================================
UPDATE public.storylets
SET requirements = COALESCE(requirements, '{}'::jsonb)
  || '{"max_total_runs": 1, "max_day_index": 5}'::jsonb
WHERE slug = 's6_day2_consequence';

-- ============================================================
-- s10: Parent Call Week 1 (Day 3-4 -- first call home, unrepeatable)
-- s25 (migration 0126) is the second call home at Day 17+.
-- ============================================================
UPDATE public.storylets
SET requirements = COALESCE(requirements, '{}'::jsonb)
  || '{"max_total_runs": 1, "max_day_index": 6}'::jsonb
WHERE slug = 's10_parent_call_w1';
