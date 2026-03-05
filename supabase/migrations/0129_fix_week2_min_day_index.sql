-- Migration 0129: Fix Week 2 storylet min_day_index to prevent pool exhaustion
--
-- Problem: arc_one_core pool is limited to s1-s11 (11 one-shot storylets) for
-- Days 1-5. Over 5 days × 3 slots = 15 total slots, only 11 have content.
-- By Day 3-4 the pool runs dry and selectStorylets pads to 3 with
-- fallbackStorylet(), producing the "Corrupted Storylet" error.
--
-- Root cause: s12-s17 (Week 2) have min_day_index: 6, so they cannot
-- rescue Days 3-5. Their NPC gates (requires_npc_met) are the real guard
-- that prevents them from appearing before the player has met those characters.
-- The day gate is redundant and overly conservative.
--
-- Fix: lower min_day_index on s12-s17 so they enter the eligible pool
-- from Day 3-4 onward. The NPC requirements still enforce proper ordering.

-- s12: Study Group Invite — requires Priya (met in s7 / first class)
UPDATE public.storylets
SET requirements = requirements || '{"min_day_index": 3}'::jsonb
WHERE slug = 's12_study_group_invite';

-- s13: The Party — requires Miguel (met in s3 dining hall or s9 orientation fair)
UPDATE public.storylets
SET requirements = requirements || '{"min_day_index": 3}'::jsonb
WHERE slug = 's13_miguel_party_invite';

-- s14: Office Hours — requires Marsh (met in s7 / first class)
UPDATE public.storylets
SET requirements = requirements || '{"min_day_index": 3}'::jsonb
WHERE slug = 's14_marsh_office_hours';

-- s15: Room Tension with Dana — requires Dana (met from Day 1)
-- Keep slightly later since conflict needs time to develop
UPDATE public.storylets
SET requirements = requirements || '{"min_day_index": 4}'::jsonb
WHERE slug = 's15_dana_small_conflict';

-- s16: Jordan First Real Talk — requires Jordan (met in s9 / orientation fair)
UPDATE public.storylets
SET requirements = requirements || '{"min_day_index": 4}'::jsonb
WHERE slug = 's16_jordan_first_talk';

-- s17: Campus Job Table — no NPC requirement, just a day window
UPDATE public.storylets
SET requirements = requirements || '{"min_day_index": 4}'::jsonb
WHERE slug = 's17_campus_job_table';
