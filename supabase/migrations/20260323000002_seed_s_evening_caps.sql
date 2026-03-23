BEGIN;

-- s_evening_caps: Day 1 evening — caps party down the hall
-- Cal hosts. Girls from Pemberton (women's dorm). Schlitz, Van Halen, bottle caps.
-- Precludes s_evening_cards and s_evening_sub.
-- Choice 1 triggers caps mini-game (win/lose branching via outcomes).
-- Choice 1 lose → "Caps Guy" reputation seed (detonates over next week).
-- Choice 1 → hangover: Day 2 morning energy penalty.

INSERT INTO public.storylets (
  slug, title, body, choices, tags, requirements, weight, is_active,
  introduces_npc, segment, time_cost_hours, is_conflict
)
VALUES (
  's_evening_caps',
  'Down the Hall',
  E'Cal''s door is open four rooms down. You can hear it from the hallway — not just music, but the specific frequency of a room that has decided to become a party. Someone found a blaster. Someone else found a case of Schlitz. The two discoveries have combined.\n\nCal leans out of his doorway and points at you like he''s been waiting. "Hey — 214. We''re doing caps. Brendan''s got girls coming from Pemberton." He says it the way you''d announce a weather event. Factual. Inevitable.\n\nYou can see past him into the room. The overhead light is off, replaced by a desk lamp draped with a towel that makes everything amber. Six or seven guys already, some sitting on the floor, one standing on a chair for no clear reason. Van Halen coming from the blaster at a volume that says nobody''s told them to turn it down yet.\n\nFrom down the hall, you can hear Dana''s tape deck through your open door. He hasn''t come out.',
  $$[
    {
      "id": "go_all_in",
      "label": "Go in — you didn't come to college to sit in your room",
      "time_cost": 1,
      "energy_cost": 2,
      "identity_tags": ["risk", "people"],
      "precludes": ["s_evening_cards", "s_evening_sub"],
      "sets_stream_state": { "stream": "belonging", "state": "first_anchor" },
      "events_emitted": [
        { "npc_id": "npc_floor_cal", "type": "SHOWED_UP", "magnitude": 1 }
      ],
      "set_npc_memory": {
        "npc_floor_cal": { "went_to_caps_party": true }
      },
      "outcomes": [
        {
          "id": "caps_win",
          "weight": 50,
          "text": "",
          "deltas": {
            "energy": -3,
            "stress": -2,
            "resources": { "socialLeverage": 1 }
          }
        },
        {
          "id": "caps_lose",
          "weight": 50,
          "text": "",
          "deltas": {
            "energy": -4,
            "stress": 2,
            "resources": { "socialLeverage": 1 }
          }
        }
      ],
      "reaction_text_conditions": [
        {
          "if": { "outcome_id": "caps_win" },
          "text": "The beer is bad and the room is loud and none of that matters because you are — for this specific window of time — exactly where you're supposed to be.\n\nCal sets two Schlitz bottles on the carpet, ten feet apart, and explains the rules like they're constitutional law. You flick the cap — thumb and middle finger, snap release — and it pings off the neck of the far bottle. The room makes a sound.\n\nThe girls from Pemberton show up around the third round — four of them, laughing about something that happened on the walk over, already comfortable in a way that makes the room recalibrate. You're good at this. Not great — your first throw caught the rim — but by the fourth round you've got the flick figured out and someone whose name you didn't catch says \"this guy\" in a tone that means you've been noticed. Cal raises his Schlitz in your direction.\n\nThere's a girl with a denim jacket and a laugh that carries. You don't talk to her. But she sees you make the shot that wins the round, and that's a thing that happened, filed away by both of you.\n\nYou walk back to your room at something past midnight. The hallway has that post-party quiet — somebody's door is still open, low music, murmured conversation. Dana is asleep or pretending to be. You drink water from the bathroom tap and lie on your bed and the ceiling does not spin, which you take as a victory.\n\nTomorrow is going to hurt. You know this. You don't care yet.",
          "set_npc_memory": {
            "npc_floor_cal": { "caps_party_win": true }
          }
        },
        {
          "if": { "outcome_id": "caps_lose" },
          "text": "The beer is bad and the room is loud and you are doing fine right up until you aren't.\n\nCal sets two Schlitz bottles on the carpet, ten feet apart, and explains the rules like they're constitutional law. You flick the cap — thumb and middle finger — and it goes wide. Then wide again. You adjust, overcorrect, and your fourth shot sails past the bottle entirely. The Schlitz you're holding is going down easier than it should.\n\nThe girls from Pemberton show up around the third round — four of them, laughing about something that happened on the walk over, already comfortable in a way that makes the room recalibrate. By the fifth round you've got the flick figured out wrong — releasing late, putting arc on throws that need line. Your last shot catches someone's beer and sends it off the windowsill. The bottle hits the floor and shatters. The room goes quiet for exactly one second. Then Cal is laughing, and the guy whose beer it was is laughing, and someone is already getting a towel, and you're apologizing and meaning it.\n\nYou hear yourself say something you think is funny. From the way the girl in the denim jacket looks at you and then looks away, you understand that it was not.\n\nYou make it back to your room by a route you will not fully remember. Dana is asleep or pretending to be. You drink water from the bathroom tap and miss your mouth a little. The ceiling is doing something it shouldn't.\n\nBy morning, the floor knows. By Tuesday, Pemberton knows. A guy in the dining hall you've never met will say \"hey, you're Caps Guy\" and you will have to decide what to do with a reputation you didn't choose.\n\nTomorrow is going to hurt. You know this already.",
          "set_npc_memory": {
            "npc_floor_cal": { "caps_party_lose": true, "caps_guy_reputation": true }
          }
        }
      ]
    },
    {
      "id": "one_drink",
      "label": "One drink — show your face, keep your options open",
      "time_cost": 1,
      "energy_cost": 1,
      "identity_tags": ["safety", "people"],
      "precludes": ["s_evening_cards", "s_evening_sub"],
      "sets_stream_state": { "stream": "belonging", "state": "performing_fit" },
      "events_emitted": [
        { "npc_id": "npc_floor_cal", "type": "SHOWED_UP", "magnitude": 0.5 }
      ],
      "set_npc_memory": {
        "npc_floor_cal": { "went_to_caps_party": true, "left_early": true }
      },
      "outcome": {
        "text": "",
        "deltas": {
          "energy": -1,
          "stress": -1,
          "resources": {}
        }
      },
      "reaction_text": "You go in. You take the Schlitz Cal puts in your hand because refusing it would be a whole thing. You stand near the window where the air is slightly cooler and you watch the room happen.\n\nCal is in his element — loud, organizing, pointing at people, deciding who throws next. He sets two bottles on the carpet, ten feet apart, and explains caps like it's constitutional law. Thumb and middle finger, snap the cap at the far bottle. The game assembles itself around him like weather around a pressure system. Someone turns up the blaster. Someone else turns it down. The negotiation happens without words.\n\nYou drink half the beer. It's warm already. A girl from Pemberton asks if you're playing and you say maybe next round, which both of you understand means no.\n\nCal puts a Schlitz in your hand and points you toward the game. Two bottles on the carpet, ten feet apart. You watch one round, get the idea. Simple enough.\n\nYour first flick is decent. Your second catches someone's hand — the guy holding the target bottle steady — and the Schlitz drops and shatters on the floor. The room goes quiet for exactly one second. Then Cal is laughing, and the guy is laughing, and someone is already getting a towel, and you're apologizing and meaning it and understanding that you should probably leave before the next thing happens.\n\nYou've been here twenty minutes. That's enough. Cal saw you come in. The guy whose beer you shattered will remember you specifically.\n\nWalking back, the hallway is louder than when you came. More doors open. The floor is becoming a place. You are part of it — adjacently, provisionally."
    },
    {
      "id": "stay_in_room",
      "label": "Close your door — you've spent enough energy today",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": ["safety", "avoid"],
      "precludes": [],
      "sets_stream_state": { "stream": "belonging", "state": "open_scanning" },
      "events_emitted": [
        { "npc_id": "npc_floor_cal", "type": "WENT_MISSING", "magnitude": 1 }
      ],
      "outcome": {
        "text": "",
        "deltas": {
          "energy": 2,
          "stress": -1,
          "resources": {}
        }
      },
      "reaction_text": "You close the door. Not hard — just enough for the latch to catch.\n\nThe party finds you anyway. Bass through the wall, somebody's laugh peaking above the music, the specific percussion of a drinking game being explained too loudly. Cal's room is four doors down. It might as well be four miles. You made your choice and the choice is a closed door and your own bed and the reading you told yourself you'd do tonight.\n\nYou don't do the reading.\n\nYou lie there and listen to other people's first night of college happening in real time. Someone runs past your door. Girls' voices — must be from Pemberton. The floor is becoming something and you're on the other side of a door you closed yourself.\n\nDana left twenty minutes ago. His side of the room is neat and empty. His tape deck is off.\n\nYou're tired. You earned this rest. Orientation, the RA, the floor meeting, all the handshakes and names you've already forgotten — that's a full day by any measure. The fact that other people still have fuel doesn't mean you should.\n\nYou tell yourself this. The hallway gets louder. You pull the pillow over your ear and wait for it to become background noise. Eventually it does."
    }
  ]$$::jsonb,
  ARRAY['arc_one', 'evening', 'belonging', 'social', 'caps'],
  '{"requires_npc_met": ["npc_floor_cal"]}'::jsonb,
  100,
  true,
  ARRAY[]::text[],
  'evening',
  2,
  false
);

COMMIT;
