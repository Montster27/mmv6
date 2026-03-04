-- /supabase/migrations/0116_seed_week1_storylets.sql
-- Week 1 storylets: First Class, Floor Meeting, Orientation Fair, Parent Call, Cal Midnight
-- These extend arc_one_core through the full first week (Days 1-4)
-- IMPORTANT: No apostrophes inside JSON string values. Body text (dollar-quoted) is fine.

-- ============================================================
-- s7: First Class (Day 2 Morning)
-- ============================================================
INSERT INTO public.storylets (slug, title, body, choices, tags, is_active)
VALUES (
  's7_first_class',
  'First Class',
  $$The classroom smells like chalk and old wood.

Desks scrape. People settle. Someone has dropped their syllabus twice.

You find a seat near the middle -- not front (too eager), not back (too obvious). A girl two seats over already has the book open. She has underlined something on the first page.

The professor walks in without ceremony.

His name is on the chalkboard. Marshall. You will call him Marsh eventually -- everyone does -- but not yet.

"Let's see who read," he says.

Not a question.

He looks out at the room.

You realize, with a small lurch, that he is about to ask something you either know or don't.$$,
  '[
    {
      "id": "raise_hand_answer",
      "label": "Raise your hand and answer.",
      "targetStoryletId": "s8_floor_meeting",
      "time_cost": 0,
      "energy_cost": 1,
      "identity_tags": ["risk", "achievement"],
      "events_emitted": [
        { "npc_id": "npc_prof_marsh", "type": "SHOWED_UP", "magnitude": 1 },
        { "npc_id": "npc_studious_priya", "type": "NOTICED_FACE", "magnitude": 1 }
      ],
      "reaction_text": "Your voice comes out steadier than you expected.\n\nMarsh nods once. Not warm. Not cold. Registering.\n\nThe girl with the underlined book glances at you briefly."
    },
    {
      "id": "wait_someone_else",
      "label": "Wait for someone else to answer.",
      "targetStoryletId": "s8_floor_meeting",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": ["safety", "avoid"]
    },
    {
      "id": "speak_wrong",
      "label": "Answer -- even though you are not sure.",
      "targetStoryletId": "s8_floor_meeting",
      "time_cost": 0,
      "energy_cost": 1,
      "identity_tags": ["risk", "confront"],
      "events_emitted": [
        { "npc_id": "npc_prof_marsh", "type": "AWKWARD_MOMENT", "magnitude": 1 }
      ],
      "reaction_text": "You get it partially right.\n\nMarsh corrects you, but not unkindly.\n\n\"Closer,\" he says. \"Think about it.\"\n\nSomething about that stings less than silence would have."
    }
  ]'::jsonb,
  ARRAY['arc_one_core', 'deja_vu']::text[],
  true
);

-- ============================================================
-- s8: Floor Meeting (Day 1 Evening)
-- ============================================================
INSERT INTO public.storylets (slug, title, body, choices, tags, is_active)
VALUES (
  's8_floor_meeting',
  'Floor Meeting',
  $$The common room at the end of the hall.

Plastic chairs in a loose circle. Someone has pinned a "Clark Hall 2nd Floor" banner that is already half-peeling at one corner.

Sandra -- the RA -- stands at the front with a clipboard and a look that says she has done this before and will do it again.

The guy next to you leans over.

"Cal," he says, extending a hand before Sandra even starts. "This is gonna be a long year."

He means it as a compliment.

You are not sure yet.

Sandra runs through the rules. You have heard most of them. But there is something about hearing them in this specific context -- this specific room, these specific strangers -- that makes them feel like a countdown.$$,
  '[
    {
      "id": "engage_sandra",
      "label": "Ask Sandra a question about the floor.",
      "targetStoryletId": "s9_orientation_fair",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": ["people", "confront"],
      "events_emitted": [
        { "npc_id": "npc_ra_sandra", "type": "SHOWED_UP", "magnitude": 1 }
      ]
    },
    {
      "id": "talk_with_cal",
      "label": "Talk with Cal during the meeting.",
      "targetStoryletId": "s9_orientation_fair",
      "time_cost": 0,
      "energy_cost": 1,
      "identity_tags": ["risk", "people"],
      "events_emitted": [
        { "npc_id": "npc_floor_cal", "type": "INTRODUCED_SELF", "magnitude": 1 }
      ],
      "reaction_text": "Cal has opinions about everything Sandra says. None of them are mean -- he just has a running commentary.\n\nYou find yourself laughing once.\n\nSandra notices."
    },
    {
      "id": "sit_quiet",
      "label": "Sit quietly and listen.",
      "targetStoryletId": "s9_orientation_fair",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": ["safety", "avoid"]
    }
  ]'::jsonb,
  ARRAY['arc_one_core']::text[],
  true
);

-- ============================================================
-- s9: Orientation Fair (Day 1 Afternoon)
-- ============================================================
INSERT INTO public.storylets (slug, title, body, choices, tags, is_active)
VALUES (
  's9_orientation_fair',
  'The Orientation Fair',
  $$The quad is louder than a quad should be.

Tables for everything: debate team, newspaper, campus radio, intramural sports, the Newman Center, the film club, something called the Free Thinkers Society.

Miguel is already at three tables, it looks like. Talking to everyone. Collecting flyers he will never read.

Near the edge of things, someone is standing alone in front of the campus radio table, looking at a sign-up sheet like they are deciding something.

You notice them because they are not performing ease.

Everyone else here is performing ease.

This person is not.$$,
  '[
    {
      "id": "approach_radio_table",
      "label": "Walk over to the radio table and stand near them.",
      "targetStoryletId": "s10_parent_call_w1",
      "time_cost": 1,
      "energy_cost": 1,
      "identity_tags": ["risk", "people"],
      "events_emitted": [
        { "npc_id": "npc_ambiguous_jordan", "type": "INTRODUCED_SELF", "magnitude": 1 }
      ],
      "reaction_text": "They look up when you approach.\n\nNot startled. Like they were waiting for something to happen, and you happened.\n\n\"Jordan,\" they say.\n\nYou give your name.\n\nSomething about the exchange feels complete."
    },
    {
      "id": "follow_miguel",
      "label": "Follow Miguel around the tables.",
      "targetStoryletId": "s10_parent_call_w1",
      "time_cost": 1,
      "energy_cost": 1,
      "identity_tags": ["people", "safety"],
      "events_emitted": [
        { "npc_id": "npc_connector_miguel", "type": "SMALL_KINDNESS", "magnitude": 1 }
      ]
    },
    {
      "id": "sign_up_something",
      "label": "Sign up for one thing and leave.",
      "targetStoryletId": "s10_parent_call_w1",
      "time_cost": 1,
      "energy_cost": 0,
      "identity_tags": ["achievement", "safety"]
    },
    {
      "id": "skip_fair",
      "label": "Decide the fair is overwhelming and head back to the dorm.",
      "targetStoryletId": "s10_parent_call_w1",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": ["safety", "avoid"]
    }
  ]'::jsonb,
  ARRAY['arc_one_core', 'deja_vu']::text[],
  true
);

-- ============================================================
-- s10: Parent Call Week 1 (Day 3-4 Evening)
-- ============================================================
INSERT INTO public.storylets (slug, title, body, choices, tags, is_active)
VALUES (
  's10_parent_call_w1',
  'The Phone Call Home',
  $$The dorm phone rings twice before you register it might be for you.

You are right.

Your mother's voice sounds closer than she is. There is a half-second delay on the line that makes the conversation feel like shouting across water.

"How is it?"

You pause.

That pause contains more than you will say.

Everything that has happened in the last three days compresses into the space between her question and your answer.

She asks about your roommate. Your father says something in the background.

You have the sudden, specific knowledge that this call will happen again. And again. And each time you will decide how much of the truth fits through a phone line.$$,
  '[
    {
      "id": "tell_truth_hard",
      "label": "Tell her it is harder than you expected.",
      "targetStoryletId": "s11_cal_midnight",
      "time_cost": 0,
      "energy_cost": 1,
      "identity_tags": ["confront", "risk"],
      "events_emitted": [
        { "npc_id": "npc_parent_voice", "type": "CONFIDED_IN", "magnitude": 1 }
      ],
      "reaction_text": "There is a silence.\n\nThen: \"That is normal.\"\n\nThe sentence lands with unexpected weight.\n\nYou did not expect it to help. It helps slightly."
    },
    {
      "id": "perform_fine",
      "label": "Tell her everything is fine.",
      "targetStoryletId": "s11_cal_midnight",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": ["safety", "avoid"],
      "events_emitted": [
        { "npc_id": "npc_parent_voice", "type": "AWKWARD_MOMENT", "magnitude": 1 }
      ]
    },
    {
      "id": "ask_for_something",
      "label": "Ask for something practical -- money, a thing from home.",
      "targetStoryletId": "s11_cal_midnight",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": ["safety", "people"],
      "events_emitted": [
        { "npc_id": "npc_parent_voice", "type": "SHOWED_UP", "magnitude": 1 }
      ]
    },
    {
      "id": "keep_it_short",
      "label": "Keep it short. Say you have to go.",
      "targetStoryletId": "s11_cal_midnight",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": ["avoid", "achievement"]
    }
  ]'::jsonb,
  ARRAY['arc_one_core']::text[],
  true
);

-- ============================================================
-- s11: Cal Midnight Knock (Day 2-3 Evening)
-- ============================================================
INSERT INTO public.storylets (slug, title, body, choices, tags, is_active)
VALUES (
  's11_cal_midnight',
  'Three Knocks',
  $$11:14 PM.

Three knocks on your door.

You were not asleep. You were almost asleep, which is worse.

It is Cal.

He is wearing a jacket like he is going somewhere. He is holding two cans of something.

"There's a thing," he says. "Not a party. Just -- a thing. Second floor of Whitmore."

He is not pressuring you. He is just Cal, and Cal exists at 11pm, apparently, and wants company.

The light under Dana's door is already off.

You look at your schedule on the desk.

First class is at 8.$$,
  '[
    {
      "id": "go_with_cal",
      "label": "Go with him.",
      "targetStoryletId": "",
      "time_cost": 1,
      "energy_cost": 2,
      "identity_tags": ["risk", "people"],
      "events_emitted": [
        { "npc_id": "npc_floor_cal", "type": "SHOWED_UP", "magnitude": 1 }
      ],
      "reaction_text": "The thing at Whitmore is about twelve people in a common room with a cassette player too loud.\n\nIt is fine. Better than fine.\n\nYou get back at 1:30.\n\nMorning arrives like a consequence."
    },
    {
      "id": "decline_cal_politely",
      "label": "Tell him not tonight.",
      "targetStoryletId": "",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": ["safety", "achievement"],
      "events_emitted": [
        { "npc_id": "npc_floor_cal", "type": "DEFERRED_TENSION", "magnitude": 1 }
      ],
      "reaction_text": "He shrugs like he expected it.\n\n\"Next time,\" he says.\n\nYou do not know if there will be a next time.\n\nBut you sleep."
    },
    {
      "id": "invite_in_instead",
      "label": "Tell him to come in for a bit instead.",
      "targetStoryletId": "",
      "time_cost": 1,
      "energy_cost": 1,
      "identity_tags": ["people", "safety"],
      "events_emitted": [
        { "npc_id": "npc_floor_cal", "type": "SMALL_KINDNESS", "magnitude": 1 }
      ],
      "reaction_text": "You talk until midnight.\n\nHe tells you something about where he is from that explains a lot about him.\n\nYou do not retain it entirely. But you remember the shape of it."
    }
  ]'::jsonb,
  ARRAY['arc_one_core']::text[],
  true
);
