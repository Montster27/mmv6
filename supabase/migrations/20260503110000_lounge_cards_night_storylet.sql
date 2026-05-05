-- lounge_cards_night — Beat 2B: "Peterson's Joke" (+ Phys-A smoke texture)
--
-- New pool storylet on the belonging track. Day 9 evening, due_offset_days=9.
-- Homophobia friction beat: Peterson lands a joke whose punchline depends on
-- the groom being read as gay. Player chooses absorbed | deflected | challenged.
-- Jordan is present in the lounge — present, not playing, hearing it.
--
-- Brief: docs/PERIOD-FRICTION-CONTENT-BRIEF.md §"Beat 2B"
-- Prose: docs/PERIOD-FRICTION-PROSE.md §"Day 9, Evening — Beat 2B"
-- Phys-A smoke: folded into peterson_setup_joke body (see brief §"Phys-A").
--
-- ─────────────────────────────────────────────────────────────────────
-- Beat structure (player flow)
-- ─────────────────────────────────────────────────────────────────────
--
-- entry: settle_in (Peterson greets — text_variant on period_stance challenged ≥1)
--   → peterson_setup_joke (carries the smoke texture: cigarette on Coke can,
--                          ashtray and floor-wax smell of 1983 indoor air)
--   → peterson_lands_joke (THE FRICTION) — three micro-choices:
--        absorbed   → peterson_absorbed  + period_stance absorbed
--        deflected  → peterson_deflected + period_stance deflected
--        challenged → peterson_challenged + period_stance challenged
--                   + set_npc_memory jordan.witnessed_pushback (FIRST persistent
--                                                                Jordan memory)
--        — the challenged label has a label_variant for repeat challengers
--          ("Come on, Peterson." instead of "That joke's old, Peterson.")
--   → jordan_glance (text_variants: flag peterson_challenged → Jordan looks up;
--                    flag peterson_absorbed + cumulative absorbed ≥2 → "the
--                    joke moves through you without catching on anything")
--   → choices
--
-- terminals:
--   stay_play — ConditionalEmissionGroup[]:
--     • flag peterson_absorbed   → SMALL_KINDNESS keith 0.5, SMALL_KINDNESS doug 0.5
--     • flag peterson_deflected  → AWKWARD_MOMENT peterson 0.3
--     • flag peterson_challenged → AWKWARD_MOMENT keith 0.5, DISRESPECT peterson 1.0
--     • else → []
--     (Jordan memory deposited on the micro-choice, fires regardless of terminal.)
--   leave_early — flat (no friction-conditional events)
--     (Jordan memory still fires from the micro-choice if player challenged.)
--
-- Note on Jordan: introduced via Beat 2G (floor_hallway_day6) Day 6, before
-- Beat 2B Day 9. Beat 2B writes memory only.
--
-- Note on the prior_period_stance vs period_stance choice for variants:
-- per session decision 2026-05-04, settle_in's variant uses the cumulative
-- period_stance counter (≥1 challenged) so the variant fires for any player
-- who has shown friction-sensitivity at any point before — durable signal,
-- not walk-local.

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
  'lounge_cards_night',
  'Cards in the Lounge',

  $body$Cards in the lounge. Peterson dealing. Doug and Keith already at the table; an empty chair across from Peterson with your name on it.$body$,

  $choices$[
    {
      "id": "stay_play",
      "label": "Stay. Play the hand out.",
      "time_cost": 2,
      "energy_cost": 1,
      "identity_tags": ["people"],
      "precludes": [],
      "events_emitted": [
        {
          "condition": { "flag": "peterson_absorbed" },
          "events": [
            { "npc_id": "npc_floor_keith",     "type": "SMALL_KINDNESS", "magnitude": 0.5 },
            { "npc_id": "npc_floor_doug",      "type": "SMALL_KINDNESS", "magnitude": 0.5 }
          ]
        },
        {
          "condition": { "flag": "peterson_deflected" },
          "events": [
            { "npc_id": "npc_floor_peterson",  "type": "AWKWARD_MOMENT", "magnitude": 0.3 }
          ]
        },
        {
          "condition": { "flag": "peterson_challenged" },
          "events": [
            { "npc_id": "npc_floor_keith",     "type": "AWKWARD_MOMENT", "magnitude": 0.5 },
            { "npc_id": "npc_floor_peterson",  "type": "DISRESPECT",     "magnitude": 1.0 }
          ]
        },
        { "condition": { "else": true }, "events": [] }
      ],
      "sets_flag": ["peterson_lounge_played"]
    },
    {
      "id": "leave_early",
      "label": "One hand. Then bed.",
      "time_cost": 1,
      "energy_cost": 0,
      "identity_tags": [],
      "precludes": [],
      "sets_flag": ["peterson_lounge_brief"]
    }
  ]$choices$::jsonb,

  $nodes$[
    {
      "id": "settle_in",
      "speaker": "npc_floor_peterson",
      "text": "\"About time. Five-card draw, nickel ante. Don't pretend you don't know how to play.\"",
      "text_variants": [
        {
          "condition": { "period_stance": { "tag": "challenged", "min": 1 } },
          "text": "\"About time.\" Peterson nods at the empty chair without looking up. Keith's already shuffling."
        }
      ],
      "next": "peterson_setup_joke"
    },
    {
      "id": "peterson_setup_joke",
      "speaker": "npc_floor_peterson",
      "text": "He's in the middle of a story when you sit down. Something about his cousin's wedding. Doug is grinning like he knows the punchline. You catch Jordan in the corner — the small couch by the window, a textbook open. Not playing.\n\nPeterson's cigarette is balanced on the rim of an empty Coke can. The room smells like ashtray and floor wax.",
      "next": "peterson_lands_joke"
    },
    {
      "id": "peterson_lands_joke",
      "speaker": "npc_floor_peterson",
      "text": "\"—and so the priest goes, 'son, that's not what we mean by holy matrimony.'\" Peterson lands the punchline. The joke's whole shape depends on the groom being read as gay. Doug barks a laugh. Keith snorts. Peterson looks pleased with himself and starts dealing.",
      "micro_choices": [
        {
          "id": "peterson_absorbed",
          "label": "Laugh. Pick up your cards.",
          "next": "jordan_glance",
          "sets_flag": "peterson_absorbed",
          "period_stance": "absorbed"
        },
        {
          "id": "peterson_deflected",
          "label": "Half-smile. Look at your cards instead.",
          "next": "jordan_glance",
          "sets_flag": "peterson_deflected",
          "period_stance": "deflected"
        },
        {
          "id": "peterson_challenged",
          "label": "\"That joke's old, Peterson.\"",
          "label_variants": [
            {
              "condition": { "period_stance": { "tag": "challenged", "min": 1 } },
              "label": "\"Come on, Peterson.\""
            }
          ],
          "next": "jordan_glance",
          "sets_flag": "peterson_challenged",
          "period_stance": "challenged",
          "set_npc_memory": {
            "npc_ambiguous_jordan": { "witnessed_pushback": true }
          }
        }
      ]
    },
    {
      "id": "jordan_glance",
      "text": "The hand gets dealt. Peterson moves on. The joke is already gone from the room.",
      "text_variants": [
        {
          "condition": { "flag": "peterson_challenged" },
          "text": "The hand gets dealt. Peterson moves on, ribs Doug about something. But Jordan looked up when you said it. Not at Peterson. At you. Then back to his book."
        },
        {
          "condition": { "all_flags": ["peterson_absorbed"], "period_stance": { "tag": "absorbed", "min": 2 } },
          "text": "The hand gets dealt. The joke moves through you without catching on anything. That's the part you notice — that there's nothing left to catch on."
        }
      ],
      "next": "choices"
    }
  ]$nodes$::jsonb,

  ARRAY['arc_one', 'belonging', 'week2', 'beat', 'day9', 'friction', 'homophobia', 'physical', 'smoke'],
  '{}'::jsonb,
  100, true,
  ARRAY[]::text[],
  (SELECT id FROM public.tracks WHERE key = 'belonging'),
  'lounge_cards_night',
  100, 9, 2,
  NULL,
  'evening', 2
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title, body = EXCLUDED.body, choices = EXCLUDED.choices, nodes = EXCLUDED.nodes,
  tags = EXCLUDED.tags, requirements = EXCLUDED.requirements, weight = EXCLUDED.weight, is_active = EXCLUDED.is_active,
  introduces_npc = EXCLUDED.introduces_npc, track_id = EXCLUDED.track_id, storylet_key = EXCLUDED.storylet_key,
  order_index = EXCLUDED.order_index, due_offset_days = EXCLUDED.due_offset_days, expires_after_days = EXCLUDED.expires_after_days,
  default_next_key = EXCLUDED.default_next_key, segment = EXCLUDED.segment, time_cost_hours = EXCLUDED.time_cost_hours;
