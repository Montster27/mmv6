-- Seed shock arcs from existing arc content (academic/social/romantic).

-- Shock Academic (from arc_academic_shock)
WITH source AS (
  SELECT title, description, tags, is_enabled
  FROM public.arc_definitions
  WHERE key = 'arc_academic_shock'
),
seed AS (
  SELECT
    COALESCE(source.title, 'Shock: Academic') AS title,
    COALESCE(
      source.description,
      'Academic pressure lands early. Decide how you respond.'
    ) AS description,
    COALESCE(source.tags, ARRAY['Craft', 'Agency']::text[]) AS tags,
    COALESCE(source.is_enabled, true) AS is_enabled
  FROM source
  UNION ALL
  SELECT
    'Shock: Academic',
    'Academic pressure lands early. Decide how you respond.',
    ARRAY['Craft', 'Agency']::text[],
    true
  WHERE NOT EXISTS (SELECT 1 FROM source)
  LIMIT 1
),
inserted AS (
  INSERT INTO public.arc_definitions (key, title, description, tags, is_enabled)
  SELECT 'shock_academic', seed.title, seed.description, seed.tags, seed.is_enabled
  FROM seed
  WHERE NOT EXISTS (SELECT 1 FROM public.arc_definitions WHERE key = 'shock_academic')
  RETURNING id
),
arc_id AS (
  SELECT id FROM public.arc_definitions WHERE key = 'shock_academic'
  UNION ALL
  SELECT id FROM inserted
  LIMIT 1
),
source_arc AS (
  SELECT id FROM public.arc_definitions WHERE key = 'arc_academic_shock'
)
INSERT INTO public.arc_steps (
  arc_id,
  step_key,
  order_index,
  title,
  body,
  options,
  default_next_step_key,
  due_offset_days,
  expires_after_days
)
SELECT
  arc_id.id,
  steps.step_key,
  steps.order_index,
  steps.title,
  steps.body,
  steps.options,
  steps.default_next_step_key,
  steps.due_offset_days,
  steps.expires_after_days
FROM public.arc_steps AS steps
JOIN source_arc ON steps.arc_id = source_arc.id
JOIN arc_id ON true
WHERE NOT EXISTS (
  SELECT 1
  FROM public.arc_steps existing
  WHERE existing.arc_id = arc_id.id AND existing.step_key = steps.step_key
);

-- Shock Social (from arc_find_your_people)
WITH source AS (
  SELECT title, description, tags, is_enabled
  FROM public.arc_definitions
  WHERE key = 'arc_find_your_people'
),
seed AS (
  SELECT
    COALESCE(source.title, 'Shock: Social') AS title,
    COALESCE(
      source.description,
      'You choose how to approach a new social circle.'
    ) AS description,
    COALESCE(source.tags, ARRAY['Belonging', 'Courage']::text[]) AS tags,
    COALESCE(source.is_enabled, true) AS is_enabled
  FROM source
  UNION ALL
  SELECT
    'Shock: Social',
    'You choose how to approach a new social circle.',
    ARRAY['Belonging', 'Courage']::text[],
    true
  WHERE NOT EXISTS (SELECT 1 FROM source)
  LIMIT 1
),
inserted AS (
  INSERT INTO public.arc_definitions (key, title, description, tags, is_enabled)
  SELECT 'shock_social', seed.title, seed.description, seed.tags, seed.is_enabled
  FROM seed
  WHERE NOT EXISTS (SELECT 1 FROM public.arc_definitions WHERE key = 'shock_social')
  RETURNING id
),
arc_id AS (
  SELECT id FROM public.arc_definitions WHERE key = 'shock_social'
  UNION ALL
  SELECT id FROM inserted
  LIMIT 1
),
source_arc AS (
  SELECT id FROM public.arc_definitions WHERE key = 'arc_find_your_people'
)
INSERT INTO public.arc_steps (
  arc_id,
  step_key,
  order_index,
  title,
  body,
  options,
  default_next_step_key,
  due_offset_days,
  expires_after_days
)
SELECT
  arc_id.id,
  steps.step_key,
  steps.order_index,
  steps.title,
  steps.body,
  steps.options,
  steps.default_next_step_key,
  steps.due_offset_days,
  steps.expires_after_days
FROM public.arc_steps AS steps
JOIN source_arc ON steps.arc_id = source_arc.id
JOIN arc_id ON true
WHERE NOT EXISTS (
  SELECT 1
  FROM public.arc_steps existing
  WHERE existing.arc_id = arc_id.id AND existing.step_key = steps.step_key
);

-- Shock Romantic (from arc_romantic_risk)
WITH source AS (
  SELECT title, description, tags, is_enabled
  FROM public.arc_definitions
  WHERE key = 'arc_romantic_risk'
),
seed AS (
  SELECT
    COALESCE(source.title, 'Shock: Romantic') AS title,
    COALESCE(
      source.description,
      'A small connection tests whether you risk closeness.'
    ) AS description,
    COALESCE(source.tags, ARRAY['Love', 'Courage', 'Belonging']::text[]) AS tags,
    COALESCE(source.is_enabled, true) AS is_enabled
  FROM source
  UNION ALL
  SELECT
    'Shock: Romantic',
    'A small connection tests whether you risk closeness.',
    ARRAY['Love', 'Courage', 'Belonging']::text[],
    true
  WHERE NOT EXISTS (SELECT 1 FROM source)
  LIMIT 1
),
inserted AS (
  INSERT INTO public.arc_definitions (key, title, description, tags, is_enabled)
  SELECT 'shock_romantic', seed.title, seed.description, seed.tags, seed.is_enabled
  FROM seed
  WHERE NOT EXISTS (SELECT 1 FROM public.arc_definitions WHERE key = 'shock_romantic')
  RETURNING id
),
arc_id AS (
  SELECT id FROM public.arc_definitions WHERE key = 'shock_romantic'
  UNION ALL
  SELECT id FROM inserted
  LIMIT 1
),
source_arc AS (
  SELECT id FROM public.arc_definitions WHERE key = 'arc_romantic_risk'
)
INSERT INTO public.arc_steps (
  arc_id,
  step_key,
  order_index,
  title,
  body,
  options,
  default_next_step_key,
  due_offset_days,
  expires_after_days
)
SELECT
  arc_id.id,
  steps.step_key,
  steps.order_index,
  steps.title,
  steps.body,
  steps.options,
  steps.default_next_step_key,
  steps.due_offset_days,
  steps.expires_after_days
FROM public.arc_steps AS steps
JOIN source_arc ON steps.arc_id = source_arc.id
JOIN arc_id ON true
WHERE NOT EXISTS (
  SELECT 1
  FROM public.arc_steps existing
  WHERE existing.arc_id = arc_id.id AND existing.step_key = steps.step_key
);
