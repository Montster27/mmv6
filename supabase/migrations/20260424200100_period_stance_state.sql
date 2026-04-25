-- period_stance counter column on daily_states (step 3 of period-stance spec).
--
-- Mirrors the life_pressure_state pattern introduced in
-- supabase/migrations/0096_arc_one_scarcity.sql.  Each friction micro-choice
-- writes a period_stance tag ('challenged' | 'deflected' | 'absorbed') which
-- bumps the corresponding counter here and writes a PERIOD_STANCE row to
-- choice_log.  The counter serves threshold + dominant queries; choice_log
-- covers the "most recent" query.
--
-- Spec: docs/specs/CODE-SPEC-period-stance-infrastructure.md §3.2
-- Decisions: docs/specs/CODE-SPEC-period-stance-infrastructure-DECISIONS.md §Q2

ALTER TABLE public.daily_states
  ADD COLUMN IF NOT EXISTS period_stance_state jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.daily_states.period_stance_state IS
  'Counter { challenged, deflected, absorbed } bumped by friction micro-choices. Persists across arcs. Most-recent reads use choice_log event_type=PERIOD_STANCE instead.';
