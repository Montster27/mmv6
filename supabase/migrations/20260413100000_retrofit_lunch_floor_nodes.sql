-- ============================================================================
-- Retrofit lunch_floor with conversational nodes
-- ============================================================================
-- Adds a node walk (salad-bar joke micro-choice) before the existing terminal
-- choices. One terminal choice (laugh_with_doug) is gated by requires_flag
-- to exercise the walk-flag-aware choice filter.
--
-- The three micro-choice paths:
--   "sided_with_doug" → laugh with Doug (NPC memory: Doug +SMALL_KINDNESS, Keith +AWKWARD_MOMENT)
--   "sided_with_keith" → catch Keith's eye (NPC memory: Keith +SMALL_KINDNESS)
--   "stayed_quiet"    → stay quiet (no NPC effects)
--
-- NPC memory effects are on the micro-choices (tone deposits happen during walk).
-- Terminal choices keep all existing wiring (skill_modifier, practices_skills, etc).
--
-- Terminal gating:
--   laugh_with_doug: requires_flag = "sided_with_doug"
--   catch_keiths_eye: ungated (always available)
--   focus_on_food: ungated (always available)
--
-- Rollback: SET nodes = NULL, remove requires_flag from laugh_with_doug choice.

BEGIN;

-- ── 1. Add nodes to lunch_floor ──────────────────────────────────────────────

UPDATE public.storylets
SET
  body = $body$The dining hall is louder than you expected. Trays on metal rails, silverware on institutional plates, two hundred conversations stacked on top of each other. The food is hot and adequate — steam trays of something that's probably chicken, a salad bar, a bread station, a dessert case with brownies that have been cut into precise squares by someone who cares about geometry more than flavor.

Long tables. No booths, no two-tops. You sit where there's space, which means sitting with people whether you planned to or not.

Trays down. Doug sits across from you. Scott is next to you. Mike and Keith are across, with Mike closest to the wall.$body$,
  nodes = $nodes$[
    {
      "id": "salad_bar_joke",
      "text": "Doug picks up a chicken leg and points it at Keith. \"Keith, you ever seen a salad bar before?\"\n\nKeith doesn't flinch. \"We have salad. We just grow it.\" No edge. He says it the way you'd correct someone about your name — gently, because they didn't mean anything by it.",
      "micro_choices": [
        {
          "id": "laugh_with_doug_micro",
          "label": "Laugh with Doug",
          "next": "after_laugh",
          "sets_flag": "sided_with_doug",
          "set_npc_memory": {
            "npc_floor_doug": { "shared_laugh": true }
          },
          "relational_effect": {
            "npc_floor_doug": { "relationship": 1 }
          }
        },
        {
          "id": "catch_keith_micro",
          "label": "Catch Keith's eye — a look that says 'he doesn't mean it'",
          "next": "after_keith",
          "sets_flag": "sided_with_keith",
          "set_npc_memory": {
            "npc_floor_keith": { "defended_early": true }
          },
          "relational_effect": {
            "npc_floor_keith": { "relationship": 1 }
          }
        },
        {
          "id": "stay_quiet_micro",
          "label": "Focus on your food",
          "next": "after_quiet",
          "sets_flag": "stayed_quiet"
        }
      ]
    },
    {
      "id": "after_laugh",
      "text": "Doug grins — you're in on the joke. Keith doesn't react. He cuts his chicken with a knife and fork while Doug tears his apart with his hands.",
      "next": "evening_pitch"
    },
    {
      "id": "after_keith",
      "text": "Keith sees the look. The smallest nod — not gratitude exactly, more like acknowledgment. He goes back to his food. Doug doesn't notice anything happened.",
      "next": "evening_pitch"
    },
    {
      "id": "after_quiet",
      "text": "You eat. The chicken is fine. The mashed potatoes taste like they were made by a machine that once met a potato. The brownie is better than it looks.",
      "next": "evening_pitch"
    },
    {
      "id": "evening_pitch",
      "text": "Mike finishes chewing, puts his fork down. \"Anyone figure out their schedule yet? I've got Chem 101 at eight AM on Tuesdays.\"\n\n\"Eight AM? That's punishment,\" Doug says.\n\n\"It's the section with Hadley. She's supposed to be good.\" Mike says it like he's already researched every professor.\n\nDoug leans back. \"So tonight. First night, we gotta do something. I heard there's a thing at Anderson Hall — a guy on third floor is throwing a party. Beer, girls from the other dorms.\"\n\n\"There's also some guys on our floor doing cards in the lounge,\" Mike says. \"Quieter.\"\n\nScott: \"Both sound good.\" Of course they do.\n\nThe meal is done. The afternoon opens up. Tonight you'll have to choose.",
      "next": "choices"
    }
  ]$nodes$::jsonb
WHERE storylet_key = 'lunch_floor'
  AND is_active = true;

-- ── 2. Gate laugh_with_doug terminal choice with requires_flag ───────────────
-- Also remove events_emitted from terminal choices (moved to micro-choices).

UPDATE public.storylets
SET choices = (
  SELECT jsonb_agg(
    CASE
      WHEN elem->>'id' = 'laugh_with_doug'
        THEN (elem - 'events_emitted') || '{"requires_flag": "sided_with_doug"}'::jsonb
      WHEN elem->>'id' = 'catch_keiths_eye'
        THEN elem - 'events_emitted'
      ELSE elem
    END
    ORDER BY idx
  )
  FROM jsonb_array_elements(choices::jsonb) WITH ORDINALITY AS t(elem, idx)
)
WHERE storylet_key = 'lunch_floor'
  AND is_active = true;

COMMIT;
