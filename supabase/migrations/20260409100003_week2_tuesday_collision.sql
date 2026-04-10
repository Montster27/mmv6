-- ================================================================
-- Week 2, Part 4: The Tuesday Collision
-- Days 13-14 — the week's thesis scene
-- Four things demand Tuesday at eight. You get one.
-- ================================================================

-- ============================================================
-- DAY 13: TUESDAY COMMITMENT (Landmark — evening, belonging)
-- Sunday. The schedule materializes. Four competing pulls.
-- The work has been done by the prior twelve days.
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
  'tuesday_commitment',
  'Tuesday at Eight',

  $body$Sunday evening. You are sitting on your bed. The class schedule is one of those computer-printed things on green-and-white striped paper, folded into quarters and soft at the creases from being in your back pocket since orientation.

You unfold it on the bed and look at Tuesday.

Tuesday at eight.$body$,

  $choices$[
    {
      "id": "tuesday_decided",
      "label": "Fold the schedule and put it back",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": [],
      "precludes": [],
      "outcome": {
        "text": "You fold the schedule along its creases. The paper is getting thin where it folds. You put it in your back pocket and go brush your teeth.",
        "deltas": {}
      }
    }
  ]$choices$::jsonb,

  $nodes$[
    {
      "id": "schedule_scan",
      "text": "Priya's study group. Keith's room. Western Civ, the reading for next week, Heller cold-calls.\n\nThe Whitmore basement is quietest Tuesday evenings — Glenn mentioned it once, in passing, and the fact that you remember it means something.\n\nDana mentioned a movie at the Union on Tuesday. He did not exactly ask. He said \"there is a thing at the Union Tuesday\" and then he said \"if you want\" and that was as close as Dana gets to an invitation.",
      "next": "the_choice"
    },
    {
      "id": "the_choice",
      "text": "Four things. One evening. The schedule sits on the bed, green and white stripes, patient.",
      "micro_choices": [
        {
          "id": "commit_study",
          "label": "Head to Keith's room Tuesday",
          "next": "choice_made",
          "sets_flag": "tuesday_study_group"
        },
        {
          "id": "commit_terminal",
          "label": "Go to the Whitmore basement",
          "next": "choice_made",
          "sets_flag": "tuesday_terminal"
        },
        {
          "id": "commit_shift",
          "label": "You cannot skip the shift",
          "next": "choice_made",
          "sets_flag": "tuesday_shift"
        },
        {
          "id": "commit_dana",
          "label": "Go to the movie with Dana",
          "next": "choice_made",
          "sets_flag": "tuesday_dana_movie"
        }
      ]
    },
    {
      "id": "choice_made",
      "text": "The other three things will happen without you. That is the math of it. You fold the schedule and the creases give easily — the paper remembers.",
      "next": "choices"
    }
  ]$nodes$::jsonb,

  ARRAY['arc_one', 'belonging', 'week2', 'landmark', 'day13', 'tuesday_collision'],
  '{}'::jsonb,
  150, true,
  NULL,
  (SELECT id FROM public.tracks WHERE key = 'belonging'),
  (SELECT id FROM public.tracks WHERE key = 'belonging'),
  'tuesday_commitment', 'tuesday_commitment',
  27, 13, 2,
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
-- DAY 14: TUESDAY NIGHT — STUDY GROUP VARIANT
-- Keith's room. Priya's highlighters. Wes from Connecticut.
-- The empty room when you get back. "Every Breath You Take."
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
  'tuesday_night_study',
  'Keith''s Room',

  $body$Keith's room, 8 PM. Priya is there, cross-legged on the floor with her three highlighters arranged by color on the carpet in front of her. A guy named Wes — not the Wes from the third floor, a different Wes, a sophomore from Connecticut — is sitting at Keith's desk chair turned backward. The study group is smaller than advertised.

You actually work for about forty minutes. The Peloponnesian War. Thucydides. Priya has a system with the highlighters — yellow for facts, pink for arguments, green for things Heller will definitely ask about — and she explains it once, crisply, and does not explain it again. Wes knows more than he lets on. Keith is quieter in his own room than he is in the hall.

At 9:30 Priya produces a hot plate from her bag — "do not ask" — and makes tea. The hot plate is definitely against dorm rules. The tea is Lipton. Nobody cares.

The conversation drifts. Someone mentions Reagan and whether he is going to get re-elected and for about ten minutes it is a real conversation, the kind where nobody is performing. Keith says something about his dad and farming and Reagan's agricultural policy and it is the most Keith has said all night. Wes disagrees but does it carefully. Priya listens with her tea in both hands.

At 10:30 you walk back to your room.$body$,

  $choices$[
    {
      "id": "tuesday_study_sleep",
      "label": "Sleep",
      "time_cost": 0,
      "energy_cost": 1,
      "identity_tags": ["people", "achieve"],
      "precludes": [],
      "outcome": {
        "text": "You get into bed. The room is dark. Down the hall, someone is playing \"Every Breath You Take\" again. You have heard it four times this week. The room is empty except for you and the sound of the song through the wall and the thin line of hallway light under the door.",
        "deltas": { "energy": -5, "stress": -5 }
      },
      "events_emitted": [
        { "npc_id": "npc_studious_priya", "type": "SHARED_ACTIVITY", "magnitude": 2 },
        { "npc_id": "npc_floor_keith", "type": "SHARED_ACTIVITY", "magnitude": 1 }
      ],
      "sets_track_state": { "state": "performing_fit" }
    }
  ]$choices$::jsonb,

  $nodes$[
    {
      "id": "empty_room_study",
      "text": "Dana is not there. The movie he mentioned started at 9:15. His desk lamp is off. His bed is made from this morning. The room has the particular stillness of a place where someone is not.",
      "next": "choices"
    }
  ]$nodes$::jsonb,

  ARRAY['arc_one', 'belonging', 'week2', 'beat', 'day14', 'tuesday_night'],
  '{"requires_flag": "tuesday_study_group"}'::jsonb,
  200, true,
  ARRAY['npc_study_wes']::text[],
  (SELECT id FROM public.tracks WHERE key = 'belonging'),
  (SELECT id FROM public.tracks WHERE key = 'belonging'),
  'tuesday_night_study', 'tuesday_night_study',
  28, 14, 2,
  NULL, NULL,
  'evening', 2
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
-- DAY 14: TUESDAY NIGHT — TERMINAL VARIANT
-- Whitmore basement. The VT100. The cursor blinks.
-- The player chose the frame story over everything else.
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
  'tuesday_night_terminal',
  'Whitmore Basement',

  $body$The basement corridor is empty at this hour. The overhead fluorescents have that particular hum — 60 hertz, you will learn later, the frequency of American current — and one of them is flickering near the door to the lab.

The lab is unlocked. Two rows of terminals. The VT100 at the end of the second row is warm when you sit down. Someone used it today. The green phosphor glow reflects off the desk surface in a way that makes the room feel like the inside of something.

You type what Glenn told you to type.

The cursor blinks three times. Then the screen fills.$body$,

  $choices$[
    {
      "id": "tuesday_terminal_end",
      "label": "Walk back to the dorm",
      "time_cost": 0,
      "energy_cost": 1,
      "identity_tags": ["risk", "achieve"],
      "precludes": [],
      "outcome": {
        "text": "The night air is cold after the basement. The campus is quiet — just the streetlights and the sound of your own footsteps and the feeling of something you do not have words for yet. The room is empty when you get back. Dana is at the movie.",
        "deltas": { "energy": -3 }
      },
      "sets_track_state": { "state": "pursuing" }
    }
  ]$choices$::jsonb,

  $nodes$[
    {
      "id": "terminal_text",
      "text": "What fills the screen is not what you expected. It is a list. Names. Dates. Some of the dates are in the future — or what you would call the future if you were not sitting in 1983 trying to remember what year it is supposed to be.\n\nYour name is not on the list.\n\nYou scroll down. More names. Some you do not recognize. One you do — it takes a moment, because the last name is spelled differently than you remember, but the first name is right and the university listed next to it is right and the date next to that is three years from now.\n\nThe cursor blinks at the bottom of the list, patient.",
      "micro_choices": [
        {
          "id": "search_own_name",
          "label": "Type your own name",
          "next": "not_found",
          "sets_flag": "searched_self_terminal"
        },
        {
          "id": "memorize_list",
          "label": "Try to memorize what you can",
          "next": "memorize",
          "sets_flag": "memorized_terminal_list"
        },
        {
          "id": "close_terminal",
          "label": "Log out",
          "next": "close_out"
        }
      ]
    },
    {
      "id": "not_found",
      "text": "NO MATCHING RECORDS.\n\nThe cursor blinks. The fluorescent behind you flickers. You are not on the list. You do not know what that means. The absence of your name feels heavier than any of the names that are there.",
      "next": "close_out"
    },
    {
      "id": "memorize",
      "text": "You read the list twice. Three times. Some of the names stick — the one you recognized, two others that are near your year, a date that means something only because it is your birthday in a year that has not happened. You do not have a pen. You will try to remember.\n\nThe screen has a timeout. After four minutes of no input, it clears itself. The cursor sits alone on a dark screen, blinking.",
      "next": "close_out"
    },
    {
      "id": "close_out",
      "text": "You log out. The screen goes dark except for the phosphor afterglow — a ghost of the text, slowly fading. The lab is empty. The fluorescent is still flickering.\n\nUpstairs, through the building's walls, you can hear the faint thump of someone's stereo. It could be anything.",
      "next": "choices"
    }
  ]$nodes$::jsonb,

  ARRAY['arc_one', 'opportunity', 'week2', 'beat', 'day14', 'tuesday_night', 'frame_story'],
  '{"requires_flag": "tuesday_terminal"}'::jsonb,
  200, true,
  NULL,
  (SELECT id FROM public.tracks WHERE key = 'opportunity'),
  (SELECT id FROM public.tracks WHERE key = 'opportunity'),
  'tuesday_night_terminal', 'tuesday_night_terminal',
  28, 14, 2,
  NULL, NULL,
  'evening', 2
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
-- DAY 14: TUESDAY NIGHT — LIBRARY SHIFT VARIANT
-- Baker Library at night. Alone with the returns cart.
-- Someone left a can of Tab on a reading desk.
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
  'tuesday_night_shift',
  'Baker Library, Evening',

  $body$The building is different at night. The reading room on the third floor is almost empty — two people at the long table, both hunched over in the kind of concentration that means they do not want to be disturbed, and the green-shaded desk lamps make little pools of light that do not quite touch each other.

Mrs. Doerr is not here. Tuesday evenings it is just you and the returns cart and the sound of the building settling. The radiators click on at 8:30 and the whole floor shifts slightly, the way old buildings do.

Someone has left a can of Tab on a reading desk. The can is warm. You throw it away and shelve the book that was next to it — Samuelson's Economics, fourteenth edition, dog-eared at the chapter on monetary policy.

You push the cart down the center aisle. The wheels need oil. The sound they make is the loudest thing on the floor.$body$,

  $choices$[
    {
      "id": "tuesday_shift_end",
      "label": "Clock out",
      "time_cost": 0,
      "energy_cost": 1,
      "identity_tags": ["safety"],
      "precludes": [],
      "outcome": {
        "text": "Outside, the campus is dark and quiet. The study group is probably wrapping up in Keith's room right now. The movie at the Union let out twenty minutes ago. You were shelving books. The money will show up in your account on Friday.",
        "deltas": { "energy": -5 }
      }
    }
  ]$choices$::jsonb,

  NULL,

  ARRAY['arc_one', 'money', 'week2', 'beat', 'day14', 'tuesday_night'],
  '{"requires_flag": "tuesday_shift"}'::jsonb,
  200, true,
  NULL,
  (SELECT id FROM public.tracks WHERE key = 'money'),
  (SELECT id FROM public.tracks WHERE key = 'money'),
  'tuesday_night_shift', 'tuesday_night_shift',
  28, 14, 2,
  NULL, NULL,
  'evening', 2
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
-- DAY 14: TUESDAY NIGHT — MOVIE WITH DANA VARIANT
-- The Union cinema. Trading Places. Dana laughs at the
-- wrong parts. His dad had a heart attack five days ago.
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
  'tuesday_night_dana_movie',
  'Trading Places',

  $body$The Union cinema charges two dollars. The seats are the old kind — wooden, with cushions that have been sat in so many times they hold the shape of a stranger. The screen is smaller than you expect.

Dana is there already. He saved you a seat with his jacket. He does not say anything when you sit down, just moves the jacket and nods. The lights go down.

Trading Places. Eddie Murphy and Dan Aykroyd. Dana laughs at the parts that are actually funny, which are not always the parts the rest of the audience laughs at. At one point he laughs hard enough that the guy in front of you turns around, and Dana makes a face at the guy that you have not seen before — a flash of something loose, something that is not the Dana who sits at his desk and listens to losing baseball games.

His dad had a heart attack five days ago. You know this. He does not know that you know this, or maybe he does and this is how he is dealing with it — sitting in a two-dollar movie theater watching Eddie Murphy, laughing at the wrong parts, being somewhere that is not the room with the letter.

Afterward you walk back to the dorm. The night is cold. Dana is quiet for most of the walk and then he says, not looking at you, "my dad used to take me to the movies every Saturday. We would go to the Rialto on Ridge Road. He always got popcorn even though my mom said it was a waste of money."

He does not say anything else about it. You walk the rest of the way listening to your footsteps on the sidewalk.$body$,

  $choices$[
    {
      "id": "tuesday_dana_end",
      "label": "Get back to the room",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": ["people"],
      "precludes": [],
      "outcome": {
        "text": "Dana puts his jacket on the back of his chair and turns on the desk lamp. He sits down and does not study and does not turn on the radio. After a while he says \"thanks for coming\" without looking up. It is the most direct thing he has said to you in a week.",
        "deltas": { "stress": -5 }
      },
      "events_emitted": [
        { "npc_id": "npc_roommate_dana", "type": "SHARED_ACTIVITY", "magnitude": 2 },
        { "npc_id": "npc_roommate_dana", "type": "SMALL_KINDNESS", "magnitude": 1 }
      ]
    }
  ]$choices$::jsonb,

  NULL,

  ARRAY['arc_one', 'roommate', 'week2', 'beat', 'day14', 'tuesday_night'],
  '{"requires_flag": "tuesday_dana_movie"}'::jsonb,
  200, true,
  NULL,
  (SELECT id FROM public.tracks WHERE key = 'roommate'),
  (SELECT id FROM public.tracks WHERE key = 'roommate'),
  'tuesday_night_dana_movie', 'tuesday_night_dana_movie',
  28, 14, 2,
  NULL, NULL,
  'evening', 2
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
