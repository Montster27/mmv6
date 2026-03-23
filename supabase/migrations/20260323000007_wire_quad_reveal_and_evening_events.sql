-- Wire new content into the arc system:
-- 1. s_quad_reveal → becomes arc_roommate beat 2 (after room_212_morning)
-- 2. Evening choice point → new arc_belonging beat for evening segment
--    with 3 mutually exclusive choices that link to standalone evening storylets
-- 3. Shift roommate_moment to beat 3

BEGIN;

-- ============================================================
-- 1. Wire s_quad_reveal into arc_roommate
-- ============================================================

-- First, shift roommate_moment from order_index=2 to 3
UPDATE public.storylets
SET order_index = 3
WHERE step_key = 'roommate_moment'
  AND arc_id = (SELECT id FROM public.arc_definitions WHERE key = 'arc_roommate');

-- Update room_212_morning to chain to quad_reveal instead of roommate_moment
UPDATE public.storylets
SET default_next_step_key = 'quad_reveal'
WHERE step_key = 'room_212_morning'
  AND arc_id = (SELECT id FROM public.arc_definitions WHERE key = 'arc_roommate');

-- Convert s_quad_reveal from standalone to arc_roommate beat 2
UPDATE public.storylets
SET
  arc_id = (SELECT id FROM public.arc_definitions WHERE key = 'arc_roommate'),
  step_key = 'quad_reveal',
  order_index = 2,
  due_offset_days = 0,
  expires_after_days = 1,
  default_next_step_key = 'roommate_moment',
  segment = 'morning',
  time_cost_hours = 1
WHERE slug = 's_quad_reveal';


-- ============================================================
-- 2. Create evening choice point in arc_belonging
-- ============================================================

-- The floor meeting (order_index=2) currently chains to orientation_fair.
-- Insert the evening choice point between them: floor_meeting → evening_choice → orientation_fair
-- Shift orientation_fair and cal_midnight_knock up by 1

UPDATE public.storylets
SET order_index = order_index + 1
WHERE arc_id = (SELECT id FROM public.arc_definitions WHERE key = 'arc_belonging')
  AND step_key IN ('orientation_fair', 'cal_midnight_knock');

-- Update floor_meeting to chain to evening_choice
UPDATE public.storylets
SET default_next_step_key = 'evening_choice'
WHERE step_key = 'floor_meeting'
  AND arc_id = (SELECT id FROM public.arc_definitions WHERE key = 'arc_belonging');

-- Insert the evening choice point
INSERT INTO public.storylets (
  slug, title, body, choices, tags, requirements, weight, is_active,
  introduces_npc, arc_id, step_key, order_index, due_offset_days,
  expires_after_days, default_next_step_key, segment, time_cost_hours
)
VALUES (
  's01_evening_choice',
  'The Evening',
  $$The floor meeting breaks up and the hallway fills with that post-organized-event energy — people who were just sitting in a circle now standing in doorways, plans forming in real time.

Three things are happening at once.

Down the hall, Cal's door is open and Van Halen is coming out of it at a volume that says nobody's told him to turn it down yet. You can hear bottles. Someone laughs. A guy you don't know leans out and says something about girls coming from Pemberton.

Closer, Miguel catches your eye from his doorway. He's holding up a deck of cards and a bag of microwave popcorn like evidence. "A few of us are playing cards. Nothing serious." He says it the way people say things when they mean them.

And near the stairwell, a group is pulling on jackets. One of them — Cal's friend Brendan — is talking about the Student Union Building. "They've got arcade cabinets. Pac-Man, Galaga, some new one nobody can beat." He's already heading for the stairs.

The hallway is loud and the evening is open and you have to pick one thing.$$,
  $$[
    {
      "id": "go_to_caps",
      "label": "Go in — you didn't come to college to sit in your room",
      "time_cost": 1, "energy_cost": 1,
      "identity_tags": ["risk", "people"],
      "precludes": ["s_evening_cards", "s_evening_sub"],
      "outcome": { "text": "", "deltas": { "energy": -1, "stress": -1 } },
      "reaction_text": "You walk toward the music. Cal points at you like he's been waiting.\n\nThe overhead light is off, replaced by a desk lamp draped with a towel that makes everything amber. Six or seven guys already, some sitting on the floor. Cal sets two Schlitz bottles on the carpet, ten feet apart, and explains the rules like they're constitutional law. You flick the cap — thumb and middle finger, snap release.\n\nThe girls from Pemberton show up around the third round — four of them, laughing about something that happened on the walk over.\n\nThe beer is bad and the room is loud and none of that matters because you are — for this specific window of time — exactly where you're supposed to be.\n\nTomorrow is going to hurt. You know this. You don't care yet.",
      "events_emitted": [
        { "npc_id": "npc_floor_cal", "type": "SHOWED_UP", "magnitude": 1 }
      ],
      "sets_stream_state": { "stream": "belonging", "state": "first_anchor" },
      "next_step_key": "orientation_fair"
    },
    {
      "id": "go_to_cards",
      "label": "Cards sound good — walk over to Miguel's room",
      "time_cost": 1, "energy_cost": 0,
      "identity_tags": ["people", "safety"],
      "precludes": ["s_evening_caps", "s_evening_sub"],
      "outcome": { "text": "", "deltas": { "energy": 0, "stress": -1 } },
      "reaction_text": "Miguel's room is two doors down. The door is already open. Three guys from the floor are sitting on the beds and the floor — there's no table, so someone's spread a towel on the carpet between them. A clock radio on the desk is playing something low enough to talk over.\n\nThe popcorn is already open. Nobody's drinking. This is the other version of the first night — the one that happens at a normal volume.\n\nYou sit on the floor and someone deals you in. The matching game is simple — pairs face-down on the towel, flip two at a time. A kid they call Spider is quietly destroying everyone and trying not to look pleased about it.\n\nThe cards become an excuse. The real game is the conversation that grows in the gaps between turns. By the time someone checks the clock and says \"it's one-thirty,\" you know four names and one of them matters.",
      "events_emitted": [
        { "npc_id": "npc_floor_miguel", "type": "SHOWED_UP", "magnitude": 1 }
      ],
      "sets_stream_state": { "stream": "belonging", "state": "first_anchor" },
      "next_step_key": "orientation_fair"
    },
    {
      "id": "go_to_sub",
      "label": "Tag along to the SUB — you want to see this place",
      "time_cost": 1, "energy_cost": 0,
      "identity_tags": ["risk", "achievement"],
      "precludes": ["s_evening_caps", "s_evening_cards"],
      "outcome": { "text": "", "deltas": { "energy": -1, "stress": 0 } },
      "reaction_text": "The walk across campus at night is different from the morning. Longer shadows. The buildings look older in the dark — the brick holds shadow differently, and the paths between them feel like they were designed for people who already knew where they were going.\n\nThe SUB game room is in the basement. Fluorescent lights and carpet that was installed during a previous administration. Four arcade cabinets against the far wall, a pool table nobody's using, and a vending machine that takes quarters and grudges.\n\nBrendan feeds a quarter into the machine at the end of the row. Green phosphor screen. A snake made of light.\n\nYou watch one round. Then you dig in your pocket for a quarter of your own. The game is simple and the screen is bright and for twenty minutes you don't think about anything except the next turn.\n\nYou discover a place. That's worth something — knowing where the SUB is, knowing what's in the basement, knowing that this exists when you need it.",
      "events_emitted": [],
      "sets_stream_state": { "stream": "belonging", "state": "first_anchor" },
      "next_step_key": "orientation_fair"
    }
  ]$$::jsonb,
  ARRAY['arc_one', 'belonging', 'evening', 'social'],
  '{}'::jsonb,
  200, true,
  ARRAY[]::text[],
  (SELECT id FROM public.arc_definitions WHERE key = 'arc_belonging'),
  'evening_choice', 3, 0, 1, 'orientation_fair',
  'evening', 1
)
ON CONFLICT (arc_id, step_key) WHERE arc_id IS NOT NULL DO UPDATE SET
  slug = EXCLUDED.slug, title = EXCLUDED.title, body = EXCLUDED.body,
  choices = EXCLUDED.choices, is_active = EXCLUDED.is_active,
  order_index = EXCLUDED.order_index, segment = EXCLUDED.segment,
  time_cost_hours = EXCLUDED.time_cost_hours,
  default_next_step_key = EXCLUDED.default_next_step_key;


COMMIT;
