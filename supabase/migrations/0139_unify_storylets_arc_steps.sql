-- 0139_unify_storylets_arc_steps.sql
-- Unify arc steps into the storylets table.
-- Arc steps are now storylets with arc membership fields set.

-- ── 1. Add arc membership columns to storylets ────────────────────────────────

ALTER TABLE public.storylets
  ADD COLUMN IF NOT EXISTS arc_id         uuid        REFERENCES public.arc_definitions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS step_key       text,
  ADD COLUMN IF NOT EXISTS order_index    integer,
  ADD COLUMN IF NOT EXISTS due_offset_days     integer,
  ADD COLUMN IF NOT EXISTS expires_after_days  integer,
  ADD COLUMN IF NOT EXISTS default_next_step_key text;

-- Unique step_key within an arc (only enforced when arc_id is not null)
CREATE UNIQUE INDEX IF NOT EXISTS storylets_arc_id_step_key_unique
  ON public.storylets (arc_id, step_key)
  WHERE arc_id IS NOT NULL;

-- Fast lookup: all steps for a given arc, ordered
CREATE INDEX IF NOT EXISTS storylets_arc_id_order_index
  ON public.storylets (arc_id, order_index)
  WHERE arc_id IS NOT NULL;

-- ── 2. Migrate arc_steps rows → storylets ─────────────────────────────────────

INSERT INTO public.storylets (
  id,
  slug,
  title,
  body,
  choices,
  is_active,
  tags,
  requirements,
  weight,
  arc_id,
  step_key,
  order_index,
  due_offset_days,
  expires_after_days,
  default_next_step_key,
  created_at
)
SELECT
  s.id,
  -- generate a slug from arc key + step_key (arc_definitions.key may not be available
  -- without a join, so we use arc_id::text + step_key as fallback)
  LOWER(REPLACE(COALESCE(d.key, s.arc_id::text) || '_' || s.step_key, '-', '_')) AS slug,
  s.title,
  s.body,
  -- arc steps store options; remap to choices with id = option_key for unified shape
  COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id',            opt->>'option_key',
          'label',         opt->>'label',
          'time_cost',     opt->'time_cost',
          'energy_cost',   opt->'energy_cost',
          'reaction_text', opt->'reaction_text',
          'next_step_key', opt->'next_step_key',
          'costs',         opt->'costs',
          'rewards',       opt->'rewards',
          'sets_stream_state',       opt->'sets_stream_state',
          'sets_expired_opportunity', opt->'sets_expired_opportunity',
          'money_effect',            opt->'money_effect',
          'money_requirement',       opt->'money_requirement',
          'outcome_type',            opt->'outcome_type',
          'identity_tags',           opt->'identity_tags',
          'skill_requirement',       opt->'skill_requirement',
          'skill_modifier',          opt->'skill_modifier',
          'relational_effects',      opt->'relational_effects'
        )
      )
      FROM jsonb_array_elements(s.options) AS opt
      WHERE opt->>'option_key' IS NOT NULL
    ),
    '[]'::jsonb
  ) AS choices,
  TRUE AS is_active,
  '[]'::jsonb AS tags,
  '{}'::jsonb AS requirements,
  1 AS weight,
  s.arc_id,
  s.step_key,
  s.order_index,
  s.due_offset_days,
  s.expires_after_days,
  s.default_next_step_key,
  s.created_at
FROM public.arc_steps s
LEFT JOIN public.arc_definitions d ON d.id = s.arc_id
ON CONFLICT (id) DO NOTHING;

-- ── 3. Update arc_instances to reference storylets (no schema change needed) ──
-- arc_instances.current_step_key already stores the step_key string.
-- The play engine will now look up storylets WHERE arc_id = ? AND step_key = ?
-- instead of arc_steps. No column migration required.

-- ── 4. Deprecate arc_steps (keep for rollback; drop in a future migration) ───
-- We intentionally do NOT drop arc_steps here so that rollback is safe.
-- The table will be dropped in a follow-up migration after verification.
-- To disable arc_steps writes, the admin API routes are updated to use storylets.

COMMENT ON TABLE public.arc_steps IS 'DEPRECATED: data migrated to storylets (0139). Do not write new rows. Will be dropped after verification.';
