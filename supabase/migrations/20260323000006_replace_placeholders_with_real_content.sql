-- Replace test placeholders with real Day 1+ content.
-- Fixes: gender pronouns (Dana he/him, Scott replaces Sandra),
-- NPC IDs (npc_ra_scott), adds segment + time_cost_hours fields.
--
-- Deletes the two placeholder beats from 20260319000003, then
-- upserts all 13 week-1 storylets with corrected content.

BEGIN;

-- ── 1. Delete placeholder beats ──────────────────────────────────────────────

DELETE FROM public.storylets
WHERE slug IN ('test_morning_beat', 'test_evening_beat');

-- ── 2. Delete any leftover week-1 arc storylets (clean slate) ────────────────

DELETE FROM public.storylets
WHERE arc_id IN (
  SELECT id FROM public.arc_definitions
  WHERE key IN (
    'arc_roommate', 'arc_academic', 'arc_money',
    'arc_belonging', 'arc_people', 'arc_opportunity', 'arc_home'
  )
);

-- ============================================================
-- ROOMMATE STREAM — Beat 0: The Hallway (Day 1 Morning)
-- ============================================================
INSERT INTO public.storylets (
  slug, title, body, choices, tags, requirements, weight, is_active,
  introduces_npc, arc_id, step_key, order_index, due_offset_days,
  expires_after_days, default_next_step_key, segment, time_cost_hours
)
VALUES (
  's01_hallway_arrival',
  'The Hallway',
  E'The hallway smells like industrial cleaner and someone else''s shampoo. Doors propped open with sneakers and milk crates. A hand-written banner — "Welcome Class of ''87" — droops from a strip of masking tape over the common room door.\n\nSomewhere behind a closed door, someone''s blaster is playing a song you almost recognize. You can''t name it, but you know the next three notes before they come. The feeling passes before you can hold it.\n\nYour room number is written on the paper schedule folded in your back pocket. Second floor, end of the hall. The door is already open.',
  $$[
    {
      "id": "go_in",
      "label": "Go in",
      "time_cost": 0, "energy_cost": 0,
      "outcome": { "text": "", "deltas": { "energy": 0, "stress": 0 } },
      "reaction_text": "The door swings open. Your roommate's side is already claimed.",
      "identity_tags": [],
      "relational_effects": {}, "set_npc_memory": {}, "precludes": [],
      "events_emitted": [],
      "sets_stream_state": null, "next_step_key": "room_212_morning"
    }
  ]$$::jsonb,
  ARRAY['arc_one', 'roommate', 'onboarding'],
  '{}'::jsonb,
  250, true,
  ARRAY[]::text[],
  (SELECT id FROM public.arc_definitions WHERE key = 'arc_roommate'),
  'hallway_arrival', 0, 0, 1, 'room_212_morning',
  'morning', 0
)
ON CONFLICT (arc_id, step_key) WHERE arc_id IS NOT NULL DO UPDATE SET
  slug = EXCLUDED.slug, title = EXCLUDED.title, body = EXCLUDED.body,
  choices = EXCLUDED.choices, is_active = EXCLUDED.is_active,
  order_index = EXCLUDED.order_index, segment = EXCLUDED.segment,
  time_cost_hours = EXCLUDED.time_cost_hours;


-- ============================================================
-- ROOMMATE STREAM — Beat 1: Room 212 (Day 1 Morning)
-- Gender-corrected: Dana is male (he/him)
-- ============================================================
INSERT INTO public.storylets (
  slug, title, body, choices, tags, requirements, weight, is_active,
  introduces_npc, arc_id, step_key, order_index, due_offset_days,
  expires_after_days, default_next_step_key, segment, time_cost_hours
)
VALUES (
  's01_room_212_morning',
  'Room 212',
  E'The ceiling is unfamiliar.\n\nNot the smell. Not the light through the curtains. The ceiling. It''s the wrong texture.\n\nDana''s side is already in order. A framed photo he placed face-down during unpacking and turned right-side-up this morning while you were still half-asleep. His bed is made with the precision of someone who does it automatically rather than someone who cares about it. His alarm clock is already set for tomorrow.\n\nOn your whiteboard by the door, in your handwriting from last night: nothing. You haven''t written anything yet.\n\nYou have been in this room for fourteen hours.',
  $$[
    {
      "id": "intro_hand",
      "label": "Cross the room, hold out your hand",
      "time_cost": 0, "energy_cost": 0,
      "outcome": { "text": "", "deltas": { "energy": -1, "stress": -1 } },
      "reaction_text": "Dana looks up. Something quick checks in his expression — the calculation of whether you're going to be someone he has to manage. He shakes your hand. \"Dana.\"",
      "identity_tags": ["people", "confront"],
      "relational_effects": {}, "set_npc_memory": {}, "precludes": [],
      "events_emitted": [{ "npc_id": "npc_roommate_dana", "type": "INTRODUCED_SELF", "magnitude": 1 }],
      "sets_stream_state": null, "next_step_key": null
    },
    {
      "id": "grab_bag",
      "label": "Grab your toiletry bag and get to the bathroom before it's crowded",
      "time_cost": 0, "energy_cost": 0,
      "outcome": { "text": "", "deltas": { "energy": 0, "stress": 1 } },
      "reaction_text": "The hallway is still quiet. You're out before you have to decide anything about the room. When you get back, he's gone. His bed is still made.",
      "identity_tags": ["avoid", "safety"],
      "relational_effects": {}, "set_npc_memory": {}, "precludes": [],
      "events_emitted": [],
      "sets_stream_state": null, "next_step_key": null
    },
    {
      "id": "hey_across_room",
      "label": "\"Hey.\" From across the room.",
      "time_cost": 0, "energy_cost": 0,
      "outcome": { "text": "", "deltas": { "energy": 0, "stress": 0 } },
      "reaction_text": "He gives you a small nod. \"Hey.\" He goes back to unpacking.",
      "identity_tags": [],
      "relational_effects": {}, "set_npc_memory": {}, "precludes": [],
      "events_emitted": [{ "npc_id": "npc_roommate_dana", "type": "NOTICED_FACE", "magnitude": 1 }],
      "sets_stream_state": null, "next_step_key": null
    }
  ]$$::jsonb,
  ARRAY['arc_one', 'roommate', 'onboarding'],
  '{}'::jsonb,
  200, true,
  ARRAY[]::text[],
  (SELECT id FROM public.arc_definitions WHERE key = 'arc_roommate'),
  'room_212_morning', 1, 0, NULL, 'roommate_moment',
  'morning', 1
)
ON CONFLICT (arc_id, step_key) WHERE arc_id IS NOT NULL DO UPDATE SET
  slug = EXCLUDED.slug, title = EXCLUDED.title, body = EXCLUDED.body,
  choices = EXCLUDED.choices, is_active = EXCLUDED.is_active,
  order_index = EXCLUDED.order_index, segment = EXCLUDED.segment,
  time_cost_hours = EXCLUDED.time_cost_hours;


-- ============================================================
-- ROOMMATE STREAM — Beat 2: The Ordinary Evening (Day 4–7)
-- Gender-corrected: Dana is male (he/him)
-- ============================================================
INSERT INTO public.storylets (
  slug, title, body, choices, tags, requirements, weight, is_active,
  introduces_npc, arc_id, step_key, order_index, due_offset_days,
  expires_after_days, default_next_step_key, segment, time_cost_hours
)
VALUES (
  's05_roommate_moment',
  'The Ordinary Evening',
  E'It happens on one of the ordinary evenings.\n\nYou''re both at your desks. He''s making something in the hot pot — technically against the rules, which both of you know and neither of you has said anything about. The room smells like whatever he''s making. Coffee, probably.\n\nThe hot pot makes a small sound. Neither of you moves.',
  $$[
    {
      "id": "real_question",
      "label": "Ask him something you actually want to know",
      "time_cost": 0, "energy_cost": 0,
      "outcome": { "text": "", "deltas": { "energy": -1, "stress": -2 } },
      "reaction_text": "He turns from the hot pot. The answer he gives is longer than you expected. Then he asks something back. You talk for thirty-five minutes. By the end you've said something you didn't plan to. He goes back to the hot pot. The coffee is probably cold.",
      "identity_tags": ["confront", "people", "risk"],
      "relational_effects": {}, "set_npc_memory": {}, "precludes": [],
      "events_emitted": [{ "npc_id": "npc_roommate_dana", "type": "CONFIDED_IN", "magnitude": 1 }],
      "sets_stream_state": { "stream": "roommate", "state": "genuine_connection" },
      "next_step_key": null
    },
    {
      "id": "surface_talk",
      "label": "Mention the bookstore. Marsh's class. Something with a known answer.",
      "time_cost": 0, "energy_cost": 0,
      "outcome": { "text": "", "deltas": { "energy": 0, "stress": 0 } },
      "reaction_text": "He laughs at the right moment. You talk for a few minutes. Warm and surface-level. He goes back to his hot pot.",
      "identity_tags": ["people", "safety"],
      "relational_effects": {}, "set_npc_memory": {}, "precludes": [],
      "events_emitted": [{ "npc_id": "npc_roommate_dana", "type": "SMALL_KINDNESS", "magnitude": 1 }],
      "sets_stream_state": null, "next_step_key": null
    },
    {
      "id": "stay_quiet",
      "label": "Keep your eyes on your book.",
      "time_cost": 0, "energy_cost": 0,
      "outcome": { "text": "", "deltas": { "energy": 1, "stress": 0 } },
      "reaction_text": "He finishes his coffee. You finish your chapter. Lights out at eleven. The room is what it's been.",
      "identity_tags": ["avoid"],
      "relational_effects": {}, "set_npc_memory": {}, "precludes": [],
      "events_emitted": [],
      "sets_stream_state": null, "next_step_key": null
    }
  ]$$::jsonb,
  ARRAY['arc_one', 'roommate'],
  '{}'::jsonb,
  100, true,
  ARRAY[]::text[],
  (SELECT id FROM public.arc_definitions WHERE key = 'arc_roommate'),
  'roommate_moment', 2, 3, 4, NULL,
  'evening', 1
)
ON CONFLICT (arc_id, step_key) WHERE arc_id IS NOT NULL DO UPDATE SET
  slug = EXCLUDED.slug, title = EXCLUDED.title, body = EXCLUDED.body,
  choices = EXCLUDED.choices, is_active = EXCLUDED.is_active,
  order_index = EXCLUDED.order_index, segment = EXCLUDED.segment,
  time_cost_hours = EXCLUDED.time_cost_hours;


-- ============================================================
-- MONEY STREAM — Beat 1: The Bookstore Line (Day 1–2, Afternoon)
-- ============================================================
INSERT INTO public.storylets (
  slug, title, body, choices, tags, requirements, weight, is_active,
  introduces_npc, arc_id, step_key, order_index, due_offset_days,
  expires_after_days, default_next_step_key, segment, time_cost_hours
)
VALUES (
  's01_bookstore_line',
  'The Line',
  E'The line is out the door and fifteen minutes long.\n\nInside it smells like carpet cleaner and the plastic wrapping on new textbooks. A typed list is taped to the window, department by department. You find yours. You count the titles. You read the prices.\n\nThere''s a moment — standing there with the list and the knowledge of what''s in your checking account — where the math is simple and wrong. Someone ahead of you picks up a textbook, checks the price sticker on the back, and puts it down on the shelf. They don''t look embarrassed. They just put it back.\n\nThe cashier has one speed.',
  $$[
    {
      "id": "buy_all",
      "label": "Get everything on the list",
      "time_cost": 1, "energy_cost": 0,
      "requires_resource": { "key": "cashOnHand", "min": 500 },
      "outcome": { "text": "", "deltas": { "energy": -1, "stress": 1, "resources": { "cashOnHand": -500 } } },
      "reaction_text": "The total is five hundred and some dollars. You write the check with the handwriting of someone not showing anything. The bag is heavy walking back. You shift it from hand to hand.",
      "identity_tags": ["achievement", "safety"],
      "relational_effects": {}, "set_npc_memory": {}, "precludes": [],
      "events_emitted": [],
      "sets_stream_state": null, "next_step_key": null
    },
    {
      "id": "buy_partial",
      "label": "Get Marsh's text and one other — sort out the rest later",
      "time_cost": 1, "energy_cost": 0,
      "requires_resource": { "key": "cashOnHand", "min": 200 },
      "outcome": { "text": "", "deltas": { "energy": 0, "stress": 1, "resources": { "cashOnHand": -200 } } },
      "reaction_text": "Two books. A hundred and sixty dollars. You tell yourself you'll get the others next week. The lab manual isn't in the bag. You don't think about it until tomorrow in class, when Marsh says open to page forty-three.",
      "identity_tags": ["achievement"],
      "relational_effects": {}, "set_npc_memory": {}, "precludes": [],
      "events_emitted": [],
      "sets_stream_state": null, "next_step_key": null
    },
    {
      "id": "buy_nothing",
      "label": "Stand here until you know, then walk out without buying anything",
      "time_cost": 1, "energy_cost": 0,
      "outcome": { "text": "", "deltas": { "energy": 0, "stress": 2 } },
      "reaction_text": "You stand in line for twenty minutes and leave with nothing. The air outside is cooler than inside.",
      "identity_tags": ["avoid", "safety"],
      "relational_effects": {}, "set_npc_memory": {}, "precludes": [],
      "events_emitted": [],
      "sets_stream_state": { "stream": "money", "state": "friction_visible" },
      "next_step_key": null
    }
  ]$$::jsonb,
  ARRAY['arc_one', 'money', 'academic'],
  '{}'::jsonb,
  150, true,
  ARRAY[]::text[],
  (SELECT id FROM public.arc_definitions WHERE key = 'arc_money'),
  'bookstore_line', 1, 0, 2, 'money_reality_check',
  'afternoon', 1
)
ON CONFLICT (arc_id, step_key) WHERE arc_id IS NOT NULL DO UPDATE SET
  slug = EXCLUDED.slug, title = EXCLUDED.title, body = EXCLUDED.body,
  choices = EXCLUDED.choices, is_active = EXCLUDED.is_active,
  order_index = EXCLUDED.order_index, segment = EXCLUDED.segment,
  time_cost_hours = EXCLUDED.time_cost_hours;


-- ============================================================
-- MONEY STREAM — Beat 2: The Register (Day 5–7, Evening)
-- ============================================================
INSERT INTO public.storylets (
  slug, title, body, choices, tags, requirements, weight, is_active,
  introduces_npc, arc_id, step_key, order_index, due_offset_days,
  expires_after_days, default_next_step_key, segment, time_cost_hours
)
VALUES (
  's05_money_reality_check',
  'The Register',
  E'Friday afternoon, and you have the checkbook register in front of you because you needed to know.\n\nThe number is the number. It''s not catastrophic. It''s also not what it was three weeks ago before the bookstore.\n\nCal has mentioned twice, in passing, that some people are going to a place called Sorrento''s for pizza. The way he mentioned it both times means he noticed you didn''t answer the first time. You''ve done the math on what an evening out costs — not the pizza specifically, the evening.\n\nOn your desk: the register, the number, the pen you used to write it.',
  $$[
    {
      "id": "go_out",
      "label": "Go — the register will say what it says when you get back",
      "time_cost": 1, "energy_cost": 0,
      "outcome": { "text": "", "deltas": { "energy": -2, "stress": -1, "resources": { "cashOnHand": -15 } } },
      "reaction_text": "Sorrento's has red-checked tablecloths and a jukebox playing something from three years ago. You split a pizza with two people whose names you've been getting wrong. You get back around eleven. You look at the register before bed.",
      "identity_tags": ["people", "risk"],
      "relational_effects": {}, "set_npc_memory": {}, "precludes": [],
      "events_emitted": [],
      "sets_stream_state": { "stream": "money", "state": "friction_visible" },
      "next_step_key": null
    },
    {
      "id": "stay_in",
      "label": "Stay in. There's a paper to get ahead of.",
      "time_cost": 0, "energy_cost": 0,
      "outcome": { "text": "", "deltas": { "energy": 1, "stress": 1, "resources": { "knowledge": 5 } } },
      "reaction_text": "You finish the reading for Marsh. The hallway gets loud, then quiet. You eat the granola bar from your desk drawer.",
      "identity_tags": ["achievement", "safety"],
      "relational_effects": {}, "set_npc_memory": {}, "precludes": [],
      "events_emitted": [],
      "sets_stream_state": { "stream": "money", "state": "background_hum" },
      "next_step_key": null
    },
    {
      "id": "eat_first",
      "label": "Eat first, then go — order something small",
      "time_cost": 1, "energy_cost": 0,
      "outcome": { "text": "", "deltas": { "energy": -1, "stress": 0 } },
      "reaction_text": "You eat in the dining hall first — practical and slightly absurd — then walk to Sorrento's and get a Coke and a side salad and you're there, present, accounted for. Nobody notices what you ordered. Cal tells a story about his high school that makes four people laugh.",
      "identity_tags": ["people", "safety"],
      "relational_effects": {}, "set_npc_memory": {}, "precludes": [],
      "events_emitted": [],
      "sets_stream_state": { "stream": "money", "state": "background_hum" },
      "next_step_key": null
    }
  ]$$::jsonb,
  ARRAY['arc_one', 'money', 'belonging'],
  '{}'::jsonb,
  100, true,
  ARRAY[]::text[],
  (SELECT id FROM public.arc_definitions WHERE key = 'arc_money'),
  'money_reality_check', 2, 4, 3, NULL,
  'evening', 1
)
ON CONFLICT (arc_id, step_key) WHERE arc_id IS NOT NULL DO UPDATE SET
  slug = EXCLUDED.slug, title = EXCLUDED.title, body = EXCLUDED.body,
  choices = EXCLUDED.choices, is_active = EXCLUDED.is_active,
  order_index = EXCLUDED.order_index, segment = EXCLUDED.segment,
  time_cost_hours = EXCLUDED.time_cost_hours;


-- ============================================================
-- BELONGING STREAM — Beat 1: First Dinner (Day 1, Afternoon)
-- ============================================================
INSERT INTO public.storylets (
  slug, title, body, choices, tags, requirements, weight, is_active,
  introduces_npc, arc_id, step_key, order_index, due_offset_days,
  expires_after_days, default_next_step_key, segment, time_cost_hours
)
VALUES (
  's01_dining_first_dinner',
  'The Dining Hall',
  E'The dining hall at six o''clock is the loudest room in the building.\n\nTrays, people, the particular clatter of five hundred strangers eating before they know each other. Steam tables. Iceberg lettuce under a heat lamp. You take a tray and follow the flow because there''s nothing else to do.\n\nThe window tables are taken. Across the room, a table of five — one of maybe three tables in here where everyone looks like they already knew each other before today. Near the middle, a round table with three people who look like they''ve known each other for longer than two days. They met at three o''clock this afternoon.\n\nAt the end of a long table: a guy eating alone with the ease of someone who isn''t uncomfortable eating alone but wouldn''t mind company. Room 214 on his jersey. You noticed his door earlier.\n\nYou have a tray. You have to put it somewhere.',
  $$[
    {
      "id": "slide_tray",
      "label": "Slide your tray down next to him — \"214, right? I'm in 212.\"",
      "time_cost": 1, "energy_cost": 0,
      "outcome": { "text": "", "deltas": { "energy": -1, "stress": -1 } },
      "reaction_text": "\"Yeah.\" He moves over without being asked. \"Miguel.\" He says it like people usually already know his name, which turns out to be because they usually already do. He tells you three other people's names before you finish eating. By the time you carry your tray back, you know who lives on the floor.",
      "identity_tags": ["people", "risk"],
      "relational_effects": {}, "set_npc_memory": {}, "precludes": [],
      "events_emitted": [{ "npc_id": "npc_floor_miguel", "type": "INTRODUCED_SELF", "magnitude": 1 }],
      "sets_stream_state": null, "next_step_key": null
    },
    {
      "id": "solo_window",
      "label": "Find the end of the least crowded table, face the window",
      "time_cost": 1, "energy_cost": 0,
      "outcome": { "text": "", "deltas": { "energy": 1, "stress": 1 } },
      "reaction_text": "You eat facing the parking lot. Some trees. It's fine. Tomorrow you'll know the shape of the dining hall without knowing a single name in it.",
      "identity_tags": ["safety"],
      "relational_effects": {}, "set_npc_memory": {}, "precludes": [],
      "events_emitted": [],
      "sets_stream_state": null, "next_step_key": null
    },
    {
      "id": "adjacent_table",
      "label": "Take a seat adjacent to the round table — not at it, just near",
      "time_cost": 1, "energy_cost": 0,
      "outcome": { "text": "", "deltas": { "energy": 0, "stress": 1 } },
      "reaction_text": "Nobody says anything to you. You're close enough to hear something about someone's roommate and nothing else. You finish your food before they do and carry your tray.",
      "identity_tags": ["safety"],
      "relational_effects": {}, "set_npc_memory": {}, "precludes": [],
      "events_emitted": [],
      "sets_stream_state": null, "next_step_key": null
    }
  ]$$::jsonb,
  ARRAY['arc_one', 'belonging', 'social'],
  '{}'::jsonb,
  150, true,
  ARRAY['npc_floor_miguel'],
  (SELECT id FROM public.arc_definitions WHERE key = 'arc_belonging'),
  'dining_first_dinner', 1, 0, 2, 'floor_meeting',
  'afternoon', 1
)
ON CONFLICT (arc_id, step_key) WHERE arc_id IS NOT NULL DO UPDATE SET
  slug = EXCLUDED.slug, title = EXCLUDED.title, body = EXCLUDED.body,
  choices = EXCLUDED.choices, is_active = EXCLUDED.is_active,
  order_index = EXCLUDED.order_index, segment = EXCLUDED.segment,
  time_cost_hours = EXCLUDED.time_cost_hours;


-- ============================================================
-- BELONGING STREAM — Beat 2: Floor Meeting (Day 1, Afternoon)
-- Gender-corrected: Scott (was Sandra), npc_ra_scott (was npc_ra_sandra)
-- ============================================================
INSERT INTO public.storylets (
  slug, title, body, choices, tags, requirements, weight, is_active,
  introduces_npc, arc_id, step_key, order_index, due_offset_days,
  expires_after_days, default_next_step_key, segment, time_cost_hours
)
VALUES (
  's01_floor_meeting',
  'Floor Meeting',
  E'The RA has a clipboard.\n\nHis name is Scott. He reads it off the clipboard, which is probably a habit even though he clearly knows his own name. The folding chairs form a shape that''s almost a circle and he''s standing outside it, which means the meeting started when he said it started.\n\nSomeone is sitting backward in his chair. That''s Cal — you''ll know that in a minute. He has the easy posture of someone who treats the meeting as a scheduling conflict rather than a fact. He''s not hostile. He''s already calculated what parts of this he needs.\n\nScott explains the laundry schedule. He means it. He also gives you the supply closet combination and describes the on-call policy with the specificity of someone who has had to use it.\n\nIn the corner: sign-up sheets on a card table. Carbon-copy forms. A stack of napkins nobody has touched.',
  $$[
    {
      "id": "front_circle",
      "label": "Front half of the circle — face Scott while he talks",
      "time_cost": 0, "energy_cost": 0,
      "outcome": { "text": "", "deltas": { "energy": -1, "stress": 0 } },
      "reaction_text": "Scott nods once in your direction. He is noting who showed up. Cal looks across the circle and does a small chin-lift.",
      "identity_tags": ["people", "safety"],
      "relational_effects": {}, "set_npc_memory": {}, "precludes": [],
      "events_emitted": [
        { "npc_id": "npc_ra_scott", "type": "SHOWED_UP", "magnitude": 1 },
        { "npc_id": "npc_floor_cal", "type": "NOTICED_FACE", "magnitude": 1 }
      ],
      "sets_stream_state": null, "next_step_key": null
    },
    {
      "id": "back_corner",
      "label": "Back corner where you can see everyone",
      "time_cost": 0, "energy_cost": 0,
      "outcome": { "text": "", "deltas": { "energy": 0, "stress": 1 } },
      "reaction_text": "You see everything. Scott has read rooms like this before — he knows where people sit. The meeting ends. You know three names from the nametag exercise and forget two by the time you're back in your room.",
      "identity_tags": ["avoid"],
      "relational_effects": {}, "set_npc_memory": {}, "precludes": [],
      "events_emitted": [{ "npc_id": "npc_floor_cal", "type": "NOTICED_FACE", "magnitude": 1 }],
      "sets_stream_state": null, "next_step_key": null
    },
    {
      "id": "sit_with_cal",
      "label": "Take the chair next to the guy sitting backward — you're both early",
      "time_cost": 0, "energy_cost": 0,
      "outcome": { "text": "", "deltas": { "energy": -1, "stress": -1 } },
      "reaction_text": "\"You're early too.\" Not a question. His name is Cal. He already has an opinion about the meeting, which he delivers in a voice low enough that only you catch it. You know his name before Scott does the nametag exercise.",
      "identity_tags": ["people", "risk"],
      "relational_effects": {}, "set_npc_memory": {}, "precludes": [],
      "events_emitted": [
        { "npc_id": "npc_floor_cal", "type": "INTRODUCED_SELF", "magnitude": 1 },
        { "npc_id": "npc_ra_scott", "type": "SHOWED_UP", "magnitude": 1 }
      ],
      "sets_stream_state": null, "next_step_key": null
    }
  ]$$::jsonb,
  ARRAY['arc_one', 'belonging', 'social'],
  '{}'::jsonb,
  150, true,
  ARRAY['npc_ra_scott', 'npc_floor_cal'],
  (SELECT id FROM public.arc_definitions WHERE key = 'arc_belonging'),
  'floor_meeting', 2, 0, 1, 'orientation_fair',
  'afternoon', 1
)
ON CONFLICT (arc_id, step_key) WHERE arc_id IS NOT NULL DO UPDATE SET
  slug = EXCLUDED.slug, title = EXCLUDED.title, body = EXCLUDED.body,
  choices = EXCLUDED.choices, is_active = EXCLUDED.is_active,
  order_index = EXCLUDED.order_index, segment = EXCLUDED.segment,
  time_cost_hours = EXCLUDED.time_cost_hours;


-- ============================================================
-- BELONGING STREAM — Beat 3: Orientation Fair (Day 2–3, Afternoon)
-- ============================================================
INSERT INTO public.storylets (
  slug, title, body, choices, tags, requirements, weight, is_active,
  introduces_npc, arc_id, step_key, order_index, due_offset_days,
  expires_after_days, default_next_step_key, segment, time_cost_hours
)
VALUES (
  's03_orientation_fair',
  'The Fair',
  E'The quad is set up with card tables under a banner that says HARWICK OPPORTUNITIES in a font chosen by committee.\n\nTuesday afternoon. Some tables have upperclassmen who''ve done this before and look it. Some have freshmen unsure whether they''re supposed to be behind the table or in front of it.\n\nThe literary magazine table has two chairs, one occupied. The person in the chair is reading something that isn''t a flyer. They look up when the wind moves one of the pamphlets toward them, catch it without looking, put it back. They don''t look like they''re staffing a table. They look like they happen to be sitting near one.\n\nThree tables down, Miguel — if you know him — is talking to someone with the ease of someone built for exactly this.',
  $$[
    {
      "id": "sign_up",
      "label": "Sign your name to the nearest sheet — don't look too hard at which",
      "time_cost": 1, "energy_cost": 0,
      "outcome": { "text": "", "deltas": { "energy": -1, "stress": 0 } },
      "reaction_text": "You sign your name to a carbon-copy form. The person behind the table says Great! in the voice of someone for whom great is a default. You have a yellow copy now. It tears cleanly at the perforation.",
      "identity_tags": ["risk", "achievement"],
      "relational_effects": {}, "set_npc_memory": {}, "precludes": [],
      "events_emitted": [],
      "sets_stream_state": { "stream": "opportunity", "state": "pursuing" },
      "next_step_key": null
    },
    {
      "id": "jordan_table",
      "label": "Walk over to the literary magazine table — \"What is this, exactly?\"",
      "time_cost": 1, "energy_cost": 0,
      "outcome": { "text": "", "deltas": { "energy": -1, "stress": -1 } },
      "reaction_text": "They look up. The Meridian. We publish twice a semester. A pause. Some good stuff. They don't tell you to sign up. They go back to reading. You stand there a beat longer than you planned.",
      "identity_tags": ["people", "risk"],
      "relational_effects": {}, "set_npc_memory": {}, "precludes": [],
      "events_emitted": [{ "npc_id": "npc_ambiguous_jordan", "type": "INTRODUCED_SELF", "magnitude": 1 }],
      "sets_stream_state": { "stream": "belonging", "state": "first_anchor" },
      "next_step_key": null
    },
    {
      "id": "full_circuit",
      "label": "One full circuit, then leave without signing anything",
      "time_cost": 1, "energy_cost": 0,
      "outcome": { "text": "", "deltas": { "energy": 1, "stress": 1 } },
      "reaction_text": "You've seen all of it. At the foreign film society table, a woman is reading the same book as the person at the literary magazine table, neither of them aware of the other. You leave without having signed anything. The carbon-copy sheets are still out if you come back.",
      "identity_tags": ["avoid", "safety"],
      "relational_effects": {}, "set_npc_memory": {}, "precludes": [],
      "events_emitted": [],
      "sets_stream_state": null, "next_step_key": null
    }
  ]$$::jsonb,
  ARRAY['arc_one', 'belonging', 'opportunity', 'social'],
  '{}'::jsonb,
  100, true,
  ARRAY['npc_ambiguous_jordan'],
  (SELECT id FROM public.arc_definitions WHERE key = 'arc_belonging'),
  'orientation_fair', 3, 1, 3, 'cal_midnight_knock',
  'afternoon', 1
)
ON CONFLICT (arc_id, step_key) WHERE arc_id IS NOT NULL DO UPDATE SET
  slug = EXCLUDED.slug, title = EXCLUDED.title, body = EXCLUDED.body,
  choices = EXCLUDED.choices, is_active = EXCLUDED.is_active,
  order_index = EXCLUDED.order_index, segment = EXCLUDED.segment,
  time_cost_hours = EXCLUDED.time_cost_hours;


-- ============================================================
-- BELONGING STREAM — Beat 4: Cal Midnight Knock (Day 3–5, Evening)
-- ============================================================
INSERT INTO public.storylets (
  slug, title, body, choices, tags, requirements, weight, is_active,
  introduces_npc, arc_id, step_key, order_index, due_offset_days,
  expires_after_days, default_next_step_key, segment, time_cost_hours
)
VALUES (
  's04_cal_midnight_knock',
  '11:03pm',
  E'11:03pm.\n\nThree knocks. Patient ones, not loud.\n\nYou awake?\n\nYou are awake. You''ve been reading something for Marsh since ten-thirty, about sixty percent sure you understand it. The hall has been quiet for forty minutes except for whatever is happening in the bathroom down the corridor.\n\nHis voice through the door is not the voice of someone who''s been drinking. It''s the voice of someone who thought of a thing and wants to do it and did the minimum calculation of who might be up for it.\n\nOn your desk: the book, open. Your notes. Your desk calendar with two things on it for tomorrow.',
  $$[
    {
      "id": "open_door",
      "label": "Open the door",
      "time_cost": 1, "energy_cost": 0,
      "outcome": { "text": "", "deltas": { "energy": -2, "stress": -1, "resources": { "cashOnHand": -12 } } },
      "reaction_text": "He's wearing a jacket. He has a plan involving three people, a car, and a diner on Route 9 that's open until 2am. You've been to a diner at midnight before but not here, not with these people. By the time you get back the notes on your desk are cold and you know four names you didn't know this morning.",
      "identity_tags": ["risk", "people"],
      "relational_effects": {}, "set_npc_memory": {}, "precludes": [],
      "events_emitted": [{ "npc_id": "npc_floor_cal", "type": "SHOWED_UP", "magnitude": 1 }],
      "sets_stream_state": { "stream": "belonging", "state": "first_anchor" },
      "next_step_key": null
    },
    {
      "id": "keep_reading",
      "label": "\"Not tonight. Have to finish this.\"",
      "time_cost": 0, "energy_cost": 0,
      "outcome": { "text": "", "deltas": { "energy": 1, "stress": 1, "resources": { "knowledge": 5 } } },
      "reaction_text": "\"All good.\" A pause. You can hear him deciding whether to say something else. He doesn't. His footsteps move down the hall. The door at the end of the corridor opens and closes. You finish the reading.",
      "identity_tags": ["achievement", "safety"],
      "relational_effects": {}, "set_npc_memory": {}, "precludes": [],
      "events_emitted": [{ "npc_id": "npc_floor_cal", "type": "WENT_MISSING", "magnitude": 1 }],
      "sets_stream_state": null, "next_step_key": null
    }
  ]$$::jsonb,
  ARRAY['arc_one', 'belonging', 'money'],
  '{}'::jsonb,
  100, true,
  ARRAY[]::text[],
  (SELECT id FROM public.arc_definitions WHERE key = 'arc_belonging'),
  'cal_midnight_knock', 4, 2, 3, NULL,
  'evening', 1
)
ON CONFLICT (arc_id, step_key) WHERE arc_id IS NOT NULL DO UPDATE SET
  slug = EXCLUDED.slug, title = EXCLUDED.title, body = EXCLUDED.body,
  choices = EXCLUDED.choices, is_active = EXCLUDED.is_active,
  order_index = EXCLUDED.order_index, segment = EXCLUDED.segment,
  time_cost_hours = EXCLUDED.time_cost_hours;


COMMIT;
