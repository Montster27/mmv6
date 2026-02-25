-- Seed shock storylets from shock arc steps so Studio can edit nodes.

WITH shock_arcs AS (
  SELECT id, key
  FROM public.arc_definitions
  WHERE key IN ('shock_academic', 'shock_social', 'shock_romantic')
),
min_steps AS (
  SELECT arc_id, MIN(order_index) AS min_order
  FROM public.arc_steps
  GROUP BY arc_id
),
source_steps AS (
  SELECT
    steps.arc_id,
    steps.step_key,
    steps.order_index,
    steps.title,
    steps.body,
    steps.options,
    arcs.key AS arc_key,
    mins.min_order
  FROM public.arc_steps AS steps
  JOIN shock_arcs AS arcs ON steps.arc_id = arcs.id
  JOIN min_steps AS mins ON steps.arc_id = mins.arc_id
),
mapped_steps AS (
  SELECT
    arc_id,
    arc_key,
    step_key,
    order_index,
    title,
    body,
    (order_index = min_order) AS is_entry,
    (
      SELECT COALESCE(
        jsonb_agg(
          CASE
            WHEN choice ? 'targetStoryletId' THEN choice
            WHEN choice ? 'next_step_key' THEN
              jsonb_set(choice, '{targetStoryletId}', to_jsonb(choice->>'next_step_key'))
            ELSE choice
          END
        ),
        '[]'::jsonb
      )
      FROM jsonb_array_elements(options) AS choice
    ) AS choices
  FROM source_steps
)
INSERT INTO public.storylets (slug, title, body, choices, tags, is_active)
SELECT
  step_key,
  title,
  body,
  choices,
  array_remove(
    array_remove(
      ARRAY[
        arc_key,
        CASE WHEN is_entry THEN 'entry:' || arc_key ELSE NULL END
      ]::text[],
      NULL
    ),
    NULL
  ),
  true
FROM mapped_steps
WHERE NOT EXISTS (
  SELECT 1
  FROM public.storylets existing
  WHERE existing.slug = mapped_steps.step_key
);
