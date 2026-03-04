-- /supabase/migrations/0117_wire_week1_arc_steps.sql
-- Register Week 1 new storylets as arc steps in arc_one_core
-- and fix targetStoryletId on s11 (cal midnight) to point to next week

-- ============================================================
-- Fix s11 targetStoryletId — currently empty; point to week 2 entry
-- Week 2 entry will be s12_study_group_invite (seeded in 0118)
-- For now, leave empty and wire when week 2 seeds land
-- ============================================================

-- ============================================================
-- Register arc_one_core steps for new Week 1 storylets
-- ============================================================

-- Get arc_one_core id for reference
-- (steps reference arc_id as UUID, not key, so we use a subquery)

-- s7_first_class → step order 7
INSERT INTO public.arc_steps (arc_id, step_key, order_index, title, body, options, due_offset_days, expires_after_days)
SELECT
  id,
  's7_first_class',
  7,
  'First Class',
  'Day 2: Navigate your first class.',
  '[]'::jsonb,
  1,
  3
FROM public.arc_definitions WHERE key = 'arc_one_core'
ON CONFLICT DO NOTHING;

-- s8_floor_meeting → step order 8 (Day 1 evening, parallel)
INSERT INTO public.arc_steps (arc_id, step_key, order_index, title, body, options, due_offset_days, expires_after_days)
SELECT
  id,
  's8_floor_meeting',
  8,
  'Floor Meeting',
  'Day 1 evening: Meet the floor.',
  '[]'::jsonb,
  0,
  2
FROM public.arc_definitions WHERE key = 'arc_one_core'
ON CONFLICT DO NOTHING;

-- s9_orientation_fair → step order 9 (Day 1 afternoon, parallel)
INSERT INTO public.arc_steps (arc_id, step_key, order_index, title, body, options, due_offset_days, expires_after_days)
SELECT
  id,
  's9_orientation_fair',
  9,
  'Orientation Fair',
  'Day 1 afternoon: Navigate the orientation fair.',
  '[]'::jsonb,
  0,
  1
FROM public.arc_definitions WHERE key = 'arc_one_core'
ON CONFLICT DO NOTHING;

-- s10_parent_call_w1 → step order 10 (Day 3–4)
INSERT INTO public.arc_steps (arc_id, step_key, order_index, title, body, options, due_offset_days, expires_after_days)
SELECT
  id,
  's10_parent_call_w1',
  10,
  'Call Home',
  'Day 3–4: The first call home.',
  '[]'::jsonb,
  2,
  4
FROM public.arc_definitions WHERE key = 'arc_one_core'
ON CONFLICT DO NOTHING;

-- s11_cal_midnight → step order 11 (Day 2–3 evening)
INSERT INTO public.arc_steps (arc_id, step_key, order_index, title, body, options, due_offset_days, expires_after_days)
SELECT
  id,
  's11_cal_midnight',
  11,
  'Cal at the Door',
  'Day 2–3 evening: Cal knocks.',
  '[]'::jsonb,
  1,
  3
FROM public.arc_definitions WHERE key = 'arc_one_core'
ON CONFLICT DO NOTHING;

-- ============================================================
-- NPC seed: ensure all Year One NPCs exist in relationships default
-- These are seeded as known NPC keys; actual state lives in
-- daily_states.relationships JSONB per user
-- ============================================================

-- No table for NPC definitions yet — NPC keys are referenced by string
-- in storylet relational_effects and events_emitted.
-- A future migration (0118+) will add an npc_definitions table if needed.

COMMENT ON TABLE public.storylets IS
'Storylets reference NPC keys as strings in relational_effects and events_emitted.
Year One canonical NPC keys:
  npc_roommate_dana
  npc_connector_miguel
  npc_prof_marsh
  npc_studious_priya
  npc_floor_cal
  npc_ambiguous_jordan
  npc_ra_sandra
  npc_parent_voice
';
