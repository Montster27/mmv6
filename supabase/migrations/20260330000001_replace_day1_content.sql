-- Replace all Day 1 storylet content with the revised opening sequence.
--
-- New NPCs: Scott (roommate), Glenn (contact), Doug/Mike/Keith (hallmates),
-- Bryce (party host), Peterson (card game host).
-- Replaces: Dana (roommate), Wren (contact), Miguel/Cal (floormates).
--
-- New storylet sequence:
--   1. the-quad (arrival)
--   2. dorm-roommate (Room 214, meet Scott)
--   3. dorm-hallmates (Doug/Mike/Keith, timing branch)
--   4. admin-errand (schedule + meal plan)
--   5. bench-glenn (the contact, time-travel reveal)
--   6. lunch-floor (dining hall, alliance lean)
--   7. evening-choice (three activities with mini-games)

BEGIN;

-- ══════════════════════════════════════════════════════════════════════
-- 1. DELETE OLD DAY 1 CONTENT
-- ══════════════════════════════════════════════════════════════════════

DELETE FROM public.storylets
WHERE slug IN (
  's01_hallway_arrival',
  's01_room_212_morning',
  's01_bookstore_line',
  's01_dining_first_dinner',
  's01_floor_meeting',
  's01_evening_choice',
  's_quad_reveal',
  's_evening_caps',
  's_evening_cards',
  's_evening_sub'
);

-- Also remove any arc-assigned Day 1 storylets that may remain
DELETE FROM public.storylets
WHERE slug LIKE 's01_%'
  AND arc_id IN (
    SELECT id FROM public.tracks
    WHERE key IN ('roommate','academic','money','belonging','opportunity','home')
  );


-- ══════════════════════════════════════════════════════════════════════
-- 2. THE QUAD — Opening storylet (Day 1, Morning)
-- ══════════════════════════════════════════════════════════════════════

INSERT INTO public.storylets (
  slug, title, body, choices, tags, requirements, weight, is_active,
  introduces_npc, arc_id, step_key, order_index, due_offset_days,
  expires_after_days, default_next_step_key, segment, time_cost_hours
)
VALUES (
  's_d1_the_quad',
  'The Quad',
  $body$The quad is wider than you expected. Red brick paths crossing a lawn that someone has been mowing since before you were born — the smell of it is still in the air, mixing with whatever the dining hall is doing to eggs this morning. Students moving in every direction, half of them holding paper schedules and looking from building to building with the specific confusion of people who don't know where they are yet.

You are one of them. You have a duffel bag strap cutting into your shoulder and a schedule in your pocket that says Fall 1983 across the top.

September light coming in low through the oaks. Long shadows on the brick. The administration building is across the quad — you need to pick up your final schedule, confirm your meal plan, the kind of errands that feel important your first day and meaningless by your third. But first: the dorm. Your room. Whoever's in it.

A girl in a denim jacket cuts across the grass ahead of you, laughing at something someone behind her said. For a half-second — less than that, a quarter-beat — your chest does something that doesn't match your nerves. Not recognition. Not deja vu exactly. More like the ghost of a feeling you haven't earned yet: that this place will be yours. That you'll know where things are. That you'll cross this quad a thousand times and stop noticing how wide it is.

The feeling passes. Your shoulder aches under the duffel strap. You don't know where the dining hall is.$body$,
  $choices$[
    {
      "id": "read_bulletin",
      "label": "Stop and read the bulletin board by the path",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": ["people"],
      "precludes": [],
      "outcome": {
        "text": "",
        "deltas": { "energy": 0, "stress": -1 }
      },
      "events_emitted": [],
      "reaction_text": "The cork board by the path is layered three deep with paper. Club fair dates. RA contact info. A hand-drawn poster for a campus radio meeting with a frequency written in marker. An intramural sign-up sheet with a pen on a string. A flyer for a Thursday night screening of Tootsie in the student union.\n\nYou read without deciding to read. The pen on the string has almost dried out. Someone has written 'GO HARWICK' on the intramural sheet in letters too big for the space.\n\nYou shift the duffel strap and walk toward the dorm."
    },
    {
      "id": "keep_walking",
      "label": "Keep walking — find the dorm",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": ["safety"],
      "precludes": [],
      "outcome": {
        "text": "",
        "deltas": { "energy": 0, "stress": 0 }
      },
      "events_emitted": [],
      "reaction_text": "Head down, moving. The quad is too open, too full of people who seem like they know each other already. The dorm is a door you can close."
    },
    {
      "id": "sit_and_watch",
      "label": "Sit on the low wall and watch for a minute",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": ["people"],
      "precludes": [],
      "outcome": {
        "text": "",
        "deltas": { "energy": 1, "stress": -1 }
      },
      "events_emitted": [],
      "reaction_text": "You find a spot on the low wall and sit. The duffel rests against your leg. You watch: students with boxes, parents lingering near cars, a guy in a Harwick Athletics shirt giving directions to someone who clearly doesn't speak enough English to follow them.\n\nThe oak tree across the path looks like a place you've sat before. You haven't. The feeling is warm and wrong at the same time. It fades when a frisbee skips across the brick near your feet.\n\nYou pick up the duffel and head for the dorm."
    }
  ]$choices$::jsonb,
  ARRAY['arc_one', 'arc_one_core', 'onboarding', 'opening', 'day1'],
  '{}'::jsonb,
  1000, true,
  ARRAY[]::text[],
  NULL, NULL, NULL, NULL, NULL, NULL,
  'morning', 0
);


-- ══════════════════════════════════════════════════════════════════════
-- 3. ROOM 214 — Meet roommate Scott (Day 1, Morning)
-- ══════════════════════════════════════════════════════════════════════

INSERT INTO public.storylets (
  slug, title, body, choices, tags, requirements, weight, is_active,
  introduces_npc, arc_id, step_key, order_index, due_offset_days,
  expires_after_days, default_next_step_key, segment, time_cost_hours
)
VALUES (
  's_d1_dorm_roommate',
  'Room 214',
  $body$The hallway smells like industrial carpet and something chemical — paint or floor wax, the kind of clean that means no one's lived here yet. Room numbers on brown doors. A fire extinguisher. A bulletin board with orientation flyers and an RA's name written in marker: TODD.

Room 214. The door is open. One side of the room is already set up — bed made, clock radio on the desk tuned low to something with horns, a Return of the Jedi poster on the cinderblock wall above the headboard. The other side is a bare mattress with a plastic cover that will crinkle when you sit on it.

A guy your age is crouched by his desk, threading a power strip behind it. He looks up.

"Hey — you must be —" He checks a piece of paper on his desk. "Yeah. I'm Scott." He stands up and wipes his hand on his jeans before offering it. His grip is solid and brief.

"Cool, cool. I got here yesterday — my dad drove me up. Took the bed by the window, hope that's alright." He says it like he's ready to switch if it's not. "You need help carrying stuff up?"

You drop the duffel on the bare mattress. The plastic cover crinkles. Scott goes back to his power strip. The room is small enough that you can hear each other breathe, and large enough that you can both pretend you can't.

His side: the poster, a desk lamp, a milk crate of cassette tapes, a framed photo that might be a family dog. Your side: a duffel bag and a mattress.$body$,
  $choices$[
    {
      "id": "unpack",
      "label": "Start unpacking",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": ["safety"],
      "precludes": [],
      "outcome": {
        "text": "",
        "deltas": { "energy": 0, "stress": -1 }
      },
      "events_emitted": [
        { "npc_id": "npc_roommate_scott", "type": "INTRODUCED_SELF", "magnitude": 1 }
      ],
      "reaction_text": "You unzip the duffel. Clothes, a toothbrush in a ziplock bag, a clock you've had since middle school. Each thing you put on the desk or the shelf makes the room fractionally more yours and fractionally less a place you could leave without consequence.\n\nScott glances over. \"The closets are bigger than they look. I thought I'd have to send half my stuff home but it all fit.\" He's the kind of person who narrates what he's learned to be helpful. You can tell he's been waiting for someone to share it with.\n\n\"I was gonna go find the dining hall in a bit — I think it's past the quad somewhere.\" He straightens up from the power strip. \"I haven't actually eaten since the drive. You want to come, or—?\"\n\nBefore you can answer, there's a knock on the open door. Not a knock exactly — more like a palm slapping the doorframe twice, fast."
    },
    {
      "id": "ask_tapes",
      "label": "\"What've you got?\" — nod at the milk crate of tapes",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": ["people"],
      "precludes": [],
      "outcome": {
        "text": "",
        "deltas": { "energy": 0, "stress": -1 }
      },
      "events_emitted": [
        { "npc_id": "npc_roommate_scott", "type": "INTRODUCED_SELF", "magnitude": 1 },
        { "npc_id": "npc_roommate_scott", "type": "SMALL_KINDNESS", "magnitude": 1 }
      ],
      "reaction_text": "\"Oh — yeah.\" He brightens. He tilts the milk crate so you can see the spines. Journey, Styx, the Doobie Brothers, a few Motown compilations, and one unlabeled cassette with \"MIX\" written in ballpoint. \"My sister made me that one. It's mostly Hall & Oates.\" He says it like he's confessing to something minor.\n\nHe goes back to the power strip, still smiling. \"I was gonna go find the dining hall in a bit. Haven't eaten since the drive. You want to come, or—?\"\n\nBefore you can answer, there's a knock on the open door. Not a knock exactly — more like a palm slapping the doorframe twice, fast."
    },
    {
      "id": "look_window",
      "label": "Look out the window",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": ["safety"],
      "precludes": [],
      "outcome": {
        "text": "",
        "deltas": { "energy": 0, "stress": 0 }
      },
      "events_emitted": [
        { "npc_id": "npc_roommate_scott", "type": "NOTICED_FACE", "magnitude": 1 }
      ],
      "reaction_text": "The window looks out over the side of the building — a strip of grass, a bike rack, the edge of another dorm. Two guys are carrying a mini-fridge between them across the lawn, arguing about which door to use.\n\nFor a moment the view has a double-exposure quality. The same window, a different season. Snow on the bike rack. The feeling of knowing exactly which bike is yours. Then it's September again and the bikes belong to strangers.\n\n\"I was gonna go find the dining hall in a bit,\" Scott says behind you. \"Haven't actually eaten since the drive. You want to come, or—?\"\n\nBefore you can answer, there's a knock on the open door. Not a knock exactly — more like a palm slapping the doorframe twice, fast."
    }
  ]$choices$::jsonb,
  ARRAY['arc_one', 'arc_one_core', 'onboarding', 'roommate', 'day1'],
  '{}'::jsonb,
  200, true,
  ARRAY['npc_roommate_scott']::text[],
  (SELECT id FROM public.tracks WHERE key = 'roommate'),
  'dorm_roommate', 0, 0, NULL, 'dorm_hallmates',
  'morning', 0
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title, body = EXCLUDED.body, choices = EXCLUDED.choices,
  tags = EXCLUDED.tags, introduces_npc = EXCLUDED.introduces_npc,
  segment = EXCLUDED.segment, time_cost_hours = EXCLUDED.time_cost_hours;


-- ══════════════════════════════════════════════════════════════════════
-- 4. DOWN THE HALL — Doug, Mike, Keith arrive (Day 1, Morning)
-- Critical timing branch: admin before lunch / lunch first / noncommittal
-- ══════════════════════════════════════════════════════════════════════

INSERT INTO public.storylets (
  slug, title, body, choices, tags, requirements, weight, is_active,
  introduces_npc, arc_id, step_key, order_index, due_offset_days,
  expires_after_days, default_next_step_key, segment, time_cost_hours
)
VALUES (
  's_d1_dorm_hallmates',
  'Down the Hall',
  $body$The palm hits the doorframe and the guy attached to it is already talking before he's fully in the room.

"There he is — new guy. I'm Doug, two doors down." He doesn't wait for a handshake. He walks in and looks at your bare side of the room like it's a problem he's going to help solve. "You just get here? My brother went here — Class of '80. I already know where everything is. The dining hall's not bad if you skip the eggs."

Behind him in the doorway, two more guys. One is leaning against the frame with a textbook under his arm — he's already wearing a watch and his shirt is tucked in. The other is broader, standing a half-step back, taking in the room the way you'd take in a barn you hadn't been in before — measuring it.

"That's Mike —" he points at the one with the textbook — "and Keith." He introduces them like he assembled the group personally.

"Hey." One syllable from Mike. Not unfriendly. His eyes go to Scott's Return of the Jedi poster and back to you. He's already filed something.

"Hi." Keith steps forward and offers his hand. His grip is calloused — working hands. "Keith Hollis. I'm at the end of the hall." He gives his full name like it's a thing people do where he's from.

"Alright," Doug says. "Dining hall opens for lunch at eleven-thirty. I say we go, get a table, figure out the lay of the land." He says it like a plan that's already been approved. "Scott, you in?"

"Yeah, definitely." Scott was already in before he was asked.

Doug looks at you.$body$,
  $choices$[
    {
      "id": "admin_before_lunch",
      "label": "\"Sure — I need to drop something at admin first, but I'll meet you there\"",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": ["achieve"],
      "precludes": [],
      "outcome": {
        "text": "",
        "deltas": { "energy": 0, "stress": 1 }
      },
      "events_emitted": [
        { "npc_id": "npc_floor_doug", "type": "INTRODUCED_SELF", "magnitude": 1 },
        { "npc_id": "npc_floor_mike", "type": "NOTICED_FACE", "magnitude": 1 },
        { "npc_id": "npc_floor_keith", "type": "INTRODUCED_SELF", "magnitude": 1 }
      ],
      "reaction_text": "\"Admin's across the quad — you'll make it. We'll save you a seat.\" Doug says it like saving seats is a thing he does. It probably is.\n\n\"The admin building's the big one with the columns?\" Keith asks. He's looking at you. Checking. Not because he's worried about you — because that's what people do where he's from when someone's heading somewhere alone.\n\nDoug exits the way he entered — already talking about something else. Mike follows, textbook still under his arm. Keith is last. He pauses at the doorframe.\n\n\"The dining hall food's fine.\" He says it like someone who's never had a strong opinion about food in his life and doesn't plan to start. \"See you over there.\"\n\nScott looks at you after they're gone. \"Doug's a lot.\" He grins. It's not mean — it's the observation of someone who's already decided to like everyone. \"He's alright though.\""
    },
    {
      "id": "lunch_first",
      "label": "\"I'll come\"",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": ["people"],
      "precludes": [],
      "outcome": {
        "text": "",
        "deltas": { "energy": 0, "stress": -1 }
      },
      "events_emitted": [
        { "npc_id": "npc_floor_doug", "type": "INTRODUCED_SELF", "magnitude": 1 },
        { "npc_id": "npc_floor_mike", "type": "NOTICED_FACE", "magnitude": 1 },
        { "npc_id": "npc_floor_keith", "type": "INTRODUCED_SELF", "magnitude": 1 }
      ],
      "reaction_text": "\"Good man. Eleven-thirty, lobby.\" Doug's already turning to leave, mission accomplished.\n\nKeith nods at you from the doorframe. Mike follows Doug out. They're gone and the hallway echoes with Doug's voice getting quieter.\n\nScott looks at you. \"Doug's a lot.\" He grins. \"He's alright though.\""
    },
    {
      "id": "noncommittal",
      "label": "\"I might catch up with you\"",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": ["safety"],
      "precludes": [],
      "outcome": {
        "text": "",
        "deltas": { "energy": 0, "stress": 0 }
      },
      "events_emitted": [
        { "npc_id": "npc_floor_doug", "type": "NOTICED_FACE", "magnitude": 1 },
        { "npc_id": "npc_floor_mike", "type": "NOTICED_FACE", "magnitude": 1 },
        { "npc_id": "npc_floor_keith", "type": "NOTICED_FACE", "magnitude": 1 }
      ],
      "reaction_text": "\"Cool, cool.\" Doug says it lighter than he means it. Doug files people into two categories — in or out — and 'maybe' reads as out.\n\nMike glances at you. Something between assessment and sympathy. He knows what Doug's 'cool, cool' means.\n\nThey leave. Keith is last. \"The dining hall food's fine.\" He says it to no one in particular and closes the door gently behind him.\n\nScott looks at you. \"Doug's a lot.\" He grins. \"He's alright though.\""
    }
  ]$choices$::jsonb,
  ARRAY['arc_one', 'arc_one_core', 'onboarding', 'belonging', 'day1'],
  '{}'::jsonb,
  200, true,
  ARRAY['npc_floor_doug', 'npc_floor_mike', 'npc_floor_keith']::text[],
  (SELECT id FROM public.tracks WHERE key = 'belonging'),
  'dorm_hallmates', 1, 0, NULL, NULL,
  'morning', 0
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title, body = EXCLUDED.body, choices = EXCLUDED.choices,
  tags = EXCLUDED.tags, introduces_npc = EXCLUDED.introduces_npc,
  segment = EXCLUDED.segment, time_cost_hours = EXCLUDED.time_cost_hours;


-- ══════════════════════════════════════════════════════════════════════
-- 5. ADMIN ERRAND — Schedule + meal plan (Day 1, Morning/Afternoon)
-- ══════════════════════════════════════════════════════════════════════

INSERT INTO public.storylets (
  slug, title, body, choices, tags, requirements, weight, is_active,
  introduces_npc, arc_id, step_key, order_index, due_offset_days,
  expires_after_days, default_next_step_key, segment, time_cost_hours
)
VALUES (
  's_d1_admin_errand',
  'The Administration Building',
  $body$The administration building is the one with the columns. Inside it smells like paper and floor polish. A line of students at the registrar's window, each one holding a folder or a form or both.

The woman at the window has glasses on a chain and a patience that comes from having done this eight hundred times this week. She takes your file, flips through it, stamps something. Slides two forms across the counter — schedule confirmation and meal plan selection.

The schedule confirmation is straightforward. Your name, your courses, your section numbers. Monday-Wednesday-Friday: Introduction to Sociology, 9 AM. English Composition, 11 AM. Tuesday-Thursday: American History to 1877, 10 AM. One elective slot still open — there's a handwritten note in the margin: "See advisor, Rm 108."

But the meal plan form has options.$body$,
  $choices$[
    {
      "id": "full_meal_plan",
      "label": "Full meal plan — three meals a day, seven days",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": ["safety"],
      "precludes": [],
      "outcome": {
        "text": "",
        "deltas": { "energy": 0, "stress": -1, "resources": { "cashOnHand": -200 } }
      },
      "events_emitted": [],
      "reaction_text": "Most expensive. Least friction. You'll always have a place to eat. The woman stamps the form and slides it back.\n\nWhile you wait, you glance down the hall toward Room 108. A door, a nameplate you can't read from here, and a student walking out with a course catalog. You file it away.\n\nYou push through the front door and the September air hits you. Bright. Warm for the season. The quad stretches out ahead — brick paths, oaks, students. The path cuts across past the chapel."
    },
    {
      "id": "standard_meal_plan",
      "label": "Standard plan — lunch and dinner on weekdays",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": ["achieve"],
      "precludes": [],
      "outcome": {
        "text": "",
        "deltas": { "energy": 0, "stress": 0, "resources": { "cashOnHand": -100 } }
      },
      "events_emitted": [],
      "reaction_text": "Middle ground. Reasonable. You'll need to figure out breakfast and weekends on your own. The woman stamps the form.\n\nWhile you wait, you notice Room 108 down the hall. A course catalog sits on a table outside the advisor's door. You flip through it. A few catch your eye: Introduction to Computer Science ('limited enrollment'), Physics I, Introduction to Business. The computer science listing has a note: 'New for Fall 1983. Lab hours required.'\n\nYou push through the front door and the September air hits you. The quad stretches out ahead. The path cuts across past the chapel."
    },
    {
      "id": "minimum_meal_plan",
      "label": "Minimum plan — ten meals a week, your choice",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": ["risk"],
      "precludes": [],
      "outcome": {
        "text": "",
        "deltas": { "energy": 0, "stress": 1, "resources": { "cashOnHand": -50 } }
      },
      "events_emitted": [],
      "reaction_text": "Cheapest. Most flexible. Most planning required. You'll skip meals or buy cheap food off-campus sometimes. The woman stamps the form without comment.\n\nYou walk down the hall and find Room 108. A course catalog sits on a table outside the advisor's door. You flip through it. Introduction to Computer Science — 'New for Fall 1983. Limited enrollment. Lab hours required.' Physics I. Introduction to Business. You take a mental note.\n\nYou push through the front door and the September air hits you. The quad stretches out ahead. The path cuts across past the chapel."
    }
  ]$choices$::jsonb,
  ARRAY['arc_one', 'arc_one_core', 'onboarding', 'academic', 'day1'],
  '{}'::jsonb,
  200, true,
  ARRAY[]::text[],
  (SELECT id FROM public.tracks WHERE key = 'academic'),
  'admin_errand', 0, 0, NULL, NULL,
  'morning', 1
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title, body = EXCLUDED.body, choices = EXCLUDED.choices,
  tags = EXCLUDED.tags, segment = EXCLUDED.segment, time_cost_hours = EXCLUDED.time_cost_hours;


-- ══════════════════════════════════════════════════════════════════════
-- 6. THE BENCH — Glenn encounter / time-travel reveal (Day 1)
-- ══════════════════════════════════════════════════════════════════════

INSERT INTO public.storylets (
  slug, title, body, choices, tags, requirements, weight, is_active,
  introduces_npc, arc_id, step_key, order_index, due_offset_days,
  expires_after_days, default_next_step_key, segment, time_cost_hours
)
VALUES (
  's_d1_bench_glenn',
  'The Bench',
  $body$Someone is sitting on a bench near the chapel. A guy — older, maybe a junior or senior. Reading a paperback with the cover folded back. And humming.

You almost walk past. You should walk past.

But the melody catches something in your head and holds it, and your feet slow down without your permission.

You know this song.

You know the next four notes before they come. You know the way the melody drops at the bridge. You know what the lyrics are, even though this guy is only humming, and the knowledge is so certain and so specific that it stops you on the brick path like a hand on your chest.

The song is wrong.

Not wrong like off-key. Wrong like it shouldn't be here. Your brain is pulling at a thread that connects this melody to a place and a time that doesn't match the buildings and the light and the students walking past you in their polo shirts and high-waisted jeans. The year is 1983. You know this. You have a schedule in your pocket that says Fall 1983 across the top.

The song on that bench does not exist yet.

The ground doesn't move. The sky stays where it is. But something inside your head tilts, like a room you've been standing in your whole life just shifted two degrees on its foundation, and everything that was level is now very slightly wrong.

The guy on the bench looks up. He's been watching you. Not the way people watch strangers — the way someone watches a door they've been waiting to see open.

He closes the paperback. Stands up. He's wearing a corduroy jacket with the sleeves pushed up and sneakers that have been white a long time ago. His eyes are the part of him that looks oldest. Everything else says twenty-one. The eyes say something else.

"You heard it." Not a question.$body$,
  $choices$[
    {
      "id": "ask_what_song",
      "label": "\"What is that song?\"",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": ["risk"],
      "precludes": [],
      "outcome": {
        "text": "",
        "deltas": { "energy": 0, "stress": 5 }
      },
      "events_emitted": [
        { "npc_id": "npc_contact_glenn", "type": "INTRODUCED_SELF", "magnitude": 1 }
      ],
      "reaction_text": "\"You already know what it is.\" He says it plain. No games, no mystery for its own sake. \"You just haven't caught up yet.\"\n\nHe sits back down and nods at the other end of the bench. You sit because standing feels wrong, and because the ground still has that two-degree tilt and you'd rather be closer to something solid.\n\nHe doesn't introduce himself right away. He watches two students walk past arguing about a dining hall waffle iron, and waits until they're gone.\n\n\"Glenn.\" Like that's enough. He doesn't offer a last name.\n\nThen he talks. Not fast, not slow. The cadence of someone who's thought about exactly how much to say and decided on less than he knows.\n\n\"You're going to need people. Not just friends. People in different places, different circles.\" He looks at you to see if you're keeping up. \"The guy who eats alone doesn't make it.\"\n\n\"Money matters. Not later — now. Figure out how it works. How to make it, how to keep it, how to move.\" A groundskeeper crosses behind the bench pulling a cart of rakes. Glenn watches him pass. \"Independence isn't a feeling. It's a bank balance.\"\n\n\"Knowledge. Not just classes — the right classes.\" He lists them like things that turned out to matter. Past tense. From experience. \"History, if you want to understand what built the things you're going to run into. Physics, if you want to understand what's happening to you.\"\n\nHe pauses. Looks at the administration building.\n\n\"Computers.\" The word sits in the air. \"There's a revolution coming in that direction and almost nobody here sees it.\"\n\n\"Sociology, politics, if you want to know how groups work. Business, if you want the money part to go faster.\"\n\n\"And find the others. Work together. The goal is to make things better — not through force. Through being in the right place with the right people knowing the right things.\"\n\nYou open your mouth. He shakes his head.\n\n\"Don't ask me how it works. I don't have all of it. Don't ask me who else there is. You'll find them, or they'll find you. Don't ask me why — I don't have that one either.\"\n\nHe stands. The paperback goes in his jacket pocket. He looks at you the way a mechanic looks at an engine they've just started.\n\n\"One more thing. Whatever you remember about how things went — sports, politics, who won what, when things happened — don't trust it. This isn't exactly the same. Close, but not the same.\"\n\n\"The broad strokes rhyme. The details don't. You bet on a game you think you remember, you'll lose.\"\n\nHe's already walking when he says the last part.\n\n\"Things will come back to you. Memories, impressions, things that feel like they already happened. Let them come. Don't force it. You just have to live it.\"\n\nHe crosses the quad toward the library without looking back. You watch him until a group of students cuts across your line of sight and when they pass, he's gone.\n\nThe bench is empty. The melody is still in your head. The schedule in your pocket says Fall 1983 and you believe it less than you did two minutes ago."
    },
    {
      "id": "just_listen",
      "label": "Stand there, not sure what to say",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": ["safety"],
      "precludes": [],
      "outcome": {
        "text": "",
        "deltas": { "energy": 0, "stress": 3 }
      },
      "events_emitted": [
        { "npc_id": "npc_contact_glenn", "type": "INTRODUCED_SELF", "magnitude": 1 }
      ],
      "reaction_text": "You don't say anything. He reads the silence like it's an answer and nods.\n\n\"Yeah. That's about right.\"\n\nHe sits back down and nods at the other end of the bench. You sit because standing feels wrong.\n\nHe watches two students walk past arguing about a dining hall waffle iron. Waits until they're gone.\n\n\"Glenn.\" Like that's enough.\n\nThen he talks. The cadence of someone who's thought about exactly how much to say and decided on less than he knows. He talks the way you'd give directions to someone in a foreign city — enough to get them moving, not enough to map the whole place.\n\n\"You're going to need people. Not just friends. People in different places, different circles. The guy who eats alone doesn't make it.\"\n\n\"Money matters. Not later — now. Figure out how it works. How to make it, how to keep it, how to move. Independence isn't a feeling. It's a bank balance.\"\n\nA groundskeeper crosses behind the bench pulling a cart of rakes.\n\n\"Knowledge. Not just classes — the right classes. History, if you want to understand what built the things you're going to run into. Physics, if you want to understand what's happening to you. Computers — there's a revolution coming in that direction and almost nobody here sees it. Sociology, politics, if you want to know how groups work. Business, if you want the money part to go faster.\"\n\nHe runs through these like someone giving a debrief, not a prophecy.\n\n\"And find the others. Work together. The goal is to make things better. Not through force. Through being in the right place with the right people knowing the right things.\"\n\nYou're sitting very still. He notices.\n\n\"Good. The ones who ask too many questions right away usually aren't ready for the answers.\"\n\nHe stands. Paperback in the jacket pocket.\n\n\"Last thing. Don't trust what you remember. About how things went — history, sports, elections, any of it. This place rhymes with what you know. But it doesn't repeat. The details are different. Sometimes a little, sometimes a lot.\"\n\nHe's walking before you can respond.\n\n\"More will come back. Memories, feelings, things that haven't happened yet. Don't fight them. Don't force them. Just live it.\"\n\nHe crosses the quad toward the library. Doesn't look back. You watch him until he's around the corner of the building or through the door or gone.\n\nThe bench is empty. The melody is still in your head. The schedule in your pocket says Fall 1983 and you believe it less than you did two minutes ago."
    }
  ]$choices$::jsonb,
  ARRAY['arc_one', 'arc_one_core', 'onboarding', 'opening', 'frame', 'time_travel', 'contact', 'day1'],
  '{}'::jsonb,
  1000, true,
  ARRAY['npc_contact_glenn']::text[],
  NULL, NULL, NULL, NULL, NULL, NULL,
  'morning', 1
);


-- ══════════════════════════════════════════════════════════════════════
-- 7. LUNCH WITH THE FLOOR — Dining hall (Day 1, Midday)
-- ══════════════════════════════════════════════════════════════════════

INSERT INTO public.storylets (
  slug, title, body, choices, tags, requirements, weight, is_active,
  introduces_npc, arc_id, step_key, order_index, due_offset_days,
  expires_after_days, default_next_step_key, segment, time_cost_hours
)
VALUES (
  's_d1_lunch_floor',
  'The Dining Hall',
  $body$The dining hall is louder than you expected. Trays on metal rails, silverware on institutional plates, two hundred conversations stacked on top of each other. The food is hot and adequate — steam trays of something that's probably chicken, a salad bar, a bread station, a dessert case with brownies that have been cut into precise squares by someone who cares about geometry more than flavor.

Long tables. No booths, no two-tops. You sit where there's space, which means sitting with people whether you planned to or not.

Trays down. Doug sits across from you. Scott is next to you. Mike and Keith are across, with Mike closest to the wall.

Doug picks up a chicken leg and points it at Keith. "Keith, you ever seen a salad bar before?"

"We have salad. We just grow it." No edge. He says it the way you'd correct someone about your name — gently, because they didn't mean anything by it.$body$,
  $choices$[
    {
      "id": "laugh_with_doug",
      "label": "Laugh with Doug",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": ["people"],
      "precludes": [],
      "outcome": {
        "text": "",
        "deltas": { "energy": 0, "stress": -1 }
      },
      "events_emitted": [
        { "npc_id": "npc_floor_doug", "type": "SMALL_KINDNESS", "magnitude": 1 },
        { "npc_id": "npc_floor_keith", "type": "AWKWARD_MOMENT", "magnitude": 1 }
      ],
      "reaction_text": "Doug grins — you're in on the joke. Keith doesn't react. He cuts his chicken with a knife and fork while Doug tears his apart with his hands.\n\nMike finishes chewing, puts his fork down. \"Anyone figure out their schedule yet? I've got Chem 101 at eight AM on Tuesdays.\"\n\n\"Eight AM? That's punishment,\" Doug says.\n\n\"It's the section with Hadley. She's supposed to be good.\" Mike says it like he's already researched every professor.\n\nDoug leans back. \"So tonight. First night, we gotta do something. I heard there's a thing at Anderson Hall — a guy on third floor is throwing a party. Beer, girls from the other dorms.\"\n\n\"There's also some guys on our floor doing cards in the lounge,\" Mike says. \"Quieter.\"\n\nScott: \"Both sound good.\" Of course they do.\n\nThe meal is done. The afternoon opens up. Tonight you'll have to choose."
    },
    {
      "id": "catch_keiths_eye",
      "label": "Catch Keith's eye — a look that says 'he doesn't mean it'",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": ["people"],
      "precludes": [],
      "outcome": {
        "text": "",
        "deltas": { "energy": 0, "stress": 0 }
      },
      "events_emitted": [
        { "npc_id": "npc_floor_keith", "type": "SMALL_KINDNESS", "magnitude": 1 }
      ],
      "reaction_text": "Keith sees the look. The smallest nod — not gratitude exactly, more like acknowledgment. He goes back to his food. Doug doesn't notice anything happened.\n\nMike finishes chewing. \"Anyone figure out their schedule yet? I've got Chem 101 at eight AM on Tuesdays.\"\n\n\"Eight AM? That's punishment.\"\n\n\"It's the section with Hadley. She's supposed to be good.\"\n\nDoug leans back. \"So tonight. First night, we gotta do something. I heard there's a thing at Anderson Hall — a guy on third floor is throwing a party.\"\n\n\"There's also some guys on our floor doing cards in the lounge,\" Mike says.\n\nScott: \"Both sound good.\"\n\nThe meal is done. The afternoon opens up. Tonight you'll have to choose."
    },
    {
      "id": "focus_on_food",
      "label": "Focus on your food",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": ["safety"],
      "precludes": [],
      "outcome": {
        "text": "",
        "deltas": { "energy": 1, "stress": 0 }
      },
      "events_emitted": [],
      "reaction_text": "You eat. The chicken is fine. The mashed potatoes taste like they were made by a machine that once met a potato. The brownie is better than it looks.\n\nMike finishes chewing. \"Anyone figure out their schedule yet? I've got Chem 101 at eight AM on Tuesdays.\"\n\nDoug: \"Eight AM? That's punishment.\"\n\nThe conversation moves on. Doug leans back. \"So tonight. First night, we gotta do something. I heard there's a thing at Anderson Hall — a guy on third floor is throwing a party. Beer, girls from the other dorms.\"\n\n\"There's also some guys on our floor doing cards in the lounge,\" Mike says. \"Quieter.\"\n\nScott: \"Both sound good.\"\n\nThe meal is done. The afternoon opens up. Tonight you'll have to choose."
    }
  ]$choices$::jsonb,
  ARRAY['arc_one', 'arc_one_core', 'onboarding', 'belonging', 'day1'],
  '{}'::jsonb,
  200, true,
  ARRAY[]::text[],
  (SELECT id FROM public.tracks WHERE key = 'belonging'),
  'lunch_floor', 2, 0, NULL, 'evening_choice',
  'afternoon', 1
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title, body = EXCLUDED.body, choices = EXCLUDED.choices,
  tags = EXCLUDED.tags, segment = EXCLUDED.segment, time_cost_hours = EXCLUDED.time_cost_hours;


-- ══════════════════════════════════════════════════════════════════════
-- 8. EVENING CHOICE — Three activities with mini-games (Day 1, Evening)
-- ══════════════════════════════════════════════════════════════════════

INSERT INTO public.storylets (
  slug, title, body, choices, tags, requirements, weight, is_active,
  introduces_npc, arc_id, step_key, order_index, due_offset_days,
  expires_after_days, default_next_step_key, segment, time_cost_hours
)
VALUES (
  's_d1_evening_choice',
  'First Night',
  $body$The dorm at night is a different animal. Doors open up and down the hall. Music from three rooms at once — someone's playing the Clash, someone else has the radio on, and from the far end comes the tinny sound of a TV tuned to something with a laugh track. The fluorescent hallway lights make everything a little too bright, a little too real.

You've unpacked. Or mostly unpacked. The clock radio on Scott's desk says 8:14 PM. Your side of the room is starting to look like someone lives there.

The melody is still in your head. Faint now, like a radio in another room. The schedule in your pocket says Fall 1983. You've read it three times since sitting on that bench. It still says the same thing.

Scott is getting ready — which for Scott means changing his shirt and checking his hair in the small mirror on the back of the closet door.

"I think I'm gonna check out the thing at Anderson Hall for a bit, then maybe swing by the card game." He says it like someone who genuinely plans to be in two places at once and doesn't see the problem. "What are you thinking?"

Anderson Hall, third floor. A guy named Bryce is hosting. Beer, music, people from several dorms. Doug's been talking about it since lunch.

Floor lounge, your dorm. Peterson and a few other guys from the floor. Cards. Mike said he'd stop by. Keith might.

Student union, downstairs. Open until midnight. Arcade cabinets, a pool table, vending machines. No one invited you there. It's just a place that exists.$body$,
  $choices$[
    {
      "id": "go_to_party",
      "label": "Head to Anderson Hall with Doug",
      "time_cost": 1,
      "energy_cost": 2,
      "identity_tags": ["risk", "people"],
      "precludes": ["s_d1_evening_cards", "s_d1_evening_union"],
      "mini_game": { "type": "caps", "config": {} },
      "sets_track_state": { "state": "first_anchor" },
      "outcome": {
        "text": "",
        "deltas": { "energy": -3, "stress": -2 }
      },
      "events_emitted": [
        { "npc_id": "npc_floor_doug", "type": "SHOWED_UP", "magnitude": 1 }
      ],
      "reaction_text": "You walk with Doug and Scott across the green to Anderson Hall. Third floor. The music is already audible from the stairwell. A room too full of people, someone's stereo playing Def Leppard loud enough to feel in your molars. Plastic cups. A girl in a Duran Duran t-shirt is arguing with someone about whether Pyromania is better than Thriller. Bryce greets everyone like they're already friends.\n\nAfterward, you walk back across the green. The air is cooler now. Doug is retelling something that happened twenty minutes ago as if it happened last year. Scott is laughing. Your ears are ringing slightly from the music.\n\nThe dorm hallway is quieter than you left it. You brush your teeth. The face in the mirror over the sink looks the same as this morning but the day behind it is longer than any day you can remember.\n\nYou lie on the mattress. The plastic cover crinkles and then goes quiet. Scott's Return of the Jedi poster. Your side has whatever you put there today.\n\nThe melody. Still there. Fainter now. The schedule on your desk says Fall 1983 and the ceiling above your bed is the color of every institutional ceiling everywhere and you're here, in this year, in this room, in whatever this is.\n\nTomorrow there will be more of it. More people, more choices, more of the quad in the morning light.\n\nYou close your eyes."
    },
    {
      "id": "go_to_cards",
      "label": "Go to the card game in the lounge",
      "time_cost": 1,
      "energy_cost": 1,
      "identity_tags": ["people", "achieve"],
      "precludes": ["s_d1_evening_party", "s_d1_evening_union"],
      "mini_game": { "type": "memory", "config": {} },
      "sets_track_state": { "state": "first_anchor" },
      "outcome": {
        "text": "",
        "deltas": { "energy": -1, "stress": -2 }
      },
      "events_emitted": [
        { "npc_id": "npc_floor_mike", "type": "SHOWED_UP", "magnitude": 1 },
        { "npc_id": "npc_floor_keith", "type": "SHOWED_UP", "magnitude": 1 }
      ],
      "reaction_text": "The floor lounge has carpet that smells like it's been here since the building opened. A circle of chairs around a low table. Peterson — a tall guy with glasses and a quiet voice — is shuffling cards. Mike is there, no textbook for once. Keith arrived early and is sitting in the most solid-looking chair, because that's what Keith does.\n\nScott pops in for ten minutes, then leaves for Anderson Hall, because of course he does.\n\nThe lounge empties slowly. Peterson collects his cards. Mike says goodnight and means it — one word, clean. Keith holds the door for you on the way out, which is just a thing Keith does.\n\nThe hallway is quiet. Doug isn't back yet. You can hear Scott's clock radio through the door, playing something soft. You brush your teeth. The face in the mirror looks like someone who had a small, good evening.\n\nYou lie on the mattress. The plastic cover crinkles. Scott's Return of the Jedi poster. Your side has whatever you put there today.\n\nThe melody. Still there. The schedule says Fall 1983. The ceiling is the color of every institutional ceiling everywhere.\n\nTomorrow there will be more of it.\n\nYou close your eyes."
    },
    {
      "id": "go_to_union",
      "label": "Walk down to the student union",
      "time_cost": 1,
      "energy_cost": 0,
      "identity_tags": ["safety"],
      "precludes": ["s_d1_evening_party", "s_d1_evening_cards"],
      "mini_game": { "type": "snake", "config": {} },
      "outcome": {
        "text": "",
        "deltas": { "energy": 0, "stress": -1 }
      },
      "events_emitted": [],
      "reaction_text": "The student union at night. Half the lights are dimmer than they should be. A pool table where two guys are playing a slow, serious game. Vending machines humming. And in the corner, the arcade cabinet — a snake game, green pixels on a black screen.\n\nYou play alone. Or next to someone else who's playing alone. A quarter exchanged. Maybe a nod.\n\nYou walk back to the dorm alone. The campus is different at night — the oaks are black shapes, the brick paths are gray, the buildings have lit windows scattered like someone rolled dice on a grid. Your room is empty when you get there — Scott is still out. The clock radio is off.\n\nYou brush your teeth in a bathroom that smells like toothpaste and industrial soap. The face in the mirror is the same one from this morning. You're not sure it should be.\n\nYou lie on the mattress. The plastic cover crinkles. Scott's Return of the Jedi poster. Your side has whatever you put there today.\n\nThe melody. Still there. Fall 1983. The ceiling above your bed.\n\nTomorrow there will be more of it.\n\nYou close your eyes."
    }
  ]$choices$::jsonb,
  ARRAY['arc_one', 'arc_one_core', 'onboarding', 'belonging', 'day1'],
  '{}'::jsonb,
  200, true,
  ARRAY[]::text[],
  (SELECT id FROM public.tracks WHERE key = 'belonging'),
  'evening_choice', 3, 0, NULL, NULL,
  'evening', 1
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title, body = EXCLUDED.body, choices = EXCLUDED.choices,
  tags = EXCLUDED.tags, segment = EXCLUDED.segment, time_cost_hours = EXCLUDED.time_cost_hours;


COMMIT;
