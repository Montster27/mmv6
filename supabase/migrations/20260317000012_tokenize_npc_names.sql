-- Replace hardcoded NPC names in storylet body/choices with [[npc_id]] tokens.
-- The client resolves these at render time based on the player's relationship
-- state, so each NPC is named only if the player actually knows them, and
-- described as a stranger (or by their face) otherwise.
--
-- Token format: [[npc_id]]  e.g.  [[npc_floor_miguel]]
--
-- Three tiers the renderer uses:
--   knows_name  → "Miguel"
--   met/face    → "the guy from orientation"
--   unknown     → "a guy with an easy grin"

BEGIN;

-- ============================================================
-- orientation_fair  (arc_belonging beat 3)
-- "Miguel — if you know him — is talking to someone"
-- → "[[npc_floor_miguel]] is talking to someone"
-- ============================================================
UPDATE public.storylets
SET
  body = replace(
    body,
    'Miguel — if you know him — is talking to someone with the ease of someone built for exactly this.',
    '[[npc_floor_miguel]] is talking to someone with the ease of someone built for exactly this.'
  ),
  updated_at = now()
WHERE step_key = 'orientation_fair';

-- ============================================================
-- money_reality_check  (arc_money beat 2)
-- "Cal has mentioned twice, in passing..."
-- "Cal tells a story about his high school" (in reaction_text)
-- "Marsh says open to page forty-three" (in reaction_text — already named)
-- ============================================================
UPDATE public.storylets
SET
  body = replace(
    body,
    'Cal has mentioned twice, in passing,',
    '[[npc_floor_cal]] has mentioned twice, in passing,'
  ),
  -- Also update the eat_first choice reaction text inside the JSONB
  choices = replace(
    choices::text,
    'Cal tells a story about his high school',
    '[[npc_floor_cal]] tells a story about his high school'
  )::jsonb,
  updated_at = now()
WHERE step_key = 'money_reality_check';

-- ============================================================
-- floor_meeting  (arc_belonging beat 2)
-- "Her name is Sandra."  → introduce with token (stranger = "the RA")
-- "That's Cal — you'll know that in a minute." → token
-- Reaction texts: "Sandra nods", "Cal looks", "His name is Cal"
-- ============================================================
UPDATE public.storylets
SET
  body = replace(replace(
    body,
    'Her name is Sandra.',
    'Her name is [[npc_ra_sandra]].'
  ),
    'That''s Cal — you''ll know that in a minute.',
    'That''s [[npc_floor_cal]] — you''ll know that in a minute.'
  ),
  choices = replace(replace(replace(replace(
    choices::text,
    '"Sandra nods once in your direction.',
    '"[[npc_ra_sandra]] nods once in your direction.'
  ),
    'Cal looks across the circle and does a small chin-lift.',
    '[[npc_floor_cal]] looks across the circle and does a small chin-lift.'
  ),
    'Sandra has read rooms like this before — she knows where people sit.',
    '[[npc_ra_sandra]] has read rooms like this before — she knows where people sit.'
  ),
    'His name is Cal.',
    'His name is [[npc_floor_cal]].'
  )::jsonb,
  updated_at = now()
WHERE step_key = 'floor_meeting';

-- ============================================================
-- miguel_floor_invite  (arc_belonging beat 5)
-- "Miguel, two other people from the floor..."
-- "Miguel doesn't collect obligations."
-- Reaction texts: "Miguel clocks you leaving"
-- ============================================================
UPDATE public.storylets
SET
  body = replace(replace(
    body,
    E'Miguel, two other people from the floor you half-recognize.',
    E'[[npc_floor_miguel]], two other people from the floor you half-recognize.'
  ),
    'Miguel doesn''t collect obligations.',
    '[[npc_floor_miguel]] doesn''t collect obligations.'
  ),
  choices = replace(
    choices::text,
    'Miguel clocks you leaving but says nothing.',
    '[[npc_floor_miguel]] clocks you leaving but says nothing.'
  )::jsonb,
  updated_at = now()
WHERE step_key = 'miguel_floor_invite';

-- ============================================================
-- cal_midnight_knock  (arc_belonging beat 4)
-- Body currently uses "his" anonymously — already fine.
-- Reaction texts reference "Cal" by name after the intro;
-- the player has already met Cal at floor_meeting so name is correct.
-- No changes needed here.
-- ============================================================

-- ============================================================
-- library_afternoon  (arc_academic beat 2)
-- "She noticed you in Marsh's class." — Priya isn't named yet
-- The body deliberately avoids naming her to preserve the slow reveal.
-- Tokenise "Marsh" so it renders as "the professor" if not yet met.
-- ============================================================
UPDATE public.storylets
SET
  body = replace(body,
    'She noticed you in Marsh''s class.',
    'She noticed you in [[npc_prof_marsh]]''s class.'
  ),
  choices = replace(
    choices::text,
    'which section you''re in for Marsh.',
    'which section you''re in for [[npc_prof_marsh]].'
  )::jsonb,
  updated_at = now()
WHERE step_key = 'library_afternoon';

-- ============================================================
-- bookstore_line (arc_money beat 1)
-- "Marsh's class" mentioned in a choice label — tokenise.
-- ============================================================
UPDATE public.storylets
SET
  choices = replace(
    choices::text,
    'Mention the bookstore. Marsh''s class.',
    'Mention the bookstore. [[npc_prof_marsh]]''s class.'
  )::jsonb,
  updated_at = now()
WHERE step_key = 'bookstore_line';

COMMIT;
