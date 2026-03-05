-- Migration 0130: Slide s18-s27 day windows back to bridge Days 5-10
--
-- Problem: Even after 0129 (Week 2 min_day fix), Days 5-10 still exhaust
-- the arc_one_core pool. There are 17 one-shot storylets (s1-s17) for
-- 10 days × 3 slots = 30 potential slots. By Day 5 most are spent.
-- s18-s27 had min_day_index 11-18 so they couldn't rescue Days 5-10.
--
-- Fix: Shift s18-s27 windows back ~6 days. NPC gates (requires_npc_met)
-- already enforce ordering — Marsh is met in s7, Cal/Dana from s8/s11/Day1,
-- Jordan from s9, Miguel from s3/s9. The day window is just the floor.
--
-- New schedule (min → max):
--   s18 The Paper:           5 → 8   (was 11 → 13) requires Marsh
--   s19 The Knock (Cal):     5 → 9   (was 11 → 14) no NPC req
--   s20 The Radio Station:   6 → 9   (was 12 → 15) requires Jordan
--   s21 Section 3B (Priya):  6 → 10  (was 13 → 16) requires Priya
--   s22 The Invitation:      7 → 10  (was 14 → 17) requires Dana (met Day 1)
--   s23 The Red Sentence:    8 → 11  (was 15 → 18) requires Marsh
--   s24 The Shore (Miguel):  8 → 11  (was 15 → 18) requires Miguel
--   s25 The Pay Phone:       9 → 12  (was 17 → 20) no NPC req
--   s26 The Same Table:     10 → 13  (was 18 → 21) no NPC req
--   s27 The Question:       10 → 14  (was 18 → 22) requires Jordan

UPDATE public.storylets
SET requirements = requirements || '{"min_day_index": 5, "max_day_index": 8}'::jsonb
WHERE slug = 's18_the_paper';

UPDATE public.storylets
SET requirements = requirements || '{"min_day_index": 5, "max_day_index": 9}'::jsonb
WHERE slug = 's19_cal_bad_night';

UPDATE public.storylets
SET requirements = requirements || '{"min_day_index": 6, "max_day_index": 9}'::jsonb
WHERE slug = 's20_radio_station';

UPDATE public.storylets
SET requirements = requirements || '{"min_day_index": 6, "max_day_index": 10}'::jsonb
WHERE slug = 's21_priya_form';

UPDATE public.storylets
SET requirements = requirements || '{"min_day_index": 7, "max_day_index": 10}'::jsonb
WHERE slug = 's22_dana_invitation';

UPDATE public.storylets
SET requirements = requirements || '{"min_day_index": 8, "max_day_index": 11}'::jsonb
WHERE slug = 's23_marsh_returns_paper';

UPDATE public.storylets
SET requirements = requirements || '{"min_day_index": 8, "max_day_index": 11}'::jsonb
WHERE slug = 's24_miguel_road_trip';

UPDATE public.storylets
SET requirements = requirements || '{"min_day_index": 9, "max_day_index": 12}'::jsonb
WHERE slug = 's25_parent_call_2';

UPDATE public.storylets
SET requirements = requirements || '{"min_day_index": 10, "max_day_index": 13}'::jsonb
WHERE slug = 's26_late_library';

UPDATE public.storylets
SET requirements = requirements || '{"min_day_index": 10, "max_day_index": 14}'::jsonb
WHERE slug = 's27_jordan_question';
