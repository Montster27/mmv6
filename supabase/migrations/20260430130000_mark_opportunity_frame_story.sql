-- T-1777564800228 — Mark the opportunity track as a frame-story track.
--
-- Frame-story tracks are structurally different from life-stream tracks:
-- they carry the main narrative arc (the terminal investigation, in Arc One)
-- and have multi-week eligibility windows by design. Treating them
-- identically to life-stream tracks under a global maxStorylets=2 cap means
-- the longer-window frame-story storylet is perpetually outranked by the
-- short-window life-stream storylets in the urgency sort.
--
-- This migration marks opportunity as frame_story; the scheduler change in
-- selectTrackStorylets reserves one slot for any frame-story track with an
-- eligible candidate. Other tracks (academic, belonging, money, roommate,
-- home) remain life_stream by default.
--
-- Idempotent: if category is already 'frame_story', this is a no-op.

UPDATE public.tracks
SET category = 'frame_story'
WHERE key = 'opportunity'
  AND category IS DISTINCT FROM 'frame_story';
