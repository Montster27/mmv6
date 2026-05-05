-- floor_hallway_day6 — Beat 2G: "Jordan in the Hallway"
--
-- New texture storylet on the belonging track. Day 6 evening, due_offset_days=6,
-- expires_after_days=0 (single-day window — the 0h interstitial is texture-only,
-- doesn't need a leakage day; tighter window prevents pool collision with
-- pay_phone_line on the home track when both fall in the global 2-slot cap).
-- Canonical introduction of Jordan (npc_ambiguous_jordan). 30-second hallway
-- encounter — no homophobia content, no friction beat. Two physical details:
-- Jordan's door is the only one without a name on it; Jordan never has anyone
-- in the room with him. Player can't act. It's texture.
--
-- Brief: docs/PERIOD-FRICTION-CONTENT-BRIEF.md §"Beat 2G"
-- Prose: docs/PERIOD-FRICTION-PROSE.md §"Day 6, Evening — Beat 2G"
--
-- Per session decision 2026-05-03 (open question #5 of source map):
-- Jordan = closeted queer in 1983. Established quietly, never named in Arc One.
-- Brief seeds recognition that he exists. Jordan crystallizer is Week 3+ ticket.
--
-- ─────────────────────────────────────────────────────────────────────
-- Beat structure (player flow)
-- ─────────────────────────────────────────────────────────────────────
--
-- entry: hallway_walk (217 → 219 → 221 — passing rooms)
--   → pass_jordan_room (Jordan at desk, headphones, looks up, nods, back to page)
--   → hallway_observation (the noticing — text_variant on period_stance
--                          challenged ≥ 2 deepens the register: "you file it
--                          away with the other things you've been filing away")
--   → choices
--
-- terminals (both 0h, both write the same flags — texture beat, the noticing
-- IS the content, not the action):
--   keep_walking → flags noticed_jordan_room + jordan_thread_seeded
--   turn_back    → flags noticed_jordan_room + jordan_thread_seeded
--
-- introduces_npc on the storylet: ["npc_ambiguous_jordan"]. Per
-- src/types/storylets.ts:253, all listed NPCs auto-marked met when ANY terminal
-- choice resolves. Beat 2B (Day 9) deposits jordan.witnessed_pushback memory
-- on an already-introduced NPC.
--
-- Engine note: time_cost: 0 on terminals is accepted by selectTrackStorylets
-- (no time_cost gating in the pool scan; precedent in
-- 20260425110000_hallway_morning_day3_friction_beat.sql). Beat 2G fires as
-- a free interstitial during Day 6 evening alongside other content.

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
  'floor_hallway_day6',
  'Down the Hallway',

  $body$You're heading down the hallway to the bathroom. The lights are the bad fluorescent kind, half the doors are open with music coming out, and someone is heating something in the microwave at the far end.$body$,

  $choices$[
    {
      "id": "keep_walking",
      "label": "Keep going. The bathroom is at the end of the hall.",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": [],
      "precludes": [],
      "sets_flag": ["noticed_jordan_room", "jordan_thread_seeded"]
    },
    {
      "id": "turn_back",
      "label": "Turn around. Go back to your room.",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": [],
      "precludes": [],
      "sets_flag": ["noticed_jordan_room", "jordan_thread_seeded"]
    }
  ]$choices$::jsonb,

  $nodes$[
    {
      "id": "hallway_walk",
      "text": "You pass 217 — Doug and Keith's room — door propped open, Springsteen on the stereo, four guys inside. You pass 219 — empty, light off. You pass 221.",
      "next": "pass_jordan_room"
    },
    {
      "id": "pass_jordan_room",
      "text": "221 is Jordan's room. Door open six inches. Nobody else inside. Jordan is at his desk, headphones on, a textbook spread under a goose-neck lamp. Looks up as you pass. Nods. Goes back to the page.",
      "next": "hallway_observation"
    },
    {
      "id": "hallway_observation",
      "text": "You keep walking. It hits you halfway down the hall: Jordan's door is the only one without a name on it. Every other door has a card or a strip of masking tape. You don't know if you've ever seen anyone in his room.",
      "text_variants": [
        {
          "condition": { "period_stance": { "tag": "challenged", "min": 2 } },
          "text": "You keep walking. Jordan's door is the only one without a name on it. You file it away with the other things you've been filing away — the silence in the lounge when Peterson told that joke; the way Jordan was already up and gone the next morning. Pieces of something you don't have a frame for yet."
        }
      ],
      "next": "choices"
    }
  ]$nodes$::jsonb,

  ARRAY['arc_one', 'belonging', 'week1', 'texture', 'day6', 'jordan', 'introduces'],
  '{}'::jsonb,
  100, true,
  ARRAY['npc_ambiguous_jordan']::text[],
  (SELECT id FROM public.tracks WHERE key = 'belonging'),
  'floor_hallway_day6',
  100, 6, 0,
  NULL,
  'evening', 0
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title, body = EXCLUDED.body, choices = EXCLUDED.choices, nodes = EXCLUDED.nodes,
  tags = EXCLUDED.tags, requirements = EXCLUDED.requirements, weight = EXCLUDED.weight, is_active = EXCLUDED.is_active,
  introduces_npc = EXCLUDED.introduces_npc, track_id = EXCLUDED.track_id, storylet_key = EXCLUDED.storylet_key,
  order_index = EXCLUDED.order_index, due_offset_days = EXCLUDED.due_offset_days, expires_after_days = EXCLUDED.expires_after_days,
  default_next_key = EXCLUDED.default_next_key, segment = EXCLUDED.segment, time_cost_hours = EXCLUDED.time_cost_hours;
