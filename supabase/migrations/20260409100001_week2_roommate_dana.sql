-- ================================================================
-- Week 2, Part 2: Roommate Track — Dana Beats
-- Days 8, 9
-- The cereal is the baseline. The letter is the fork.
-- ================================================================

-- ============================================================
-- DAY 8: DANA, CEREAL, 11PM (Beat — evening, roommate track)
-- The ambient version of the roommate relationship.
-- Stale Rice Krispies. A losing baseball game. A box offered.
-- ============================================================
INSERT INTO public.storylets (
  slug, title, body, choices, nodes,
  tags, requirements, weight, is_active,
  introduces_npc,
  arc_id, track_id,
  step_key, storylet_key,
  order_index, due_offset_days, expires_after_days,
  default_next_step_key, default_next_key,
  segment, time_cost_hours
)
VALUES (
  'dana_cereal',
  'Rice Krispies',

  $body$You get back around eleven. The overhead light is off and the desk lamp is on. Dana is sitting on his bed in gym shorts and a T-shirt, eating Rice Krispies out of the box, dry. The radio is on low — AM, the back half of a Tigers game. Sparky Anderson is being interviewed about a loss and he sounds like a man who has had this exact conversation four hundred times.

Dana nods when you come in. Does not say anything. Holds the box out toward you.$body$,

  $choices$[
    {
      "id": "cereal_continue",
      "label": "Continue",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": [],
      "precludes": [],
      "outcome": {
        "text": "",
        "deltas": {}
      }
    }
  ]$choices$::jsonb,

  $nodes$[
    {
      "id": "cereal_offer",
      "text": "The box rustles when he tilts it. The room smells faintly of cardboard and the particular staleness of cereal that has been open too long.",
      "micro_choices": [
        {
          "id": "take_handful",
          "label": "Take a handful",
          "next": "stale",
          "sets_flag": "dana_cereal_engaged"
        },
        {
          "id": "ask_game",
          "label": "How'd they do?",
          "next": "game_talk",
          "sets_flag": "dana_cereal_engaged"
        },
        {
          "id": "no_thanks",
          "label": "No thanks",
          "next": "quiet_room"
        },
        {
          "id": "bed_not_talking",
          "label": "Start getting ready for bed",
          "next": "radio_down",
          "sets_flag": "dana_cereal_cold"
        }
      ]
    },
    {
      "id": "stale",
      "text": "\"They're stale, sorry,\" Dana says, and goes back to listening to the radio. You eat them anyway. They are stale. The sound the box makes when you reach in again is the loudest thing in the room for a while.",
      "next": "choices"
    },
    {
      "id": "game_talk",
      "text": "\"Blew it in the eighth. Morris gave up a three-run double.\" He shakes his head. \"They're not going anywhere this year anyway.\" He says it the way people say things about teams they have watched lose for a long time — without heat, just the flat certainty of someone who has already done his grieving.",
      "next": "choices"
    },
    {
      "id": "quiet_room",
      "text": "Dana shifts the box to his lap and keeps eating. The room is quiet except for the radio. Anderson is saying something about the bullpen. The cereal crackles faintly every time Dana reaches into the box.",
      "next": "choices"
    },
    {
      "id": "radio_down",
      "text": "Dana turns the radio down another notch without being asked. The game becomes a murmur — you can hear the cadence of the announcer but not the words. The faucet in the bathroom down the hall is running. Someone else is still up.",
      "next": "choices"
    }
  ]$nodes$::jsonb,

  ARRAY['arc_one', 'roommate', 'week2', 'beat', 'day8'],
  '{}'::jsonb,
  100, true,
  ARRAY[]::text[],
  (SELECT id FROM public.tracks WHERE key = 'roommate'),
  (SELECT id FROM public.tracks WHERE key = 'roommate'),
  'dana_cereal', 'dana_cereal',
  22, 8, 2,
  NULL, NULL,
  'evening', 0
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title, body = EXCLUDED.body, choices = EXCLUDED.choices,
  nodes = EXCLUDED.nodes, tags = EXCLUDED.tags, requirements = EXCLUDED.requirements,
  weight = EXCLUDED.weight, is_active = EXCLUDED.is_active,
  introduces_npc = EXCLUDED.introduces_npc,
  order_index = EXCLUDED.order_index, due_offset_days = EXCLUDED.due_offset_days,
  expires_after_days = EXCLUDED.expires_after_days,
  default_next_step_key = EXCLUDED.default_next_step_key,
  default_next_key = EXCLUDED.default_next_key,
  segment = EXCLUDED.segment, time_cost_hours = EXCLUDED.time_cost_hours;


-- ============================================================
-- DAY 9: DANA'S THING — VARIANT A (genuine_connection)
-- Dana tells you about his dad. The lamp goes off while
-- you are still talking.
-- Gated by: player chose "real_question" in roommate_moment
-- ============================================================
INSERT INTO public.storylets (
  slug, title, body, choices, nodes,
  tags, requirements, weight, is_active,
  introduces_npc,
  arc_id, track_id,
  step_key, storylet_key,
  order_index, due_offset_days, expires_after_days,
  default_next_step_key, default_next_key,
  segment, time_cost_hours
)
VALUES (
  'dana_letter_connected',
  'Parma, Ohio',

  $body$Dana is at his desk when you get back. Not studying. The desk lamp is on. He has got a letter in his hand — not reading it, just holding it. The envelope is on the desk. The return address is Parma, Ohio.

He looks up when you come in and says "hey."

Then, after a beat: "My dad had a heart attack."

He says it flat, because he has been holding it for two hours and has already done the loud version in his head.$body$,

  $choices$[
    {
      "id": "dana_connected_end",
      "label": "Try to sleep",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": ["people"],
      "precludes": [],
      "outcome": {
        "text": "The desk lamp clicks off. The room goes dark except for the thin line of hallway light under the door. You are still sitting on your bed. Dana's breathing changes after a while but you cannot tell if he is sleeping.",
        "deltas": { "stress": 5 }
      },
      "events_emitted": [
        { "npc_id": "npc_roommate_dana", "type": "CONFIDED_IN", "magnitude": 3 },
        { "npc_id": "npc_roommate_dana", "type": "WITNESSED_VULNERABILITY", "magnitude": 2 }
      ]
    }
  ]$choices$::jsonb,

  $nodes$[
    {
      "id": "first_response",
      "text": "The letter is handwritten. You can see that from across the room — the uneven lines of someone writing quickly, or someone whose hand is not steady.",
      "micro_choices": [
        {
          "id": "sit_down",
          "label": "Sit down on your bed",
          "next": "dana_talks",
          "sets_flag": "sat_with_dana"
        },
        {
          "id": "ask_what_happened",
          "label": "What happened?",
          "next": "dana_talks",
          "sets_flag": "asked_dana_direct"
        },
        {
          "id": "offer_practical",
          "label": "Do you need anything?",
          "next": "dana_practical",
          "sets_flag": "offered_help"
        }
      ]
    },
    {
      "id": "dana_talks",
      "text": "Dana puts the letter down on the desk, face down. \"He's got a shop. Transmission repair. He has been doing it since he was twenty-two.\" He is not looking at you. He is looking at the letter. \"My mom says it was at the shop. He was under a car when it happened. The other guy — Dennis, he works there — he called the ambulance.\"\n\nHe picks up a pen from the desk and puts it back down.\n\n\"It is a six-hour drive. I do not know if I should go.\"",
      "speaker": "npc_roommate_dana",
      "next": "what_would_you_do"
    },
    {
      "id": "dana_practical",
      "text": "\"No. I mean — I do not know.\" He puts the letter down. \"He has got a shop. Transmission place. He was under a car when it happened.\" The details come out in pieces, not in order. His dad. The shop. A guy named Dennis who called the ambulance. His mom writing the letter instead of calling because long distance is expensive.\n\n\"It is a six-hour drive,\" he says. \"I do not know if I should go.\"",
      "speaker": "npc_roommate_dana",
      "next": "what_would_you_do"
    },
    {
      "id": "what_would_you_do",
      "text": "He looks at you. \"What would you do?\"",
      "speaker": "npc_roommate_dana",
      "micro_choices": [
        {
          "id": "say_go",
          "label": "I'd go",
          "next": "dana_nods"
        },
        {
          "id": "say_call_first",
          "label": "I'd call first. See how he's doing.",
          "next": "dana_considers"
        },
        {
          "id": "say_dont_know",
          "label": "I don't know",
          "next": "dana_quiet"
        }
      ]
    },
    {
      "id": "dana_nods",
      "text": "Dana nods. Not like he agrees — like he needed to hear someone say it out loud.\n\n\"I think I am gonna try to sleep,\" he says.",
      "speaker": "npc_roommate_dana",
      "next": "lamp_off"
    },
    {
      "id": "dana_considers",
      "text": "\"Yeah,\" Dana says. \"Yeah, that is — yeah.\" He picks up the pen again and writes something on the back of the envelope. A phone number, maybe. Or a reminder.\n\n\"I think I am gonna try to sleep,\" he says.",
      "speaker": "npc_roommate_dana",
      "next": "lamp_off"
    },
    {
      "id": "dana_quiet",
      "text": "\"Yeah,\" Dana says. \"Me neither.\"\n\nHe folds the letter and puts it in the desk drawer. Closes the drawer.\n\n\"I think I am gonna try to sleep,\" he says.",
      "speaker": "npc_roommate_dana",
      "next": "lamp_off"
    },
    {
      "id": "lamp_off",
      "text": "He reaches for the desk lamp. The click is loud in the quiet room. You are still sitting on your bed when the light goes off.",
      "next": "choices"
    }
  ]$nodes$::jsonb,

  ARRAY['arc_one', 'roommate', 'week2', 'landmark', 'day9', 'dana_letter'],
  '{"requires_choice": "real_question"}'::jsonb,
  300, true,
  ARRAY[]::text[],
  (SELECT id FROM public.tracks WHERE key = 'roommate'),
  (SELECT id FROM public.tracks WHERE key = 'roommate'),
  'dana_letter_connected', 'dana_letter_connected',
  23, 9, 2,
  NULL, NULL,
  'evening', 0
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title, body = EXCLUDED.body, choices = EXCLUDED.choices,
  nodes = EXCLUDED.nodes, tags = EXCLUDED.tags, requirements = EXCLUDED.requirements,
  weight = EXCLUDED.weight, is_active = EXCLUDED.is_active,
  introduces_npc = EXCLUDED.introduces_npc,
  order_index = EXCLUDED.order_index, due_offset_days = EXCLUDED.due_offset_days,
  expires_after_days = EXCLUDED.expires_after_days,
  default_next_step_key = EXCLUDED.default_next_step_key,
  default_next_key = EXCLUDED.default_next_key,
  segment = EXCLUDED.segment, time_cost_hours = EXCLUDED.time_cost_hours;


-- ============================================================
-- DAY 9: DANA'S THING — VARIANT B (surface/default)
-- Dana does not tell you. You push once. He leaves.
-- Default variant — fires when no specific state is set.
-- ============================================================
INSERT INTO public.storylets (
  slug, title, body, choices, nodes,
  tags, requirements, weight, is_active,
  introduces_npc,
  arc_id, track_id,
  step_key, storylet_key,
  order_index, due_offset_days, expires_after_days,
  default_next_step_key, default_next_key,
  segment, time_cost_hours
)
VALUES (
  'dana_letter_surface',
  'Parma, Ohio',

  $body$Dana is at his desk when you get back. Not studying. The desk lamp is on. He has got a letter in his hand — not reading it, just holding it. The envelope is on the desk, and from across the room you can see the return address. Parma, Ohio.

He looks up, sees it is you, looks back down at the letter. Does not say anything.$body$,

  $choices$[
    {
      "id": "dana_surface_end",
      "label": "Get into bed",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": [],
      "precludes": [],
      "outcome": {
        "text": "Dana comes back some time later. You are asleep or doing a good enough job pretending. He moves carefully in the dark. The bedsprings on his side creak once. The room settles.",
        "deltas": {}
      },
      "events_emitted": [
        { "npc_id": "npc_roommate_dana", "type": "DEFERRED_TENSION", "magnitude": 2 }
      ],
      "sets_track_state": { "state": "surface_tension" }
    }
  ]$choices$::jsonb,

  $nodes$[
    {
      "id": "dana_quiet",
      "text": "The envelope sits on the desk between you. Parma, Ohio. You do not know anyone in Parma, Ohio, except that you know Dana is from there because it said so on the housing form.",
      "micro_choices": [
        {
          "id": "ask_wrong_surface",
          "label": "You okay?",
          "next": "dana_fine"
        },
        {
          "id": "ignore_letter",
          "label": "Start unpacking your bag",
          "next": "dana_leaves"
        }
      ]
    },
    {
      "id": "dana_fine",
      "text": "\"Nothing. It is fine.\" He folds the letter and puts it in the desk drawer. The drawer sticks and he has to pull it twice to get it shut.",
      "speaker": "npc_roommate_dana",
      "micro_choices": [
        {
          "id": "push_once",
          "label": "You sure?",
          "next": "dana_hospital"
        },
        {
          "id": "let_it_go",
          "label": "Let it go",
          "next": "dana_leaves"
        }
      ]
    },
    {
      "id": "dana_hospital",
      "text": "A pause. He is looking at the closed drawer.\n\n\"My dad is in the hospital. It is fine. They think it is fine.\"\n\nHe does not elaborate. His hand is still on the drawer handle.",
      "speaker": "npc_roommate_dana",
      "micro_choices": [
        {
          "id": "push_further",
          "label": "What happened?",
          "next": "dana_shuts_down"
        },
        {
          "id": "nod_and_stop",
          "label": "Nod",
          "next": "dana_leaves"
        }
      ]
    },
    {
      "id": "dana_shuts_down",
      "text": "\"I said it is fine.\" The words come out with an edge that was not there before. He picks up his keys from the desk and stands.\n\n\"I am going to — I will be back.\"\n\nHe leaves. The door closes quietly, which is worse than if he had let it slam.",
      "speaker": "npc_roommate_dana",
      "next": "choices"
    },
    {
      "id": "dana_leaves",
      "text": "Dana sits for another minute. Then he picks up his keys from the desk and stands.\n\n\"I am going to take a walk,\" he says. He does not say when he will be back.\n\nThe door closes behind him. The letter is in the drawer.",
      "speaker": "npc_roommate_dana",
      "next": "choices"
    }
  ]$nodes$::jsonb,

  ARRAY['arc_one', 'roommate', 'week2', 'landmark', 'day9', 'dana_letter'],
  '{}'::jsonb,
  100, true,
  ARRAY[]::text[],
  (SELECT id FROM public.tracks WHERE key = 'roommate'),
  (SELECT id FROM public.tracks WHERE key = 'roommate'),
  'dana_letter_surface', 'dana_letter_surface',
  23, 9, 2,
  NULL, NULL,
  'evening', 0
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title, body = EXCLUDED.body, choices = EXCLUDED.choices,
  nodes = EXCLUDED.nodes, tags = EXCLUDED.tags, requirements = EXCLUDED.requirements,
  weight = EXCLUDED.weight, is_active = EXCLUDED.is_active,
  introduces_npc = EXCLUDED.introduces_npc,
  order_index = EXCLUDED.order_index, due_offset_days = EXCLUDED.due_offset_days,
  expires_after_days = EXCLUDED.expires_after_days,
  default_next_step_key = EXCLUDED.default_next_step_key,
  default_next_key = EXCLUDED.default_next_key,
  segment = EXCLUDED.segment, time_cost_hours = EXCLUDED.time_cost_hours;


-- ============================================================
-- DAY 9: DANA'S THING — VARIANT C (avoidance)
-- Dana is not there. The letter is. The pay stub in the morning.
-- Gated by: player chose "bed_not_talking" in dana_cereal
-- ============================================================
INSERT INTO public.storylets (
  slug, title, body, choices, nodes,
  tags, requirements, weight, is_active,
  introduces_npc,
  arc_id, track_id,
  step_key, storylet_key,
  order_index, due_offset_days, expires_after_days,
  default_next_step_key, default_next_key,
  segment, time_cost_hours
)
VALUES (
  'dana_letter_avoidance',
  'Parma, Ohio',

  $body$Dana is not in the room when you get back.

The desk lamp is off. His bed is made, which it usually is not by evening. On his desk, a letter — face down. The envelope next to it, flap open. The return address is visible in the light from the hallway: Parma, Ohio.$body$,

  $choices$[
    {
      "id": "dana_avoidance_end",
      "label": "Morning",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": [],
      "precludes": [],
      "outcome": {
        "text": "In the morning Dana is gone before you wake up. His bed is made. On your desk there is a note on a torn piece of notebook paper: rent is due friday do not forget. The handwriting is neat. It is not angry. It is the note of someone who has decided you are a logistics problem.",
        "deltas": { "stress": 3 }
      },
      "events_emitted": [
        { "npc_id": "npc_roommate_dana", "type": "MISSED_SIGNAL", "magnitude": 3 }
      ],
      "sets_track_state": { "state": "avoidance_pattern" }
    }
  ]$choices$::jsonb,

  $nodes$[
    {
      "id": "empty_room",
      "text": "The room is very quiet. Down the hall someone has music on — faint bass through the wall. Dana's things are in their usual places. Textbooks stacked. The clock radio on his nightstand. The Tigers pennant thumbtacked above his bed, one corner curling.",
      "micro_choices": [
        {
          "id": "look_at_envelope",
          "label": "Look at the envelope",
          "next": "envelope_detail"
        },
        {
          "id": "read_the_letter",
          "label": "Read the letter",
          "next": "letter_content",
          "sets_flag": "read_dana_letter"
        },
        {
          "id": "leave_it",
          "label": "Leave it alone",
          "next": "go_to_bed"
        }
      ]
    },
    {
      "id": "envelope_detail",
      "text": "The handwriting on the envelope is a woman's — neat, small, the kind of writing that comes from someone who learned penmanship in school and kept it. The stamp is crooked. There is no return name, just the address. Parma, Ohio.",
      "next": "go_to_bed"
    },
    {
      "id": "letter_content",
      "text": "The letter is short. One page. The handwriting is the same as the envelope — neat but with a shakiness in the longer words.\n\nDana's father had a heart attack. He is in the hospital. He is stable. His mother writes that she did not want to call because long distance costs too much and besides she did not want Dana to hear it in her voice. She asks him to call when he can. She says his father would say not to worry.\n\nYou put the letter back face down, exactly where it was.",
      "next": "go_to_bed"
    },
    {
      "id": "go_to_bed",
      "text": "You get into bed. The room is dark. \n\nDana comes back sometime around 2 AM. You know this because you are not asleep, but you do not move, and he does not turn on a light. He takes his shoes off carefully. The bedsprings creak once. Then the room is quiet again.\n\nNeither of you says anything.",
      "next": "choices"
    }
  ]$nodes$::jsonb,

  ARRAY['arc_one', 'roommate', 'week2', 'landmark', 'day9', 'dana_letter'],
  '{"requires_flag": "dana_cereal_cold"}'::jsonb,
  200, true,
  ARRAY[]::text[],
  (SELECT id FROM public.tracks WHERE key = 'roommate'),
  (SELECT id FROM public.tracks WHERE key = 'roommate'),
  'dana_letter_avoidance', 'dana_letter_avoidance',
  23, 9, 2,
  NULL, NULL,
  'evening', 0
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title, body = EXCLUDED.body, choices = EXCLUDED.choices,
  nodes = EXCLUDED.nodes, tags = EXCLUDED.tags, requirements = EXCLUDED.requirements,
  weight = EXCLUDED.weight, is_active = EXCLUDED.is_active,
  introduces_npc = EXCLUDED.introduces_npc,
  order_index = EXCLUDED.order_index, due_offset_days = EXCLUDED.due_offset_days,
  expires_after_days = EXCLUDED.expires_after_days,
  default_next_step_key = EXCLUDED.default_next_step_key,
  default_next_key = EXCLUDED.default_next_key,
  segment = EXCLUDED.segment, time_cost_hours = EXCLUDED.time_cost_hours;
