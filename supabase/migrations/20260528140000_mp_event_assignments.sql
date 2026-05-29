-- ============================================================
-- Coordinated Events — Assignments (presence: who is at each location)
-- ============================================================
-- Ticket: MP-03
-- Spec:   docs/prompts/MP-03-assign.md
--
-- Records who is present at each location of a coordinated event:
--   mp_event_assignments — one row per (event, player)
--
-- A player has at most one assignment per event (UNIQUE event_id,
-- player_id). assignment_source distinguishes coordinator deployments
-- ('coordinator') from self-selected "show up" presence
-- ('self_selected'). Player refs point at auth.users(id) — MMV has no
-- separate `players` table; a "player" is an authenticated user, same
-- convention as clubs (20260528120000) and mp_events (20260528130000).
--
-- assigned_by_player_id records the coordinator who deployed the player
-- (NULL for self_selected). ON DELETE SET NULL so a coordinator's
-- account deletion leaves the assignment row standing.
--
-- Writes are server-mediated (the service-role client bypasses RLS), so
-- — following the clubs and mp_events precedents — only a SELECT policy
-- is defined, readable by ANY authenticated user: presence is
-- transparent to all players per docs/MULTIPLAYER-DESIGN.md. Authorization
-- (coordinator-only assigns/unassigns, self-only self-select/leave) is
-- enforced in mpAssignments.server.ts, not in RLS.
--
-- Idempotent: CREATE TABLE IF NOT EXISTS, policy guarded with
-- duplicate_object. No seed rows.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.mp_event_assignments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id              UUID NOT NULL REFERENCES public.mp_events(id) ON DELETE CASCADE,
  location_id           UUID NOT NULL REFERENCES public.mp_event_locations(id) ON DELETE CASCADE,
  player_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assignment_source     TEXT NOT NULL
                          CHECK (assignment_source IN ('coordinator', 'self_selected')),
  assigned_by_player_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, player_id)
);

CREATE INDEX IF NOT EXISTS mp_event_assignments_event_idx
  ON public.mp_event_assignments (event_id);

CREATE INDEX IF NOT EXISTS mp_event_assignments_location_idx
  ON public.mp_event_assignments (location_id);

ALTER TABLE public.mp_event_assignments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY mp_event_assignments_select ON public.mp_event_assignments
    FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- No client write policies — assignments are created/removed server-side
-- with coordinator/self authorization enforced in mpAssignments.server.ts.

COMMENT ON TABLE public.mp_event_assignments IS
  'Presence at coordinated-event locations (MP-03). One row per (event, player); assignment_source = coordinator | self_selected. Writes are service-role with authorization in code.';

COMMIT;

-- ============================================================
-- Rollback (uncomment to reverse)
-- ============================================================
-- DROP TABLE IF EXISTS public.mp_event_assignments;
