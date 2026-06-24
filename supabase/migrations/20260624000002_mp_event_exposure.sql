-- MP-07: personal exposure persistence
-- New table tracking per-player exposure within an event (Signal 1 — "am I
-- being reckless?"). Upserted at round resolution by the server resolver,
-- which runs as service role. Clients read their own row for the game-bar
-- exposure meter; clubmate exposure is not surfaced in the current design.
--
-- `exposure` is clamped 0–100. Tier labels (Unseen / Noticed / Watched /
-- Burned) are derived client-side from EXPOSURE_TIERS in src/lib/mpEvents.ts.

CREATE TABLE IF NOT EXISTS public.mp_event_exposure (
  event_id   UUID        NOT NULL REFERENCES public.mp_events(id) ON DELETE CASCADE,
  player_id  UUID        NOT NULL REFERENCES auth.users(id)       ON DELETE CASCADE,
  exposure   INT         NOT NULL DEFAULT 0
               CHECK (exposure BETWEEN 0 AND 100),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, player_id)
);

ALTER TABLE public.mp_event_exposure ENABLE ROW LEVEL SECURITY;

-- Players can read only their own exposure row.
-- No client INSERT/UPDATE policy — the service-role resolver owns all writes.
CREATE POLICY "mp_event_exposure_select"
  ON public.mp_event_exposure FOR SELECT
  USING (auth.uid() = player_id);
