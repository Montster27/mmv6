-- First-three-days narrative pass.
-- Tightens exposition, makes the Room 214 first impression echo the next
-- morning, and gives the first routine plan distinct social propositions.

BEGIN;

-- Day 1: remove explanatory aftercare from the hallmates beat. The stress
-- movement remains, but the prose now gives it a physical cause.
UPDATE public.storylets
SET choices = (
  SELECT jsonb_agg(
    CASE elem->>'id'
      WHEN 'admin_before_lunch' THEN jsonb_set(elem, '{reaction_text}', to_jsonb(
        '“Responsible,” Doug says, halfway between praise and accusation. “Eleven-thirty, then.” He is already walking backward down the hall, still talking.'::text))
      WHEN 'lunch_first' THEN jsonb_set(elem, '{reaction_text}', to_jsonb(
        '“That’s what I’m saying.” Doug falls into step beside you. Four doors open as you pass, each room briefly offering a different song. By the stairs, you have acquired Mike and Keith without anyone formally inviting them.'::text))
      WHEN 'noncommittal' THEN jsonb_set(elem, '{reaction_text}', to_jsonb(
        '“Sure. Maybe.” Doug points two fingers at you like he is saving your place, then turns to collect whoever answers the next door. When the hallway quiets, you can still hear him one floor down.'::text))
      ELSE elem
    END
    ORDER BY idx
  )
  FROM jsonb_array_elements(choices) WITH ORDINALITY AS t(elem, idx)
)
WHERE storylet_key = 'dorm_hallmates' AND is_active = true;

-- Day 2: the opening now remembers how the player met Scott. Conditional text
-- is deliberately slight: recognition, not a branch recap.
UPDATE public.storylets
SET
  body = $body$Morning arrives by accumulation: pipes knocking awake, a shower running down the hall, somebody losing an argument with a vending machine. The blinds stripe the opposite wall. For half a second the room is only a room. Then it is Room 214, and it belongs partly to you.$body$,
  nodes = $nodes$[
    {
      "id": "scott_morning",
      "text": "Scott is tying his shoes beside the desk. He glances up, polite and unreadable. “Orientation at ten, right?”",
      "text_variants": [
        {
          "condition": { "npc_memory": "npc_roommate_scott.player_asked_song" },
          "text": "Scott is tying his shoes beside the desk. The cassette from yesterday is already back in its case. “Orientation at ten, right?” His thumb rests on the cracked plastic hinge."
        },
        {
          "condition": { "npc_memory": "npc_roommate_scott.started_warm" },
          "text": "Scott is tying his shoes beside the desk. When he sees you awake, he taps two fingers against the cassette case between your desks. “Orientation at ten, right?” The question sounds like the continuation of something."
        },
        {
          "condition": { "npc_memory": "npc_roommate_scott.played_cool" },
          "text": "Scott is tying his shoes beside the desk, careful not to disturb anything on your side. “Orientation at ten, right?” He asks without looking up, offering you the same amount of room you gave him yesterday."
        }
      ],
      "speaker": "npc_roommate_scott",
      "micro_choices": [
        {
          "id": "coordinated",
          "label": "“Walk over together?”",
          "next": "react_together",
          "sets_flag": "morning_together",
          "set_npc_memory": { "npc_roommate_scott": { "morning_coordinated": true } }
        },
        {
          "id": "noncommittal",
          "label": "“Maybe. I’ll see you there.”",
          "next": "react_noncommittal",
          "sets_flag": "morning_solo"
        },
        {
          "id": "independent",
          "label": "“Yeah.” Reach for your towel.",
          "next": "react_independent",
          "sets_flag": "morning_solo"
        }
      ]
    },
    {
      "id": "react_together",
      "text": "“Good. Ten minutes?” He says it lightly, but leaves the door unlatched when he goes to brush his teeth.",
      "speaker": "npc_roommate_scott",
      "next": "hallway_beat"
    },
    {
      "id": "react_noncommittal",
      "text": "“Sure.” The clock radio catches a weather report—clear, high of seventy-one—before Scott turns it down, not quite off.",
      "speaker": "npc_roommate_scott",
      "next": "hallway_beat"
    },
    {
      "id": "react_independent",
      "text": "Scott nods once. His “see you there” follows you into the hall. It may be a courtesy. It may be an expectation.",
      "speaker": "npc_roommate_scott",
      "next": "hallway_beat"
    },
    {
      "id": "hallway_beat",
      "text": "Cold linoleum. Three stalls, two showers behind vinyl curtains, a bar of soap softening in its plastic case. While you brush your teeth, someone behind a curtain hums a melody you almost recognize. The next note should resolve it. It never does.",
      "next": "choices"
    }
  ]$nodes$::jsonb
WHERE storylet_key = 'first_morning' AND is_active = true;

-- Day 3: distinguish the two early social routines and remove premature claims
-- about professors the player has not met.
UPDATE public.routine_activities
SET flavor_text = 'Lectures, recitations, assigned seats. For now, the names on the schedule are only names.'
WHERE activity_key = 'attend_classes';

UPDATE public.routine_activities
SET display_name = 'Keep Your Door Open',
    flavor_text = 'Stay in Room 214 while the floor drifts past. Scott may stop by. So may someone you have not met yet.'
WHERE activity_key = 'dorm_floor_time';

UPDATE public.routine_activities
SET display_name = 'Cards in the Lounge',
    flavor_text = 'Doug has called it a regular game. Nobody else has agreed to the word regular.'
WHERE activity_key = 'floor_hangout';

COMMIT;
