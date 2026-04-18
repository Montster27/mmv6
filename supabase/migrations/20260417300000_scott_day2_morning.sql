-- scott_day2_morning — First Day 2 roommate content.
--
-- Proves Day 0 roommate choices have consequences: three conditional entry
-- nodes branch on NPC memory (started_warm / played_cool / fallback absent).
--
-- Engine feature used: npc_memory condition on DialogueNode (new in this PR).
--
-- Also retrofits room_214 to set played_cool NPC memory on neutral/quiet
-- micro-choices so the condition gate has something to check.
--
-- Terminal choice gating uses a single "scott_engaged" walk flag instead of
-- requires_flag_mode:"any" (which the engine doesn't support).
-- The read_note_leave terminal sets persistent flag "read_scotts_note" via
-- sets_flag for a future Day 4-5 callback storylet.

BEGIN;

-- ══════════════════════════════════════════════════════════════════════
-- 1. Retrofit room_214 — add played_cool NPC memory to neutral/quiet
-- ══════════════════════════════════════════════════════════════════════

UPDATE public.storylets
SET nodes = (
  SELECT jsonb_agg(
    CASE
      -- neutral micro-choice: add set_npc_memory
      WHEN elem->'micro_choices' IS NOT NULL
       AND elem->>'id' = 'scott_greets'
      THEN jsonb_set(
        elem,
        '{micro_choices}',
        (
          SELECT jsonb_agg(
            CASE
              WHEN mc->>'id' IN ('brief', 'look_around')
               AND mc->'set_npc_memory' IS NULL
              THEN mc || '{"set_npc_memory": {"npc_roommate_scott": {"played_cool": true}}}'::jsonb
              ELSE mc
            END
            ORDER BY mc_idx
          )
          FROM jsonb_array_elements(elem->'micro_choices') WITH ORDINALITY AS t(mc, mc_idx)
        )
      )
      ELSE elem
    END
    ORDER BY idx
  )
  FROM jsonb_array_elements(nodes) WITH ORDINALITY AS t(elem, idx)
)
WHERE storylet_key = 'room_214'
  AND is_active = true;


-- ══════════════════════════════════════════════════════════════════════
-- 2. Insert scott_day2_morning
-- ══════════════════════════════════════════════════════════════════════

INSERT INTO public.storylets (
  slug, title, body, choices, nodes,
  tags, requirements, weight, is_active,
  introduces_npc,
  arc_id, track_id,
  step_key, storylet_key,
  order_index, due_offset_days, expires_after_days,
  default_next_step_key, default_next_key,
  segment, time_cost_hours
)
VALUES (
  'scott_day2_morning',
  'Room 214, Morning',

  -- ── Preamble (universal scene-setter) ──────────────────────────────
  $body$Room 214. Morning light through the window your roommate's desk sits under.$body$,

  -- ── Terminal choices ───────────────────────────────────────────────
  $choices$[
    {
      "id": "breakfast_with_scott",
      "label": "Head to the dining hall with Scott",
      "requires_flag": "scott_engaged",
      "excludes_flag": "was_brief",
      "time_cost": 1,
      "energy_cost": 0,
      "identity_tags": ["people"],
      "reaction_text": "You walk to the dining hall together. Scott points out a shortcut through the science building he found yesterday while you were somewhere else. The dining hall is loud and fluorescent and you get trays and sit at the end of a long table without discussing it. The eggs are powdered. The coffee tastes like it was made by someone who has heard of coffee but never tasted it. Scott eats like someone who doesn't think about food, mechanical and thorough. Neither of you talks much. It's okay.",
      "precludes": [],
      "outcome": { "text": "", "deltas": {} },
      "events_emitted": [
        { "npc_id": "npc_roommate_scott", "type": "SHARED_MEAL", "magnitude": 1 },
        { "npc_id": "npc_roommate_scott", "type": "SHOWED_UP", "magnitude": 1 }
      ]
    },
    {
      "id": "head_out_alone",
      "label": "Grab your stuff and head out",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": [],
      "reaction_text": "You pick up your backpack. The room is small enough that leaving it changes the air pressure. Scott says \"see ya\" or the note says \"gone to breakfast\" or nobody says anything at all, depending on the morning you've had. The door closes behind you and the hallway is bright and the day is starting and you're in it now.",
      "precludes": [],
      "outcome": { "text": "", "deltas": {} },
      "events_emitted": [
        { "npc_id": "npc_roommate_scott", "type": "DEFERRED_TENSION", "magnitude": 0.5 }
      ]
    },
    {
      "id": "read_note_leave",
      "label": "Read Scott's note one more time, then leave",
      "requires_flag": "looked_at_stuff",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": [],
      "sets_flag": ["read_scotts_note"],
      "reaction_text": "You pick up the note. Hold it for a second. The handwriting is patient — each letter formed like he was taught cursive and rejected it, choosing print instead, choosing clarity. \"Gone to breakfast.\" Three words that carry the weight of a decision to leave before you woke up. You put it back where you found it, exactly where he left it, and you go.",
      "precludes": [],
      "outcome": { "text": "", "deltas": {} },
      "events_emitted": []
    }
  ]$choices$::jsonb,

  -- ── Conversational nodes ───────────────────────────────────────────
  --
  -- Entry nodes use npc_memory conditions to branch on room_214 choices.
  -- Each entry merges the body variant + dialogue into one node.
  -- Fallthrough chain: entry_warm → entry_neutral → entry_absent.
  --
  -- Engage micro-choices set "scott_engaged" to gate breakfast terminal.
  -- Disengage micro-choices set "was_brief" or "looked_at_stuff".

  $nodes$[
    {
      "id": "entry_warm",
      "text": "Scott is already up. His side of the room looks different — photos tacked to the corkboard above his desk. A family on a porch. A dog in a yard that's mostly gravel. A poster of a car you don't recognize, something with a long hood and chrome bumpers.\n\nHe's eating cereal straight from the box. No bowl. Just reaching in like a kid watching Saturday cartoons, except there's no TV and it's Wednesday.\n\nHe looks up when you move. Not startled. Like he was waiting for you to wake up and now you have.",
      "condition": { "npc_memory": "npc_roommate_scott.started_warm" },
      "next": "entry_neutral",
      "micro_choices": [
        {
          "id": "tell_him_about_night",
          "label": "Tell him about last night",
          "next": "warm_engaged",
          "sets_flag": "scott_engaged"
        },
        {
          "id": "keep_it_short_warm",
          "label": "\"It was good. You should've come.\"",
          "next": "warm_brief",
          "sets_flag": "was_brief"
        }
      ]
    },
    {
      "id": "entry_neutral",
      "text": "Scott is at his desk. Textbook open but he's staring at the wall above it where there's nothing to stare at yet. When you shift in bed he turns around — slightly startled, like he forgot he has a roommate.\n\nHis side of the room is still sparse. A few things unpacked but nothing on the walls. The box under his bed hasn't moved since move-in day, still taped shut.\n\nHe turns back to the desk. Then, over his shoulder, not quite looking at you:",
      "speaker": "npc_roommate_scott",
      "condition": { "npc_memory": "npc_roommate_scott.played_cool" },
      "next": "entry_absent",
      "micro_choices": [
        {
          "id": "yeah_lets_go",
          "label": "\"Yeah. You want to go?\"",
          "next": "neutral_invited",
          "sets_flag": "scott_engaged"
        },
        {
          "id": "in_a_bit",
          "label": "\"In a bit.\"",
          "next": "neutral_solo",
          "sets_flag": "was_brief"
        }
      ]
    },
    {
      "id": "entry_absent",
      "text": "Scott's bed is made. Made carefully — hospital corners, pillow centered. His side of the room is neat in a way that feels like a statement, every object placed with the precision of someone drawing a border.\n\nHe's not here. His backpack is gone. On his desk, a folded piece of paper. The handwriting is careful, each letter formed separately: \"Gone to breakfast.\"\n\nThe Pretenders tape is on his desk. He's rewound it to the beginning.",
      "micro_choices": [
        {
          "id": "look_at_his_stuff",
          "label": "Look at the photos he hasn't put up yet",
          "next": "absent_looked",
          "sets_flag": "looked_at_stuff"
        },
        {
          "id": "just_leave",
          "label": "Get dressed. Head out.",
          "next": "absent_left",
          "sets_flag": "was_brief"
        }
      ]
    },
    {
      "id": "warm_engaged",
      "text": "\"Hey.\" He brushes cereal dust off his hands. \"How was last night?\"\n\nYou tell him. Not everything — not the part where you stood in the hallway for thirty seconds deciding whether to go back to the room — but the shape of it. Who was there. What the music was like. How weird it is to be surrounded by strangers who are all pretending not to be strangers.\n\nScott listens. Actually listens — not waiting for his turn, not checking the clock. When you finish, he nods.\n\n\"I stayed in. Read for a while. Fell asleep around eleven.\" A pause. \"I should've gone somewhere.\"",
      "speaker": "npc_roommate_scott",
      "micro_choices": [
        {
          "id": "next_time",
          "label": "\"Come next time. I'll knock before I leave.\"",
          "next": "warm_offered",
          "sets_flag": "offered_next_time"
        },
        {
          "id": "its_fine",
          "label": "\"Reading's not bad. Quieter.\"",
          "next": "warm_validated",
          "sets_flag": "validated_staying_in"
        }
      ]
    },
    {
      "id": "warm_brief",
      "text": "He nods. Reaches back into the cereal box.\n\n\"Yeah. Maybe next time.\" He says it the way people say things they half mean. The conversation finds its natural floor and sits there — not awkward, not warm, just two people in a room who haven't figured out the rhythm yet.",
      "next": "choices"
    },
    {
      "id": "warm_offered",
      "text": "Something shifts in his face. Not a smile exactly — more like a muscle relaxing that had been tensed.\n\n\"Yeah. Okay.\" He puts the cereal box on the desk, brushes his hands on his jeans. \"You want to go get real breakfast? The dining hall's supposed to have eggs on Wednesdays.\"",
      "speaker": "npc_roommate_scott",
      "next": "choices"
    },
    {
      "id": "warm_validated",
      "text": "He looks at you for a second like he's deciding whether you mean it.\n\n\"I used to share a room with my brother. He went out every night. I read every night. Worked fine until it didn't.\" He stops himself. Shakes the cereal box — almost empty. \"Anyway. Breakfast?\"",
      "speaker": "npc_roommate_scott",
      "next": "choices"
    },
    {
      "id": "neutral_invited",
      "text": "\"Oh. Hey.\"\n\nHe looks mildly surprised. Like the invitation was possible but not expected.\n\n\"Sure. Give me a minute.\" He closes the textbook — thermodynamics, the cover bent at the corner like he's been carrying it around without a bag. Puts on sneakers without untying them.\n\nYou wait by the door. It's not a long wait but you're aware of it. Two people learning how to leave a room together.",
      "next": "choices"
    },
    {
      "id": "neutral_solo",
      "text": "\"Okay.\" He goes back to the textbook. The page doesn't turn.\n\nYou get dressed. The silence has a texture — not hostile, not comfortable. The texture of two people who share a space but haven't decided what that means.\n\nHe's still at the desk when you pick up your backpack.",
      "next": "choices"
    },
    {
      "id": "absent_looked",
      "text": "You read the note again. The handwriting is careful. \"Gone to breakfast\" — not \"went to breakfast\" or \"at dining hall.\" Gone. Like he wanted you to know he chose to leave.\n\nThe box under his bed is still taped. But on his desk, tucked behind the textbook, a strip of photos from a booth. Scott and a girl — sister maybe, the same chin — making faces in four frames. In the last one they're both laughing at something outside the booth.\n\nHe carried these from Ohio. Hasn't put them up. Hasn't put anything up. You wonder if the room doesn't feel like his yet, or if he doesn't want it to.",
      "next": "choices"
    },
    {
      "id": "absent_left",
      "text": "You get dressed fast. The note sits on his desk. You don't write one back.\n\nThe hallway smells like industrial cleaner and someone else's shampoo. Two doors down, someone's alarm is still going off. Nobody's turning it off.",
      "next": "choices"
    }
  ]$nodes$::jsonb,

  ARRAY['roommate', 'orientation', 'day2'],
  '{}'::jsonb,
  100, true,
  ARRAY[]::text[],

  (SELECT id FROM public.tracks WHERE key = 'roommate'),
  (SELECT id FROM public.tracks WHERE key = 'roommate'),

  'scott_day2_morning', 'scott_day2_morning',

  10, 2, 7,
  NULL, NULL,

  'morning', 0
);

COMMIT;
