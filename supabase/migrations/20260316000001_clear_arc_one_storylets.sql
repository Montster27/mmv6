-- Clear all existing arc_one storylets from the database.
-- Run before seeding the new Week 1 content.

BEGIN;

DELETE FROM public.storylets
WHERE arc_id IN (
  SELECT id FROM public.arc_definitions
  WHERE key IN (
    'arc_roommate', 'arc_academic', 'arc_money',
    'arc_belonging', 'arc_people', 'arc_opportunity', 'arc_home'
  )
);

COMMIT;
