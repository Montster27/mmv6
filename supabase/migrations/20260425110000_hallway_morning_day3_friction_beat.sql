-- hallway_morning_day3 — Beat 2A: "The Hallway Comment"
--
-- First period_stance friction beat in Arc One. Wires Beat 2A from
-- docs/PERIOD-FRICTION-CONTENT-MAP.md into an existing Day 4 morning
-- belonging-track storylet (due_offset_days=3, started_day=1 → fires Day 4).
--
-- This is the integration test that gates merging the period-stance
-- infrastructure branch (commit 6d7d1a9). Exercises every piece of the
-- new infrastructure end-to-end:
--
--   • period_stance micro-choice tagging (challenged | deflected | absorbed)
--   • walk-flag pattern (hallway_challenged | hallway_deflected | hallway_absorbed)
--   • DialogueNode text_variants gated by prior_period_stance (wired
--     for correctness — won't fire in Arc One since this is the first beat)
--   • DialogueNode text_variants gated by walk flags (aftermath prose)
--   • ConditionalEmissionGroup[] events_emitted on the terminal choice
--
-- ─────────────────────────────────────────────────────────────────────
-- Beat structure (player flow)
-- ─────────────────────────────────────────────────────────────────────
--
-- entry: hallway_pass (Doug nods → Keith catches up mid-conversation)
--   ├── lounge_callback (UI-conditional on lounge_day2) → hallway_comment
--   └── just_nod (always shown) → hallway_comment
--
-- hallway_comment (THE FRICTION) — Keith says "that was so gay" about a
-- movie. Mike is at his door, half-turned. text_variants on
-- prior_period_stance (Arc Two+ only).
--   ├── challenge → friction_response, sets hallway_challenged + period_stance challenged
--   ├── deflect   → friction_response, sets hallway_deflected + period_stance deflected
--   └── absorb    → friction_response, sets hallway_absorbed + period_stance absorbed
--
-- friction_response — aftermath prose, text_variants on the walk flag
-- the player just set.
--   └── continue → choices
--
-- terminal: head_to_class_day3 — events_emitted is a ConditionalEmissionGroup[]:
--   • flag hallway_challenged → Keith AWKWARD_MOMENT 1 (trust −0.5),
--                               Doug DEFERRED_TENSION 1 (reliability −0.5),
--                               Mike SMALL_KINDNESS 1 (trust +0.5, reliability +0.5)
--   • flag hallway_deflected  → Doug AWKWARD_MOMENT 0.5 (trust −0.25)
--   • flag hallway_absorbed   → no events (absorption tracked via period_stance only)
--   • else                    → no events
--
-- ─────────────────────────────────────────────────────────────────────
-- Event-type mapping note (relationships.ts taxonomy)
-- ─────────────────────────────────────────────────────────────────────
--
-- The relationship engine only knows the named event types in
-- src/lib/relationships.ts (RelationshipEventType union). Mapping the
-- brief's deltas to that taxonomy:
--
--   Keith trust −0.5      → AWKWARD_MOMENT magnitude 1
--   Doug reliability −0.5 → DEFERRED_TENSION magnitude 1
--   Doug trust −0.25      → AWKWARD_MOMENT magnitude 0.5
--   Mike trust +0.5       → SMALL_KINDNESS magnitude 1 (also gives reliability +0.5
--                           as a side-effect; this is fine narratively — Mike
--                           "showed up" as a quiet ally, reliability bump fits.)
--
-- ─────────────────────────────────────────────────────────────────────
-- NPCs in this beat
-- ─────────────────────────────────────────────────────────────────────
--
-- All three (Doug, Keith, Mike) were introduced via dorm_hallmates on Day 0,
-- so no introduces_npc updates needed here. Names appear plainly.
-- npc_floor_mike is not in ALL_YEAR_ONE_NPCS in src/lib/relationships.ts;
-- applyRelationshipEvents creates default state on first event, so this is
-- safe but worth noting if a future audit cares.

BEGIN;

UPDATE public.storylets
SET
  nodes = $nodes$[
    {
      "id": "hallway_pass",
      "text": "Doug comes out of his room pulling a t-shirt over his head. He sees you and does the chin-nod — the one that means acknowledgment without commitment. The hallway is wide enough for two people but Doug still turns sideways, a habit from somewhere smaller.\n\nFootsteps behind him. Keith catches up, pulling on a flannel, talking already, mid-conversation about a movie they saw on Saturday.",
      "micro_choices": [
        {
          "id": "lounge_callback",
          "next": "hallway_comment",
          "label": "\"Hey. Good time last night.\"",
          "condition": {"requires_flag": "lounge_day2"}
        },
        {
          "id": "just_nod",
          "next": "hallway_comment",
          "label": "Nod back. Keep walking."
        }
      ]
    },
    {
      "id": "hallway_comment",
      "text": "\"...and then the part with the spaceship — that was so gay,\" Keith says. He says it the way people say \"that's wild\" or \"that was awful.\" Casual. Unconscious. Doug laughs.\n\nMike is at his door, key still in the lock, half-turned. He's heard. He doesn't move. The hallway holds for a second.",
      "text_variants": [
        {
          "condition": { "prior_period_stance": "challenged" },
          "text": "\"...and then the part with the spaceship — that was so gay,\" Keith says. Same word. You've heard him use it twice already this week. Doug laughs the way he laughed before.\n\nMike is at his door, key still in the lock. He's looking at you now, not at Keith. He's heard you each of the last two times. He's waiting."
        },
        {
          "condition": { "prior_period_stance": "absorbed" },
          "text": "\"...and then the part with the spaceship — that was so gay,\" Keith says. Doug laughs. Same hallway. Same word. Same shape of you not saying anything before.\n\nMike is at his door, key still in the lock. He doesn't look up."
        },
        {
          "condition": { "prior_period_stance": "deflected" },
          "text": "\"...and then the part with the spaceship — that was so gay,\" Keith says. Doug laughs. Last time you changed the subject. Keith never noticed. Doug never noticed. It just happened and then didn't.\n\nMike is at his door, key still in the lock, watching the wall."
        }
      ],
      "micro_choices": [
        {
          "id": "challenge",
          "label": "\"Maybe pick a different word.\"",
          "next": "friction_response",
          "sets_flag": "hallway_challenged",
          "period_stance": "challenged"
        },
        {
          "id": "deflect",
          "label": "\"Hey — what'd you think of the third act?\"",
          "next": "friction_response",
          "sets_flag": "hallway_deflected",
          "period_stance": "deflected"
        },
        {
          "id": "absorb",
          "label": "Laugh. Keep walking.",
          "next": "friction_response",
          "sets_flag": "hallway_absorbed",
          "period_stance": "absorbed"
        }
      ]
    },
    {
      "id": "friction_response",
      "text": "The hallway resumes its noise. Doors. A shower somewhere. The bulletin board's volleyball sign-up still has nobody on it.",
      "text_variants": [
        {
          "condition": { "flag": "hallway_challenged" },
          "text": "Keith blinks. \"What — really?\" Doug glances at him, then at you. The conversation finds nowhere to go. Mike's key turns slowly. He looks at you for a beat — half a second longer than he needed to — and goes inside."
        },
        {
          "condition": { "flag": "hallway_deflected" },
          "text": "Doug picks up the third-act question. Keith goes along, half-distracted, the original word already half-forgotten. Mike's key turns. He's not in your line of sight when you look back."
        },
        {
          "condition": { "flag": "hallway_absorbed" },
          "text": "Keith laughs back. The conversation rolls forward, Doug claps you on the shoulder as he passes. Mike's door is already closed when you turn."
        }
      ],
      "micro_choices": [
        {
          "id": "continue_resp",
          "label": "Continue",
          "next": "choices"
        }
      ]
    }
  ]$nodes$::jsonb,

  choices = $choices$[
    {
      "id": "head_to_class_day3",
      "label": "Head to class",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": [],
      "reaction_text": "You take the stairs two at a time. The morning air outside is cooler than you expected — September pretending it's still August but not quite pulling it off.",
      "events_emitted": [
        {
          "condition": { "flag": "hallway_challenged" },
          "events": [
            { "npc_id": "npc_floor_keith", "type": "AWKWARD_MOMENT", "magnitude": 1 },
            { "npc_id": "npc_floor_doug",  "type": "DEFERRED_TENSION", "magnitude": 1 },
            { "npc_id": "npc_floor_mike",  "type": "SMALL_KINDNESS",   "magnitude": 1 }
          ]
        },
        {
          "condition": { "flag": "hallway_deflected" },
          "events": [
            { "npc_id": "npc_floor_doug", "type": "AWKWARD_MOMENT", "magnitude": 0.5 }
          ]
        },
        {
          "condition": { "flag": "hallway_absorbed" },
          "events": []
        },
        {
          "condition": { "else": true },
          "events": []
        }
      ],
      "precludes": []
    }
  ]$choices$::jsonb
WHERE storylet_key = 'hallway_morning_day3'
  AND is_active = true;

-- Verification (run after migration to confirm the JSONB structure):
--
--   SELECT jsonb_pretty(nodes) FROM public.storylets WHERE storylet_key = 'hallway_morning_day3';
--   SELECT jsonb_pretty(choices) FROM public.storylets WHERE storylet_key = 'hallway_morning_day3';
--
-- The choices array should have one entry (head_to_class_day3) with
-- events_emitted containing 4 ConditionalEmissionGroups (one per friction
-- flag + an else group). The nodes array should have 3 entries
-- (hallway_pass, hallway_comment with prior_period_stance text_variants,
-- friction_response with walk-flag text_variants).

COMMIT;
