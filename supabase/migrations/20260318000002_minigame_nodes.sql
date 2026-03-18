-- Minigame nodes embedded between arc beats in the narrative flow.
-- game_type is a discriminator for which React component the play engine mounts.
-- order_index is numeric (not integer) so nodes can be placed at 1.5 between beats 1 and 2.
-- outcomes has three fixed branches: win, lose, skip.

CREATE TABLE IF NOT EXISTS public.minigame_nodes (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  key               text        NOT NULL UNIQUE,
  title             text        NOT NULL,
  description       text        NOT NULL DEFAULT '',
  game_type         text        NOT NULL DEFAULT 'caps',
  arc_id            uuid        REFERENCES public.arc_definitions(id) ON DELETE SET NULL,
  order_index       numeric     NOT NULL DEFAULT 0,
  due_offset_days   integer     NOT NULL DEFAULT 0,
  trigger_condition jsonb       DEFAULT NULL,
  outcomes          jsonb       NOT NULL DEFAULT '{
    "win":  { "deltas": {}, "next_step_key": null, "reaction_text": "" },
    "lose": { "deltas": {}, "next_step_key": null, "reaction_text": "" },
    "skip": { "deltas": {}, "next_step_key": null, "reaction_text": "" }
  }'::jsonb,
  is_active         boolean     NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS minigame_nodes_arc_id_order
  ON public.minigame_nodes (arc_id, order_index)
  WHERE arc_id IS NOT NULL;

ALTER TABLE public.minigame_nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_minigame_nodes"
  ON public.minigame_nodes
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Seed the caps minigame (already live in play engine, now visible in studio)
INSERT INTO public.minigame_nodes
  (key, title, description, game_type, arc_id, order_index, due_offset_days, outcomes, is_active)
SELECT
  'caps_day1',
  'Caps',
  'Cal has set up a bottle-cap game in Room 214. Three shots, one chance to connect with the floor.',
  'caps',
  d.id,
  1.5,
  0,
  '{
    "win": {
      "deltas": { "stress": -1 },
      "next_step_key": null,
      "reaction_text": "The cap spins off and hits the baseboard. Someone says there it is. Cal nods once."
    },
    "lose": {
      "deltas": { "stress": 1 },
      "next_step_key": null,
      "reaction_text": "The cap skims wide. Three shots, nothing. Good form though, Cal says, which means nothing and also everything."
    },
    "skip": {
      "deltas": {},
      "next_step_key": null,
      "reaction_text": "You lean in the doorway long enough that you are part of it without being in it. That is something."
    }
  }'::jsonb,
  true
FROM public.arc_definitions d
WHERE d.key = 'arc_roommate'
ON CONFLICT (key) DO NOTHING;
