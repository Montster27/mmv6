-- 2026-04-24 — Gate 0 playtest feedback P3.8: the dorm-smell line in room_214
-- flattens three sensory layers into one noun phrase ("carpet cleaner and
-- someone else's tape collection"). Expand to carry industrial cleaner,
-- carpet off-gassing, and cologne — the layered sensory palette the
-- playtester flagged. Move the cassette detail into the lived-in side so
-- the opening line isn't doing double duty.

UPDATE storylets
SET body = 'The room smells like industrial cleaner and fresh carpet, with a thread of someone''s cologne drifting in from the hall. One side already lived-in: bed made with military corners, a campus map tacked to the cinderblock with masking tape, a clock radio on the desk tuned low to something with horns, a shoebox of cassettes at the foot of the bed. Your side is a bare mattress with a plastic cover that crinkles when you drop the duffel on it.'
WHERE storylet_key = 'room_214';
