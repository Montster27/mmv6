-- 20260316000002_seed_arc_one_week1.sql
-- Week 1 storylets for Arc One, 1983, Harwick University.
-- 13 storylets across 6 streams, Days 1–7.
-- All choices carry energy/stress deltas. Every choice matters.
-- NPCs: npc_roommate_dana (auto), npc_floor_miguel, npc_prof_marsh,
--       npc_studious_priya, npc_floor_cal, npc_ambiguous_jordan,
--       npc_ra_sandra, npc_parent_voice

BEGIN;


-- ============================================================
-- ROOMMATE STREAM — Beat 1: Room 212 (Day 1 Morning)
-- ============================================================
INSERT INTO public.storylets (
  slug, title, body, choices, tags, requirements, weight, is_active,
  introduces_npc, arc_id, step_key, order_index, due_offset_days,
  expires_after_days, default_next_step_key
)
VALUES (
  's01_room_212_morning',
  'Room 212',
  E'The ceiling is unfamiliar.\n\nNot the smell. Not the light through the curtains. The ceiling. It''s the wrong texture.\n\nDana''s side is already in order. A framed photo she placed face-down during unpacking and turned right-side-up this morning while you were still half-asleep. Her bed is made with the precision of someone who does it automatically rather than someone who cares about it. Her alarm clock is already set for tomorrow.\n\nOn your whiteboard by the door, in your handwriting from last night: nothing. You haven''t written anything yet.\n\nYou have been in this room for fourteen hours.',
  '[
    {
      "id": "intro_hand",
      "label": "Cross the room, hold out your hand",
      "time_cost": 0, "energy_cost": 0,
      "outcome": { "text": "", "deltas": { "energy": -1, "stress": -1 } },
      "reaction_text": "Dana looks up. Something quick checks in her expression — the calculation of whether you''re going to be someone she has to manage. She shakes your hand. \"Dana.\"",
      "identity_tags": ["people", "confront"],
      "relational_effects": {}, "set_npc_memory": {}, "precludes": [],
      "events_emitted": [{ "npc_id": "npc_roommate_dana", "type": "INTRODUCED_SELF", "magnitude": 1 }],
      "sets_stream_state": null, "next_step_key": null
    },
    {
      "id": "grab_bag",
      "label": "Grab your toiletry bag and get to the bathroom before it''s crowded",
      "time_cost": 0, "energy_cost": 0,
      "outcome": { "text": "", "deltas": { "energy": 0, "stress": 1 } },
      "reaction_text": "The hallway is still quiet. You''re out before you have to decide anything about the room. When you get back, she''s gone. Her bed is still made.",
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
      "reaction_text": "She gives you a small nod. \"Hey.\" She goes back to unpacking.",
      "identity_tags": [],
      "relational_effects": {}, "set_npc_memory": {}, "precludes": [],
      "events_emitted": [{ "npc_id": "npc_roommate_dana", "type": "NOTICED_FACE", "magnitude": 1 }],
      "sets_stream_state": null, "next_step_key": null
    }
  ]'::jsonb,
  ARRAY['arc_one', 'roommate', 'onboarding'],
  '{}'::jsonb,
  200, true,
  ARRAY[]::text[],
  (SELECT id FROM public.arc_definitions WHERE key = 'arc_roommate'),
  'room_212_morning', 1, 0, NULL, 'roommate_moment'
)
ON CONFLICT (arc_id, step_key) DO UPDATE SET
  title = EXCLUDED.title, body = EXCLUDED.body,
  choices = EXCLUDED.choices, is_active = EXCLUDED.is_active;


-- ============================================================
-- ROOMMATE STREAM — Beat 2: The Ordinary Evening (Day 4–7)
-- ============================================================
INSERT INTO public.storylets (
  slug, title, body, choices, tags, requirements, weight, is_active,
  introduces_npc, arc_id, step_key, order_index, due_offset_days,
  expires_after_days, default_next_step_key
)
VALUES (
  's05_roommate_moment',
  'The Ordinary Evening',
  E'It happens on one of the ordinary evenings.\n\nYou''re both at your desks. She''s making something in the hot pot — technically against the rules, which both of you know and neither of you has said anything about. The room smells like whatever she''s making. Tea, probably.\n\nThe hot pot makes a small sound. Neither of you moves.',
  '[
    {
      "id": "real_question",
      "label": "Ask her something you actually want to know",
      "time_cost": 0, "energy_cost": 0,
      "outcome": { "text": "", "deltas": { "energy": -1, "stress": -2 } },
      "reaction_text": "She turns from the hot pot. The answer she gives is longer than you expected. Then she asks something back. You talk for thirty-five minutes. By the end you''ve said something you didn''t plan to. She goes back to the hot pot. The tea is probably cold.",
      "identity_tags": ["confront", "people", "risk"],
      "relational_effects": {}, "set_npc_memory": {}, "precludes": [],
      "events_emitted": [{ "npc_id": "npc_roommate_dana", "type": "CONFIDED_IN", "magnitude": 1 }],
      "sets_stream_state": { "stream": "roommate", "state": "genuine_connection" },
      "next_step_key": null
    },
    {
      "id": "surface_talk",
      "label": "Mention the bookstore. Marsh''s class. Something with a known answer.",
      "time_cost": 0, "energy_cost": 0,
      "outcome": { "text": "", "deltas": { "energy": 0, "stress": 0 } },
      "reaction_text": "She laughs at the right moment. You talk for a few minutes. Warm and surface-level. She goes back to her hot pot.",
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
      "reaction_text": "She finishes her tea. You finish your chapter. Lights out at eleven. The room is what it''s been.",
      "identity_tags": ["avoid"],
      "relational_effects": {}, "set_npc_memory": {}, "precludes": [],
      "events_emitted": [],
      "sets_stream_state": null, "next_step_key": null
    }
  ]'::jsonb,
  ARRAY['arc_one', 'roommate'],
  '{}'::jsonb,
  100, true,
  ARRAY[]::text[],
  (SELECT id FROM public.arc_definitions WHERE key = 'arc_roommate'),
  'roommate_moment', 2, 3, 4, NULL
)
ON CONFLICT (arc_id, step_key) DO UPDATE SET
  title = EXCLUDED.title, body = EXCLUDED.body,
  choices = EXCLUDED.choices, is_active = EXCLUDED.is_active;


-- ============================================================
-- MONEY STREAM — Beat 1: The Bookstore Line (Day 1–2)
-- ============================================================
INSERT INTO public.storylets (
  slug, title, body, choices, tags, requirements, weight, is_active,
  introduces_npc, arc_id, step_key, order_index, due_offset_days,
  expires_after_days, default_next_step_key
)
VALUES (
  's01_bookstore_line',
  'The Line',
  E'The line is out the door and fifteen minutes long.\n\nInside it smells like carpet cleaner and the plastic wrapping on new textbooks. A typed list is taped to the window, department by department. You find yours. You count the titles. You read the prices.\n\nThere''s a moment — standing there with the list and the knowledge of what''s in your checking account — where the math is simple and wrong. Someone ahead of you picks up a textbook, checks the price sticker on the back, and puts it down on the shelf. They don''t look embarrassed. They just put it back.\n\nThe cashier has one speed.',
  '[
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
      "label": "Get Marsh''s text and one other — sort out the rest later",
      "time_cost": 1, "energy_cost": 0,
      "requires_resource": { "key": "cashOnHand", "min": 200 },
      "outcome": { "text": "", "deltas": { "energy": 0, "stress": 1, "resources": { "cashOnHand": -200 } } },
      "reaction_text": "Two books. A hundred and sixty dollars. You tell yourself you''ll get the others next week. The lab manual isn''t in the bag. You don''t think about it until tomorrow in class, when Marsh says open to page forty-three.",
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
  ]'::jsonb,
  ARRAY['arc_one', 'money', 'academic'],
  '{}'::jsonb,
  150, true,
  ARRAY[]::text[],
  (SELECT id FROM public.arc_definitions WHERE key = 'arc_money'),
  'bookstore_line', 1, 0, 2, 'money_reality_check'
)
ON CONFLICT (arc_id, step_key) DO UPDATE SET
  title = EXCLUDED.title, body = EXCLUDED.body,
  choices = EXCLUDED.choices, is_active = EXCLUDED.is_active;


-- ============================================================
-- MONEY STREAM — Beat 2: The Register (Day 5–7)
-- ============================================================
INSERT INTO public.storylets (
  slug, title, body, choices, tags, requirements, weight, is_active,
  introduces_npc, arc_id, step_key, order_index, due_offset_days,
  expires_after_days, default_next_step_key
)
VALUES (
  's05_money_reality_check',
  'The Register',
  E'Friday afternoon, and you have the checkbook register in front of you because you needed to know.\n\nThe number is the number. It''s not catastrophic. It''s also not what it was three weeks ago before the bookstore.\n\nCal has mentioned twice, in passing, that some people are going to a place called Sorrento''s for pizza. The way he mentioned it both times means he noticed you didn''t answer the first time. You''ve done the math on what an evening out costs — not the pizza specifically, the evening.\n\nOn your desk: the register, the number, the pen you used to write it.',
  '[
    {
      "id": "go_out",
      "label": "Go — the register will say what it says when you get back",
      "time_cost": 1, "energy_cost": 0,
      "outcome": { "text": "", "deltas": { "energy": -2, "stress": -1, "resources": { "cashOnHand": -15 } } },
      "reaction_text": "Sorrento''s has red-checked tablecloths and a jukebox playing something from three years ago. You split a pizza with two people whose names you''ve been getting wrong. You get back around eleven. You look at the register before bed.",
      "identity_tags": ["people", "risk"],
      "relational_effects": {}, "set_npc_memory": {}, "precludes": [],
      "events_emitted": [],
      "sets_stream_state": { "stream": "money", "state": "friction_visible" },
      "next_step_key": null
    },
    {
      "id": "stay_in",
      "label": "Stay in. There''s a paper to get ahead of.",
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
      "reaction_text": "You eat in the dining hall first — practical and slightly absurd — then walk to Sorrento''s and get a Coke and a side salad and you''re there, present, accounted for. Nobody notices what you ordered. Cal tells a story about his high school that makes four people laugh.",
      "identity_tags": ["people", "safety"],
      "relational_effects": {}, "set_npc_memory": {}, "precludes": [],
      "events_emitted": [],
      "sets_stream_state": { "stream": "money", "state": "background_hum" },
      "next_step_key": null
    }
  ]'::jsonb,
  ARRAY['arc_one', 'money', 'belonging'],
  '{}'::jsonb,
  100, true,
  ARRAY[]::text[],
  (SELECT id FROM public.arc_definitions WHERE key = 'arc_money'),
  'money_reality_check', 2, 4, 3, NULL
)
ON CONFLICT (arc_id, step_key) DO UPDATE SET
  title = EXCLUDED.title, body = EXCLUDED.body,
  choices = EXCLUDED.choices, is_active = EXCLUDED.is_active;


-- ============================================================
-- BELONGING STREAM — Beat 1: First Dinner (Day 1–2)
-- ============================================================
INSERT INTO public.storylets (
  slug, title, body, choices, tags, requirements, weight, is_active,
  introduces_npc, arc_id, step_key, order_index, due_offset_days,
  expires_after_days, default_next_step_key
)
VALUES (
  's01_dining_first_dinner',
  'The Dining Hall',
  E'The dining hall at six o''clock is the loudest room in the building.\n\nTrays, people, the particular clatter of five hundred strangers eating before they know each other. Steam tables. Iceberg lettuce under a heat lamp. You take a tray and follow the flow because there''s nothing else to do.\n\nThe window tables are taken. Across the room, a table of five — one of maybe three tables in here where everyone looks like they already knew each other before today. Near the middle, a round table with three people who look like they''ve known each other for longer than two days. They met at three o''clock this afternoon.\n\nAt the end of a long table: a guy eating alone with the ease of someone who isn''t uncomfortable eating alone but wouldn''t mind company. Room 214 on his jersey. You noticed his door earlier.\n\nYou have a tray. You have to put it somewhere.',
  '[
    {
      "id": "slide_tray",
      "label": "Slide your tray down next to him — \"214, right? I''m in 212.\"",
      "time_cost": 1, "energy_cost": 0,
      "outcome": { "text": "", "deltas": { "energy": -1, "stress": -1 } },
      "reaction_text": "\"Yeah.\" He moves over without being asked. \"Miguel.\" He says it like people usually already know his name, which turns out to be because they usually already do. He tells you three other people''s names before you finish eating. By the time you carry your tray back, you know who lives on the floor.",
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
      "reaction_text": "You eat facing the parking lot. Some trees. It''s fine. Tomorrow you''ll know the shape of the dining hall without knowing a single name in it.",
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
      "reaction_text": "Nobody says anything to you. You''re close enough to hear something about someone''s roommate and nothing else. You finish your food before they do and carry your tray.",
      "identity_tags": ["safety"],
      "relational_effects": {}, "set_npc_memory": {}, "precludes": [],
      "events_emitted": [],
      "sets_stream_state": null, "next_step_key": null
    }
  ]'::jsonb,
  ARRAY['arc_one', 'belonging', 'social'],
  '{}'::jsonb,
  150, true,
  ARRAY['npc_floor_miguel'],
  (SELECT id FROM public.arc_definitions WHERE key = 'arc_belonging'),
  'dining_first_dinner', 1, 0, 2, 'floor_meeting'
)
ON CONFLICT (arc_id, step_key) DO UPDATE SET
  title = EXCLUDED.title, body = EXCLUDED.body,
  choices = EXCLUDED.choices, is_active = EXCLUDED.is_active;


-- ============================================================
-- BELONGING STREAM — Beat 2: Floor Meeting (Day 1)
-- ============================================================
INSERT INTO public.storylets (
  slug, title, body, choices, tags, requirements, weight, is_active,
  introduces_npc, arc_id, step_key, order_index, due_offset_days,
  expires_after_days, default_next_step_key
)
VALUES (
  's01_floor_meeting',
  'Floor Meeting',
  E'The RA has a clipboard.\n\nHer name is Sandra. She reads it off the clipboard, which is probably a habit even though she clearly knows her own name. The folding chairs form a shape that''s almost a circle and she''s standing outside it, which means the meeting started when she said it started.\n\nSomeone is sitting backward in his chair. That''s Cal — you''ll know that in a minute. He has the easy posture of someone who treats the meeting as a scheduling conflict rather than a fact. He''s not hostile. He''s already calculated what parts of this he needs.\n\nSandra explains the laundry schedule. She means it. She also gives you the supply closet combination and describes the on-call policy with the specificity of someone who has had to use it.\n\nIn the corner: sign-up sheets on a card table. Carbon-copy forms. A stack of napkins nobody has touched.',
  '[
    {
      "id": "front_circle",
      "label": "Front half of the circle — face Sandra while she talks",
      "time_cost": 0, "energy_cost": 0,
      "outcome": { "text": "", "deltas": { "energy": -1, "stress": 0 } },
      "reaction_text": "Sandra nods once in your direction. She is noting who showed up. Cal looks across the circle and does a small chin-lift.",
      "identity_tags": ["people", "safety"],
      "relational_effects": {}, "set_npc_memory": {}, "precludes": [],
      "events_emitted": [
        { "npc_id": "npc_ra_sandra", "type": "SHOWED_UP", "magnitude": 1 },
        { "npc_id": "npc_floor_cal", "type": "NOTICED_FACE", "magnitude": 1 }
      ],
      "sets_stream_state": null, "next_step_key": null
    },
    {
      "id": "back_corner",
      "label": "Back corner where you can see everyone",
      "time_cost": 0, "energy_cost": 0,
      "outcome": { "text": "", "deltas": { "energy": 0, "stress": 1 } },
      "reaction_text": "You see everything. Sandra has read rooms like this before — she knows where people sit. The meeting ends. You know three names from the nametag exercise and forget two by the time you''re back in your room.",
      "identity_tags": ["avoid"],
      "relational_effects": {}, "set_npc_memory": {}, "precludes": [],
      "events_emitted": [{ "npc_id": "npc_floor_cal", "type": "NOTICED_FACE", "magnitude": 1 }],
      "sets_stream_state": null, "next_step_key": null
    },
    {
      "id": "sit_with_cal",
      "label": "Take the chair next to the guy sitting backward — you''re both early",
      "time_cost": 0, "energy_cost": 0,
      "outcome": { "text": "", "deltas": { "energy": -1, "stress": -1 } },
      "reaction_text": "\"You''re early too.\" Not a question. His name is Cal. He already has an opinion about the meeting, which he delivers in a voice low enough that only you catch it. You know his name before Sandra does the nametag exercise.",
      "identity_tags": ["people", "risk"],
      "relational_effects": {}, "set_npc_memory": {}, "precludes": [],
      "events_emitted": [
        { "npc_id": "npc_floor_cal", "type": "INTRODUCED_SELF", "magnitude": 1 },
        { "npc_id": "npc_ra_sandra", "type": "SHOWED_UP", "magnitude": 1 }
      ],
      "sets_stream_state": null, "next_step_key": null
    }
  ]'::jsonb,
  ARRAY['arc_one', 'belonging', 'social'],
  '{}'::jsonb,
  150, true,
  ARRAY['npc_ra_sandra', 'npc_floor_cal'],
  (SELECT id FROM public.arc_definitions WHERE key = 'arc_belonging'),
  'floor_meeting', 2, 0, 1, 'orientation_fair'
)
ON CONFLICT (arc_id, step_key) DO UPDATE SET
  title = EXCLUDED.title, body = EXCLUDED.body,
  choices = EXCLUDED.choices, is_active = EXCLUDED.is_active;


-- ============================================================
-- BELONGING STREAM — Beat 3: Orientation Fair (Day 2–3)
-- ============================================================
INSERT INTO public.storylets (
  slug, title, body, choices, tags, requirements, weight, is_active,
  introduces_npc, arc_id, step_key, order_index, due_offset_days,
  expires_after_days, default_next_step_key
)
VALUES (
  's03_orientation_fair',
  'The Fair',
  E'The quad is set up with card tables under a banner that says HARWICK OPPORTUNITIES in a font chosen by committee.\n\nTuesday afternoon. Some tables have upperclassmen who''ve done this before and look it. Some have freshmen unsure whether they''re supposed to be behind the table or in front of it.\n\nThe literary magazine table has two chairs, one occupied. The person in the chair is reading something that isn''t a flyer. They look up when the wind moves one of the pamphlets toward them, catch it without looking, put it back. They don''t look like they''re staffing a table. They look like they happen to be sitting near one.\n\nThree tables down, Miguel — if you know him — is talking to someone with the ease of someone built for exactly this.',
  '[
    {
      "id": "sign_up",
      "label": "Sign your name to the nearest sheet — don''t look too hard at which",
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
      "reaction_text": "They look up. The Meridian. We publish twice a semester. A pause. Some good stuff. They don''t tell you to sign up. They go back to reading. You stand there a beat longer than you planned.",
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
      "reaction_text": "You''ve seen all of it. At the foreign film society table, a woman is reading the same book as the person at the literary magazine table, neither of them aware of the other. You leave without having signed anything. The carbon-copy sheets are still out if you come back.",
      "identity_tags": ["avoid", "safety"],
      "relational_effects": {}, "set_npc_memory": {}, "precludes": [],
      "events_emitted": [],
      "sets_stream_state": null, "next_step_key": null
    }
  ]'::jsonb,
  ARRAY['arc_one', 'belonging', 'opportunity', 'social'],
  '{}'::jsonb,
  100, true,
  ARRAY['npc_ambiguous_jordan'],
  (SELECT id FROM public.arc_definitions WHERE key = 'arc_belonging'),
  'orientation_fair', 3, 1, 3, 'cal_midnight_knock'
)
ON CONFLICT (arc_id, step_key) DO UPDATE SET
  title = EXCLUDED.title, body = EXCLUDED.body,
  choices = EXCLUDED.choices, is_active = EXCLUDED.is_active;


-- ============================================================
-- BELONGING STREAM — Beat 4: Cal Midnight Knock (Day 3–5)
-- ============================================================
INSERT INTO public.storylets (
  slug, title, body, choices, tags, requirements, weight, is_active,
  introduces_npc, arc_id, step_key, order_index, due_offset_days,
  expires_after_days, default_next_step_key
)
VALUES (
  's04_cal_midnight_knock',
  '11:03pm',
  E'11:03pm.\n\nThree knocks. Patient ones, not loud.\n\nYou awake?\n\nYou are awake. You''ve been reading something for Marsh since ten-thirty, about sixty percent sure you understand it. The hall has been quiet for forty minutes except for whatever is happening in the bathroom down the corridor.\n\nHis voice through the door is not the voice of someone who''s been drinking. It''s the voice of someone who thought of a thing and wants to do it and did the minimum calculation of who might be up for it.\n\nOn your desk: the book, open. Your notes. Your desk calendar with two things on it for tomorrow.',
  '[
    {
      "id": "open_door",
      "label": "Open the door",
      "time_cost": 1, "energy_cost": 0,
      "outcome": { "text": "", "deltas": { "energy": -2, "stress": -1, "resources": { "cashOnHand": -12 } } },
      "reaction_text": "He''s wearing a jacket. He has a plan involving three people, a car, and a diner on Route 9 that''s open until 2am. You''ve been to a diner at midnight before but not here, not with these people. By the time you get back the notes on your desk are cold and you know four names you didn''t know this morning.",
      "identity_tags": ["risk", "people"],
      "relational_effects": {}, "set_npc_memory": {}, "precludes": [],
      "events_emitted": [{ "npc_id": "npc_floor_cal", "type": "SHOWED_UP", "magnitude": 1 }],
      "sets_stream_state": { "stream": "belonging", "state": "first_anchor" },
      "next_step_key": null
    },
    {
      "id": "stay_still",
      "label": "Stay still — let him think you''re asleep",
      "time_cost": 0, "energy_cost": 0,
      "outcome": { "text": "", "deltas": { "energy": 0, "stress": 1 } },
      "reaction_text": "He waits fifteen seconds. Then his footsteps down the hall. You lie there for a while. The book is still open. You don''t go back to it for another thirty minutes.",
      "identity_tags": ["avoid", "safety"],
      "relational_effects": {}, "set_npc_memory": {}, "precludes": [],
      "events_emitted": [{ "npc_id": "npc_floor_cal", "type": "WENT_MISSING", "magnitude": 1 }],
      "sets_stream_state": null, "next_step_key": null
    },
    {
      "id": "through_door",
      "label": "\"I''ve got an early thing.\" Through the door.",
      "time_cost": 0, "energy_cost": 0,
      "outcome": { "text": "", "deltas": { "energy": 0, "stress": 1 } },
      "reaction_text": "Yeah, no worries. He means it, which makes it easier and also harder. His footsteps go to the end of the hall and stop. Then another door opens.",
      "identity_tags": ["safety", "avoid"],
      "relational_effects": {}, "set_npc_memory": {}, "precludes": [],
      "events_emitted": [{ "npc_id": "npc_floor_cal", "type": "DEFERRED_TENSION", "magnitude": 1 }],
      "sets_stream_state": null, "next_step_key": null
    }
  ]'::jsonb,
  ARRAY['arc_one', 'belonging', 'social'],
  '{"requires_npc_met": ["npc_floor_cal"]}'::jsonb,
  100, true,
  ARRAY[]::text[],
  (SELECT id FROM public.arc_definitions WHERE key = 'arc_belonging'),
  'cal_midnight_knock', 4, 2, 4, 'miguel_floor_invite'
)
ON CONFLICT (arc_id, step_key) DO UPDATE SET
  title = EXCLUDED.title, body = EXCLUDED.body,
  choices = EXCLUDED.choices, is_active = EXCLUDED.is_active;


-- ============================================================
-- BELONGING STREAM — Beat 5: Miguel Invite (Day 5–7)
-- ============================================================
INSERT INTO public.storylets (
  slug, title, body, choices, tags, requirements, weight, is_active,
  introduces_npc, arc_id, step_key, order_index, due_offset_days,
  expires_after_days, default_next_step_key
)
VALUES (
  's07_miguel_floor_invite',
  'The Invitation',
  E'You''re coming out of your room with your shower bag when you nearly walk into him.\n\nMiguel, two other people from the floor you half-recognize. He''s not going anywhere slowly.\n\nHey — Saunders is having a thing Saturday. You''re coming, right?\n\nThe right doesn''t mean he''s really asking. It also means he''ll take no for an answer without it meaning anything. Miguel doesn''t collect obligations. He issues invitations.\n\nBehind you, your door is still open. The paper is on your desk.',
  '[
    {
      "id": "yeah_there",
      "label": "\"Yeah, I''ll be there.\"",
      "time_cost": 1, "energy_cost": 0,
      "outcome": { "text": "", "deltas": { "energy": -2, "stress": -1 } },
      "reaction_text": "He points at you and moves on down the hall. Saturday you go to Saunders and stay later than you planned. The paper gets done Sunday — not great, but done. You know six more names by Monday morning.",
      "identity_tags": ["people", "risk"],
      "relational_effects": {}, "set_npc_memory": {}, "precludes": [],
      "events_emitted": [{ "npc_id": "npc_floor_miguel", "type": "SHOWED_UP", "magnitude": 1 }],
      "sets_stream_state": { "stream": "belonging", "state": "first_anchor" },
      "next_step_key": null
    },
    {
      "id": "cant_go",
      "label": "\"I can''t — got something due Monday.\" True.",
      "time_cost": 0, "energy_cost": 0,
      "outcome": { "text": "", "deltas": { "energy": 0, "stress": 1 } },
      "reaction_text": "Cool, no worries. He means it. This is the second time you''ve said some version of this. He''ll ask once more before he stops.",
      "identity_tags": ["achievement", "safety"],
      "relational_effects": {}, "set_npc_memory": {}, "precludes": [],
      "events_emitted": [{ "npc_id": "npc_floor_miguel", "type": "DEFERRED_TENSION", "magnitude": 1 }],
      "sets_stream_state": null, "next_step_key": null
    },
    {
      "id": "one_hour",
      "label": "\"I''ll come for an hour.\"",
      "time_cost": 1, "energy_cost": 0,
      "outcome": { "text": "", "deltas": { "energy": -1, "stress": 0 } },
      "reaction_text": "Solid. You go at nine, leave at eleven while people are still there. Miguel clocks you leaving but says nothing. He''ll remember you said you''d leave at a certain time and you did.",
      "identity_tags": ["people", "achievement"],
      "relational_effects": {}, "set_npc_memory": {}, "precludes": [],
      "events_emitted": [{ "npc_id": "npc_floor_miguel", "type": "SMALL_KINDNESS", "magnitude": 1 }],
      "sets_stream_state": null, "next_step_key": null
    }
  ]'::jsonb,
  ARRAY['arc_one', 'belonging', 'social'],
  '{"requires_npc_met": ["npc_floor_miguel"]}'::jsonb,
  100, true,
  ARRAY[]::text[],
  (SELECT id FROM public.arc_definitions WHERE key = 'arc_belonging'),
  'miguel_floor_invite', 5, 4, 3, NULL
)
ON CONFLICT (arc_id, step_key) DO UPDATE SET
  title = EXCLUDED.title, body = EXCLUDED.body,
  choices = EXCLUDED.choices, is_active = EXCLUDED.is_active;


-- ============================================================
-- ACADEMIC STREAM — Beat 1: First Class (Day 2)
-- ============================================================
INSERT INTO public.storylets (
  slug, title, body, choices, tags, requirements, weight, is_active,
  introduces_npc, arc_id, step_key, order_index, due_offset_days,
  expires_after_days, default_next_step_key
)
VALUES (
  's02_first_class',
  'First Class',
  E'Whitmore 101 smells like the previous class — not quite chalk, something under chalk.\n\nSixty people settling into seats with the low noise of people who haven''t talked to each other yet. You find the middle: not front (too eager), not back (too visible in the wrong way). The woman two seats over already has the book open. She''s underlined something in the first paragraph with the pencil she''s still holding. She doesn''t look up.\n\nThe professor walks in without putting anything on the desk. His name is on the chalkboard in handwriting that doesn''t suggest anything. Marshall. You''ll call him Marsh eventually — everyone does — but not yet.\n\n"Let''s see who read," he says.\n\nNot a question. He looks out at the room. Nobody moves.',
  '[
    {
      "id": "hold_eye_contact",
      "label": "Hold eye contact when he scans the room",
      "time_cost": 1, "energy_cost": 1,
      "outcome": { "text": "", "deltas": { "energy": -2, "stress": -1, "resources": { "knowledge": 10 } } },
      "reaction_text": "He calls on you. The answer you give is partly right and he lets you finish before he adds the rest. Correct, partially — no condescension in it. The woman two seats over glances.",
      "identity_tags": ["risk", "achievement", "confront"],
      "relational_effects": {}, "set_npc_memory": {}, "precludes": [],
      "events_emitted": [
        { "npc_id": "npc_prof_marsh", "type": "INTRODUCED_SELF", "magnitude": 1 },
        { "npc_id": "npc_studious_priya", "type": "NOTICED_FACE", "magnitude": 1 }
      ],
      "sets_stream_state": { "stream": "academic", "state": "active_engagement" },
      "next_step_key": null
    },
    {
      "id": "look_down",
      "label": "Look down — take notes on nothing",
      "time_cost": 1, "energy_cost": 0,
      "outcome": { "text": "", "deltas": { "energy": -1, "stress": 1, "resources": { "knowledge": 3 } } },
      "reaction_text": "He calls on someone else. The class proceeds. You write down things you already know. You leave with three pages of notes and no memory of deciding whether you wanted to be here.",
      "identity_tags": ["avoid", "safety"],
      "relational_effects": {}, "set_npc_memory": {}, "precludes": [],
      "events_emitted": [
        { "npc_id": "npc_prof_marsh", "type": "NOTICED_FACE", "magnitude": 1 },
        { "npc_id": "npc_studious_priya", "type": "NOTICED_FACE", "magnitude": 1 }
      ],
      "sets_stream_state": { "stream": "academic", "state": "quiet_doubt" },
      "next_step_key": null
    },
    {
      "id": "admit_no_book",
      "label": "\"I don''t have the text yet.\"",
      "time_cost": 1, "energy_cost": 1,
      "outcome": { "text": "", "deltas": { "energy": -1, "stress": 0, "resources": { "knowledge": 5 } } },
      "reaction_text": "He looks at you for a beat. \"Come to office hours.\" Then moves on. It''s not warm and it''s not dismissive. You have an appointment now, which means you have to go.",
      "identity_tags": ["confront", "risk"],
      "relational_effects": {}, "set_npc_memory": {}, "precludes": [],
      "events_emitted": [
        { "npc_id": "npc_prof_marsh", "type": "INTRODUCED_SELF", "magnitude": 1 },
        { "npc_id": "npc_studious_priya", "type": "NOTICED_FACE", "magnitude": 1 }
      ],
      "sets_stream_state": { "stream": "academic", "state": "active_engagement" },
      "next_step_key": null
    }
  ]'::jsonb,
  ARRAY['arc_one', 'academic', 'money'],
  '{}'::jsonb,
  200, true,
  ARRAY['npc_prof_marsh', 'npc_studious_priya'],
  (SELECT id FROM public.arc_definitions WHERE key = 'arc_academic'),
  'first_class', 1, 1, 1, 'library_afternoon'
)
ON CONFLICT (arc_id, step_key) DO UPDATE SET
  title = EXCLUDED.title, body = EXCLUDED.body,
  choices = EXCLUDED.choices, is_active = EXCLUDED.is_active;


-- ============================================================
-- ACADEMIC STREAM — Beat 2: Library Afternoon (Day 3–5)
-- ============================================================
INSERT INTO public.storylets (
  slug, title, body, choices, tags, requirements, weight, is_active,
  introduces_npc, arc_id, step_key, order_index, due_offset_days,
  expires_after_days, default_next_step_key
)
VALUES (
  's04_library_afternoon',
  'The Library',
  E'The second floor of Harwick Library at four in the afternoon is not actually quiet.\n\nThe carrels by the window are claimed by upperclassmen who leave coats on the chairs even when they''re in the stacks. The card catalog is in the corner. A microfiche machine hums with nobody at it.\n\nShe''s at the third table from the stairs. Three books open at different pages. Her notebook has two columns — you can see this from where you''re standing. She noticed you in Marsh''s class. You know this because you noticed her noticing.\n\nThe seat across from her is not taken.',
  '[
    {
      "id": "sit_talk",
      "label": "Sit down. \"The page forty-three thing — I didn''t follow it.\"",
      "time_cost": 1, "energy_cost": 1,
      "outcome": { "text": "", "deltas": { "energy": -1, "stress": -1, "resources": { "knowledge": 10 } } },
      "reaction_text": "She looks up. A small pause. The Turner argument, she says, then goes back to her page. Three minutes later she corrects something in your notes without being asked. You''re not sure when you started sharing a table.",
      "identity_tags": ["people", "achievement"],
      "relational_effects": {}, "set_npc_memory": {}, "precludes": [],
      "events_emitted": [{ "npc_id": "npc_studious_priya", "type": "SMALL_KINDNESS", "magnitude": 1 }],
      "sets_stream_state": { "stream": "academic", "state": "active_engagement" },
      "next_step_key": null
    },
    {
      "id": "solo_carrel",
      "label": "Take a carrel on the other side of the room — work alone",
      "time_cost": 1, "energy_cost": 0,
      "outcome": { "text": "", "deltas": { "energy": -1, "stress": 0, "resources": { "knowledge": 5 } } },
      "reaction_text": "You get through two chapters. You leave knowing exactly what you know and nothing about how anyone else is handling this class. The carrel has the initials of four different people carved into the wood above the shelf.",
      "identity_tags": ["achievement"],
      "relational_effects": {}, "set_npc_memory": {}, "precludes": [],
      "events_emitted": [],
      "sets_stream_state": null, "next_step_key": null
    },
    {
      "id": "sit_quiet",
      "label": "Sit down, open your own book, say nothing",
      "time_cost": 1, "energy_cost": 0,
      "outcome": { "text": "", "deltas": { "energy": -1, "stress": 0, "resources": { "knowledge": 7 } } },
      "reaction_text": "You both read. Nobody speaks for twenty minutes. Then she asks which section you''re in for Marsh. You talk for fifteen minutes. Then you both go back to reading.",
      "identity_tags": ["achievement", "safety"],
      "relational_effects": {}, "set_npc_memory": {}, "precludes": [],
      "events_emitted": [{ "npc_id": "npc_studious_priya", "type": "SHARED_MEAL", "magnitude": 1 }],
      "sets_stream_state": null, "next_step_key": null
    }
  ]'::jsonb,
  ARRAY['arc_one', 'academic', 'belonging'],
  '{"requires_npc_met": ["npc_studious_priya"]}'::jsonb,
  100, true,
  ARRAY[]::text[],
  (SELECT id FROM public.arc_definitions WHERE key = 'arc_academic'),
  'library_afternoon', 2, 2, 4, NULL
)
ON CONFLICT (arc_id, step_key) DO UPDATE SET
  title = EXCLUDED.title, body = EXCLUDED.body,
  choices = EXCLUDED.choices, is_active = EXCLUDED.is_active;


-- ============================================================
-- OPPORTUNITY STREAM — Beat 1: The Bulletin Board (Day 2–5)
-- ============================================================
INSERT INTO public.storylets (
  slug, title, body, choices, tags, requirements, weight, is_active,
  introduces_npc, arc_id, step_key, order_index, due_offset_days,
  expires_after_days, default_next_step_key
)
VALUES (
  's02_opportunity_board',
  'The Board',
  E'The bulletin board outside the student union has been accumulating since before you got here.\n\nLayer on layer — flyers for events that already happened, a missing-cat notice (tabby, answers to Socks) from two weeks before classes started. Someone has thumbtacked something new over the corner of something old and there''s a tear where the tack pulled through.\n\nThe Harwick Herald: Wednesday pitch meeting, Kemp Hall 202, 7pm. The tab row has been half-torn. Six or seven tabs taken.\n\nCampus Radio WHRK: audition slots. One slot left, Tuesday 4pm.\n\n3rd shift dishwasher, Dining Commons. $3.35/hour. Apply in person, ask for Terri.\n\nBy the end of the week most of these sign-up sheets will be gone.',
  '[
    {
      "id": "herald_tab",
      "label": "Tear off a Herald number tab",
      "time_cost": 0, "energy_cost": 0,
      "outcome": { "text": "", "deltas": { "energy": 0, "stress": 0 } },
      "reaction_text": "The tab is in your pocket. Wednesday is three days away.",
      "identity_tags": ["achievement", "risk"],
      "relational_effects": {}, "set_npc_memory": {}, "precludes": [],
      "events_emitted": [],
      "sets_stream_state": { "stream": "opportunity", "state": "noticed" },
      "next_step_key": null
    },
    {
      "id": "radio_time",
      "label": "Fix the radio audition time in your memory — Tuesday, 4pm",
      "time_cost": 0, "energy_cost": 0,
      "outcome": { "text": "", "deltas": { "energy": 0, "stress": 0 } },
      "reaction_text": "You close your eyes once to cement it. One slot. You walk away with a date in your head in the way things get there.",
      "identity_tags": ["risk"],
      "relational_effects": {}, "set_npc_memory": {}, "precludes": [],
      "events_emitted": [],
      "sets_stream_state": { "stream": "opportunity", "state": "noticed" },
      "next_step_key": null
    },
    {
      "id": "dishwasher_math",
      "label": "Read the dishwasher posting until you''ve done the math on it",
      "time_cost": 0, "energy_cost": 0,
      "outcome": { "text": "", "deltas": { "energy": 0, "stress": 1 } },
      "reaction_text": "Three-thirty-five an hour. Five nights. You do the math twice without meaning to. You stand there longer than you meant to.",
      "identity_tags": ["achievement", "safety"],
      "relational_effects": {}, "set_npc_memory": {}, "precludes": [],
      "events_emitted": [],
      "sets_stream_state": { "stream": "opportunity", "state": "noticed" },
      "next_step_key": null
    },
    {
      "id": "keep_walking",
      "label": "Keep walking",
      "time_cost": 0, "energy_cost": 0,
      "outcome": { "text": "", "deltas": { "energy": 0, "stress": 0 } },
      "reaction_text": "You''ll look next time.",
      "identity_tags": ["avoid"],
      "relational_effects": {}, "set_npc_memory": {}, "precludes": [],
      "events_emitted": [],
      "sets_stream_state": null, "next_step_key": null
    }
  ]'::jsonb,
  ARRAY['arc_one', 'opportunity'],
  '{}'::jsonb,
  100, true,
  ARRAY[]::text[],
  (SELECT id FROM public.arc_definitions WHERE key = 'arc_opportunity'),
  'opportunity_board', 1, 1, 4, NULL
)
ON CONFLICT (arc_id, step_key) DO UPDATE SET
  title = EXCLUDED.title, body = EXCLUDED.body,
  choices = EXCLUDED.choices, is_active = EXCLUDED.is_active;


-- ============================================================
-- HOME STREAM — Beat 1: Dorm Phone (Day 3–5)
-- ============================================================
INSERT INTO public.storylets (
  slug, title, body, choices, tags, requirements, weight, is_active,
  introduces_npc, arc_id, step_key, order_index, due_offset_days,
  expires_after_days, default_next_step_key
)
VALUES (
  's03_parent_dorm_phone',
  'The Floor Phone',
  E'The floor phone.\n\nTouch-tone, mounted to the wall, cord too short to lean on anything while you talk. The whiteboard next to it has four messages, three handwritings. One of them is yours: Call when you can. —Mom.\n\nOr Dad. The handwriting belongs to whoever answered when they called the floor line this afternoon and got the sophomore who lives at the end of the hall.\n\nThe hallway is between quiet and not-quiet. A TV through someone''s door. You pick up the phone.',
  '[
    {
      "id": "tell_truth",
      "label": "Tell them it''s strange — harder than you expected",
      "time_cost": 0, "energy_cost": 0,
      "outcome": { "text": "", "deltas": { "energy": -1, "stress": -2 } },
      "reaction_text": "There''s a pause. Then: Yeah. They don''t try to fix it. They ask one question you can actually answer. The call is shorter than you expected. You hang up feeling less alone in a way that doesn''t make sense with the physics of a telephone.",
      "identity_tags": ["confront", "people"],
      "relational_effects": {}, "set_npc_memory": {}, "precludes": [],
      "events_emitted": [{ "npc_id": "npc_parent_voice", "type": "CONFIDED_IN", "magnitude": 1 }],
      "sets_stream_state": { "stream": "home", "state": "background_warmth" },
      "next_step_key": null
    },
    {
      "id": "tell_great",
      "label": "Tell them it''s great — give them the version they''re hoping for",
      "time_cost": 0, "energy_cost": 0,
      "outcome": { "text": "", "deltas": { "energy": 0, "stress": 2 } },
      "reaction_text": "They sound so relieved. Your mother says she knew it would be fine. You laugh at the right moment. When you hang up the relief in their voice stays somewhere in your chest wrong. You look at the whiteboard. The message is still there.",
      "identity_tags": ["avoid", "safety"],
      "relational_effects": {}, "set_npc_memory": {}, "precludes": [],
      "events_emitted": [{ "npc_id": "npc_parent_voice", "type": "DEFERRED_TENSION", "magnitude": 1 }],
      "sets_stream_state": { "stream": "home", "state": "guilt_current" },
      "next_step_key": null
    },
    {
      "id": "ask_money",
      "label": "Ask if there''s more money — take three tries to get there",
      "time_cost": 0, "energy_cost": 0,
      "outcome": { "text": "", "deltas": { "energy": -1, "stress": 0, "resources": { "cashOnHand": 0 } } },
      "reaction_text": "It comes out smaller than you meant. A silence. We''ll see what we can do — their voice has something in it you recognize. They''ll try. You won''t know for four or five days. You hang up with something unfinished.",
      "identity_tags": ["confront", "risk"],
      "relational_effects": {}, "set_npc_memory": {}, "precludes": [],
      "events_emitted": [{ "npc_id": "npc_parent_voice", "type": "CONFIDED_IN", "magnitude": 1 }],
      "sets_stream_state": { "stream": "home", "state": "active_pull" },
      "next_step_key": null
    }
  ]'::jsonb,
  ARRAY['arc_one', 'home', 'family'],
  '{}'::jsonb,
  150, true,
  ARRAY['npc_parent_voice'],
  (SELECT id FROM public.arc_definitions WHERE key = 'arc_home'),
  'parent_dorm_phone', 1, 2, 3, NULL
)
ON CONFLICT (arc_id, step_key) DO UPDATE SET
  title = EXCLUDED.title, body = EXCLUDED.body,
  choices = EXCLUDED.choices, is_active = EXCLUDED.is_active;


COMMIT;
