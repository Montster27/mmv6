BEGIN;

-- s_evening_sub: Day 1 evening — SUB arcade trip
-- Loose group from the floor heads to the Student Union Building game room.
-- 1983 arcade cabinets, quarters, neon in the dark. Snake mini-game on cabinet.
-- Precludes s_evening_caps and s_evening_cards.
-- Choice 1 triggers snake mini-game. Win → high score initials on the cabinet.

INSERT INTO public.storylets (
  slug, title, body, choices, tags, requirements, weight, is_active,
  introduces_npc, segment, time_cost_hours, is_conflict
)
VALUES (
  's_evening_sub',
  'The SUB',
  E'You''re in the hallway when three guys from the floor come past your door pulling on jackets. One of them — Brendan, Cal''s friend from high school — slows down long enough to say "We''re heading to the SUB. They''ve got a game room."\n\nHe says it over his shoulder, already moving. It''s not really an invitation. It''s a door left open for you to walk through or not.\n\nThe Student Union Building is a five-minute walk across the quad. You can see it from the dorm window — a brick rectangle with light spilling from the ground-floor windows. You''ve walked past it twice today without going in. The orientation map called it "the hub of student life," which is the kind of phrase that means nothing until you''ve been inside.\n\nDana is at his desk with the course catalog open. He looks up when the guys pass but doesn''t move. The tape deck is playing something quiet — Steely Dan, maybe. He''s settled in for the night.',
  $$[
    {
      "id": "walk_over",
      "label": "Grab your jacket and catch up",
      "time_cost": 1,
      "energy_cost": 1,
      "identity_tags": ["risk", "people"],
      "precludes": ["s_evening_caps", "s_evening_cards"],
      "sets_stream_state": { "stream": "belonging", "state": "first_anchor" },
      "events_emitted": [],
      "set_npc_memory": {
        "npc_floor_cal": { "knows_brendan": true }
      },
      "outcomes": [
        {
          "id": "snake_win",
          "weight": 50,
          "text": "",
          "deltas": {
            "energy": -1,
            "stress": -2,
            "resources": { "socialLeverage": 1 }
          }
        },
        {
          "id": "snake_lose",
          "weight": 50,
          "text": "",
          "deltas": {
            "energy": -1,
            "stress": -1,
            "resources": {}
          }
        }
      ],
      "reaction_text_conditions": [
        {
          "if": { "outcome_id": "snake_win" },
          "text": "The quad at night is a different campus. The buildings are the same shapes but the light is different — amber from the path lamps, blue-white from windows where people are still unpacking. Your breath makes small clouds. September, but the nights already know what's coming.\n\nThe SUB game room is in the basement. You hear it before you see it — the layered electronic soundtrack of a dozen arcade cabinets running at once. Pac-Man. Galaga. Donkey Kong. The room is dim except for the screens, and the screens are everything.\n\nBrendan feeds quarters into Galaga and is dead in ninety seconds. The other two guys find the pool table. You drift along the row of cabinets until you find one in the corner — a snake game, green on black, the kind of simple that hooks you before you understand why.\n\nYou drop a quarter in. The snake moves. You move with it.\n\nSomething clicks. The grid makes sense to you the way the card game didn't, the way caps wouldn't. You're not thinking — you're just turning, eating, growing, staying alive. The snake fills half the screen. Then three-quarters. A guy you don't know stops behind you and watches. Then another.\n\nWhen you finally hit your own tail the score is the highest on the board. The machine asks for three initials. You type them in and they glow green on the black screen and something about seeing your letters on a machine in a building you didn't know existed this morning feels like the first real mark you've made at Harwick.\n\nBrendan looks over. \"Dude. First try?\" You shrug. You don't tell him you've played before — in another arcade, in another life, though you couldn't say where.\n\nYou walk back to the dorm with the group. The quad is empty now. Your initials are in a machine in the basement of the Student Union Building, and tomorrow someone will try to beat them, and that means you were here.",
          "set_npc_memory": {
            "npc_floor_cal": { "sub_arcade_high_score": true }
          }
        },
        {
          "if": { "outcome_id": "snake_lose" },
          "text": "The quad at night is a different campus. The buildings are the same shapes but the light is different — amber from the path lamps, blue-white from windows where people are still unpacking. Your breath makes small clouds. September, but the nights already know what's coming.\n\nThe SUB game room is in the basement. You hear it before you see it — the layered electronic soundtrack of a dozen arcade cabinets running at once. Pac-Man. Galaga. Donkey Kong. The room is dim except for the screens, and the screens are everything.\n\nBrendan feeds quarters into Galaga and is dead in ninety seconds. The other two guys find the pool table. You drift along the row of cabinets until you find one in the corner — a snake game, green on black, the kind of simple that hooks you before you understand why.\n\nYou drop a quarter in. The snake moves. You move with it — for about thirty seconds. Then you clip your own tail on a turn you saw coming and couldn't correct. You feed in another quarter. Dead faster. Another. The high score list mocks you from the top of the screen — three sets of initials that aren't yours, left by people who were here before you.\n\nYou burn through six quarters. You do not crack the board. But somewhere around the fourth try, you stop caring about the score and start caring about the room — the sound of it, the glow of it, the way nobody in here is performing anything. A girl at the Pac-Man cabinet has been on the same quarter for twenty minutes and a small crowd has gathered. Brendan is arguing about Galaga strategy with a stranger. The pool table guys are betting with quarters they can't spare.\n\nThis place exists. You didn't know it this morning and now you do, and tomorrow you'll come back, and the quarters you burned are the price of that knowledge.\n\nYou walk back to the dorm with the group. The quad is empty. You're down a dollar fifty in quarters and up one place that feels like it could be yours.",
          "set_npc_memory": {
            "npc_floor_cal": { "sub_arcade_visited": true }
          }
        }
      ]
    },
    {
      "id": "tag_along",
      "label": "Walk over but keep your quarters — just look around",
      "time_cost": 1,
      "energy_cost": 0,
      "identity_tags": ["safety", "people"],
      "precludes": ["s_evening_caps", "s_evening_cards"],
      "sets_stream_state": { "stream": "belonging", "state": "performing_fit" },
      "events_emitted": [],
      "set_npc_memory": {
        "npc_floor_cal": { "knows_brendan": true }
      },
      "outcome": {
        "text": "",
        "deltas": {
          "energy": 0,
          "stress": -1,
          "resources": {}
        }
      },
      "reaction_text": "You grab your jacket. You don't bring quarters.\n\nThe walk across the quad takes five minutes and nobody talks much. It's not awkward — it's just four guys walking across a campus they don't know yet, looking at buildings they'll learn to take for granted. The path lamps make amber circles on the concrete. Someone's playing guitar on a bench near the library. You file the location away.\n\nThe SUB game room is in the basement. A dozen arcade cabinets glowing in the dark, the collective soundtrack of Pac-Man and Galaga and Donkey Kong layered into something that almost sounds intentional. Brendan makes straight for Galaga. The other two find the pool table.\n\nYou walk the room. You watch a girl at the Pac-Man cabinet who's been on the same quarter for what has to be twenty minutes — a small crowd has gathered behind her, and she doesn't blink. You check the high scores on every cabinet like you're reading the names of people who were here before you. The snake game in the corner has a leaderboard full. You put your hands in your pockets and watch the demo screen loop.\n\nYou find the bulletin board by the stairs. Flyers for clubs, bands, study groups, a part-time job at the campus bookstore. You read every one. This is the kind of information that won't matter until it does.\n\nBrendan finds you by the exit an hour later. \"You didn't play anything?\" You shrug. You didn't need to. You came to learn the building and you learned the building. That's enough for tonight.\n\nThe walk back is colder. The dorm, when you get there, feels smaller than it did when you left. That's the first sign that the campus is starting to work."
    },
    {
      "id": "pass_sub",
      "label": "Pass — you'll find it tomorrow",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": ["safety", "avoid"],
      "precludes": [],
      "sets_stream_state": { "stream": "belonging", "state": "open_scanning" },
      "events_emitted": [],
      "outcome": {
        "text": "",
        "deltas": {
          "energy": 2,
          "stress": -1,
          "resources": {}
        }
      },
      "reaction_text": "\"Maybe tomorrow,\" you say to the hallway, but Brendan's already around the corner and you're not sure he heard.\n\nYou go back in your room. Dana is reading. His desk lamp makes a warm circle on the course catalog and nothing else. The room is quiet except for the tape deck — Steely Dan, something off Aja, the kind of music that sounds like someone thinking.\n\nYou sit on your bed. From the window you can see three figures crossing the quad toward the SUB, getting smaller. The Student Union Building is a lit rectangle in the dark. You'll go tomorrow, or the day after, or whenever it stops feeling like one more thing you should do.\n\nThe floor is quieter now. The caps party has hit its peak and started to fade — you can tell from the way the bass has dropped and the laughter has gone intermittent. Miguel's card game is still going. You can hear the murmur of it through the wall.\n\nEveryone is somewhere tonight. You are here, in your room, with a roommate who doesn't need you to talk and a course catalog you're not reading and the particular silence of a person who chose rest and isn't resting.\n\nYou'll find the SUB tomorrow. It's not going anywhere. Neither are you, which is either reassuring or the whole problem, depending on how long you think about it."
    }
  ]$$::jsonb,
  ARRAY['arc_one', 'evening', 'belonging', 'exploration', 'arcade'],
  '{}'::jsonb,
  100,
  true,
  ARRAY[]::text[],
  'evening',
  2,
  false
);

COMMIT;
