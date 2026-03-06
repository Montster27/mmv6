-- Migration 0125: Wire Day 1 s4 preclusion chains
--
-- Per the Design Bible's Day 1 worked example:
-- - Choosing the bookstore (s4) permanently closes the job table path
-- - Choosing the job table permanently closes the Marcus/bookstore cluster
--
-- We add requires_not_precluded to s17 (job table week 2) so it doesn't
-- appear if the player already took the Day 1 job table path.
-- We also add precludes values to s4's choices via the choices JSONB.
--
-- The precludes mechanism works with the new preclusion_gates column:
-- when a choice has "precludes": ["slug_a", "slug_b"], the play page
-- appends those slugs to daily_states.preclusion_gates on choice.
-- selectStorylets then filters out any storylet with
-- requires_not_precluded matching a gate in the list.

-- Add precludes to s4_midday_choice choices:
-- Choice 0 (bookstore with Marcus) precludes s17_campus_job_table
-- Choice 1 (campus job table Day 1) precludes s4_bookstore_cluster (gate key)
-- NOTE: We use a safe JSON update that targets by choice id to avoid
-- ordering assumptions.

UPDATE public.storylets
SET choices = (
  SELECT jsonb_agg(
    CASE
      WHEN choice->>'id' = 'go_to_bookstore'
        THEN choice || '{"precludes": ["s17_campus_job_table"]}'::jsonb
      WHEN choice->>'id' = 'go_to_job_table'
        THEN choice || '{"precludes": ["s16_jordan_first_talk_bookstore_path"]}'::jsonb
      ELSE choice
    END
  )
  FROM jsonb_array_elements(choices) AS choice
)
WHERE slug = 's4_midday_choice';
