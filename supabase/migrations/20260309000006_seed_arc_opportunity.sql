-- narrative_3: Seed First Opportunity arc (arc_opportunity) — Stream 5
-- Source: docs/new content/opportunity.json
-- Activated by choosing "walk campus" in opening Beat 5
-- Beats: The Bulletin Board → The Obstacle

BEGIN;

-- 1. Insert arc definition
INSERT INTO public.arc_definitions (key, title, description, tags, is_enabled)
VALUES (
  'arc_opportunity',
  'First Opportunity',
  E'Do I trust myself enough to reach for something before I know if I''m ready?',
  '["work", "identity", "risk", "arc_one"]'::jsonb,
  true
);

-- 2. Beat 1: The Bulletin Board
INSERT INTO public.storylets (
  slug, title, body, choices, tags, requirements, weight, is_active,
  introduces_npc, arc_id, step_key, order_index, due_offset_days,
  expires_after_days, default_next_step_key
)
VALUES (
  'arc_opportunity_bulletin_board',
  'The Bulletin Board',
  E'You''re standing in front of the cork board outside the student union. Three layers of flyers, thumbtacked on top of each other, edges curling. Most of them are weeks old — a summer concert series that already happened, a roommate-wanted ad with all the phone number tabs torn off, a handwritten note about a lost cat named Biscuit.\n\nBut one flyer is new. You can tell because the paper is still flat and the thumbtack is still tight.\n\nIt''s a quarter-sheet, typed on a typewriter with one crooked ''e'':\n\nSTUDENT NEWSPAPER — THE MERIDIAN\nWriters needed for fall semester.\nNo experience required. Bring a story idea.\nPitch meeting: Wednesday, 6 PM\nStudent Union basement, Room B4\nFirst come, limited spots.\n\nWednesday is two days from now. You don''t have a story idea. You''re not sure you''re a writer. But you read the flyer twice and you''re still standing here.',
  '[
    {
      "id": "tear_tab",
      "label": "Tear off a tab with the room number — you might go",
      "energy_cost": 0,
      "time_cost": 0,
      "outcome": {
        "text": "",
        "deltas": { "energy": 0, "stress": 2, "resources": {} }
      },
      "reaction_text": "You tear off the bottom tab. Room B4, Wednesday, 6 PM. The paper is small enough to fit in your pocket, which is where you put it, next to the book list and Sandra''s schedule and the growing archive of your first day.\n\nYou don''t know if you''ll go. But you have the tab, and the tab is a decision deferred, and deferred decisions have a way of becoming real ones.\n\nWalking back toward the dorm, you pass the quad. The orientation fair is packing up — tables folding, sign-up sheets being stacked. A few people are lingering, the ones who showed up late or couldn''t decide. You''re not one of them. You had your afternoon. Whether it was the right one, you''ll find out.\n\nThe tab in your pocket has a crooked ''e'' on it. For some reason that matters to you more than the rest.",
      "identity_tags": ["risk"],
      "relational_effects": {},
      "set_npc_memory": {},
      "sets_stream_state": { "stream": "opportunity", "state": "considering" },
      "events_emitted": [],
      "next_step_key": "opportunity_s2_obstacle"
    },
    {
      "id": "memorize_details",
      "label": "Read it carefully, commit the details to memory, walk away clean",
      "energy_cost": 0,
      "time_cost": 0,
      "outcome": {
        "text": "",
        "deltas": { "energy": 0, "stress": 1, "resources": { "knowledge": 1 } }
      },
      "reaction_text": "Wednesday. Six PM. Student union basement, room B4. The Meridian. No experience required.\n\nYou read it once more and walk away without tearing a tab. The information is in your head. It doesn''t need to be in your pocket.\n\nThis is how you make decisions — you gather information, you hold it, you wait for the shape of the right choice to appear. It''s not indecision. It''s patience. Or it''s indecision dressed up as patience. You''ve never been sure which.\n\nThe quad is emptying. The orientation fair is folding itself back into the boxes it came from. Someone is carrying a stack of sign-up sheets toward the student activities office, and you wonder how many of those names will actually show up to the things they signed up for. Half, probably. Maybe less.\n\nYou walk back toward the dorm. The campus is starting to make sense — the paths between buildings, the shortcuts through courtyards, the way the light falls between the library and the science building at this time of day. You''re learning the place. That was the point of the walk. The flyer was a bonus. Or a complication.",
      "identity_tags": ["safety", "achievement"],
      "relational_effects": {},
      "set_npc_memory": {},
      "sets_stream_state": { "stream": "opportunity", "state": "considering" },
      "events_emitted": [],
      "next_step_key": "opportunity_s2_obstacle"
    },
    {
      "id": "keep_walking",
      "label": "Notice it. File it. Keep walking.",
      "energy_cost": 0,
      "time_cost": 0,
      "outcome": {
        "text": "",
        "deltas": { "energy": 0, "stress": -1, "resources": {} }
      },
      "reaction_text": "You read it. You note it. You don''t tear a tab.\n\nIt''s the first day. You don''t have to reach for everything that catches your eye. There will be other flyers, other meetings, other Wednesday evenings. This one doesn''t have to be yours.\n\nYou keep walking. The campus continues to unfold — the athletic center with its chain-link fence, the parking lot where someone''s station wagon has a bumper sticker that says QUESTION AUTHORITY, the path behind the library where the trees are old enough to have been here before the college.\n\nYou find your way back to the dorm without using the map. That feels like something.\n\nBut walking up the stairs to your floor, passing the common room where someone has already claimed the TV, you think about the flyer again. The crooked ''e.'' The phrase ''no experience required.'' The fact that it said ''first come, limited spots'' and spots don''t stay open forever.\n\nYou file it. Whether it stays filed is another question.",
      "identity_tags": ["avoid"],
      "relational_effects": {},
      "set_npc_memory": {},
      "sets_stream_state": { "stream": "opportunity", "state": "deferred" },
      "events_emitted": [],
      "next_step_key": "opportunity_s2_obstacle"
    }
  ]'::jsonb,
  ARRAY['arc_one', 'opportunity', 'identity', 'expiring'],
  '{}'::jsonb,
  1,
  true,
  ARRAY[]::text[],
  (SELECT id FROM public.arc_definitions WHERE key = 'arc_opportunity'),
  'opportunity_s1_bulletin_board',
  1,
  0,
  1,
  'opportunity_s2_obstacle'
);

-- 3. Beat 2: The Obstacle
INSERT INTO public.storylets (
  slug, title, body, choices, tags, requirements, weight, is_active,
  introduces_npc, arc_id, step_key, order_index, due_offset_days,
  expires_after_days, default_next_step_key
)
VALUES (
  'arc_opportunity_obstacle',
  'The Obstacle',
  E'It''s Tuesday. The pitch meeting is tomorrow.\n\nYou''ve been thinking about it more than you expected to. In the dining hall, you overheard someone mention the newspaper — "The Meridian, apparently they''re desperate for writers" — and the word ''desperate'' bothered you in a way you couldn''t quite explain.\n\nThe problem isn''t whether you want to go. The problem is the requirement: bring a story idea.\n\nYou don''t have one. Or you have several, none of which feel ready. You could write about orientation — but everyone lived that. You could write about the dining hall food — but that''s a joke, not a story. There''s something about the bulletin board itself, the layers of it, the archaeology of a semester in thumbtacked paper. But is that a newspaper story or just a thing you noticed?\n\nOn top of this, tomorrow at 6 PM is when a group from your floor is going to the dining hall together. If you go to the pitch meeting, you skip the group dinner. If you skip the pitch meeting, the spots fill and the flyer becomes something you saw once and didn''t act on.',
  '[
    {
      "id": "go_pitch",
      "label": "Go to the pitch meeting — bring whatever idea you have and wing it",
      "energy_cost": 2,
      "time_cost": 1,
      "outcome": {
        "text": "",
        "deltas": { "energy": -2, "stress": 5, "resources": { "knowledge": 2, "socialLeverage": 1 } }
      },
      "reaction_text": "Room B4 is in the basement of the student union, past the vending machines and a storage closet with a mop leaning against the open door. The fluorescent lights buzz. There are twelve chairs arranged around a table that seats eight.\n\nSeven people are already there. They look like they belong. You do not feel like you belong.\n\nThe editor is a junior named Rachel with ink-stained fingers and a directness that''s either confidence or exhaustion. She goes around the table. Each person pitches. Some ideas are good. Some are obvious. One guy pitches a feature about the football team and Rachel''s expression doesn''t change but her pen stops moving.\n\nYour turn. You say the thing about the bulletin board — the layers, the archaeology, the way a semester''s worth of campus life is pinned to a piece of cork. You''re not sure it''s good. You''re sure it''s yours.\n\nRachel''s pen starts moving again. \"That could work,\" she says. \"Eight hundred words. Friday.\"\n\nFriday. That''s three days. You have a deadline and you haven''t written a newspaper article in your life.\n\nWalking back to the dorm, you pass the dining hall. Through the window you can see a table of guys from your floor. Miguel is doing the thing with his hands. Someone is laughing. You weren''t there. The inside joke is forming without you.\n\nBut you have eight hundred words and a Friday deadline and a junior named Rachel who said ''that could work.'' You hold that against the window and it''s enough. Barely.",
      "identity_tags": ["risk", "confront", "achievement"],
      "relational_effects": {},
      "set_npc_memory": {},
      "sets_stream_state": { "stream": "opportunity", "state": "committed" },
      "skill_modifier": "assertiveness",
      "sets_expired_opportunity": "social",
      "events_emitted": [],
      "next_step_key": null
    },
    {
      "id": "skip_dinner_prep",
      "label": "Skip the group dinner but spend the evening preparing — go to the pitch meeting ready",
      "energy_cost": 1,
      "time_cost": 1,
      "outcome": {
        "text": "",
        "deltas": { "energy": -1, "stress": 3, "resources": { "knowledge": 3 } }
      },
      "reaction_text": "You spend Tuesday evening in the library. Third floor, the quiet section, a desk by a window that looks out over the quad where two days ago you stood at a folding table and signed up for nothing.\n\nYou write three ideas on a piece of notebook paper. You cross out two. The bulletin board piece stays — you refine it, think about angle, think about who would read this and why they''d care. By 9 PM you have a paragraph of notes that feels like something.\n\nWednesday at 6 PM you''re in room B4 with something approaching a plan. The editor is a junior named Rachel. She goes around the table. When it''s your turn, you pitch the bulletin board piece — specific, structured, yours.\n\n\"Good,\" Rachel says. Not ''that could work.'' Just ''good.'' She writes your name in her notebook. \"Eight hundred words. Friday.\"\n\nYou walk back knowing two things: you have a deadline, and you spent an evening alone in a library instead of at a table with your floor. The tradeoff was clean. Whether it was right depends on what you do with the eight hundred words.\n\nDana is asleep when you get back. His tape deck is off. The room is dark and quiet and smells like someone else''s toothpaste. You lie in bed and think about what the first sentence should be.",
      "identity_tags": ["achievement", "avoid"],
      "relational_effects": {
        "npc_floor_miguel": { "reliability": -1 }
      },
      "set_npc_memory": {},
      "sets_stream_state": { "stream": "opportunity", "state": "committed" },
      "skill_modifier": "studyDiscipline",
      "sets_expired_opportunity": "social",
      "events_emitted": [],
      "next_step_key": null
    },
    {
      "id": "go_dinner_skip_pitch",
      "label": "Go to the group dinner — the newspaper will be there next semester",
      "energy_cost": 1,
      "time_cost": 1,
      "outcome": {
        "text": "",
        "deltas": { "energy": -1, "stress": -2, "resources": { "socialLeverage": 2 } }
      },
      "reaction_text": "You go to the dining hall. The meatloaf is the same. Miguel saves you a seat. Cal is there, quiet as always, contributing a dry observation every few minutes that makes the table better without anyone noticing.\n\nIt''s a good evening. Easy in the way the pizza night was easy — people becoming a group through the simple act of eating at the same table at the same time. You laugh at something Miguel says. You learn Cal''s last name. You discover that the guy two doors down, Travis, is less annoying than you initially thought, which is a low bar but he clears it.\n\nAt 6:15 you think about room B4. At 6:30 you stop thinking about it. At 7:00 the pitch meeting is over and whoever was there is a newspaper writer and you''re here, finishing dining hall Jell-O with people who are starting to feel like your people.\n\nWalking back, you pass the student union. The lights in the basement are off. The meeting happened. The spots filled. The flyer on the bulletin board will get covered by another flyer by Friday.\n\nYou chose this. You chose them. The weight of that choice is specific — not heavy, exactly, but present. Like a door you watched close from the outside.\n\nThere will be other doors. You''re pretty sure of that.",
      "identity_tags": ["people", "avoid"],
      "relational_effects": {
        "npc_floor_miguel": { "relationship": 1, "reliability": 1 },
        "npc_floor_cal": { "relationship": 1 }
      },
      "set_npc_memory": {
        "npc_floor_miguel": { "chose_dinner_over_opportunity": true }
      },
      "sets_stream_state": { "stream": "opportunity", "state": "expired" },
      "sets_expired_opportunity": "academic",
      "events_emitted": [
        { "npc_id": "npc_floor_miguel", "type": "SHOWED_UP", "magnitude": 1 }
      ],
      "next_step_key": null
    }
  ]'::jsonb,
  ARRAY['arc_one', 'opportunity', 'identity', 'conflict', 'expiring'],
  '{}'::jsonb,
  1,
  true,
  ARRAY[]::text[],
  (SELECT id FROM public.arc_definitions WHERE key = 'arc_opportunity'),
  'opportunity_s2_obstacle',
  2,
  2,
  1,
  NULL
);

COMMIT;
