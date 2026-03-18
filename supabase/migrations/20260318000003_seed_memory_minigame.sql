-- Register the Memory / Wall game in minigame_nodes.
-- Placed at order_index 1.5 in arc_belonging (between dining_first_dinner
-- and floor_meeting) — day 2, after all beats are resolved.

INSERT INTO public.minigame_nodes
  (key, title, description, game_type, arc_id, order_index,
   due_offset_days, outcomes, is_active)
SELECT
  'memory_day2',
  'The Wall',
  'Someone covers the wall and gives you four seconds. Tile-flip memory game — 5 pairs, 10 tiles.',
  'memory',
  d.id,
  1.5,   -- between dining_first_dinner (order 1) and floor_meeting (order 2)
  1,     -- due on day 2 (due_offset_days=1 from arc start)
  '{
    "win": {
      "deltas": { "stress": -1, "resources": { "knowledge": 2 } },
      "next_step_key": null,
      "reaction_text": "You get them all. Miguel says nice."
    },
    "lose": {
      "deltas": { "stress": 1 },
      "next_step_key": null,
      "reaction_text": "The cassette and the socks trip you up at the end."
    },
    "skip": {
      "deltas": {},
      "next_step_key": null,
      "reaction_text": "You watch from the doorway. They get competitive about it eventually."
    }
  }'::jsonb,
  true
FROM public.arc_definitions d
WHERE d.key = 'arc_belonging'
ON CONFLICT (key) DO NOTHING;
