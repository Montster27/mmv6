-- narrative_3: Seed the opening arc (arc_opening) — 3 beats
-- Source: docs/new content/opening.json
-- Beats: Hallway → Room → Dana
-- Sets money band and roommate stream state. No time slots consumed.

BEGIN;

-- 1. Insert arc definition
INSERT INTO public.arc_definitions (key, title, description, tags, is_enabled)
VALUES (
  'arc_opening',
  'Arrival',
  'The first minutes in your dorm. You haven''t chosen anything yet. Everything is about to start.',
  '["arc_one", "opening", "required"]'::jsonb,
  true
);

-- 2. Beat 1: The Hallway
INSERT INTO public.storylets (
  slug, title, body, choices, tags, requirements, weight, is_active,
  introduces_npc, arc_id, step_key, order_index, due_offset_days,
  expires_after_days, default_next_step_key
)
VALUES (
  'arc_opening_hallway',
  'The Hallway',
  E'The hallway smells like industrial cleaner and someone else''s shampoo. Doors propped open with sneakers and milk crates. A hand-written banner — "Welcome Class of ''87" — droops from a strip of masking tape over the common room door.\n\nSomewhere behind a closed door, someone is playing a song you almost recognize. You can''t name it, but you know the next three notes before they come. The feeling passes before you can hold it.\n\nYour room number is written on the paper schedule folded in your back pocket. Second floor, end of the hall. The door is already open.',
  '[
    {
      "id": "enter_room",
      "label": "Go in",
      "energy_cost": 0,
      "time_cost": 0,
      "outcome": {
        "text": "",
        "deltas": { "energy": 0, "stress": 0, "resources": {} }
      },
      "reaction_text": "The hallway stretches behind you. Voices overlap from open doors — introductions, small talk, the same questions asked and answered a dozen times over. Someone laughs too loud. Someone drags a box across linoleum.\n\nYou find the door. Your name is on a strip of masking tape beside another name you don''t know yet.\n\nYou step inside.",
      "identity_tags": [],
      "next_step_key": "opening_s2_room"
    }
  ]'::jsonb,
  ARRAY['arc_one', 'opening', 'deja_vu'],
  '{}'::jsonb,
  1,
  true,
  ARRAY[]::text[],
  (SELECT id FROM public.arc_definitions WHERE key = 'arc_opening'),
  'opening_s1_hallway',
  1,
  0,
  NULL,
  'opening_s2_room'
);

-- 3. Beat 2: The Room
INSERT INTO public.storylets (
  slug, title, body, choices, tags, requirements, weight, is_active,
  introduces_npc, arc_id, step_key, order_index, due_offset_days,
  expires_after_days, default_next_step_key
)
VALUES (
  'arc_opening_room',
  'The Room',
  E'Half the room is already claimed. The better desk — the one by the window — has a cassette player on it and a stack of tapes you''d need to get closer to read. A poster on the wall: a black-and-white photo of a band you half-recognize. The bed is made, tight corners, almost military. Yours is a bare mattress with folded sheets from the housing office sitting on top.\n\nYour roommate isn''t here. His name is on the whiteboard by the door in careful block letters: DANA.\n\nYou set your bags down. The room is smaller than you imagined. The ceiling is lower. There is one window and the light comes through it at an angle that makes the dust visible.\n\nThis is where you live now.\n\nYour dad handed you an envelope at the car. He didn''t say how much was in it. You knew what it meant.',
  '[
    {
      "id": "envelope_counted",
      "label": "You counted it that night at the motel. You''ve counted it twice since.",
      "energy_cost": 0,
      "time_cost": 0,
      "money_effect": null,
      "outcome": {
        "text": "",
        "deltas": { "energy": 0, "stress": 5, "resources": { "cashOnHand": 120 } }
      },
      "reaction_text": "The number is exact in your head. Four hundred and eighty dollars. It has to last until October, and you''ve already done the math enough times to know it might not.\n\nYou put the envelope in the bottom drawer, under your socks, where no one will look. You''ve been carrying it against your chest since the car. The absence of its weight feels wrong for a moment, like setting down something you''ve been holding too long.\n\nYou start making the bed. Hospital corners, the way your mom showed you. The sheets smell like your house. That catches you off guard.\n\nThe room is still too quiet. You leave the door open, the way everyone else on the hall has.",
      "identity_tags": ["safety"],
      "sets_stream_state": { "stream": "money", "state": "tight" },
      "relational_effects": {},
      "set_npc_memory": {},
      "next_step_key": "opening_s3_dana"
    },
    {
      "id": "envelope_there",
      "label": "It''s in your bag somewhere. Enough to get started.",
      "energy_cost": 0,
      "time_cost": 0,
      "money_effect": null,
      "outcome": {
        "text": "",
        "deltas": { "energy": 0, "stress": 0, "resources": { "cashOnHand": 350 } }
      },
      "reaction_text": "You know it''s there. You don''t need to count it right now. Your parents saved for this — not comfortably, but deliberately — and the envelope represents something more than the cash inside it. You''ll be careful with it. But you''re not going to let it be the first thing you think about.\n\nYou find the envelope in the side pocket of your duffel, creased from being packed around. You toss it in the desk drawer and start making the bed.\n\nThe sheets from home still smell faintly like detergent from a box your mom buys at the grocery store two towns over. You notice it, then you don''t.\n\nThe door is open. The hallway sounds like the beginning of something.",
      "identity_tags": [],
      "sets_stream_state": { "stream": "money", "state": "okay" },
      "relational_effects": {},
      "set_npc_memory": {},
      "next_step_key": "opening_s3_dana"
    },
    {
      "id": "envelope_deposited",
      "label": "You deposited it before you left. Your mom set up the checking account in June.",
      "energy_cost": 0,
      "time_cost": 0,
      "money_effect": null,
      "outcome": {
        "text": "",
        "deltas": { "energy": 0, "stress": 0, "resources": { "cashOnHand": 600 } }
      },
      "reaction_text": "The money is handled. Your mom walked you through the checking account over the summer, and the numbers are in a small notebook in your bag, written in her handwriting. You have enough. That''s one less thing.\n\nYou know that''s not true for everyone here. You heard it in the parking lot — a father''s voice saying something about being careful, a mother pressing an envelope into someone''s hand. You know enough not to talk about it.\n\nYou make the bed quickly. The sheets are new — your mom bought them for this, still creased from the package. The room smells like cardboard and possibility.\n\nYou leave the door open. Might as well.",
      "identity_tags": [],
      "sets_stream_state": { "stream": "money", "state": "comfortable" },
      "relational_effects": {},
      "set_npc_memory": {},
      "next_step_key": "opening_s3_dana"
    }
  ]'::jsonb,
  ARRAY['arc_one', 'opening', 'money'],
  '{}'::jsonb,
  1,
  true,
  ARRAY[]::text[],
  (SELECT id FROM public.arc_definitions WHERE key = 'arc_opening'),
  'opening_s2_room',
  2,
  0,
  NULL,
  'opening_s3_dana'
);

-- 4. Beat 3: Dana
INSERT INTO public.storylets (
  slug, title, body, choices, tags, requirements, weight, is_active,
  introduces_npc, arc_id, step_key, order_index, due_offset_days,
  expires_after_days, default_next_step_key
)
VALUES (
  'arc_opening_dana',
  'Dana',
  E'The door opens wider behind you. A guy your age, maybe a little taller, carrying a paper bag from the dining hall. He stops when he sees you — not startled, just recalibrating. Like he''d gotten used to the room being his.\n\n"Oh — hey. You must be—" He checks the whiteboard, even though he''s the one who wrote on it this morning.\n\nHe puts the bag on his desk. Grease is already soaking through the bottom. The room feels smaller with two people in it.\n\nHe sits on the edge of his bed, hands on his knees, and looks at you with the expression of someone who knows this conversation is required but hasn''t figured out how to start it naturally.\n\n"So. Where are you from?"',
  '[
    {
      "id": "volunteer_real",
      "label": "Tell him where you''re from — and what it was like to leave",
      "energy_cost": 1,
      "time_cost": 0,
      "outcome": {
        "text": "",
        "deltas": { "energy": -1, "stress": -3, "resources": {} }
      },
      "reaction_text": "You tell him. Not the rehearsed version — the real one. The town, the size of it, what your street looked like from the back seat as you pulled away. You didn''t plan to say that last part.\n\nSomething in his posture changed when you did. He leaned back against the wall and told you about his drive up — eleven hours, his dad''s truck, a gas station in Pennsylvania where they didn''t talk for forty miles after. He laughed about it but his eyes went somewhere else.\n\nNeither of you is performing anymore. For now. The greasy bag sits untouched on his desk. He offers you half of whatever''s in it. You haven''t eaten since the car.\n\nThe room is still small. But the silence between sentences has a different quality now — not empty, just easy. Like the first draft of something that might work.",
      "identity_tags": ["people", "risk"],
      "sets_stream_state": { "stream": "roommate", "state": "genuine_connection" },
      "relational_effects": {
        "npc_roommate_dana": { "trust": 1, "relationship": 1 }
      },
      "set_npc_memory": {
        "npc_roommate_dana": { "knows_hometown": true, "shared_first_meal": true }
      },
      "events_emitted": [
        { "npc_id": "npc_roommate_dana", "type": "INTRODUCED_SELF", "magnitude": 1 },
        { "npc_id": "npc_roommate_dana", "type": "SHARED_MEAL", "magnitude": 1 }
      ],
      "next_step_key": null
    },
    {
      "id": "keep_surface",
      "label": "Answer the question, keep it light, ask him one back",
      "energy_cost": 0,
      "time_cost": 0,
      "outcome": {
        "text": "",
        "deltas": { "energy": 0, "stress": 0, "resources": {} }
      },
      "reaction_text": "You give him the easy version. State, town, size of your high school. He nods like he''s filing it. He gives you the same back — a place you''ve heard of but couldn''t find on a map, a high school with a name that sounds like every other high school.\n\nYou ask about his major. He asks about yours. You both hedge in the same way — \"I''m thinking about\" instead of \"I am.\" That''s a small thing to have in common but you both notice it.\n\nHe pulls a sandwich out of the bag and says the dining hall isn''t as bad as it looks. You''re not sure if that''s true but you appreciate the data point.\n\nThe conversation finds its natural end. He turns on his cassette player — low, not inconsiderate — and you go back to unpacking. The room has a rhythm now. Surface, functional, fine. There''s time.",
      "identity_tags": ["safety"],
      "sets_stream_state": { "stream": "roommate", "state": "neutral_start" },
      "relational_effects": {
        "npc_roommate_dana": { "relationship": 1 }
      },
      "set_npc_memory": {
        "npc_roommate_dana": { "knows_hometown": true }
      },
      "events_emitted": [
        { "npc_id": "npc_roommate_dana", "type": "INTRODUCED_SELF", "magnitude": 1 }
      ],
      "next_step_key": null
    },
    {
      "id": "stay_busy",
      "label": "Give a short answer and keep unpacking — you''ll talk when you''re settled",
      "energy_cost": 0,
      "time_cost": 0,
      "outcome": {
        "text": "",
        "deltas": { "energy": 0, "stress": -2, "resources": {} }
      },
      "reaction_text": "You tell him the name of your town. He nods. You turn back to the box you were unpacking and start putting shirts in the small dresser that smells like someone else''s year.\n\nHe got the message. Not rude, just — occupied. He sits there for a moment longer than feels natural, then turns on his cassette player. Quieter than before. A consideration, or an adjustment. You can''t tell which.\n\nYou unpack methodically. Books on the shelf, shoes under the bed, alarm clock on the nightstand. Each thing you place makes the room slightly more yours and slightly less his. He eats his sandwich without offering you half.\n\nThe two of you exist in the same small room without quite being in it together. It''s manageable. It''s controlled. It''s the thing you know how to do when you don''t know what else to do.\n\nOutside the door, the hallway is getting louder. Someone is organizing something. You''ll get to it. Just — not yet.",
      "identity_tags": ["avoid", "achievement"],
      "sets_stream_state": { "stream": "roommate", "state": "avoidance_start" },
      "relational_effects": {
        "npc_roommate_dana": { "reliability": -1 }
      },
      "set_npc_memory": {},
      "events_emitted": [
        { "npc_id": "npc_roommate_dana", "type": "INTRODUCED_SELF", "magnitude": 0 }
      ],
      "next_step_key": null
    }
  ]'::jsonb,
  ARRAY['arc_one', 'opening', 'roommate', 'relationship'],
  '{}'::jsonb,
  1,
  true,
  ARRAY['npc_roommate_dana'],
  (SELECT id FROM public.arc_definitions WHERE key = 'arc_opening'),
  'opening_s3_dana',
  3,
  0,
  NULL,
  NULL
);

COMMIT;
