-- walk_to_class_day4 — Beat 2C: "The Quad Walk"
--
-- New pool storylet on the belonging track. Day 4 morning, due_offset_days=4.
-- Misogyny friction beat: Doug + Keith walking to class evaluate three women
-- crossing the quad. Player chooses absorbed | deflected | challenged.
--
-- Brief: docs/PERIOD-FRICTION-CONTENT-BRIEF.md §"Beat 2C"
-- Prose: docs/PERIOD-FRICTION-PROSE.md §"Day 4, Morning — Beat 2C"
-- Precedent template: 20260425110000_hallway_morning_day3_friction_beat.sql
--
-- ─────────────────────────────────────────────────────────────────────
-- Beat structure (player flow)
-- ─────────────────────────────────────────────────────────────────────
--
-- entry: leave_dorm   (text-only scene-setting; auto-advances)
--   → women_pass     (Doug evaluates; Keith picks one and gives a number)
--   → she_glances   (THE FRICTION) — three micro-choices:
--        absorbed    → quad_absorbed  + period_stance absorbed
--                   + set_npc_memory priya.gate_misogyny_witnessed (closes Priya gate)
--        deflected   → quad_deflected + period_stance deflected
--        challenged  → quad_challenged + period_stance challenged
--   → walk_continues (text_variants on flag)
--   → choices
--
-- terminals:
--   walk_in_with_them — events_emitted as ConditionalEmissionGroup[]:
--     • flag quad_absorbed   → SMALL_KINDNESS keith 0.5, SHOWED_UP doug 0.5
--     • flag quad_deflected  → []
--     • flag quad_challenged → DEFERRED_TENSION doug 0.5, AWKWARD_MOMENT keith 1.0
--     • else                 → []
--   peel_off — flat (no friction-conditional fallout)
--
-- Doug, Keith already introduced via dorm_hallmates (Day 0). Priya memory
-- written on absorbed via micro-choice set_npc_memory (engine writes to
-- daily_states.npc_memory at micro-selection time per harness.ts:555-570).

BEGIN;

INSERT INTO public.storylets (
  slug, title, body,
  choices, nodes,
  tags, requirements, weight, is_active,
  introduces_npc,
  track_id,
  storylet_key,
  order_index, due_offset_days, expires_after_days,
  default_next_key,
  segment, time_cost_hours
)
VALUES (
  'walk_to_class_day4',
  'The Quad Walk',

  $body$Doug catches you in the hall. He and Keith are walking to Western Civ; same building as your morning class. You fall in.$body$,

  $choices$[
    {
      "id": "walk_in_with_them",
      "label": "Walk into the building together.",
      "time_cost": 1,
      "energy_cost": 0,
      "identity_tags": [],
      "precludes": [],
      "events_emitted": [
        {
          "condition": { "flag": "quad_absorbed" },
          "events": [
            { "npc_id": "npc_floor_keith", "type": "SMALL_KINDNESS",   "magnitude": 0.5 },
            { "npc_id": "npc_floor_doug",  "type": "SHOWED_UP",        "magnitude": 0.5 }
          ]
        },
        {
          "condition": { "flag": "quad_deflected" },
          "events": []
        },
        {
          "condition": { "flag": "quad_challenged" },
          "events": [
            { "npc_id": "npc_floor_doug",  "type": "DEFERRED_TENSION", "magnitude": 0.5 },
            { "npc_id": "npc_floor_keith", "type": "AWKWARD_MOMENT",   "magnitude": 1.0 }
          ]
        },
        {
          "condition": { "else": true },
          "events": []
        }
      ],
      "sets_flag": ["walked_with_floor_day4"]
    },
    {
      "id": "peel_off",
      "label": "Peel off at the entrance. You forgot something.",
      "time_cost": 1,
      "energy_cost": 0,
      "identity_tags": [],
      "precludes": [],
      "sets_flag": ["alone_after_quad"]
    }
  ]$choices$::jsonb,

  $nodes$[
    {
      "id": "leave_dorm",
      "text": "Outside is brighter than you expected. The grass on the quad is still wet — sprinklers ran early. A handful of students cutting across, paper schedules tucked under arms. Keith is talking about his weekend.",
      "next": "women_pass"
    },
    {
      "id": "women_pass",
      "speaker": "npc_floor_doug",
      "text": "A group of three women — sophomores, probably — cuts across the quad heading the other direction. Doug nudges you with his elbow. \"Check it out.\" He says something about the one in the middle. Not crude exactly. Evaluative. Like she's a thing to assess. Keith picks one and gives her a number.",
      "next": "she_glances"
    },
    {
      "id": "she_glances",
      "text": "The middle one glances back. She heard. Her expression doesn't change. She keeps walking.",
      "micro_choices": [
        {
          "id": "quad_absorbed",
          "label": "Look where they're looking. Shrug.",
          "next": "walk_continues",
          "sets_flag": "quad_absorbed",
          "period_stance": "absorbed",
          "set_npc_memory": {
            "npc_studious_priya": { "gate_misogyny_witnessed": true }
          }
        },
        {
          "id": "quad_deflected",
          "label": "Don't engage. Keep walking.",
          "next": "walk_continues",
          "sets_flag": "quad_deflected",
          "period_stance": "deflected"
        },
        {
          "id": "quad_challenged",
          "label": "\"Come on, man.\"",
          "next": "walk_continues",
          "sets_flag": "quad_challenged",
          "period_stance": "challenged"
        }
      ]
    },
    {
      "id": "walk_continues",
      "text": "The conversation moves on. Keith starts in on the football team's weekend. The building is up ahead.",
      "text_variants": [
        {
          "condition": { "flag": "quad_challenged" },
          "text": "Doug glances at you. Doesn't say anything. Keith does — short and confused. \"What's your problem?\" Then he answers his own question by changing the subject. The building is up ahead."
        },
        {
          "condition": { "flag": "quad_deflected" },
          "text": "Doug and Keith keep going for another minute. You're a half-step behind them by the time you reach the building."
        }
      ],
      "next": "choices"
    }
  ]$nodes$::jsonb,

  ARRAY['arc_one', 'belonging', 'week1', 'beat', 'day4', 'friction', 'misogyny'],
  '{}'::jsonb,
  100, true,
  ARRAY[]::text[],
  (SELECT id FROM public.tracks WHERE key = 'belonging'),
  'walk_to_class_day4',
  100, 4, 2,
  NULL,
  'morning', 1
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  body = EXCLUDED.body,
  choices = EXCLUDED.choices,
  nodes = EXCLUDED.nodes,
  tags = EXCLUDED.tags,
  requirements = EXCLUDED.requirements,
  weight = EXCLUDED.weight,
  is_active = EXCLUDED.is_active,
  introduces_npc = EXCLUDED.introduces_npc,
  track_id = EXCLUDED.track_id,
  storylet_key = EXCLUDED.storylet_key,
  order_index = EXCLUDED.order_index,
  due_offset_days = EXCLUDED.due_offset_days,
  expires_after_days = EXCLUDED.expires_after_days,
  default_next_key = EXCLUDED.default_next_key,
  segment = EXCLUDED.segment,
  time_cost_hours = EXCLUDED.time_cost_hours;

COMMIT;
