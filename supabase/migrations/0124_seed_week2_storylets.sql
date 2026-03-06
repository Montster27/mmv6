-- Migration 0124: Seed Week 2 storylets (s12-s17)
-- Days 6-10 of Arc One (College: First Week extension into Week 2)
-- Per STORYLINE_MAP.md Week 2 specification.
-- IMPORTANT: No apostrophes inside JSON string values. Body text (dollar-quoted) is fine.

-- ============================================================
-- s12: Study Group Invite (Day 6, Afternoon)
-- ============================================================
INSERT INTO public.storylets (slug, title, body, choices, tags, is_active, requirements)
VALUES (
  's12_study_group_invite',
  'The Study Group',
  $$The library has a particular smell on the second floor -- old paper and the specific anxiety of people who are behind.

Priya is at a table near the window. She has three highlighters and a system. She looks up when you sit down nearby.

"Marsh's class," she says. Not a question.

She is already two chapters ahead. You can see the tabs.

There is a pause that might be an invitation.$$,
  '[
    {
      "id": "ask_to_join",
      "label": "Ask if she would mind working near each other.",
      "time_cost": 1,
      "energy_cost": 1,
      "identity_tags": ["risk", "people"],
      "skill_modifier": "socialEase",
      "events_emitted": [
        { "npc_id": "npc_studious_priya", "type": "SHOWED_UP", "magnitude": 1 }
      ],
      "reaction_text": "She considers this for a moment.\n\n\"Fine,\" she says. \"But I don''t talk while I work.\"\n\nYou sit down. Twenty minutes later she asks what you thought of the third chapter."
    },
    {
      "id": "sit_near_quietly",
      "label": "Sit nearby without saying anything.",
      "time_cost": 1,
      "energy_cost": 0,
      "identity_tags": ["safety", "avoid"],
      "events_emitted": [
        { "npc_id": "npc_studious_priya", "type": "NOTICED_FACE", "magnitude": 1 }
      ]
    },
    {
      "id": "study_alone_different_floor",
      "label": "Go to a different floor to work alone.",
      "time_cost": 1,
      "energy_cost": 0,
      "identity_tags": ["achievement", "safety"],
      "skill_modifier": "studyDiscipline"
    }
  ]'::jsonb,
  ARRAY['arc_one_core']::text[],
  true,
  '{"min_day_index": 6, "max_day_index": 10, "max_total_runs": 1, "requires_npc_met": ["npc_studious_priya"]}'::jsonb
);

-- ============================================================
-- s13: Miguel Party Invite (Day 7, Evening)
-- ============================================================
INSERT INTO public.storylets (slug, title, body, choices, tags, is_active, requirements)
VALUES (
  's13_miguel_party_invite',
  'The Party',
  $$Miguel finds you in the dining hall.

He has the specific energy of someone who has already been three places tonight and is heading somewhere fourth.

"There's something happening at Prescott," he says, dropping into the seat across from you. "You should come."

He says it the way someone confident says things: as if your yes is already assumed.

You are tired. You also have reading due tomorrow.$$,
  '[
    {
      "id": "go_to_party",
      "label": "Go with him.",
      "time_cost": 1,
      "energy_cost": 2,
      "identity_tags": ["risk", "people"],
      "skill_modifier": "socialEase",
      "events_emitted": [
        { "npc_id": "npc_connector_miguel", "type": "SHOWED_UP", "magnitude": 1 }
      ],
      "reaction_text": "Prescott is loud. You do not know most of the people.\n\nMiguel introduces you to three people whose names you will not remember. One of them, you will remember.\n\nYou get back late. The reading does not happen."
    },
    {
      "id": "go_briefly",
      "label": "Go for an hour and then leave.",
      "time_cost": 1,
      "energy_cost": 1,
      "identity_tags": ["people", "safety"],
      "events_emitted": [
        { "npc_id": "npc_connector_miguel", "type": "SHOWED_UP", "magnitude": 1 }
      ],
      "reaction_text": "You stay exactly one hour. Miguel barely notices you leave. But you were there -- that registers."
    },
    {
      "id": "decline_party",
      "label": "Tell him you have reading.",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": ["safety", "achievement"],
      "skill_modifier": "studyDiscipline",
      "events_emitted": [
        { "npc_id": "npc_connector_miguel", "type": "WENT_MISSING", "magnitude": 1 }
      ],
      "reaction_text": "He shrugs. \"Your call.\"\n\nYou get the reading done. The dining hall is quieter than usual."
    }
  ]'::jsonb,
  ARRAY['arc_one_core']::text[],
  true,
  '{"min_day_index": 6, "max_day_index": 10, "max_total_runs": 1, "requires_npc_met": ["npc_connector_miguel"]}'::jsonb
);

-- ============================================================
-- s14: Marsh Office Hours (Day 8, Afternoon)
-- ============================================================
INSERT INTO public.storylets (slug, title, body, choices, tags, is_active, requirements)
VALUES (
  's14_marsh_office_hours',
  'Office Hours',
  $$Marsh holds office hours on Tuesdays, 2-4pm. The door is open.

He is at his desk reading something. He looks up when you appear in the doorway but does not say anything immediately.

You are not sure if you were supposed to knock. The door was open.

You have a question about the paper. You also could have figured it out yourself.$$,
  '[
    {
      "id": "ask_about_paper",
      "label": "Come in and ask your question about the paper.",
      "time_cost": 1,
      "energy_cost": 1,
      "identity_tags": ["risk", "confront"],
      "skill_modifier": "assertiveness",
      "events_emitted": [
        { "npc_id": "npc_prof_marsh", "type": "SHOWED_UP", "magnitude": 1 }
      ],
      "reaction_text": "He listens to your question all the way through.\n\nThen he asks you one back.\n\nYou are there for twenty minutes. When you leave, you are less certain about your argument and more certain it is worth making."
    },
    {
      "id": "check_in_briefly",
      "label": "Come in just to say you read the assignment.",
      "time_cost": 1,
      "energy_cost": 0,
      "identity_tags": ["achievement", "safety"],
      "events_emitted": [
        { "npc_id": "npc_prof_marsh", "type": "NOTICED_FACE", "magnitude": 1 }
      ]
    },
    {
      "id": "skip_office_hours",
      "label": "Walk past. You can figure it out yourself.",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": ["safety", "avoid"]
    }
  ]'::jsonb,
  ARRAY['arc_one_core']::text[],
  true,
  '{"min_day_index": 6, "max_day_index": 12, "max_total_runs": 1, "requires_npc_met": ["npc_prof_marsh"]}'::jsonb
);

-- ============================================================
-- s15: Dana Small Conflict (Day 9, Evening)
-- ============================================================
INSERT INTO public.storylets (slug, title, body, choices, tags, is_active, requirements)
VALUES (
  's15_dana_small_conflict',
  'The Room',
  $$Dana is at her desk when you get back. She is doing that thing where she is very specifically not looking at you.

Something is off. You have been living in twelve feet of shared space long enough to know the texture of her quiet.

There is a half-empty coffee cup on your desk that is not yours. The light on your side has been moved.

Small things. The kind that compound.$$,
  '[
    {
      "id": "address_directly",
      "label": "Ask if something is wrong.",
      "time_cost": 0,
      "energy_cost": 1,
      "identity_tags": ["confront", "people"],
      "skill_modifier": "assertiveness",
      "events_emitted": [
        { "npc_id": "npc_roommate_dana", "type": "REPAIR_ATTEMPT", "magnitude": 1 }
      ],
      "reaction_text": "She pauses before answering.\n\n\"Your stuff keeps ending up on my side,\" she says. \"I didn''t want to make a thing of it.\"\n\nYou talk for ten minutes. It doesn''t resolve everything. But the air in the room changes."
    },
    {
      "id": "move_coffee_cup_silently",
      "label": "Move the cup back to your side and say nothing.",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": ["safety", "avoid"],
      "events_emitted": [
        { "npc_id": "npc_roommate_dana", "type": "DEFERRED_TENSION", "magnitude": 1 }
      ]
    },
    {
      "id": "bring_it_up_lightly",
      "label": "Mention it as a small thing, half-joking.",
      "time_cost": 0,
      "energy_cost": 1,
      "identity_tags": ["people", "avoid"],
      "events_emitted": [
        { "npc_id": "npc_roommate_dana", "type": "REPAIR_ATTEMPT", "magnitude": 1 }
      ]
    }
  ]'::jsonb,
  ARRAY['arc_one_core']::text[],
  true,
  '{"min_day_index": 8, "max_day_index": 14, "requires_npc_met": ["npc_roommate_dana"]}'::jsonb
);

-- ============================================================
-- s16: Jordan First Real Talk (Day 9-10, Afternoon)
-- ============================================================
INSERT INTO public.storylets (slug, title, body, choices, tags, is_active, requirements)
VALUES (
  's16_jordan_first_talk',
  'The First Real Talk',
  $$Jordan is sitting outside the student union. Not waiting for anyone. Just sitting.

You have seen them twice since orientation. Both times there was almost something -- then the crowd moved, or someone interrupted, or you both let the moment dissolve.

Now there is no one else around.

The sun is doing something specific with the late-afternoon brick. Jordan is reading something they put down when they see you.$$,
  '[
    {
      "id": "sit_down_and_talk",
      "label": "Sit down. Say something real.",
      "time_cost": 1,
      "energy_cost": 1,
      "identity_tags": ["risk", "people"],
      "skill_modifier": "socialEase",
      "events_emitted": [
        { "npc_id": "npc_ambiguous_jordan", "type": "CONFIDED_IN", "magnitude": 1 }
      ],
      "reaction_text": "You talk for almost an hour. You find out where they are from, what they were reading, and one thing they have not told most people yet.\n\nThey ask you something that takes a minute to answer honestly.\n\nWhen you leave, you are aware that something shifted."
    },
    {
      "id": "say_hi_keep_walking",
      "label": "Say hi, but keep walking.",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": ["safety", "avoid"],
      "events_emitted": [
        { "npc_id": "npc_ambiguous_jordan", "type": "NOTICED_FACE", "magnitude": 1 }
      ]
    },
    {
      "id": "stop_briefly",
      "label": "Stop for a few minutes, keep it easy.",
      "time_cost": 0,
      "energy_cost": 1,
      "identity_tags": ["people", "safety"],
      "events_emitted": [
        { "npc_id": "npc_ambiguous_jordan", "type": "SMALL_KINDNESS", "magnitude": 1 }
      ]
    }
  ]'::jsonb,
  ARRAY['arc_one_core', 'deja_vu']::text[],
  true,
  '{"min_day_index": 8, "max_day_index": 14, "max_total_runs": 1, "requires_npc_met": ["npc_ambiguous_jordan"]}'::jsonb
);

-- ============================================================
-- s17: Campus Job Table Week 2 (Days 6-8, one-shot)
-- This is the SECOND chance at the job table -- only available if the
-- player missed the Day 1 job table (s4_midday_choice bookstore path).
-- The preclusion mechanism will prevent this from appearing if the player
-- already took the Day 1 job table path.
-- ============================================================
INSERT INTO public.storylets (slug, title, body, choices, tags, is_active, requirements)
VALUES (
  's17_campus_job_table',
  'The Job Board',
  $$There is still a table outside the student employment office. Different from the one on Day 1 -- quieter, fewer options -- but the sign says openings are available.

You have been watching the money situation. It has not improved.

A woman at the table looks up when you approach. "Looking for work?" she asks.

The hours are not ideal. The pay is not generous. But you remember how the last few days felt carrying a tight wallet into every decision.$$,
  '[
    {
      "id": "apply_for_position",
      "label": "Fill out the application.",
      "time_cost": 1,
      "energy_cost": 1,
      "identity_tags": ["achievement", "safety"],
      "skill_modifier": "practicalHustle",
      "reaction_text": "You take a Tuesday/Thursday kitchen shift, 6-8am.\n\nThe woman stamps your form and tells you to report Monday.\n\nSomething about having a schedule feels more real than it did this morning."
    },
    {
      "id": "look_at_postings_leave",
      "label": "Look at what is available, but decide not to apply yet.",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": ["safety", "avoid"]
    },
    {
      "id": "decide_not_worth_it",
      "label": "The hours are bad. Pass on it.",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": ["safety", "avoid"]
    }
  ]'::jsonb,
  ARRAY['arc_one_core']::text[],
  true,
  '{"min_day_index": 6, "max_day_index": 8, "max_total_runs": 1, "requires_not_precluded": "s17_campus_job_table"}'::jsonb
);

-- Mark s16 and s14 as one-shot (each person only gets this moment once)
UPDATE public.storylets
SET requirements = COALESCE(requirements, '{}'::jsonb) || '{"max_total_runs": 1}'::jsonb
WHERE slug IN ('s14_marsh_office_hours', 's16_jordan_first_talk');
