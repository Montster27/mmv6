-- ================================================================
-- Week 2 Content Brief — Part 2: Activity Roster Expansion
--
-- 1. Adds `segment_lock TEXT[]` column to routine_activities.
-- 2. Updates the 6 existing seeded activities with segment locks
--    derived from their flavor (classes span morning+afternoon,
--    running is morning, herald is evening, etc.).
-- 3. Seeds 8 new activities spanning morning, afternoon, evening.
--
-- Idempotent (IF NOT EXISTS on the column; ON CONFLICT on the seeds).
-- Reversible (see DROP block at the end).
-- ================================================================

-- ----------------------------------------------------------------
-- 1. Add segment_lock column.
--    NULL / empty means unrestricted (backward compatible).
-- ----------------------------------------------------------------
ALTER TABLE public.routine_activities
  ADD COLUMN IF NOT EXISTS segment_lock TEXT[] DEFAULT NULL;

-- ----------------------------------------------------------------
-- 2. Backfill segment_lock on the 6 existing seeded activities.
--    Keys: attend_classes, library_study, herald_meetings,
--          dorm_floor_time, running, library_shift
-- ----------------------------------------------------------------
UPDATE public.routine_activities
   SET segment_lock = ARRAY['morning','afternoon']
 WHERE activity_key = 'attend_classes';

UPDATE public.routine_activities
   SET segment_lock = ARRAY['afternoon']
 WHERE activity_key = 'library_study';

UPDATE public.routine_activities
   SET segment_lock = ARRAY['evening']
 WHERE activity_key = 'herald_meetings';

UPDATE public.routine_activities
   SET segment_lock = ARRAY['evening']
 WHERE activity_key = 'dorm_floor_time';

UPDATE public.routine_activities
   SET segment_lock = ARRAY['morning']
 WHERE activity_key = 'running';

UPDATE public.routine_activities
   SET segment_lock = ARRAY['afternoon','evening']
 WHERE activity_key = 'library_shift';

-- ----------------------------------------------------------------
-- 3. Seed 8 new activities.
--    Using the project's actual schema:
--      display_name    (not title)
--      flavor_text     (not description)
--      requirements    (not gate_requires)
--      npc_deposits    + skill_practice_ids (not a single deposits blob)
--    half_day_cost = 1 for all new rows.
-- ----------------------------------------------------------------
INSERT INTO public.routine_activities
  (activity_key, display_name, category, half_day_cost, requirements,
   npc_deposits, skill_practice_ids, flavor_text, interruption_hooks, segment_lock)
VALUES
  (
    'western_civ_reading',
    'Western Civ Reading',
    'academic',
    1,
    NULL,
    '[]'::jsonb,
    ARRAY['study_discipline', 'close_reading'],
    'Pages 1-38 aren''t going to read themselves. The library has a copy on reserve if you forgot to buy the textbook.',
    ARRAY['academic_threshold'],
    ARRAY['morning']
  ),
  (
    'call_home',
    'Call Home',
    'social',
    1,
    NULL,
    '[{"npc_id": "npc_parent_voice", "type": "SHOWED_UP", "magnitude": 1}]'::jsonb,
    ARRAY[]::TEXT[],
    'The hallway phone has a long cord. You can almost reach your room if you stretch.',
    ARRAY[]::TEXT[],
    ARRAY['morning']
  ),
  (
    'floor_hangout',
    'Floor Hangout',
    'social',
    1,
    NULL,
    '[{"npc_id": "npc_floor_doug", "type": "SHOWED_UP", "magnitude": 1}]'::jsonb,
    ARRAY['small_talk'],
    'Doors open, someone has cards, someone has a TV. The low-effort version of belonging.',
    ARRAY['floor_social'],
    ARRAY['evening']
  ),
  (
    'music_practice',
    'Music Practice',
    'creative',
    1,
    NULL,
    '[]'::jsonb,
    ARRAY['musical_ear'],
    'Your roommate''s out. The room is yours. Headphones on, cassette in, air guitar or the real thing.',
    ARRAY[]::TEXT[],
    ARRAY['evening']
  ),
  (
    'explore_campus',
    'Explore Campus',
    'practical',
    1,
    NULL,
    '[]'::jsonb,
    ARRAY[]::TEXT[],
    'There are buildings you haven''t been inside. Paths you haven''t walked. A campus map is just a suggestion.',
    ARRAY[]::TEXT[],
    ARRAY['afternoon']
  ),
  (
    'free_time',
    'Free Time',
    'practical',
    1,
    NULL,
    '[]'::jsonb,
    ARRAY[]::TEXT[],
    'Nothing scheduled. Rest, read a magazine, stare at the ceiling. Sometimes doing nothing is the most productive thing.',
    ARRAY[]::TEXT[],
    ARRAY['morning','afternoon','evening']
  ),
  (
    'volunteer_committee',
    'Student Volunteer Committee',
    'social',
    1,
    NULL,
    '[]'::jsonb,
    ARRAY['small_talk'],
    'A sign-up sheet on the Student Union bulletin board. Orientation week cleanup, campus tour guides, blood drive help.',
    ARRAY[]::TEXT[],
    ARRAY['afternoon']
  ),
  (
    'arpanet_terminal',
    'ARPANET Terminal',
    'academic',
    1,
    '{"requires_flag": "found_terminal"}'::jsonb,
    '[]'::jsonb,
    ARRAY['critical_analysis'],
    'The basement of Whitmore Hall. Green phosphor glow. Nobody else is here at this hour.',
    ARRAY[]::TEXT[],
    ARRAY['evening']
  )
ON CONFLICT (activity_key) DO UPDATE SET
  display_name       = EXCLUDED.display_name,
  category           = EXCLUDED.category,
  half_day_cost      = EXCLUDED.half_day_cost,
  requirements       = EXCLUDED.requirements,
  npc_deposits       = EXCLUDED.npc_deposits,
  skill_practice_ids = EXCLUDED.skill_practice_ids,
  flavor_text        = EXCLUDED.flavor_text,
  interruption_hooks = EXCLUDED.interruption_hooks,
  segment_lock       = EXCLUDED.segment_lock;

-- ----------------------------------------------------------------
-- Rollback (uncomment to reverse)
-- ----------------------------------------------------------------
-- DELETE FROM public.routine_activities WHERE activity_key IN (
--   'western_civ_reading','call_home','floor_hangout','music_practice',
--   'explore_campus','free_time','volunteer_committee','arpanet_terminal'
-- );
-- ALTER TABLE public.routine_activities DROP COLUMN IF EXISTS segment_lock;
