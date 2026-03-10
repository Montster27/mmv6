-- narrative_3: Seed Money Reality arc (arc_money) — Stream 3
-- Source: docs/new content/money.json
-- Activated by choosing "go to bookstore" in opening Beat 5
-- Beats: The Bookstore → The Dining Hall

BEGIN;

-- 1. Insert arc definition
INSERT INTO public.arc_definitions (key, title, description, tags, is_enabled)
VALUES (
  'arc_money',
  'Money Reality',
  E'Am I going to be okay, or am I already behind in a way I can''t fix?',
  '["financial", "practical", "arc_one"]'::jsonb,
  true
);

-- 2. Beat 1: The Bookstore
INSERT INTO public.storylets (
  slug, title, body, choices, tags, requirements, weight, is_active,
  introduces_npc, arc_id, step_key, order_index, due_offset_days,
  expires_after_days, default_next_step_key
)
VALUES (
  'arc_money_bookstore',
  'The Bookstore',
  E'The line moves slowly. You''ve been holding your course list for ten minutes, watching people ahead of you emerge from the shelves with stacks of books pressed against their chests like armor.\n\nThe store is organized by course number, handwritten section labels taped to the shelves. You find your section and start pulling. Introduction to Western Civilization — $38. College Writing: A Reader — $22. Biology: The Science of Life — $45.\n\nThe prices are printed on small white stickers that someone applied by hand, slightly crooked, like even the bookstore knows this is awkward.\n\nYou''re holding three books. Your list says you need two more for classes that start this week. The total is building in your head whether you want it to or not.',
  '[
    {
      "id": "buy_all",
      "label": "Buy everything on the list — you need them all",
      "energy_cost": 0,
      "time_cost": 0,
      "money_requirement": "okay",
      "outcome": {
        "text": "",
        "deltas": { "energy": 0, "stress": 3, "resources": { "cashOnHand": -140, "knowledge": 1 } }
      },
      "reaction_text_conditions": [
        {
          "if": { "money_band": "okay" },
          "text": "You carry the stack to the register and write a check. The number hurts more than you expected — not devastating, but real. The woman behind the counter tears the receipt off and hands it to you without looking up. She''s done this a hundred times today.\n\nYou carry the bag back across campus. It''s heavier than you thought five books would be. The plastic handles cut into your fingers. But you have them. Tomorrow morning, when the professor says turn to page thirty-four, you''ll be able to turn to page thirty-four.\n\nThat''s worth something. You''re not sure how much, but it''s worth something.\n\nThe envelope in your desk drawer is thinner now. You can feel it from here."
        },
        {
          "if": { "money_band": "comfortable" },
          "text": "You carry the stack to the register and write a check. The total is significant but manageable — this is what the account was for. The woman behind the counter tears the receipt off and you fold it into your pocket without looking at the number.\n\nYou carry the bag back across campus. It''s heavier than you thought five books would be. Behind you in line, a guy is putting one of his books back on the shelf, carefully, like he''s trying not to let anyone see him do it.\n\nYou don''t look away fast enough. The moment sits with you across the quad."
        }
      ],
      "identity_tags": ["achievement"],
      "relational_effects": {},
      "set_npc_memory": {},
      "events_emitted": [],
      "next_step_key": "money_s2_dining"
    },
    {
      "id": "buy_essential",
      "label": "Buy only what you need for this week — the rest can wait",
      "energy_cost": 0,
      "time_cost": 0,
      "outcome": {
        "text": "",
        "deltas": { "energy": 0, "stress": 2, "resources": { "cashOnHand": -60, "knowledge": 0 } }
      },
      "reaction_text": "You put two books back. The biology text — $45, and you don''t have bio until Thursday — and the writing reader, because maybe you can borrow one for the first week.\n\nThe line at the register is shorter now. You write a check for sixty dollars even. The woman behind the counter doesn''t comment on the size of your purchase. She doesn''t have to.\n\nWalking back, the bag is lighter than other people''s bags. You notice that. You notice yourself noticing that.\n\nYou tell yourself you''ll come back for the rest. You might. You might also find someone in your bio section who''ll let you share, or a used copy on the bulletin board in the student union. There are ways to solve this that don''t involve spending money you''re not sure you have.\n\nThe math is running in the background now. It doesn''t turn off.",
      "identity_tags": ["safety"],
      "relational_effects": {},
      "set_npc_memory": {},
      "events_emitted": [],
      "next_step_key": "money_s2_dining"
    },
    {
      "id": "look_used",
      "label": "Check the used shelf first — accept the delay if it saves money",
      "energy_cost": 0,
      "time_cost": 0,
      "outcome": {
        "text": "",
        "deltas": { "energy": -1, "stress": 1, "resources": { "cashOnHand": -45 } }
      },
      "reaction_text": "The used section is a separate shelf, smaller, picked over. The spines are creased and the pages are soft with someone else''s year. You find two of your five — Western Civ and the writing reader — for roughly half price. Someone has highlighted the writing reader in three colors. You''ll live with their opinions.\n\nThe other three aren''t here. The biology text is new-only, and the remaining two are already gone. You''ll have to come back, or find another way.\n\nYou write a check for forty-five dollars. It feels like you''ve done something — not solved the problem, but outmaneuvered part of it. The woman behind the counter looks at your stack and says, \"Smart. Used goes fast — come back Monday for returns.\"\n\nShe didn''t have to say that. You file it.\n\nThe walk back is lighter. Two books in the bag, three still on the list, and a plan forming that involves the Monday return shelf and possibly the bulletin board outside the student union where someone might be selling theirs.",
      "identity_tags": ["safety", "achievement"],
      "relational_effects": {},
      "set_npc_memory": {},
      "skill_modifier": "practicalHustle",
      "events_emitted": [],
      "next_step_key": "money_s2_dining"
    }
  ]'::jsonb,
  ARRAY['arc_one', 'financial', 'practical', 'bookstore'],
  '{}'::jsonb,
  1,
  true,
  ARRAY[]::text[],
  (SELECT id FROM public.arc_definitions WHERE key = 'arc_money'),
  'money_s1_bookstore',
  1,
  0,
  1,
  'money_s2_dining'
);

-- 3. Beat 2: The Dining Hall
INSERT INTO public.storylets (
  slug, title, body, choices, tags, requirements, weight, is_active,
  introduces_npc, arc_id, step_key, order_index, due_offset_days,
  expires_after_days, default_next_step_key
)
VALUES (
  'arc_money_dining',
  'The Dining Hall',
  E'The dining hall is a low-ceilinged room with fluorescent lights and the specific acoustics of a hundred people eating at the same time. Your meal plan card — a laminated rectangle with your photo on it, taken at orientation before you''d slept — gets you three meals a day in here.\n\nThe food is institutional. Recognizable but not inviting. Meatloaf. Iceberg lettuce. Jell-O in small glass dishes. A salad bar that looks like it''s been there since the building opened.\n\nYou eat because you need to eat. Halfway through, a guy from your floor — Miguel, if you''ve met him, or just the dark-haired guy from the hallway if you haven''t — drops his tray across from you and says, "A bunch of us are going to get pizza tonight. Off campus. You in?"\n\nHe says it like it''s nothing. It''s $3 for a slice and a Coke at the place on College Avenue.',
  '[
    {
      "id": "go_pizza",
      "label": "\"Yeah, I''m in\" — go and spend the money",
      "energy_cost": 1,
      "time_cost": 1,
      "outcome": {
        "text": "",
        "deltas": { "energy": -1, "stress": -4, "resources": { "cashOnHand": -3, "socialLeverage": 2 } }
      },
      "reaction_text": "The pizza place on College Avenue is small and loud and exactly what you needed without knowing you needed it. Checkered tablecloths, a jukebox someone has fed three quarters into, and a counter where a guy with flour on his arms slides slices onto paper plates.\n\nThere are six of you from the floor. Miguel is telling a story about his high school football team that can''t possibly be true, and everyone is laughing, and for the first time since you arrived, nobody is performing orientation. This is just people eating pizza.\n\nYour slice costs $2.75 with tax. You leave a quarter tip because the guy behind the counter called you \"chief\" and it seemed like the kind of place where you tip.\n\nThree dollars. It''s nothing. It''s also three dollars of the envelope, and the envelope doesn''t refill.\n\nWalking back to campus, Miguel falls into step next to you. \"Same time Thursday?\" he says, like this is already a thing. You say sure. You''ve just made a recurring expense. You''ve also just made something else — a table where people expect you. That''s harder to price.",
      "identity_tags": ["people", "risk"],
      "relational_effects": {
        "npc_floor_miguel": { "relationship": 1, "reliability": 1 }
      },
      "set_npc_memory": {
        "npc_floor_miguel": { "pizza_regular": true }
      },
      "events_emitted": [
        { "npc_id": "npc_floor_miguel", "type": "SHARED_MEAL", "magnitude": 1 }
      ],
      "next_step_key": null
    },
    {
      "id": "suggest_cheaper",
      "label": "\"Is there somewhere cheaper?\" — try to go without spending as much",
      "energy_cost": 1,
      "time_cost": 1,
      "outcome": {
        "text": "",
        "deltas": { "energy": -1, "stress": 1, "resources": { "cashOnHand": -1, "socialLeverage": 1 } }
      },
      "reaction_text": "Miguel pauses. Not long — just a half-beat where he recalculates. \"There''s a diner on Oak Street. Coffee''s fifty cents. I think they have pie.\"\n\nThe diner is the kind of place that hasn''t changed since the building was built. Vinyl booths, a counter with round stools, a waitress who calls everyone \"hon\" and means it. You order coffee and a slice of pie that costs a dollar ten.\n\nIt''s quieter than pizza would have been. Fewer people came — just you, Miguel, and a guy named Cal who apparently gravitates toward the least obvious option. But the conversation is better for being smaller. Miguel talks about home. Cal talks about the radio station. You talk about the campus walk you took this afternoon, and the bulletin board, and how many layers of flyers were on it.\n\n\"That board is the whole school,\" Cal says. \"Everything important is on that board before it''s anywhere else.\"\n\nYou file that. You also file the fact that a dollar ten is not three dollars, and that nobody treated the choice as strange.",
      "identity_tags": ["people", "safety"],
      "relational_effects": {
        "npc_floor_miguel": { "relationship": 1 }
      },
      "set_npc_memory": {
        "npc_floor_miguel": { "suggested_cheaper": true }
      },
      "skill_modifier": "practicalHustle",
      "events_emitted": [
        { "npc_id": "npc_floor_miguel", "type": "SHARED_MEAL", "magnitude": 1 }
      ],
      "next_step_key": null
    },
    {
      "id": "make_excuse",
      "label": "\"Can''t tonight\" — stay in and eat what the meal plan covers",
      "energy_cost": 0,
      "time_cost": 0,
      "outcome": {
        "text": "",
        "deltas": { "energy": 1, "stress": 2, "resources": { "cashOnHand": 0 } }
      },
      "reaction_text": "\"Can''t tonight — still getting settled.\" He nods, doesn''t push it. \"Next time,\" he says, and picks up his tray.\n\nYou finish the meatloaf. It''s not good but it''s paid for. The Jell-O is the same red it''s been since before you were born.\n\nThe dining hall empties around you. People leave in groups of two and three, heading somewhere — the pizza place, a party someone mentioned, a study session that''s probably just an excuse to keep talking. You bus your tray and walk back to the dorm alone.\n\nThe hallway is quieter than it''s been all day. Most of the doors are closed. From the common room you can hear the TV — someone''s watching M*A*S*H reruns. You don''t stop.\n\nIn your room, Dana''s gone. Pizza, probably. His tape deck is off. The room is just a room again — small, quiet, yours for now.\n\nYou saved three dollars. You also missed whatever is happening at a table on College Avenue where people from your floor are becoming a group. You''ll hear about it tomorrow. The story will have an inside joke you weren''t there for.\n\nThat''s the cost. Not three dollars. The other thing.",
      "identity_tags": ["avoid", "safety"],
      "relational_effects": {
        "npc_floor_miguel": { "reliability": -1 }
      },
      "set_npc_memory": {},
      "events_emitted": [
        { "npc_id": "npc_floor_miguel", "type": "DISMISSED", "magnitude": 1 }
      ],
      "next_step_key": null
    }
  ]'::jsonb,
  ARRAY['arc_one', 'financial', 'social', 'dining'],
  '{}'::jsonb,
  1,
  true,
  ARRAY[]::text[],
  (SELECT id FROM public.arc_definitions WHERE key = 'arc_money'),
  'money_s2_dining',
  2,
  1,
  1,
  NULL
);

COMMIT;
