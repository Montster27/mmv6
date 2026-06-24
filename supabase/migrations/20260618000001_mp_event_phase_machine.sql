-- ============================================================
-- Event Phase Machine (MP-05)
-- phase transitions, round clock, movement transit, AI opposition
-- ============================================================
-- Ticket: MP-05
-- Spec:   docs/prompts/MP-05-phase-machine.md
--
-- Two new tables:
--   mp_event_rounds   — one row per event; holds the phase/round FSM state
--   mp_event_transit  — players currently in motion between locations
--
-- mp_event_rounds is UNIQUE on event_id: one active round record per event.
-- Phase is planning → active → resolving → planning (cycling).
-- active_started_at + round_duration_seconds are the authoritative clock;
-- remaining time is always computed server-side, never stored.
--
-- mp_event_transit holds the movement-lag state while a player is between
-- locations (they contribute to neither location during transit). When
-- arrives_at passes and resolveRound fires, players are finalized into
-- mp_event_assignments at to_location_id and removed from transit.
--
-- Realtime: the supabase_realtime publication exists but is empty (confirmed
-- at MP-05 planning time). We add mp_event_locations and mp_event_rounds so
-- the board page can subscribe to board-state and phase-state changes without
-- polling. mp_event_transit is NOT added — transit rows are short-lived and
-- their effective state is delivered via the GET detail response + round
-- resolution, not streamed individually.
--
-- All write-paths are server-mediated (service-role client). SELECT policies
-- follow the established mp_* precedent: readable by any authenticated user.
--
-- Idempotent: CREATE TABLE IF NOT EXISTS, policies guarded with
-- duplicate_object, ALTER PUBLICATION is idempotent.
-- ============================================================

BEGIN;

-- ─── mp_event_rounds ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mp_event_rounds (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id                        UUID NOT NULL UNIQUE
                                    REFERENCES public.mp_events(id) ON DELETE CASCADE,
  phase                           TEXT NOT NULL DEFAULT 'planning'
                                    CHECK (phase IN ('planning', 'active', 'resolving')),
  round_number                    INT NOT NULL DEFAULT 1,
  active_started_at               TIMESTAMPTZ,
  round_duration_seconds          INT NOT NULL DEFAULT 120,
  planning_deadline               TIMESTAMPTZ,
  ai_last_escalation_location_id  UUID
                                    REFERENCES public.mp_event_locations(id)
                                    ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS mp_event_rounds_event_idx
  ON public.mp_event_rounds (event_id);

ALTER TABLE public.mp_event_rounds ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY mp_event_rounds_select ON public.mp_event_rounds
    FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON TABLE public.mp_event_rounds IS
  'Phase/round FSM state for a coordinated event (MP-05). One row per event; UNIQUE(event_id) enforced. Writes are service-role; the board page reads via the GET detail endpoint + Realtime.';
COMMENT ON COLUMN public.mp_event_rounds.active_started_at IS
  'Server-stamped when planning→active. Together with round_duration_seconds this is the authoritative clock; remaining time is always computed, never stored.';
COMMENT ON COLUMN public.mp_event_rounds.planning_deadline IS
  'Optional AFK guard — an absolute timestamp after which an un-started planning phase auto-warns. NULL = no deadline. Not enforced in this slice; stored for future use.';

-- ─── mp_event_transit ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mp_event_transit (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id         UUID NOT NULL
                     REFERENCES public.mp_events(id) ON DELETE CASCADE,
  player_id        UUID NOT NULL
                     REFERENCES auth.users(id) ON DELETE CASCADE,
  from_location_id UUID
                     REFERENCES public.mp_event_locations(id),
  to_location_id   UUID NOT NULL
                     REFERENCES public.mp_event_locations(id),
  departed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  arrives_at       TIMESTAMPTZ NOT NULL,
  UNIQUE (event_id, player_id)
);

CREATE INDEX IF NOT EXISTS mp_event_transit_event_idx
  ON public.mp_event_transit (event_id);

CREATE INDEX IF NOT EXISTS mp_event_transit_player_idx
  ON public.mp_event_transit (player_id);

ALTER TABLE public.mp_event_transit ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY mp_event_transit_select ON public.mp_event_transit
    FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON TABLE public.mp_event_transit IS
  'Players currently in motion between locations (MP-05). While a row exists the player contributes to neither location. On resolveRound, rows with arrives_at <= now() are finalized into mp_event_assignments and removed here.';
COMMENT ON COLUMN public.mp_event_transit.arrives_at IS
  'Server-computed: departed_at + TRANSIT_LAG_SECONDS. Never supplied by the client.';

-- ─── Realtime publication ────────────────────────────────────────────
-- supabase_realtime exists but had 0 tables at MP-05 planning time.
-- Adding the two tables the board page subscribes to. mp_event_transit
-- is intentionally excluded (short-lived rows; state delivered via API).
ALTER PUBLICATION supabase_realtime
  ADD TABLE public.mp_event_locations,
             public.mp_event_rounds;

-- ─── Seed: First Renfaire round state ────────────────────────────────
INSERT INTO public.mp_event_rounds (event_id, phase, round_number, round_duration_seconds)
VALUES ('e0000000-0000-4000-a000-000000000001'::uuid, 'planning', 1, 120)
ON CONFLICT (event_id) DO NOTHING;

COMMIT;

-- ============================================================
-- Rollback (uncomment to reverse)
-- ============================================================
-- ALTER PUBLICATION supabase_realtime
--   DROP TABLE public.mp_event_locations, public.mp_event_rounds;
-- DROP TABLE IF EXISTS public.mp_event_transit;
-- DROP TABLE IF EXISTS public.mp_event_rounds;
