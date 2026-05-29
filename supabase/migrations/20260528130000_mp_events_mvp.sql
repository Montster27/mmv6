-- ============================================================
-- Coordinated Events — MVP (heatmap: events + locations, SCA Renfaire seed)
-- ============================================================
-- Ticket: MP-02
-- Spec:   docs/prompts/MP-02-heatmap.md
--
-- View-only heatmap for a single seeded event. Two tables:
--   mp_events           — a coordinated multiplayer event sponsored by a club
--   mp_event_locations  — the campus locations shown on the heatmap
--
-- Named with an `mp_` prefix because the bare `events` table is already
-- taken by the Phase-One analytics log (0012_events.sql, user_id/event_type/
-- payload). This is the unrelated multiplayer coordinated-events surface.
--
-- Writes are server-mediated (the service-role client bypasses RLS), so —
-- following the clubs (20260528120000) and newsnet precedents — only SELECT
-- policies are defined, readable by ANY authenticated user: the heatmap is
-- public to all logged-in players regardless of club affiliation.
--
-- Idempotent: CREATE TABLE IF NOT EXISTS, policies guarded with
-- duplicate_object, and the seed uses fixed UUID literals with
-- ON CONFLICT DO NOTHING so re-running is a no-op. The SCA (sponsoring club)
-- is looked up dynamically by is_system_seeded = true because its UUID is
-- not fixed across environments.
-- ============================================================

BEGIN;

-- ─── mp_events ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mp_events (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name               TEXT NOT NULL,
  description        TEXT,
  sponsoring_club_id UUID NOT NULL REFERENCES public.clubs(id),
  scheduled_at       TIMESTAMPTZ,
  status             TEXT NOT NULL DEFAULT 'upcoming'
                       CHECK (status IN ('upcoming', 'active', 'resolved')),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mp_events_club_idx
  ON public.mp_events (sponsoring_club_id);

ALTER TABLE public.mp_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY mp_events_select ON public.mp_events
    FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- No client write policies — events are created/updated server-side.

COMMENT ON TABLE public.mp_events IS
  'Coordinated multiplayer events (MP-02). Heatmap surface sponsored by a club. The bare `events` table is the unrelated Phase-One analytics log.';

-- ─── mp_event_locations ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mp_event_locations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      UUID NOT NULL REFERENCES public.mp_events(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  location_type TEXT NOT NULL
                  CHECK (location_type IN
                    ('dorm', 'dining', 'social', 'academic', 'admin', 'merchant', 'other')),
  state         TEXT NOT NULL DEFAULT 'contested'
                  CHECK (state IN
                    ('contested', 'leaning_pro', 'leaning_con', 'locked_pro', 'locked_con')),
  display_order INT NOT NULL,
  UNIQUE (event_id, display_order)
);

CREATE INDEX IF NOT EXISTS mp_event_locations_event_idx
  ON public.mp_event_locations (event_id);

ALTER TABLE public.mp_event_locations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY mp_event_locations_select ON public.mp_event_locations
    FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- No client write policies — location state is updated server-side.

COMMENT ON TABLE public.mp_event_locations IS
  'Campus locations for a coordinated event, ordered by display_order. state drives the heatmap color coding.';

-- ─── Seed: The First Renfaire (SCA tutorial event) ───────────────────
-- Fixed event UUID so the location rows can reference it and re-running is
-- a no-op. The SCA is resolved dynamically (its UUID varies per env). MP-01
-- runs first and always seeds the SCA, so the lookup is non-empty here.
WITH sca AS (
  SELECT id FROM public.clubs WHERE is_system_seeded = true LIMIT 1
)
INSERT INTO public.mp_events (id, name, description, sponsoring_club_id, status)
SELECT
  'e0000000-0000-4000-a000-000000000001'::uuid,
  'The First Renfaire',
  'The SCA proposes a small Renaissance fair on the south quad. We need administrative approvals, merchant donations, and dorm buy-in.',
  sca.id,
  'active'
FROM sca
ON CONFLICT (id) DO NOTHING;

-- Six locations referencing the fixed event UUID. Fixed location UUIDs plus
-- ON CONFLICT DO NOTHING keep the seed idempotent.
INSERT INTO public.mp_event_locations (id, event_id, name, location_type, state, display_order)
VALUES
  ('1c000000-0000-4000-a000-000000000001'::uuid, 'e0000000-0000-4000-a000-000000000001'::uuid, 'Admin Building', 'admin',    'locked_con',  1),
  ('1c000000-0000-4000-a000-000000000002'::uuid, 'e0000000-0000-4000-a000-000000000001'::uuid, 'Merchant Row',   'merchant', 'contested',   2),
  ('1c000000-0000-4000-a000-000000000003'::uuid, 'e0000000-0000-4000-a000-000000000001'::uuid, 'South Dorm',     'dorm',     'leaning_pro', 3),
  ('1c000000-0000-4000-a000-000000000004'::uuid, 'e0000000-0000-4000-a000-000000000001'::uuid, 'North Dorm',     'dorm',     'contested',   4),
  ('1c000000-0000-4000-a000-000000000005'::uuid, 'e0000000-0000-4000-a000-000000000001'::uuid, 'West Dorm',      'dorm',     'leaning_con', 5),
  ('1c000000-0000-4000-a000-000000000006'::uuid, 'e0000000-0000-4000-a000-000000000001'::uuid, 'Dining Hall',    'dining',   'contested',   6)
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- ============================================================
-- Rollback (uncomment to reverse)
-- ============================================================
-- DROP TABLE IF EXISTS public.mp_event_locations;
-- DROP TABLE IF EXISTS public.mp_events;
