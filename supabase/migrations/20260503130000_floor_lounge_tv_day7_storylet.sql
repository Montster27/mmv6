-- floor_lounge_tv_day7 — Beat 2F: "The TV Conversation"
--
-- New pool storylet on the belonging track. Day 7 evening, due_offset_days=7.
-- Racism friction beat: 1983 Beirut barracks bombing on the news; Keith says
-- "those people have been killing each other for two thousand years." The room
-- accepts it without engaging. Mike is in the room, witness.
--
-- Brief: docs/PERIOD-FRICTION-CONTENT-BRIEF.md §"Beat 2F"
-- Prose: docs/PERIOD-FRICTION-PROSE.md §"Day 7, Evening — Beat 2F"
--
-- ─────────────────────────────────────────────────────────────────────
-- Beat structure (player flow)
-- ─────────────────────────────────────────────────────────────────────
--
-- entry: news_segment (TV is on; Doug and Keith on the corduroy couch)
--   → keith_opines (Keith's "those people" line)
--   → room_response (THE FRICTION) — three micro-choices:
--        absorbed   → tv_absorbed  + period_stance absorbed
--        deflected  → tv_deflected + period_stance deflected
--        challenged → tv_challenged + period_stance challenged
--                   + set_npc_memory mike.witnessed_tv_pushback
--                     (third Mike-witness deposit toward Week 3 gate)
--   → news_continues (text_variants on flag)
--   → choices
--
-- terminals:
--   stay_lounge — ConditionalEmissionGroup[]:
--     • flag tv_absorbed   → SHOWED_UP doug 0.5, SMALL_KINDNESS keith 0.3
--     • flag tv_challenged → DEFERRED_TENSION doug 0.5, AWKWARD_MOMENT keith 1.0,
--                            SMALL_KINDNESS mike 1.0
--     • else → []
--   leave_for_room — flat (no friction-conditional events)
--     (Mike memory still fires from micro if player challenged.)
--
-- All NPCs (Doug, Keith, Mike) introduced via dorm_hallmates Day 0.

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
  'floor_lounge_tv_day7',
  'TV in the Lounge',

  $body$The TV in the floor lounge is on — news, then a sitcom, then back to news. Half the floor is in here pretending to study, including Doug and Keith on the corduroy couch.$body$,

  $choices$[
    {
      "id": "stay_lounge",
      "label": "Stay in the lounge. Watch whatever's on.",
      "time_cost": 2,
      "energy_cost": 0,
      "identity_tags": ["people"],
      "precludes": [],
      "events_emitted": [
        {
          "condition": { "flag": "tv_absorbed" },
          "events": [
            { "npc_id": "npc_floor_doug",  "type": "SHOWED_UP",       "magnitude": 0.5 },
            { "npc_id": "npc_floor_keith", "type": "SMALL_KINDNESS",  "magnitude": 0.3 }
          ]
        },
        {
          "condition": { "flag": "tv_challenged" },
          "events": [
            { "npc_id": "npc_floor_doug",  "type": "DEFERRED_TENSION", "magnitude": 0.5 },
            { "npc_id": "npc_floor_keith", "type": "AWKWARD_MOMENT",   "magnitude": 1.0 },
            { "npc_id": "npc_floor_mike",  "type": "SMALL_KINDNESS",   "magnitude": 1.0 }
          ]
        },
        { "condition": { "else": true }, "events": [] }
      ],
      "sets_flag": ["watched_tv_lounge_day7"]
    },
    {
      "id": "leave_for_room",
      "label": "Head back to your room.",
      "time_cost": 1,
      "energy_cost": 0,
      "identity_tags": [],
      "precludes": [],
      "sets_flag": ["left_lounge_early_day7"]
    }
  ]$choices$::jsonb,

  $nodes$[
    {
      "id": "news_segment",
      "text": "The anchor is talking about the marines in Beirut. Footage of a barracks; a number on the screen. Doug and Keith aren't really watching. Keith has a textbook open on his knee but hasn't turned a page in five minutes.",
      "next": "keith_opines"
    },
    {
      "id": "keith_opines",
      "speaker": "npc_floor_keith",
      "text": "\"I don't get why we're even over there.\" He says it like he's commenting on the weather. \"Those people have been killing each other for two thousand years. Always going to. It's just how they are.\"",
      "next": "room_response"
    },
    {
      "id": "room_response",
      "text": "Doug nods. So does the guy in the armchair you don't know. Nobody is pushing back. Nobody is engaging either. It's not a debate. It's wallpaper.",
      "micro_choices": [
        {
          "id": "tv_absorbed",
          "label": "Stare at the screen. Don't say anything.",
          "next": "news_continues",
          "sets_flag": "tv_absorbed",
          "period_stance": "absorbed"
        },
        {
          "id": "tv_deflected",
          "label": "\"Anyone seen what's on Channel 7?\"",
          "next": "news_continues",
          "sets_flag": "tv_deflected",
          "period_stance": "deflected"
        },
        {
          "id": "tv_challenged",
          "label": "\"That's not really how it works.\"",
          "next": "news_continues",
          "sets_flag": "tv_challenged",
          "period_stance": "challenged",
          "set_npc_memory": {
            "npc_floor_mike": { "witnessed_tv_pushback": true }
          }
        }
      ]
    },
    {
      "id": "news_continues",
      "text": "The news goes to commercial. Someone gets up to change the channel.",
      "text_variants": [
        {
          "condition": { "flag": "tv_challenged" },
          "text": "Keith looks at you. Doesn't say anything. Doug shifts on the couch. The room reorganizes around the small thing you said. It doesn't feel like winning."
        },
        {
          "condition": { "flag": "tv_deflected" },
          "text": "Someone takes the bait — turns out Magnum P.I. is on. The channel flips. The conversation moves."
        }
      ],
      "next": "choices"
    }
  ]$nodes$::jsonb,

  ARRAY['arc_one', 'belonging', 'week1', 'beat', 'day7', 'friction', 'racism', 'physical', 'tv'],
  '{}'::jsonb,
  100, true,
  ARRAY[]::text[],
  (SELECT id FROM public.tracks WHERE key = 'belonging'),
  'floor_lounge_tv_day7',
  100, 7, 2,
  NULL,
  'evening', 2
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title, body = EXCLUDED.body, choices = EXCLUDED.choices, nodes = EXCLUDED.nodes,
  tags = EXCLUDED.tags, requirements = EXCLUDED.requirements, weight = EXCLUDED.weight, is_active = EXCLUDED.is_active,
  introduces_npc = EXCLUDED.introduces_npc, track_id = EXCLUDED.track_id, storylet_key = EXCLUDED.storylet_key,
  order_index = EXCLUDED.order_index, due_offset_days = EXCLUDED.due_offset_days, expires_after_days = EXCLUDED.expires_after_days,
  default_next_key = EXCLUDED.default_next_key, segment = EXCLUDED.segment, time_cost_hours = EXCLUDED.time_cost_hours;
