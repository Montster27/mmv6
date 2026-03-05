-- Migration 0126: Seed Days 11-20 storylets (s18-s27)
-- Arc One: College (First Semester) -- Weeks 3 and 4
-- Per MMV Narrative Design Bible v2.0
-- IMPORTANT: No apostrophes inside JSON string values. Body text (dollar-quoted) is fine.

-- ============================================================
-- s18: The Paper (Day 11-13)
-- First real academic submission -- finding out what actually lands
-- ============================================================
INSERT INTO public.storylets (slug, title, body, choices, tags, is_active, requirements)
VALUES (
  's18_the_paper',
  'The Paper',
  $$The paper is four pages plus the bibliography. You have read it eight times.

The submission slot is on the third floor of Whitmore Hall -- a brass slot in a wooden door. Your name is written in the top right corner of the envelope.

You are standing in the hallway outside.

Marsh will not read it until tonight. You know this. You are still standing here.$$,
  '[
    {
      "id": "slide_it_in",
      "label": "Slide it in. Done.",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": ["safety", "achievement"],
      "skill_modifier": "studyDiscipline",
      "reaction_text": "The envelope disappears into the slot.\n\nYou walk down three flights of stairs. The hallway outside is ordinary.\n\nSomething about the ordinary feels earned."
    },
    {
      "id": "read_last_paragraph",
      "label": "Read the last paragraph one more time before you submit.",
      "time_cost": 0,
      "energy_cost": 1,
      "identity_tags": ["achievement", "avoid"],
      "skill_modifier": "studyDiscipline",
      "reaction_text": "You read it.\n\nYou change one word. You are not sure it is better.\n\nYou slide it in anyway."
    },
    {
      "id": "leave_note_for_marsh",
      "label": "Slip a note in with it -- a clarifying question about your argument.",
      "time_cost": 0,
      "energy_cost": 1,
      "identity_tags": ["risk", "confront"],
      "skill_modifier": "assertiveness",
      "events_emitted": [
        { "npc_id": "npc_prof_marsh", "type": "SHOWED_UP", "magnitude": 1 }
      ],
      "reaction_text": "You write three sentences on a piece of notebook paper.\n\nYou fold it and put it in front of the essay.\n\nMarsh will either answer it or he won''t. You have put something real in the envelope."
    }
  ]'::jsonb,
  ARRAY['arc_one_core']::text[],
  true,
  '{"min_day_index": 11, "max_day_index": 13, "max_total_runs": 1, "requires_npc_met": ["npc_prof_marsh"]}'::jsonb
);

-- ============================================================
-- s19: Cal's Bad Night (Day 11-14)
-- Cal from the floor shows up after midnight
-- ============================================================
INSERT INTO public.storylets (slug, title, body, choices, tags, is_active, requirements)
VALUES (
  's19_cal_bad_night',
  'The Knock',
  $$It is past midnight. Someone knocks.

Cal is in the doorway. You have exchanged maybe forty words since move-in, most of them about the shower schedule.

He is in his socks. His shoes are in his hand.

"Hey," he says.

That is all he says.$$,
  '[
    {
      "id": "let_him_in",
      "label": "\"Come in.\"",
      "time_cost": 1,
      "energy_cost": 2,
      "identity_tags": ["risk", "people"],
      "skill_modifier": "socialEase",
      "events_emitted": [
        { "npc_id": "npc_floor_cal", "type": "SMALL_KINDNESS", "magnitude": 2 }
      ],
      "reaction_text": "He sits on the floor with his back against your wall. You sit in your desk chair.\n\nNeither of you says much for a while. At some point you make him tea on the hot plate.\n\nHe leaves around 2am. He says \"thanks\" in a way that is about more than tea."
    },
    {
      "id": "check_in_through_door",
      "label": "\"You okay?\"",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": ["people", "safety"],
      "events_emitted": [
        { "npc_id": "npc_floor_cal", "type": "NOTICED_FACE", "magnitude": 1 }
      ],
      "reaction_text": "He looks at you for a moment.\n\n\"Yeah,\" he says. \"Sorry to bother you.\"\n\nHe goes back to his room. You hear his door close."
    },
    {
      "id": "close_door",
      "label": "\"It''s late.\" Close the door.",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": ["safety", "avoid"],
      "events_emitted": [
        { "npc_id": "npc_floor_cal", "type": "WENT_MISSING", "magnitude": 1 }
      ]
    }
  ]'::jsonb,
  ARRAY['arc_one_core']::text[],
  true,
  '{"min_day_index": 11, "max_day_index": 14, "max_total_runs": 1}'::jsonb
);

-- ============================================================
-- s20: The Radio Station (Day 12-15)
-- Jordan has a WKDU slot. You saw the flyer. This is a deja vu moment --
-- you have almost shown up for Jordan before without doing it.
-- ============================================================
INSERT INTO public.storylets (slug, title, body, choices, tags, is_active, requirements)
VALUES (
  's20_radio_station',
  'The Radio Station',
  $$There is a WKDU broadcast flyer on the bulletin board outside the mailboxes. It has been there for a week.

Someone has written the time slot in blue ink by hand: Friday, 8-9pm.

The name below it is Jordan K.

You know who that is. On Friday at quarter to eight, you are two blocks from the station building for reasons that have nothing to do with any of this.$$,
  '[
    {
      "id": "go_in",
      "label": "Go in.",
      "time_cost": 1,
      "energy_cost": 1,
      "identity_tags": ["risk", "people"],
      "skill_modifier": "socialEase",
      "events_emitted": [
        { "npc_id": "npc_ambiguous_jordan", "type": "SHOWED_UP", "magnitude": 2 }
      ],
      "reaction_text": "The room is small. Old carpet. The smell of electronics that have been running too long.\n\nJordan sees you through the glass before the show starts. Their expression is not surprise -- more like something they filed away and did not expect to retrieve tonight.\n\nAfterward they say: \"I didn''t know you listened.\"\n\nYou say you didn''t, until now."
    },
    {
      "id": "walk_past",
      "label": "Walk past the building.",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": ["safety", "avoid"],
      "events_emitted": [
        { "npc_id": "npc_ambiguous_jordan", "type": "NOTICED_FACE", "magnitude": 1 }
      ]
    },
    {
      "id": "stand_outside_leave",
      "label": "Stand outside until the music starts through the wall. Then leave.",
      "time_cost": 1,
      "energy_cost": 0,
      "identity_tags": ["people", "safety"]
    }
  ]'::jsonb,
  ARRAY['arc_one_core', 'deja_vu']::text[],
  true,
  '{"min_day_index": 12, "max_day_index": 15, "max_total_runs": 1, "requires_npc_met": ["npc_ambiguous_jordan"]}'::jsonb
);

-- ============================================================
-- s21: Priya's Form (Day 13-16)
-- Priya is at the library, stuck on a financial aid form
-- ============================================================
INSERT INTO public.storylets (slug, title, body, choices, tags, is_active, requirements)
VALUES (
  's21_priya_form',
  'Section 3B',
  $$Priya is at the window table. The highlighters are not out.

There is a single form in front of her -- financial aid, from the heading. Section 3B, from how far the form is folded open.

She has been at the same page for twenty minutes. You can tell because you were here when she sat down.

Your own work is spread across a table two rows over.$$,
  '[
    {
      "id": "walk_over_ask",
      "label": "Walk over and ask if she needs help.",
      "time_cost": 0,
      "energy_cost": 1,
      "identity_tags": ["risk", "people"],
      "skill_modifier": "socialEase",
      "events_emitted": [
        { "npc_id": "npc_studious_priya", "type": "SMALL_KINDNESS", "magnitude": 1 }
      ],
      "reaction_text": "She looks up. Then at the form. Then back at you.\n\n\"It''s the income verification section,\" she says. \"My parents'' situation is complicated.\"\n\nYou sit down. You do not know anything about income verification. You read the instructions with her anyway.\n\nShe figures it out. You are not sure you helped. But you were there."
    },
    {
      "id": "leave_her_alone",
      "label": "Leave her to it.",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": ["safety", "avoid"],
      "events_emitted": [
        { "npc_id": "npc_studious_priya", "type": "NOTICED_FACE", "magnitude": 1 }
      ]
    },
    {
      "id": "sit_quietly_same_table",
      "label": "Move to the same table without saying anything about the form.",
      "time_cost": 1,
      "energy_cost": 1,
      "identity_tags": ["people", "safety"],
      "events_emitted": [
        { "npc_id": "npc_studious_priya", "type": "SHOWED_UP", "magnitude": 1 }
      ],
      "reaction_text": "You sit across from her with your own books open.\n\nNeither of you mentions the form.\n\nAt some point she puts it away and takes out her own work. The table feels less charged after that."
    }
  ]'::jsonb,
  ARRAY['arc_one_core']::text[],
  true,
  '{"min_day_index": 13, "max_day_index": 16, "max_total_runs": 1, "requires_npc_met": ["npc_studious_priya"]}'::jsonb
);

-- ============================================================
-- s22: Dana's Invitation (Day 14-17)
-- Dana invites you to the campus film society -- first real social overture
-- ============================================================
INSERT INTO public.storylets (slug, title, body, choices, tags, is_active, requirements)
VALUES (
  's22_dana_invitation',
  'The Invitation',
  $$Dana is by the door in her coat.

"The film society is showing something at Irvine tonight," she says. "8pm."

A pause.

"You can come if you want."

She has made it easy to say no. This is not accidental.

It has been two weeks of twelve feet of shared space, and this is the first time she has suggested going anywhere together.$$,
  '[
    {
      "id": "say_yes",
      "label": "\"Yeah. Give me five minutes.\"",
      "time_cost": 1,
      "energy_cost": 1,
      "identity_tags": ["risk", "people"],
      "skill_modifier": "socialEase",
      "events_emitted": [
        { "npc_id": "npc_roommate_dana", "type": "SHOWED_UP", "magnitude": 1 }
      ],
      "reaction_text": "The film is foreign, subtitled. You don''t recognize any of the actors.\n\nDana watches with her arms crossed, but not in a closed way -- more like she is concentrating.\n\nAfterward she says: \"The ending was wrong.\"\n\nYou ask what she would have done instead. She tells you, all the way back to the dorm."
    },
    {
      "id": "decline_tonight",
      "label": "\"I can''t tonight.\"",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": ["safety", "avoid"],
      "events_emitted": [
        { "npc_id": "npc_roommate_dana", "type": "WENT_MISSING", "magnitude": 1 }
      ],
      "reaction_text": "\"Okay,\" she says.\n\nShe leaves. The room is the same as it was before she asked."
    },
    {
      "id": "ask_what_showing",
      "label": "\"What''s showing?\"",
      "time_cost": 1,
      "energy_cost": 1,
      "identity_tags": ["people", "safety"],
      "events_emitted": [
        { "npc_id": "npc_roommate_dana", "type": "SMALL_KINDNESS", "magnitude": 1 }
      ],
      "reaction_text": "She tells you the title and the director''s name.\n\nYou have not heard of either. You say yes anyway.\n\nThis turns out to be the right answer."
    }
  ]'::jsonb,
  ARRAY['arc_one_core']::text[],
  true,
  '{"min_day_index": 14, "max_day_index": 17, "max_total_runs": 1, "requires_npc_met": ["npc_roommate_dana"]}'::jsonb
);

-- ============================================================
-- s23: Marsh Returns Paper (Day 15-18)
-- Grade back. One red-ink sentence.
-- ============================================================
INSERT INTO public.storylets (slug, title, body, choices, tags, is_active, requirements)
VALUES (
  's23_marsh_returns_paper',
  'The Red Sentence',
  $$The returned papers are on the table outside Marsh's classroom.

Your name is at the bottom of the stack. The grade is in red at the top: B+.

Below it, in the same red ink, one sentence: "The argument you are avoiding is in your third paragraph."

You are standing in the hallway with the paper in your hands.$$,
  '[
    {
      "id": "read_it_here",
      "label": "Re-read the whole thing right here in the hall.",
      "time_cost": 1,
      "energy_cost": 1,
      "identity_tags": ["achievement", "confront"],
      "skill_modifier": "studyDiscipline",
      "reaction_text": "You read all four pages.\n\nHe is right about the third paragraph. You can see it -- the place where you turned away from the harder thing and said something safer.\n\nYou are not sure whether to feel embarrassed or grateful that he noticed."
    },
    {
      "id": "fold_it_away",
      "label": "Fold it and put it in your bag. Read it later.",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": ["safety", "avoid"],
      "reaction_text": "You put it at the bottom of the front pocket.\n\nYou do not read it later. At least not today."
    },
    {
      "id": "go_to_office_hours",
      "label": "Go to his office hours and ask what he meant.",
      "time_cost": 1,
      "energy_cost": 2,
      "identity_tags": ["risk", "confront"],
      "skill_modifier": "assertiveness",
      "events_emitted": [
        { "npc_id": "npc_prof_marsh", "type": "SHOWED_UP", "magnitude": 2 }
      ],
      "reaction_text": "He asks you which paragraph you think it is.\n\nYou say the third.\n\nHe says yes. Then he asks why you backed away from it.\n\nYou are there for half an hour. You leave with more questions than you brought. This is, apparently, the point."
    }
  ]'::jsonb,
  ARRAY['arc_one_core']::text[],
  true,
  '{"min_day_index": 15, "max_day_index": 18, "max_total_runs": 1, "requires_npc_met": ["npc_prof_marsh"]}'::jsonb
);

-- ============================================================
-- s24: Miguel's Road Trip (Day 15-18)
-- Weekend trip to the shore -- commitment vs. the draft
-- ============================================================
INSERT INTO public.storylets (slug, title, body, choices, tags, is_active, requirements)
VALUES (
  's24_miguel_road_trip',
  'The Shore',
  $$Miguel finds you in the dining hall on Wednesday.

He is with three other people, all mid-conversation, all with the specific restlessness of people who have already decided something.

"We are driving to the shore Friday night," he says. "Back Sunday. You should come."

He says it as a fact. The car is already running in the sentence.

You have a paper draft due Monday.$$,
  '[
    {
      "id": "say_yes_to_trip",
      "label": "\"Yeah, I''m in.\"",
      "time_cost": 2,
      "energy_cost": 2,
      "identity_tags": ["risk", "people"],
      "skill_modifier": "socialEase",
      "events_emitted": [
        { "npc_id": "npc_connector_miguel", "type": "SHOWED_UP", "magnitude": 1 }
      ],
      "reaction_text": "The shore is cold in October. Nobody checked a weather report.\n\nYou sleep in a car and eat from a gas station and at one point someone builds a fire on the beach that is technically illegal.\n\nYou get back Sunday at 11pm. The draft is not done. You write it in two hours.\n\nIt is not your best work. You are not certain it is your worst."
    },
    {
      "id": "say_no_to_trip",
      "label": "\"I have a draft due.\"",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": ["safety", "achievement"],
      "skill_modifier": "studyDiscipline",
      "events_emitted": [
        { "npc_id": "npc_connector_miguel", "type": "WENT_MISSING", "magnitude": 1 }
      ],
      "reaction_text": "\"Your call,\" Miguel says.\n\nThe table moves on. You write the draft over the weekend.\n\nIt is solid. You find yourself wondering what the shore looked like."
    },
    {
      "id": "ask_for_time",
      "label": "\"Let me see if I can work it out.\"",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": ["people", "safety"],
      "events_emitted": [
        { "npc_id": "npc_connector_miguel", "type": "AWKWARD_MOMENT", "magnitude": 1 }
      ],
      "reaction_text": "Miguel looks at you.\n\n\"Friday at six,\" he says. \"That''s when we leave.\"\n\nYou say you''ll try to make it. He nods in a way that means he knows you probably won''t."
    }
  ]'::jsonb,
  ARRAY['arc_one_core']::text[],
  true,
  '{"min_day_index": 15, "max_day_index": 18, "max_total_runs": 1, "requires_npc_met": ["npc_connector_miguel"]}'::jsonb
);

-- ============================================================
-- s25: Parent Call #2 (Day 17-20)
-- The pay phone. Ten days since the last call.
-- ============================================================
INSERT INTO public.storylets (slug, title, body, choices, tags, is_active, requirements)
VALUES (
  's25_parent_call_2',
  'The Pay Phone',
  $$The pay phone at the end of the third-floor hallway.

You have been walking past it for four days.

Your parents expect a call once a week. It has been ten days since the last one.

You have a dime. The hallway is empty.$$,
  '[
    {
      "id": "say_getting_used_to_it",
      "label": "Call and say you are getting used to it here.",
      "time_cost": 1,
      "energy_cost": 1,
      "identity_tags": ["safety", "people"],
      "events_emitted": [
        { "npc_id": "npc_parent_voice", "type": "SHOWED_UP", "magnitude": 1 }
      ],
      "reaction_text": "Your mother asks what you are eating. Your father asks about grades.\n\nYou say things are fine. Getting easier.\n\nThis is partially true. You are grateful the phone does not show faces."
    },
    {
      "id": "say_things_are_fine",
      "label": "Call and say things are fine.",
      "time_cost": 1,
      "energy_cost": 0,
      "identity_tags": ["safety", "avoid"],
      "events_emitted": [
        { "npc_id": "npc_parent_voice", "type": "NOTICED_FACE", "magnitude": 1 }
      ],
      "reaction_text": "You say it is good. You have classes. The food is okay.\n\nThey say they are glad to hear it. The call is eleven minutes.\n\nThe hallway is the same after as before."
    },
    {
      "id": "say_harder_than_expected",
      "label": "Call and say it is harder than you expected, but you are figuring it out.",
      "time_cost": 1,
      "energy_cost": 2,
      "identity_tags": ["risk", "confront"],
      "skill_modifier": "assertiveness",
      "events_emitted": [
        { "npc_id": "npc_parent_voice", "type": "CONFIDED_IN", "magnitude": 1 }
      ],
      "reaction_text": "There is a pause on the other end.\n\nYour father says: \"That''s how it''s supposed to feel.\"\n\nYou don''t know what to do with that. You stay on the phone longer than you meant to."
    },
    {
      "id": "keep_walking",
      "label": "Keep walking. You''ll call this weekend.",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": ["safety", "avoid"],
      "events_emitted": [
        { "npc_id": "npc_parent_voice", "type": "WENT_MISSING", "magnitude": 1 }
      ]
    }
  ]'::jsonb,
  ARRAY['arc_one_core']::text[],
  true,
  '{"min_day_index": 17, "max_day_index": 20}'::jsonb
);

-- ============================================================
-- s26: Late Library (Day 18-21)
-- Deja vu moment -- same floor, same hour, different night
-- ============================================================
INSERT INTO public.storylets (slug, title, body, choices, tags, is_active, requirements)
VALUES (
  's26_late_library',
  'The Same Table',
  $$It is past ten. The second floor of the library.

The fluorescents are the same as always at this hour. The quiet has the same texture -- people distributed across tables, the specific sound of pages turning.

You have been here before. This exact table. Probably this exact hour.

It is not the same night. It is somehow the same night anyway.

Someone you do not recognize is at the window table where Priya usually sits.$$,
  '[
    {
      "id": "sit_at_usual_table",
      "label": "Sit at your usual spot and work.",
      "time_cost": 1,
      "energy_cost": 0,
      "identity_tags": ["safety", "achievement"],
      "skill_modifier": "studyDiscipline",
      "reaction_text": "You open your books.\n\nAn hour passes. Then another.\n\nThe library is the same library it was three weeks ago. You are not the same person who first sat here. You are not sure when that happened."
    },
    {
      "id": "try_different_table",
      "label": "Sit at a table you have never used before.",
      "time_cost": 1,
      "energy_cost": 1,
      "identity_tags": ["risk", "people"],
      "skill_modifier": "socialEase",
      "reaction_text": "You sit closer to the window.\n\nThe person at the next table is working on something with a lot of diagrams.\n\nYou don''t talk. But for a moment the room feels less like a place you came back to and more like a place you are still finding."
    },
    {
      "id": "stand_and_observe",
      "label": "Stand in the doorway a moment before finding your spot.",
      "time_cost": 1,
      "energy_cost": 0,
      "identity_tags": ["safety", "avoid"],
      "skill_modifier": "studyDiscipline"
    }
  ]'::jsonb,
  ARRAY['arc_one_core', 'deja_vu']::text[],
  true,
  '{"min_day_index": 18, "max_day_index": 21, "max_total_runs": 1}'::jsonb
);

-- ============================================================
-- s27: Jordan's Question (Day 18-22)
-- "What do you actually want out of this place?" -- culmination of Jordan thread
-- ============================================================
INSERT INTO public.storylets (slug, title, body, choices, tags, is_active, requirements)
VALUES (
  's27_jordan_question',
  'The Question',
  $$The benches outside the student union. You have been here before -- this bench has become a place in the way some places become places.

Jordan is there. You sit down.

The conversation moves through ordinary things and then, without preamble, Jordan says:

"What do you actually want out of this place?"

Not aggressively. Just the way someone asks when they actually want to know.$$,
  '[
    {
      "id": "answer_honestly",
      "label": "Tell them what you actually want.",
      "time_cost": 1,
      "energy_cost": 2,
      "identity_tags": ["risk", "confront"],
      "skill_modifier": "assertiveness",
      "events_emitted": [
        { "npc_id": "npc_ambiguous_jordan", "type": "CONFIDED_IN", "magnitude": 2 }
      ],
      "reaction_text": "You tell them.\n\nIt takes a few attempts to find the right sentence. Jordan listens to all of them.\n\nWhen you finish, they say: \"Yeah.\"\n\nJust that. But you understand they mean something like: me too."
    },
    {
      "id": "turn_it_back",
      "label": "\"What do you want out of it?\"",
      "time_cost": 1,
      "energy_cost": 1,
      "identity_tags": ["people", "risk"],
      "skill_modifier": "socialEase",
      "events_emitted": [
        { "npc_id": "npc_ambiguous_jordan", "type": "SMALL_KINDNESS", "magnitude": 1 }
      ],
      "reaction_text": "Jordan looks at you for a moment -- checking something.\n\nThen they tell you. The answer is longer than you expected and more specific.\n\nYou ask a follow-up question. By the end you are not sure which of you answered first."
    },
    {
      "id": "still_figuring_out",
      "label": "\"Still figuring it out.\"",
      "time_cost": 1,
      "energy_cost": 0,
      "identity_tags": ["safety", "avoid"],
      "events_emitted": [
        { "npc_id": "npc_ambiguous_jordan", "type": "NOTICED_FACE", "magnitude": 1 }
      ],
      "reaction_text": "Jordan nods.\n\n\"Fair,\" they say.\n\nThe conversation moves on. The question stays in the air a while, the way unanswered questions do."
    }
  ]'::jsonb,
  ARRAY['arc_one_core', 'deja_vu']::text[],
  true,
  '{"min_day_index": 18, "max_day_index": 22, "max_total_runs": 1, "requires_npc_met": ["npc_ambiguous_jordan"]}'::jsonb
);
