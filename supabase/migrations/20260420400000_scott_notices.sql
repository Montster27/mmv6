-- ================================================================
-- Week 2 Content Brief — Part 3: L2 `scott_notices` (Day 11 evening)
--
-- Roommate-track crystallizer. Scott opens the door or doesn't, based on
-- whether the player has invested in the relationship over the prior 9 days.
-- The flag `scott_noticed_something` (the single most important roommate flag
-- for the 50-year arc) is set here via persistent NPC memory.
--
-- This migration also:
--  1. Retrofits prior Scott storylets' terminal choices to write trust_high /
--     trust_low NPC memory, so scott_notices' entry-node npc_memory conditions
--     have something to branch on.
--  2. Closes the lingering Known Issue #12 residue — four dana_letter_* rows
--     still carried `npc_roommate_dana` inside events_emitted / nodes.speaker
--     because the 2026-04-20 regression fix only replaced capital-D 'Dana'.
--
-- Engine behavior used (all pre-existing):
--  - DialogueNode.condition.npc_memory (format "npc_id.key") — fallthrough
--    ordering means unconditional nodes following conditional nodes act as
--    defaults when earlier npc_memory checks fail.
--  - MicroChoice.set_npc_memory — committed immediately via handleMicroEffects,
--    persisted into daily_states.relationships.
--  - Terminal choice sets_flag[] — persisted as FLAG_SET events in choice_log.
--
-- Idempotent via ON CONFLICT DO UPDATE + conditional jsonb_agg rebuilds.
-- ================================================================

BEGIN;

-- ══════════════════════════════════════════════════════════════════════
-- 1. Close Known Issue #12 residue — npc_roommate_dana → npc_roommate_scott
--    in the four rows that still carried it.
--    Re-runs safely (the LIKE predicate filters already-clean rows).
-- ══════════════════════════════════════════════════════════════════════

UPDATE public.storylets
SET choices = REPLACE(choices::text, 'npc_roommate_dana', 'npc_roommate_scott')::jsonb
WHERE choices::text LIKE '%npc_roommate_dana%';

UPDATE public.storylets
SET nodes = REPLACE(nodes::text, 'npc_roommate_dana', 'npc_roommate_scott')::jsonb
WHERE nodes IS NOT NULL AND nodes::text LIKE '%npc_roommate_dana%';

UPDATE public.storylets
SET body = REPLACE(body, 'npc_roommate_dana', 'npc_roommate_scott')
WHERE body LIKE '%npc_roommate_dana%';

-- ══════════════════════════════════════════════════════════════════════
-- 2. Retrofit trust_high / trust_low NPC memory on prior Scott terminals.
--
-- Model (simplified from brief):
--   trust_high = any meaningful positive engagement with Scott
--     • breakfast_with_scott (Day 2 morning)
--     • dana_connected_end    (Day 9 evening)
--   trust_low  = any meaningful distance / refusal
--     • head_out_alone        (Day 2 morning)
--     • read_note_leave       (Day 2 morning)
--     • dana_surface_end      (Day 9 evening)
--     • dana_avoidance_end    (Day 9 evening)
--
-- If both end up set across the walk, scott_notices' node order picks
-- trust_high first (scott_opens precedes scott_opens_low).
--
-- If neither is set, scott_notices falls through to scott_absent.
-- ══════════════════════════════════════════════════════════════════════

-- scott_day2_morning — three terminals to tag
UPDATE public.storylets
SET choices = (
  SELECT jsonb_agg(
    CASE
      WHEN elem->>'id' = 'breakfast_with_scott'
      THEN elem || '{"set_npc_memory": {"npc_roommate_scott": {"trust_high": true}}}'::jsonb
      WHEN elem->>'id' IN ('head_out_alone', 'read_note_leave')
      THEN elem || '{"set_npc_memory": {"npc_roommate_scott": {"trust_low": true}}}'::jsonb
      ELSE elem
    END
    ORDER BY idx
  )
  FROM jsonb_array_elements(choices) WITH ORDINALITY AS t(elem, idx)
)
WHERE storylet_key = 'scott_day2_morning';

-- dana_letter_connected — single terminal, trust_high
UPDATE public.storylets
SET choices = jsonb_set(
  choices,
  '{0,set_npc_memory}',
  '{"npc_roommate_scott": {"trust_high": true}}'::jsonb
)
WHERE storylet_key = 'dana_letter_connected'
  AND choices->0->>'id' = 'dana_connected_end';

-- dana_letter_surface — single terminal, trust_low
UPDATE public.storylets
SET choices = jsonb_set(
  choices,
  '{0,set_npc_memory}',
  '{"npc_roommate_scott": {"trust_low": true}}'::jsonb
)
WHERE storylet_key = 'dana_letter_surface'
  AND choices->0->>'id' = 'dana_surface_end';

-- dana_letter_avoidance — single terminal, trust_low
UPDATE public.storylets
SET choices = jsonb_set(
  choices,
  '{0,set_npc_memory}',
  '{"npc_roommate_scott": {"trust_low": true}}'::jsonb
)
WHERE storylet_key = 'dana_letter_avoidance'
  AND choices->0->>'id' = 'dana_avoidance_end';


-- ══════════════════════════════════════════════════════════════════════
-- 3. Insert scott_notices.
--
-- Node order matters. scott_opens (trust_high) and scott_opens_low
-- (trust_low) are conditional; scott_absent has no condition and
-- therefore matches unconditionally — engine picks it when both
-- npc_memory checks fail. Downstream nodes (the_question, etc.) are
-- reached via explicit micro_choice.next, not via initial-node scan.
--
-- Persistent memory is written on the MICRO-choices that also set the
-- scene-local flag, so the signal survives beyond the scene:
--   scott_noticed_something → npc_memory noticed_something = true
--   deflected_scott          → npc_memory roommate_avoids  = true
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
  'scott_notices',
  'Room 214',

  $body$The room is dark except for Scott's desk lamp. You can hear someone's stereo through the wall — something with synthesizers, the bass line drifting through cinder block like a pulse. Scott is on his bed, back against the wall, a textbook open on his lap that he stopped reading twenty minutes ago.

You've been at your desk pretending to work. The kind of evening where the room is shared but quiet, two people occupying the same space without needing to fill it. Outside, someone laughs in the hallway and a door closes.

Scott turns a page he hasn't read. Then he stops.$body$,

  $choices$[
    {
      "id": "lights_out_close",
      "label": "Turn off your desk lamp and lie there in the dark",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": ["people", "safety"],
      "precludes": [],
      "sets_flag": ["scott_notices_resolved"],
      "reaction_text": "The ceiling is acoustic tile. You count the holes in one square. You lose count. You start again. The stereo through the wall has stopped. Scott's breathing changes. One of you will be asleep first.",
      "outcome": { "text": "", "deltas": {} },
      "events_emitted": []
    },
    {
      "id": "step_out",
      "label": "Grab your jacket and step into the hallway",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": ["safety"],
      "precludes": [],
      "sets_flag": ["scott_notices_resolved"],
      "reaction_text": "The hallway is bright after the dim room. Fluorescent light and industrial carpet. Someone left a pizza box on the phone shelf. The door to 214 clicks shut behind you.\n\nYou walk. No destination. Just the need to not be in a room where someone is looking at you like they're trying to read a book in a language they almost recognize.",
      "outcome": { "text": "", "deltas": {} },
      "events_emitted": []
    }
  ]$choices$::jsonb,

  $nodes$[
    {
      "id": "scott_opens",
      "text": "\"Can I ask you something weird?\"",
      "speaker": "npc_roommate_scott",
      "condition": { "npc_memory": "npc_roommate_scott.trust_high" },
      "micro_choices": [
        {
          "id": "sure",
          "label": "\"Sure.\"",
          "next": "the_question"
        },
        {
          "id": "depends",
          "label": "\"Depends on how weird.\"",
          "next": "the_question"
        }
      ]
    },
    {
      "id": "scott_opens_low",
      "text": "He glances at you, then back at the ceiling. \"You're kind of a weird dude, you know that?\" He says it like a joke. The delivery is almost right.",
      "speaker": "npc_roommate_scott",
      "condition": { "npc_memory": "npc_roommate_scott.trust_low" },
      "micro_choices": [
        {
          "id": "laugh_low",
          "label": "Laugh. \"Thanks.\"",
          "next": "the_observation_low"
        },
        {
          "id": "wait_low",
          "label": "Wait for whatever comes next.",
          "next": "the_observation_low"
        }
      ]
    },
    {
      "id": "scott_absent",
      "text": "The room is empty. Scott's jacket is gone. His desk light is off. A textbook sits open on his bed, face-down, spine cracking.\n\nYou sit at your desk. The quiet has a different quality when someone else's stuff is here but they're not. His cassettes are stacked by the stereo. A letter from home tucked under the lamp base. A life accumulating in parallel to yours, on the other side of the room.",
      "next": "alone_in_214"
    },
    {
      "id": "the_question",
      "text": "He doesn't look at you. He's talking to the ceiling.\n\n\"You never seem surprised by anything.\" He pauses. \"Like — remember when the fire alarm went off Tuesday? Everyone was freaking out and you just... got your jacket and walked out. Like you knew it was coming.\"\n\nHe turns his head toward you. \"And you knew where the bookstore was. First day. You didn't check the map once.\"",
      "speaker": "npc_roommate_scott",
      "micro_choices": [
        {
          "id": "laugh_off",
          "label": "\"I just pay attention.\"",
          "next": "scott_accepts",
          "sets_flag": "deflected_scott",
          "set_npc_memory": { "npc_roommate_scott": { "roommate_avoids": true } }
        },
        {
          "id": "go_quiet",
          "label": "Go quiet. Let the silence sit.",
          "next": "scott_reads_silence",
          "sets_flag": "scott_noticed_something",
          "set_npc_memory": { "npc_roommate_scott": { "noticed_something": true } }
        },
        {
          "id": "turn_it_back",
          "label": "\"What do you mean?\" — make him say it.",
          "next": "scott_accepts",
          "sets_flag": "scott_noticed_something",
          "set_npc_memory": { "npc_roommate_scott": { "noticed_something": true } }
        },
        {
          "id": "deflect_warm",
          "label": "\"You're the weird one, man.\"",
          "next": "scott_accepts",
          "sets_flag": "deflected_scott_warm"
        }
      ]
    },
    {
      "id": "the_observation_low",
      "text": "\"No, I mean it.\" He's still half-smiling but the smile isn't doing anything. \"You walk around like you've been here before. Like you already know where everything is.\"\n\nHe waits a beat. \"Most freshmen look lost. You don't look lost.\"",
      "speaker": "npc_roommate_scott",
      "micro_choices": [
        {
          "id": "brush_off_low",
          "label": "\"Good sense of direction, I guess.\"",
          "next": "scott_drops_it",
          "sets_flag": "deflected_scott",
          "set_npc_memory": { "npc_roommate_scott": { "roommate_avoids": true } }
        },
        {
          "id": "hold_gaze_low",
          "label": "Hold his gaze. Don't say anything.",
          "next": "scott_files_it",
          "sets_flag": "scott_noticed_something",
          "set_npc_memory": { "npc_roommate_scott": { "noticed_something": true } }
        }
      ]
    },
    {
      "id": "scott_reads_silence",
      "text": "The silence goes on longer than it should. Scott watches you. You can feel him deciding whether to push.\n\nHe doesn't push.\n\n\"Okay,\" he says. He looks back at the ceiling. The stereo through the wall changes tracks. Neither of you moves to fill the space.\n\nBut something has shifted. He asked and you didn't answer, and the not-answering told him more than an answer would have.",
      "next": "choices"
    },
    {
      "id": "scott_accepts",
      "text": "He nods. It's not a satisfied nod — more like the nod you give when you know the real answer isn't coming. \"Yeah. Okay.\"\n\nHe goes back to his textbook. You go back to your desk. The room returns to what it was, almost. The stereo through the wall is between tracks. In the gap, you can hear the hallway — someone on the phone, a door closing.",
      "next": "choices"
    },
    {
      "id": "scott_drops_it",
      "text": "\"Right.\" He picks the textbook back up. The joke energy is gone and nothing replaced it. The room settles back into its two-person quiet.\n\nHe didn't get what he was looking for. He's not sure what he was looking for.",
      "next": "choices"
    },
    {
      "id": "scott_files_it",
      "text": "He holds your look for two seconds. Then three. Then he nods, slowly, and looks away.\n\n\"Alright,\" he says. Not a dismissal. An acknowledgment. He files it wherever he files things he doesn't understand yet.\n\nHe goes back to his textbook. But the room feels different. Not uncomfortable. Just... observed.",
      "next": "choices"
    },
    {
      "id": "alone_in_214",
      "text": "You sit with it for a while. The room when it's just yours. His alarm clock ticking on the nightstand. The poster he taped up — Springsteen, Born in the U.S.A., slightly crooked.\n\nYou don't know where he went. You're not sure if you would have asked.",
      "next": "choices"
    }
  ]$nodes$::jsonb,

  ARRAY['arc_one', 'roommate', 'week2', 'crystallizer', 'frame_bleed'],
  '{}'::jsonb,
  100, true,
  ARRAY[]::text[],
  (SELECT id FROM public.tracks WHERE key = 'roommate'),
  (SELECT id FROM public.tracks WHERE key = 'roommate'),
  'scott_notices', 'scott_notices',
  24, 11, 2,
  NULL, NULL,
  'evening', 2
)
ON CONFLICT (slug) DO UPDATE SET
  title              = EXCLUDED.title,
  body               = EXCLUDED.body,
  choices            = EXCLUDED.choices,
  nodes              = EXCLUDED.nodes,
  tags               = EXCLUDED.tags,
  requirements       = EXCLUDED.requirements,
  weight             = EXCLUDED.weight,
  is_active          = EXCLUDED.is_active,
  introduces_npc     = EXCLUDED.introduces_npc,
  order_index        = EXCLUDED.order_index,
  due_offset_days    = EXCLUDED.due_offset_days,
  expires_after_days = EXCLUDED.expires_after_days,
  default_next_step_key = EXCLUDED.default_next_step_key,
  default_next_key      = EXCLUDED.default_next_key,
  segment            = EXCLUDED.segment,
  time_cost_hours    = EXCLUDED.time_cost_hours;


-- ══════════════════════════════════════════════════════════════════════
-- 4. Verify — residue checks.
-- ══════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  dana_refs integer;
  missing_memory integer;
BEGIN
  SELECT COUNT(*) INTO dana_refs
  FROM public.storylets
  WHERE body LIKE '%npc_roommate_dana%'
     OR choices::text LIKE '%npc_roommate_dana%'
     OR (nodes IS NOT NULL AND nodes::text LIKE '%npc_roommate_dana%');

  IF dana_refs > 0 THEN
    RAISE WARNING 'Still % storylets with npc_roommate_dana references after migration', dana_refs;
  END IF;

  SELECT COUNT(*) INTO missing_memory
  FROM public.storylets
  WHERE storylet_key = 'scott_day2_morning'
    AND NOT (choices::text LIKE '%trust_high%' AND choices::text LIKE '%trust_low%');

  IF missing_memory > 0 THEN
    RAISE WARNING 'scott_day2_morning is missing trust_high or trust_low retrofit';
  END IF;
END $$;

COMMIT;
