BEGIN;

-- s_evening_cards: Day 1 evening — card game in Miguel's room
-- Miguel hosts. Low-key hangout, memory card game, real conversation.
-- Spider (nickname, no one knows his real name) is quietly dominant at the game.
-- Precludes s_evening_caps and s_evening_sub.
-- Choice 1 triggers memory card mini-game (win/lose branching via outcomes).

INSERT INTO public.storylets (
  slug, title, body, choices, tags, requirements, weight, is_active,
  introduces_npc, segment, time_cost_hours, is_conflict
)
VALUES (
  's_evening_cards',
  'The Card Game',
  E'Miguel catches you in the hallway after the floor meeting. He''s got a deck of cards in one hand and a bag of microwave popcorn in the other, and he holds them both up like evidence.\n\n"A few of us are playing cards in my room. Nothing serious — just hanging out." He says it like he''s done this before, which he probably has. Some people arrive at college already knowing how to invite strangers into a room and make it feel normal. Miguel is one of those people.\n\nHis room is two doors down from yours. The door is already open. Three guys from the floor are sitting on the beds and the floor — there''s no table, so someone''s spread a towel on the carpet between them. The clock radio on the desk is playing something low enough to talk over. The window is cracked because five people in a dorm room in September is about two people too many.\n\nOne of them — skinny kid, dark eyes, sitting cross-legged against the radiator — is shuffling the deck with the kind of speed that suggests he''s been doing it since he could hold cards. Someone calls him Spider. You get the feeling that''s the only name anyone''s going to get.\n\nThe popcorn is already open. Nobody''s drinking. This is the other version of the first night — the one that happens at a normal volume.',
  $$[
    {
      "id": "deal_in",
      "label": "Sit down and deal yourself in",
      "time_cost": 1,
      "energy_cost": 1,
      "identity_tags": ["people", "risk"],
      "precludes": ["s_evening_caps", "s_evening_sub"],
      "sets_stream_state": { "stream": "belonging", "state": "first_anchor" },
      "events_emitted": [
        { "npc_id": "npc_floor_miguel", "type": "SHOWED_UP", "magnitude": 1 }
      ],
      "set_npc_memory": {
        "npc_floor_miguel": { "played_cards": true }
      },
      "outcomes": [
        {
          "id": "memory_win",
          "weight": 50,
          "text": "",
          "deltas": {
            "energy": -1,
            "stress": -2,
            "resources": { "socialLeverage": 1 }
          }
        },
        {
          "id": "memory_lose",
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
          "if": { "outcome_id": "memory_win" },
          "text": "You sit on the floor and someone deals you in and for the next two hours you are just a person playing cards with other people and that turns out to be exactly enough.\n\nMiguel runs the game like he runs everything — loose, easy, making sure nobody feels stupid. Pairs face-down on the towel, flip two at a time. Spider is already three rounds ahead of everyone, his hands moving with that shuffler's memory, but you're keeping pace. Quiet, steady, remembering where the seven of clubs was three turns ago while everyone else is still guessing.\n\n\"How are you doing that?\" the guy from Akron asks. You shrug. You don't know how to explain that your brain just holds the grid. Spider glances at you across the towel — the first time he's looked directly at anyone — and something like respect crosses his face. Miguel watches you clear the last pair and nods like he's filing something away.\n\nThe cards become an excuse. The real game is the conversation that grows in the gaps between turns. The guy from Akron who picked Harwick because his cousin said the food was decent. Spider, who says nothing about himself and everything about the cards — where they were, how the shuffle changed the distribution, patterns nobody asked him to track. Miguel, who talks about San Antonio like it's a person he misses.\n\nNobody asks you anything you can't answer. Nobody makes you perform. By the time the popcorn is gone and someone checks the clock and says \"it's one-thirty,\" you know four names and one nickname, and one of them matters.\n\nYou walk back to your room. Dana's light is off. You don't turn yours on. You lie in the dark and the quiet is the good kind — the kind that comes after being with people, not instead of it.",
          "set_npc_memory": {
            "npc_floor_miguel": { "memory_game_win": true }
          }
        },
        {
          "if": { "outcome_id": "memory_lose" },
          "text": "You sit on the floor and someone deals you in. The matching game is simple — pairs face-down on the towel, flip two at a time, remember where things are. You should be good at this.\n\nYou are not good at this.\n\nThe grid won't hold. You flip the nine of hearts, then flip it again two turns later in the wrong spot, and the guy from Akron grins. Spider — the skinny kid against the radiator — is running the table without appearing to try, his hands remembering what his face doesn't show. Miguel laughs — not at you, with the situation — and says \"you're overthinking it, man.\"\n\nYou are. The harder you try to track the cards, the more they blur. Spider clears three pairs in a row and someone mutters \"how\" and Spider just shrugs, which is apparently the most anyone's getting out of him tonight.\n\nIt doesn't matter. The game stops being about winning somewhere around the fourth round and becomes about the conversation that fills the spaces between turns. The guy from Akron who picked Harwick because his cousin said the food was decent. Spider, who says nothing personal and occasionally makes a sound that might be a laugh. Miguel, who talks about San Antonio like it's a person he misses.\n\nYou lose every round. Nobody cares. That's the thing about a game played on a towel on the floor at midnight — the score isn't the point. The point is that five people who didn't know each other this morning are sitting in a warm room eating burnt popcorn and talking about nothing important, and it feels like something.\n\nBy the time someone checks the clock and says \"it's one-thirty,\" you know four names and one nickname, and one of them matters.\n\nYou walk back to your room. Dana's light is off. You don't turn yours on. You lie in the dark and the quiet is the good kind — the kind that comes after being with people, not instead of it.",
          "set_npc_memory": {
            "npc_floor_miguel": { "memory_game_lose": true }
          }
        }
      ]
    },
    {
      "id": "watch_round",
      "label": "Watch for a round — see what the vibe is",
      "time_cost": 1,
      "energy_cost": 0,
      "identity_tags": ["safety", "people"],
      "precludes": ["s_evening_caps", "s_evening_sub"],
      "sets_stream_state": { "stream": "belonging", "state": "performing_fit" },
      "events_emitted": [
        { "npc_id": "npc_floor_miguel", "type": "SHOWED_UP", "magnitude": 0.5 }
      ],
      "set_npc_memory": {
        "npc_floor_miguel": { "watched_cards": true }
      },
      "outcome": {
        "text": "",
        "deltas": {
          "energy": 0,
          "stress": -1,
          "resources": {}
        }
      },
      "reaction_text": "You lean against the doorframe. Miguel makes space on the bed but you shake your head — you're fine here. You want to see how this works before you're in it.\n\nThe matching game is straightforward. Pairs face-down, flip two, remember where things are. What's interesting isn't the game — it's what happens around it. The guy from Akron bets his popcorn on the next flip and loses. Spider is quietly destroying everyone, his hands moving with that shuffler's memory, face showing nothing. Miguel is keeping score on the back of an orientation pamphlet but also clearly not keeping score.\n\nYou watch for forty minutes. Long enough to learn the rhythms — Spider's silence, Miguel's easy steering, the way the guy from Akron fills every gap with a question. Long enough that Miguel stops checking whether you're going to sit down and just lets you be where you are. Long enough that when someone asks you a question — \"hey, where are you from?\" — you answer without the feeling that you're performing.\n\nYou don't play. You don't need to. The room gave you what it had to offer from exactly where you were standing.\n\nWalking back, the hallway is quieter than the caps-party end of the floor. Different frequencies. You are learning that a building can hold more than one version of the same night, and you don't have to choose wrong."
    },
    {
      "id": "decline_miguel",
      "label": "Tell him maybe later — head back to your room",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": ["safety", "avoid"],
      "precludes": [],
      "sets_stream_state": { "stream": "belonging", "state": "open_scanning" },
      "events_emitted": [
        { "npc_id": "npc_floor_miguel", "type": "WENT_MISSING", "magnitude": 1 }
      ],
      "outcome": {
        "text": "",
        "deltas": {
          "energy": 2,
          "stress": -1,
          "resources": {}
        }
      },
      "reaction_text": "\"Maybe later,\" you say, and Miguel nods like he expected that answer, or at least like he's got a version of himself that handles it smoothly. \"Door's open,\" he says. \"Come by whenever.\"\n\nYou won't.\n\nYou go back to your room and sit on your bed and listen to the building settle into its first real night. Down the hall, the caps party is getting louder. Closer, from Miguel's room, you can hear cards and laughter at a volume that doesn't carry through walls so much as seep through them.\n\nDana left for the party an hour ago. His side of the room is neat. His tape deck is off.\n\nYou could still go. Miguel said the door was open. That's probably even true — he seems like the kind of person who means what he says, or at least who's figured out that meaning what you say is easier than the alternative.\n\nYou pick up the course catalog and read the same page three times without absorbing it. The laughter from down the hall has the rhythm of people who are becoming friends. You are in a room by yourself holding a catalog for classes that start tomorrow.\n\nIt's fine. You're tired. Tomorrow is a full day and you're being smart about it. All of this is true and none of it is the reason you're here instead of there, and you know it, and knowing it doesn't help."
    }
  ]$$::jsonb,
  ARRAY['arc_one', 'evening', 'belonging', 'social', 'cards'],
  '{"requires_npc_met": ["npc_floor_miguel"]}'::jsonb,
  100,
  true,
  ARRAY[]::text[],
  'evening',
  2,
  false
);

COMMIT;
