-- 0141_assign_storylets_to_arcs.sql
-- Assign the 16 standalone arc-one storylets (imported from arc-one.json)
-- to their appropriate stream arcs based on stream tag / slug prefix.
-- These are narrative events that belong to an arc's theme but are NOT
-- timed FSM beats (step_key stays null). Order indexes start at 10 to
-- leave room below the existing beats (order_index 1–4 from 0138).

-- ── arc_roommate ──────────────────────────────────────────────────────────────
UPDATE public.storylets
SET arc_id = (SELECT id FROM public.arc_definitions WHERE key = 'arc_roommate' LIMIT 1),
    order_index = 10
WHERE slug = 's1_room_212_wake'
  AND arc_id IS NULL;

UPDATE public.storylets
SET arc_id = (SELECT id FROM public.arc_definitions WHERE key = 'arc_roommate' LIMIT 1),
    order_index = 20
WHERE slug = 's1_danny_first_conversation'
  AND arc_id IS NULL;

UPDATE public.storylets
SET arc_id = (SELECT id FROM public.arc_definitions WHERE key = 'arc_roommate' LIMIT 1),
    order_index = 30
WHERE slug = 's1_danny_music_friction'
  AND arc_id IS NULL;

UPDATE public.storylets
SET arc_id = (SELECT id FROM public.arc_definitions WHERE key = 'arc_roommate' LIMIT 1),
    order_index = 40
WHERE slug = 's1_danny_revealing_moment'
  AND arc_id IS NULL;

-- ── arc_academic ──────────────────────────────────────────────────────────────
UPDATE public.storylets
SET arc_id = (SELECT id FROM public.arc_definitions WHERE key = 'arc_academic' LIMIT 1),
    order_index = 10
WHERE slug = 's2_syllabus_moment'
  AND arc_id IS NULL;

UPDATE public.storylets
SET arc_id = (SELECT id FROM public.arc_definitions WHERE key = 'arc_academic' LIMIT 1),
    order_index = 20
WHERE slug = 's2_first_gap'
  AND arc_id IS NULL;

-- ── arc_money ─────────────────────────────────────────────────────────────────
UPDATE public.storylets
SET arc_id = (SELECT id FROM public.arc_definitions WHERE key = 'arc_money' LIMIT 1),
    order_index = 10
WHERE slug = 's3_bookstore_line'
  AND arc_id IS NULL;

UPDATE public.storylets
SET arc_id = (SELECT id FROM public.arc_definitions WHERE key = 'arc_money' LIMIT 1),
    order_index = 20
WHERE slug = 's3_pizza_social'
  AND arc_id IS NULL;

UPDATE public.storylets
SET arc_id = (SELECT id FROM public.arc_definitions WHERE key = 'arc_money' LIMIT 1),
    order_index = 30
WHERE slug = 's3_money_friction_event'
  AND arc_id IS NULL;

-- ── arc_belonging ─────────────────────────────────────────────────────────────
UPDATE public.storylets
SET arc_id = (SELECT id FROM public.arc_definitions WHERE key = 'arc_belonging' LIMIT 1),
    order_index = 10
WHERE slug = 's4_orientation_fair'
  AND arc_id IS NULL;

UPDATE public.storylets
SET arc_id = (SELECT id FROM public.arc_definitions WHERE key = 'arc_belonging' LIMIT 1),
    order_index = 20
WHERE slug = 's4_floor_social'
  AND arc_id IS NULL;

-- ── arc_opportunity ───────────────────────────────────────────────────────────
UPDATE public.storylets
SET arc_id = (SELECT id FROM public.arc_definitions WHERE key = 'arc_opportunity' LIMIT 1),
    order_index = 10
WHERE slug = 's5_opportunity_noticed'
  AND arc_id IS NULL;

UPDATE public.storylets
SET arc_id = (SELECT id FROM public.arc_definitions WHERE key = 'arc_opportunity' LIMIT 1),
    order_index = 20
WHERE slug = 's5_newspaper_pitch'
  AND arc_id IS NULL;

UPDATE public.storylets
SET arc_id = (SELECT id FROM public.arc_definitions WHERE key = 'arc_opportunity' LIMIT 1),
    order_index = 30
WHERE slug = 's5_opportunity_expired'
  AND arc_id IS NULL;

-- ── arc_home ──────────────────────────────────────────────────────────────────
UPDATE public.storylets
SET arc_id = (SELECT id FROM public.arc_definitions WHERE key = 'arc_home' LIMIT 1),
    order_index = 10
WHERE slug = 's6_first_contact_home'
  AND arc_id IS NULL;

UPDATE public.storylets
SET arc_id = (SELECT id FROM public.arc_definitions WHERE key = 'arc_home' LIMIT 1),
    order_index = 20
WHERE slug = 's6_home_contrast_moment'
  AND arc_id IS NULL;
