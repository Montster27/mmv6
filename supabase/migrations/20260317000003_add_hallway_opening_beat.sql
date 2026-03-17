-- 20260317000003_add_hallway_opening_beat.sql
-- Adds 'hallway_arrival' as the first beat in arc_roommate (order_index=0).
-- Single-choice scene-setter that advances to room_212_morning.
-- Also shifts room_212_morning and roommate_moment order_index up by 1.

BEGIN;

-- Shift existing arc_roommate steps up to make room for order_index=0
UPDATE public.storylets
SET order_index = order_index + 1
WHERE arc_id = (SELECT id FROM public.arc_definitions WHERE key = 'arc_roommate')
  AND step_key IN ('room_212_morning', 'roommate_moment');

-- Insert The Hallway as arc_roommate step 0
INSERT INTO public.storylets (
  slug, title, body, choices, tags, requirements, weight, is_active,
  introduces_npc, arc_id, step_key, order_index, due_offset_days,
  expires_after_days, default_next_step_key
)
VALUES (
  's01_hallway_arrival',
  'The Hallway',
  E'The hallway smells like industrial cleaner and someone else''s shampoo. Doors propped open with sneakers and milk crates. A hand-written banner — "Welcome Class of ''87" — droops from a strip of masking tape over the common room door.\n\nSomewhere behind a closed door, someone''s boom box is playing a song you almost recognize. You can''t name it, but you know the next three notes before they come. The feeling passes before you can hold it.\n\nYour room number is written on the paper schedule folded in your back pocket. Second floor, end of the hall. The door is already open.',
  '[
    {
      "id": "go_in",
      "label": "Go in",
      "time_cost": 0, "energy_cost": 0,
      "outcome": { "text": "", "deltas": { "energy": 0, "stress": 0 } },
      "reaction_text": "The door swings open. Your roommate''s side is already claimed.",
      "identity_tags": [],
      "relational_effects": {}, "set_npc_memory": {}, "precludes": [],
      "events_emitted": [],
      "sets_stream_state": null, "next_step_key": "room_212_morning"
    }
  ]'::jsonb,
  ARRAY['arc_one', 'roommate', 'onboarding'],
  '{}'::jsonb,
  250, true,
  ARRAY[]::text[],
  (SELECT id FROM public.arc_definitions WHERE key = 'arc_roommate'),
  'hallway_arrival', 0, 0, 1, 'room_212_morning'
)
ON CONFLICT (arc_id, step_key) WHERE arc_id IS NOT NULL DO UPDATE SET
  title = EXCLUDED.title, body = EXCLUDED.body,
  choices = EXCLUDED.choices, is_active = EXCLUDED.is_active,
  order_index = EXCLUDED.order_index;

COMMIT;
