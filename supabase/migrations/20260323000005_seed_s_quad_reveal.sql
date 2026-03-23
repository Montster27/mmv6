-- s_quad_reveal: The time-travel frame reveal
-- Day 1 morning. Player crosses the quad, hears Gangsta's Paradise hummed
-- (never named), has the mind-spin, meets the Contact (Wren).
-- Two soft choices: push for answers vs. listen quietly.
-- Both deliver the four directives and anomaly warning.

BEGIN;

-- Register the Contact NPC (Wren) if not already present
-- Note: This NPC is also added to the TS registry separately.

INSERT INTO public.storylets (
  slug, title, body, choices, tags, requirements, weight, is_active,
  introduces_npc, arc_id, step_key, order_index, due_offset_days,
  expires_after_days, default_next_step_key, segment, time_cost_hours
)
VALUES (
  's_quad_reveal',
  'The Quad',
  $$The quad is wider than you expected. Red brick paths crossing a lawn that someone has been mowing since before you were born — the smell of it is still in the air, mixing with whatever the dining hall is doing to eggs this morning. Students moving in every direction, half of them holding paper schedules and looking from building to building with the specific confusion of people who don't know where they are yet.

September light coming in low through the oaks. Long shadows on the brick. The administration building is across the quad — you need to pick up your final schedule, confirm your meal plan, the kind of errands that feel important your first day and meaningless by your third.

Someone is sitting on a bench near the chapel. A guy — older, maybe a junior or senior. Reading a paperback with the cover folded back. And humming.

You almost walk past. You should walk past. But the melody catches something in your head and holds it, and your feet slow down without your permission.

You know this song.

You know the next four notes before they come. You know the way the melody drops at the bridge. You know what the lyrics are, even though this guy is only humming, and the knowledge is so certain and so specific that it stops you on the brick path like a hand on your chest.

The song is wrong.

Not wrong like off-key. Wrong like it shouldn't be here. Your brain is doing something it shouldn't be able to do — pulling at a thread that connects this melody to a place and a time that doesn't match the buildings and the light and the students walking past you in their polo shirts and high-waisted jeans. The year is 1983. You know this. You have a schedule in your pocket that says Fall 1983 across the top.

The song on that bench does not exist yet.

The ground doesn't move. The sky stays where it is. But something inside your head tilts, like a room you've been standing in your whole life just shifted two degrees on its foundation, and everything that was level is now very slightly wrong.

The guy on the bench looks up. He's been watching you. Not the way people watch strangers — the way someone watches a door they've been waiting to see open.

He closes the paperback. Stands up. He's wearing a corduroy jacket with the sleeves pushed up and sneakers that have been white a long time ago. His eyes are the part of him that looks oldest. Everything else says twenty-one. The eyes say something else.

"You heard it," he says. Not a question.$$,
  $$[
    {
      "id": "ask_what_song",
      "label": "\"What is that song?\"",
      "energy_cost": 0,
      "time_cost": 0,
      "identity_tags": ["risk", "confront"],
      "precludes": [],
      "outcome": {
        "text": "",
        "deltas": { "energy": 0, "stress": 5 }
      },
      "events_emitted": [
        { "npc_id": "npc_contact_wren", "type": "INTRODUCED_SELF", "magnitude": 1 }
      ],
      "reaction_text": "\"You already know what it is,\" he says. \"You just haven't caught up yet.\"\n\nHe sits back down and nods at the other end of the bench. You sit because standing feels wrong, and because the ground still has that two-degree tilt and you'd rather be closer to something solid.\n\nHe doesn't introduce himself right away. He watches two students walk past arguing about a dining hall waffle iron, and waits until they're gone.\n\n\"Wren,\" he says. Like that's enough. He doesn't offer a last name.\n\nThen he talks. Not fast, not slow. The cadence of someone who's thought about exactly how much to say and decided on less than he knows. He talks the way you'd give directions to someone in a foreign city — enough to get them moving, not enough to map the whole place.\n\n\"You're going to need people,\" he says. \"Not just friends. People in different places, different circles. The guy who eats alone doesn't make it.\"\n\nHe looks at you to see if you're keeping up. You are, but you don't know what you're keeping up with.\n\n\"Money matters. Not later — now. Figure out how it works. How to make it, how to keep it, how to move. Independence isn't a feeling. It's a bank balance.\"\n\nA groundskeeper crosses behind the bench pulling a cart of rakes. Wren watches him pass, then continues.\n\n\"Knowledge. Not just classes — the right classes. History, if you want to understand what built the things you're going to run into. Physics, if you want to understand what's happening to you. Computers — \" he pauses, looks at the administration building like it personally offends him — \"there's a revolution coming in that direction and almost nobody here sees it. Sociology, politics, if you want to know how groups work. Business, if you want the money part to go faster.\"\n\nHe says it like he's listing things that turned out to matter. Past tense. From experience.\n\n\"And find the others. Work together. The goal is to make things better — not through force. Through being in the right place with the right people knowing the right things.\"\n\nYou open your mouth. He shakes his head.\n\n\"Don't ask me how it works. I don't know all of it. Don't ask me who else there is. You'll find them, or they'll find you. Don't ask me why — I don't have that one either.\"\n\nHe stands. The paperback goes in his jacket pocket. He looks at you the way a mechanic looks at an engine they've just started — checking if it's going to run.\n\n\"One more thing. Whatever you remember about how things went — sports, politics, who won what, when things happened — don't trust it. This isn't exactly the same. Close, but not the same. The broad strokes rhyme. The details don't. You bet on a game you think you remember, you'll lose.\"\n\nHe's already walking when he says the last part. Not rushing. Just done.\n\n\"Things will come back to you. Memories, impressions, things that feel like they already happened. Let them come. Don't force it. You just have to live it.\"\n\nHe crosses the quad toward the library without looking back. You watch him until a group of students cuts across your line of sight and when they pass, he's around the corner of the building or through the door or gone.\n\nThe bench is empty. The melody is still in your head. The schedule in your pocket says Fall 1983 and you believe it less than you did two minutes ago.\n\nYou have an errand at the administration building. You still need to pick up your schedule. The morning is bright and full of people who know exactly what year it is.\n\nYou get up and walk."
    },
    {
      "id": "just_listen",
      "label": "Say nothing — just listen",
      "energy_cost": 0,
      "time_cost": 0,
      "identity_tags": ["safety", "avoid"],
      "precludes": [],
      "outcome": {
        "text": "",
        "deltas": { "energy": 0, "stress": 3 }
      },
      "events_emitted": [
        { "npc_id": "npc_contact_wren", "type": "INTRODUCED_SELF", "magnitude": 1 }
      ],
      "reaction_text": "He sits back down. Looks at you for a long moment — measuring something. Then he nods, like you passed a test by not taking it.\n\n\"Wren,\" he says. No last name.\n\nHe talks. You don't interrupt. The melody is still caught in your head like a burr in wool and the two-degree tilt hasn't corrected and the smartest thing you can do right now is let this happen.\n\n\"You're going to need people.\" He says it like the first line of something he's rehearsed but doesn't want to sound rehearsed. \"Not acquaintances. Not drinking buddies. People in different circles, different positions. Nobody makes it alone.\"\n\nHe lets that sit. A student walks past carrying a box of textbooks stacked to her chin.\n\n\"Money. Figure it out early. How it works, how to generate it, how to keep someone else from holding your leash. That part matters more than anyone here is going to tell you.\"\n\n\"Knowledge — and I mean the right knowledge. History tells you who built the walls. Physics tells you what's happening to you. Computers — \" a short exhale through his nose, almost a laugh — \"pay attention to the computer people. Sociology and politics tell you how groups think. Business makes the money part go faster.\"\n\nHe runs through these like he's done it before. Not bored — compressed. Someone who has had this conversation and learned what to leave out.\n\n\"Find the others. There are others. The point is to make things better. Together. Not through — \" he waves a hand, dismissing something — \"not through anything dramatic. Through positioning. Knowledge. Cooperation.\"\n\nYou're sitting very still. He notices.\n\n\"Good,\" he says. \"The ones who ask too many questions right away usually aren't ready for the answers.\"\n\nHe stands. Paperback in the jacket pocket. He looks out across the quad like he's checking exits.\n\n\"Last thing. Don't trust what you remember. About how things went — history, sports, elections, any of it. This place rhymes with what you know. But it doesn't repeat. The details are different. Sometimes a little, sometimes a lot. You remember who won the Series last year, don't bet on it.\"\n\nHe's walking before you can respond.\n\n\"More will come back. Memories, feelings, things that haven't happened yet. Don't fight them. Don't force them. Just live it.\"\n\nHe crosses the quad. You watch him. He doesn't look back. He walks like someone who knows exactly where he's going and has been there before.\n\nThe bench. The cut grass. The schedule in your back pocket. The song in your head that has no business being there.\n\nYou get up. The administration building is straight ahead. The morning is doing what mornings do. You walk into it."
    }
  ]$$::jsonb,
  ARRAY['arc_one', 'opening', 'frame', 'time_travel', 'contact'],
  '{}'::jsonb,
  1000,
  true,
  ARRAY['npc_contact_wren']::text[],
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'morning',
  1
);

COMMIT;
