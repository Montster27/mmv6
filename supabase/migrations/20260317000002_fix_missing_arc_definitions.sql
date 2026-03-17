-- 20260317000002_fix_missing_arc_definitions.sql
-- arc_roommate, arc_academic, arc_belonging, arc_home were absent from the
-- remote arc_definitions table. Their storylets were inserted with arc_id=NULL
-- by 20260316000002. This migration:
--   1. Inserts the four missing arc definitions (idempotent via ON CONFLICT)
--   2. Patches the ten storylets that have arc_id=NULL

BEGIN;

-- ── 1. Ensure all six stream arc definitions exist ──────────────────────────

INSERT INTO public.arc_definitions (key, title, description, tags, is_enabled)
VALUES
  (
    'arc_roommate',
    'The Roommate',
    'A relationship you didn''t choose. The housing office did.',
    '["relationship","arc_one"]'::jsonb,
    true
  ),
  (
    'arc_academic',
    'Academic Footing',
    'You were good at school. Or you weren''t. Either way, what that meant back home no longer applies here.',
    '["academic","arc_one"]'::jsonb,
    true
  ),
  (
    'arc_belonging',
    'Finding Your People',
    'The orientation fair is on the quad. Too many tables. Not enough information to choose intelligently.',
    '["belonging","arc_one"]'::jsonb,
    true
  ),
  (
    'arc_home',
    'Something From Home',
    'You left. That was the choice. But leaving doesn''t mean it stopped.',
    '["family","arc_one"]'::jsonb,
    true
  )
ON CONFLICT (key) DO UPDATE SET is_enabled = true;

-- ── 2. Patch storylets that were inserted with arc_id=NULL ───────────────────

-- arc_roommate storylets
UPDATE public.storylets
SET arc_id = (SELECT id FROM public.arc_definitions WHERE key = 'arc_roommate')
WHERE arc_id IS NULL
  AND step_key IN ('room_212_morning', 'roommate_moment');

-- arc_academic storylets
UPDATE public.storylets
SET arc_id = (SELECT id FROM public.arc_definitions WHERE key = 'arc_academic')
WHERE arc_id IS NULL
  AND step_key IN ('first_class', 'library_afternoon');

-- arc_belonging storylets
UPDATE public.storylets
SET arc_id = (SELECT id FROM public.arc_definitions WHERE key = 'arc_belonging')
WHERE arc_id IS NULL
  AND step_key IN (
    'dining_first_dinner',
    'floor_meeting',
    'orientation_fair',
    'cal_midnight_knock',
    'miguel_floor_invite'
  );

-- arc_home storylets
UPDATE public.storylets
SET arc_id = (SELECT id FROM public.arc_definitions WHERE key = 'arc_home')
WHERE arc_id IS NULL
  AND step_key IN ('parent_dorm_phone');

COMMIT;
