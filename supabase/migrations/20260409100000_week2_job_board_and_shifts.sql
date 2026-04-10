-- ================================================================
-- Week 2, Part 1: The Job Board + First Shift Variants
-- Money Track — Days 7, 10
-- "Work Study Binds You" — the player's time starts belonging
-- to other people, and they begin to feel it.
-- ================================================================

-- ============================================================
-- DAY 7: THE JOB BOARD (Landmark — afternoon, money track)
-- The corkboard outside the work-study office. Terminal choice:
-- one job locks the schedule for the rest of the arc.
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
  'job_board',
  'Student Union 204',

  $body$The corkboard outside the work-study office is the kind they have in every university building — brown cork gone dark at the edges, pushpins with bent stems, one whole quadrant taken up by a flyer for a lecture series nobody attends.

You have done the math on what is left. It is the kind of math that sends you to a corkboard with tear-off phone number tabs at the bottom of index cards.

The cards are pinned unevenly. A babysitter wanted in a faculty house on Prospect Street — must have references, two evenings a week. A dog walker for a golden retriever named Hutch, friendly but pulls. A dishwasher at Capri Pizza with six of the eight phone number tabs already torn off.

Four cards matter. The others are set dressing and you know it.$body$,

  $choices$[
    {
      "id": "leave_board",
      "label": "Head out",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": [],
      "precludes": [],
      "outcome": {
        "text": "You fold the card and put it in your back pocket. The cork underneath is lighter where the card was — a little rectangle of the original color, like the shadow of something that has been there a long time.",
        "deltas": {}
      },
      "sets_track_state": { "state": "friction_visible" }
    }
  ]$choices$::jsonb,

  $nodes$[
    {
      "id": "scan_board",
      "text": "The first card is typed, clean white, the ink slightly faded. Baker Library, evening shelving, $3.35 an hour, ten hours a week. It has been up a while.\n\nNext to it, handwritten on lined paper torn from a notebook: Dining Commons, breakfast shift, $3.35 an hour, fifteen hours a week. Tuesday, Thursday, Saturday, 5:30 to 8:30 AM. Someone has drawn an exclamation point after JOIN OUR TEAM.\n\nBelow that, on a card with a coffee ring stamped across one corner: Grounds crew, maintenance, $4.10 an hour, twelve hours a week. Outdoor work, weather dependent.\n\nAnd one more, at the bottom right, typed on heavier paper — the kind from an IBM Selectric, each letter bitten in clean. Research assistant, Economics Department, $4.15 an hour, six hours a week. Data entry and source review. Some statistical background preferred. At the bottom, in pencil, recent: See R. Chen, Crandall Hall 304.",
      "next": "pick_card"
    },
    {
      "id": "pick_card",
      "text": "You reach for a card.",
      "micro_choices": [
        {
          "id": "job_library",
          "label": "Take the Baker Library card",
          "next": "card_taken",
          "sets_flag": "has_job_library"
        },
        {
          "id": "job_dining",
          "label": "Take the dining hall card",
          "next": "card_taken",
          "sets_flag": "has_job_dining"
        },
        {
          "id": "job_grounds",
          "label": "Take the grounds crew card",
          "next": "card_taken",
          "sets_flag": "has_job_grounds"
        },
        {
          "id": "job_research",
          "label": "Take the card from the bottom right",
          "next": "card_taken",
          "sets_flag": "has_job_research"
        }
      ]
    },
    {
      "id": "card_taken",
      "text": "The card comes off the pushpin with a small tearing sound where the pin went through. You fold it once and put it in your back pocket.",
      "next": "choices"
    }
  ]$nodes$::jsonb,

  ARRAY['arc_one', 'money', 'week2', 'landmark', 'day7'],
  '{}'::jsonb,
  100, true,
  ARRAY[]::text[],
  (SELECT id FROM public.tracks WHERE key = 'money'),
  (SELECT id FROM public.tracks WHERE key = 'money'),
  'job_board', 'job_board',
  20, 7, 3,
  NULL, NULL,
  'afternoon', 1
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
-- DAY 10: FIRST SHIFT — LIBRARY VARIANT
-- Gated by job_library flag from Job Board micro-choice.
-- Mrs. Doerr has a system. She explains it twice.
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
  'first_shift_library',
  'Baker Library, Third Floor',

  $body$Mrs. Doerr has a system. She explains it twice.

The returns cart has a particular order — fiction on the top shelf by author, nonfiction on the bottom by call number, periodicals in the wire rack underneath. She shows you the order and then she shows you again, not because she thinks you are slow but because the system matters to her and she wants you to see that it matters.

The third floor smells like old carpet. The radiators click in a pattern you almost catch and then lose. You shelve for two hours and realize you have read the spines of about four hundred books without taking any of them in.

At ten o'clock Mrs. Doerr checks your work. She moves three books without comment and nods once.$body$,

  $choices$[
    {
      "id": "finish_shift_library",
      "label": "Clock out",
      "time_cost": 0,
      "energy_cost": 1,
      "identity_tags": ["safety"],
      "precludes": [],
      "outcome": {
        "text": "The night air outside Baker Library is different from the air inside. Colder, and it does not smell like carpet.",
        "deltas": { "energy": -5 }
      },
      "events_emitted": [
        { "npc_id": "npc_librarian_doerr", "type": "WORKED_FOR", "magnitude": 1 }
      ]
    }
  ]$choices$::jsonb,

  NULL,

  ARRAY['arc_one', 'money', 'week2', 'beat', 'day10', 'job_library'],
  '{"requires_flag": "has_job_library"}'::jsonb,
  200, true,
  ARRAY['npc_librarian_doerr']::text[],
  (SELECT id FROM public.tracks WHERE key = 'money'),
  (SELECT id FROM public.tracks WHERE key = 'money'),
  'first_shift_library', 'first_shift_library',
  21, 10, 3,
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
-- DAY 10: FIRST SHIFT — DINING HALL VARIANT
-- 5:30 AM. Terry. Doug in the hairnet line.
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
  'first_shift_dining',
  '5:30 AM',

  $body$The industrial dishwasher is already running when you push through the kitchen door. The clock on the wall says 5:34.

A guy named Terry who looks about forty and is not a student shows you how to break down the egg station. Hairnet, apron, the order of operations for the steam trays. He does not ask your name. At one point he says "the trays go here, not there" and that is the most he has said to you in an hour.

The work is not hard. It is just early, and wet, and the fluorescent lights are the bad kind — the kind that make everything look like evidence.

At 7:15 Doug comes through the breakfast line and sees you behind the counter in the hairnet.

He does not make a joke about it.

Which is somehow worse than if he had.$body$,

  $choices$[
    {
      "id": "finish_shift_dining",
      "label": "Clock out at 8:30",
      "time_cost": 0,
      "energy_cost": 2,
      "identity_tags": ["achieve"],
      "precludes": [],
      "outcome": {
        "text": "You hang up the apron. Your fingers smell like industrial soap. The morning outside the kitchen door is already half over.",
        "deltas": { "energy": -10 }
      },
      "events_emitted": [
        { "npc_id": "npc_dining_terry", "type": "WORKED_FOR", "magnitude": 1 },
        { "npc_id": "npc_floor_doug", "type": "NOTICED_VULNERABILITY", "magnitude": 1 }
      ]
    }
  ]$choices$::jsonb,

  NULL,

  ARRAY['arc_one', 'money', 'week2', 'beat', 'day10', 'job_dining'],
  '{"requires_flag": "has_job_dining"}'::jsonb,
  200, true,
  ARRAY['npc_dining_terry']::text[],
  (SELECT id FROM public.tracks WHERE key = 'money'),
  (SELECT id FROM public.tracks WHERE key = 'money'),
  'first_shift_dining', 'first_shift_dining',
  21, 10, 3,
  NULL, NULL,
  'morning', 3
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
-- DAY 10: FIRST SHIFT — GROUNDS CREW VARIANT
-- Cold. Raking. Vince. "You'll get used to it."
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
  'first_shift_grounds',
  'North Side',

  $body$It is cold. Not the dramatic kind — the persistent kind that gets into your fingers through the work gloves after about twenty minutes and stays.

You are raking leaves on the north side of the library with a guy named Vince who is a sophomore and does not want to talk. He showed you where the rakes are and where the bags go and then he put his headphones on. The headphones are connected to a Walkman clipped to his belt. You can hear a faint, tinny bleed of something — could be Springsteen, could be anything.

The leaves are wet. They come off the grass in clumps that stick to the rake tines. You develop a rhythm after a while — scrape, lift, shake, dump — and the rhythm is almost enough to keep your mind off the cold. Almost.

At one point Vince takes one headphone off and says "you'll get used to it" without looking over.

It is not clear what he means.$body$,

  $choices$[
    {
      "id": "finish_shift_grounds",
      "label": "Load the last bag",
      "time_cost": 0,
      "energy_cost": 2,
      "identity_tags": ["safety"],
      "precludes": [],
      "outcome": {
        "text": "Vince clips the Walkman off his belt and walks toward the maintenance shed. He does not say goodbye. Your hands take about ten minutes to warm up.",
        "deltas": { "energy": -10 }
      },
      "events_emitted": [
        { "npc_id": "npc_grounds_vince", "type": "WORKED_WITH", "magnitude": 1 }
      ]
    }
  ]$choices$::jsonb,

  NULL,

  ARRAY['arc_one', 'money', 'week2', 'beat', 'day10', 'job_grounds'],
  '{"requires_flag": "has_job_grounds"}'::jsonb,
  200, true,
  ARRAY['npc_grounds_vince']::text[],
  (SELECT id FROM public.tracks WHERE key = 'money'),
  (SELECT id FROM public.tracks WHERE key = 'money'),
  'first_shift_grounds', 'first_shift_grounds',
  21, 10, 3,
  NULL, NULL,
  'morning', 2
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
-- DAY 10: FIRST SHIFT — RESEARCH ASSISTANT VARIANT
-- Rebecca Chen. Crandall Hall 304. She watches you work.
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
  'first_shift_research',
  'Crandall Hall 304',

  $body$The office is small. Two desks, a window that looks out at a brick wall. Fluorescent light — the good kind that does not hum.

Rebecca is there when you arrive. She is maybe twenty-one. Cardigan, hair pulled back, a coffee cup that says DEPARTMENT OF ECONOMICS in serif letters. When you come in she looks up and studies you for about two seconds longer than is comfortable.

"Okay," she says. "Here is what we are doing."

She hands you a folder of photocopied articles from the Journal of Monetary Economics and a yellow legal pad. "Mark anything about forward rate expectations. Do not summarize. Just mark the passages."

You sit down. Rebecca goes back to her own reading. The office is quiet except for the scratch of your pen on the legal pad and, from somewhere in the building, the muffled ring of a telephone that nobody answers.

Forty minutes in, you realize she has not turned a page the whole time.

She is watching you work.$body$,

  $choices$[
    {
      "id": "finish_shift_research",
      "label": "Leave when she says you can go",
      "time_cost": 0,
      "energy_cost": 1,
      "identity_tags": ["achieve"],
      "precludes": [],
      "outcome": {
        "text": "Rebecca takes the legal pad and flips through your marks without expression. \"Same time Thursday,\" she says. She does not look up when you leave.",
        "deltas": { "energy": -3 }
      },
      "events_emitted": [
        { "npc_id": "npc_econ_rebecca", "type": "WORKED_FOR", "magnitude": 1 }
      ]
    }
  ]$choices$::jsonb,

  NULL,

  ARRAY['arc_one', 'money', 'week2', 'beat', 'day10', 'job_research'],
  '{"requires_flag": "has_job_research"}'::jsonb,
  200, true,
  ARRAY['npc_econ_rebecca']::text[],
  (SELECT id FROM public.tracks WHERE key = 'money'),
  (SELECT id FROM public.tracks WHERE key = 'money'),
  'first_shift_research', 'first_shift_research',
  21, 10, 3,
  NULL, NULL,
  'afternoon', 1
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
