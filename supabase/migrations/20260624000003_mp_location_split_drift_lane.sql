-- MP-07: split/drift display layer + lane metadata + state vocabulary rename
--
-- Extends mp_event_locations for the campaign board:
--   split (0–100)   — numeric share of the room (powers the tug bar)
--   prev_split      — last round's value (drift = split − prev_split, computed)
--   lane            — safe | risk (controls exposure cost and Deploy card style)
--   kind            — constituency type label ("Local merchants", etc.)
--   blurb           — short blurb shown on the Deploy card
--   map_x / map_y   — % position on the CSS campus map
--
-- Also renames the state CHECK values to match the design vocabulary:
--   leaning_pro → leaning_yes  |  locked_pro → won
--   leaning_con → leaning_no   |  locked_con → lost

-- 1. New columns -----------------------------------------------------------

ALTER TABLE public.mp_event_locations
  ADD COLUMN IF NOT EXISTS split      INT  NOT NULL DEFAULT 50
    CHECK (split      BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS prev_split INT  NOT NULL DEFAULT 50
    CHECK (prev_split BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS lane  TEXT NOT NULL DEFAULT 'safe'
    CHECK (lane IN ('safe', 'risk')),
  ADD COLUMN IF NOT EXISTS kind  TEXT,
  ADD COLUMN IF NOT EXISTS blurb TEXT,
  ADD COLUMN IF NOT EXISTS map_x INT,
  ADD COLUMN IF NOT EXISTS map_y INT;

-- 2. Migrate existing state values to new vocabulary ----------------------

UPDATE public.mp_event_locations
  SET state = CASE state
    WHEN 'leaning_pro' THEN 'leaning_yes'
    WHEN 'leaning_con' THEN 'leaning_no'
    WHEN 'locked_pro'  THEN 'won'
    WHEN 'locked_con'  THEN 'lost'
    ELSE state
  END;

-- 3. Replace CHECK constraint with new vocabulary -------------------------

ALTER TABLE public.mp_event_locations
  DROP CONSTRAINT IF EXISTS mp_event_locations_state_check;

ALTER TABLE public.mp_event_locations
  ADD CONSTRAINT mp_event_locations_state_check
    CHECK (state IN ('contested', 'leaning_yes', 'leaning_no', 'won', 'lost'));

-- 4. Seed split / prev_split from state (midpoint of each band) -----------
-- In this slice, split is display-only and derived from state. A later slice
-- inverts this: split becomes authoritative and state is threshold-derived.

UPDATE public.mp_event_locations
  SET
    split = CASE state
      WHEN 'won'         THEN 90
      WHEN 'leaning_yes' THEN 70
      WHEN 'contested'   THEN 50
      WHEN 'leaning_no'  THEN 30
      WHEN 'lost'        THEN 10
      ELSE 50
    END,
    prev_split = CASE state
      WHEN 'won'         THEN 90
      WHEN 'leaning_yes' THEN 70
      WHEN 'contested'   THEN 50
      WHEN 'leaning_no'  THEN 30
      WHEN 'lost'        THEN 10
      ELSE 50
    END;
