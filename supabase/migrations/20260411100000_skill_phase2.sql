-- Phase 2: Skills Matter in Storylets
-- Creates skill_practice_events audit table and retrofits 5 existing storylets
-- with requires_skill, skill_modifier, reaction_with_skill, and practices_skills.
--
-- REVERSIBLE: each section has a corresponding rollback comment.

-- ============================================================================
-- 1. Audit table: skill_practice_events
-- ============================================================================
-- Tracks when diegetic practice credits fire for Phase 5 tuning analysis.
-- Rollback: DROP TABLE IF EXISTS skill_practice_events;

CREATE TABLE IF NOT EXISTS skill_practice_events (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_id    text NOT NULL,
  storylet_key text NOT NULL,
  choice_id   text NOT NULL,
  credit_seconds integer NOT NULL DEFAULT 900,
  applied_at  timestamptz NOT NULL DEFAULT now()
);

-- Index for per-user queries (playtest analysis)
CREATE INDEX IF NOT EXISTS idx_skill_practice_events_user
  ON skill_practice_events(user_id, applied_at DESC);

-- RLS: users can only read their own practice events
ALTER TABLE skill_practice_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY skill_practice_events_select
  ON skill_practice_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY skill_practice_events_insert
  ON skill_practice_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role bypass (for server-side inserts via supabaseServer)
CREATE POLICY skill_practice_events_service_insert
  ON skill_practice_events FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- 2. Retrofit: glenn_pastime_paradise — skill_modifier: musical_ear
-- ============================================================================
-- The quad reveal scene. With Musical Ear trained, the player recognizes the
-- harmonic structure of the impossible melody, not just its impossibility.
-- No practices_skills — listening to an impossible song isn't practicing.
--
-- Rollback: revert choices to remove skill_modifier and reaction_with_skill
-- from the head_to_evening choice.

UPDATE storylets
SET choices = (
  SELECT jsonb_agg(
    CASE
      WHEN elem->>'id' = 'head_to_evening' THEN
        elem
        || '{"skill_modifier": {"skill_id": "musical_ear", "effect": "soften"}}'::jsonb
        || '{"reaction_with_skill": "You walk toward the dining hall, but the melody follows you. Not just the tune — you can hear the structure underneath it. The harmonic progression is sophisticated, almost jazzy, built on a descending bass line that resolves in a way that feels both inevitable and surprising. Stevie Wonder territory, but not Stevie Wonder. You know enough to know this is composed, not improvised. And you know enough to know it shouldn''t exist yet.\n\nThe melody sits in your chest like a question with no answer. You don''t know the song. You can''t know the song. But you can feel its bones, and the bones are from a building that hasn''t been built.\n\nThe quad is golden. The evening is starting. Whatever this is, it''s yours to carry now."}'::jsonb
      ELSE elem
    END
  )
  FROM jsonb_array_elements(choices::jsonb) AS elem
)
WHERE storylet_key = 'glenn_pastime_paradise'
  AND is_active = true;

-- ============================================================================
-- 3. Retrofit: lunch_floor — skill_modifier: small_talk + practices_skills
-- ============================================================================
-- The dining hall. With Small Talk trained, the player lands a joke early and
-- the table opens up naturally. practices_skills: ['small_talk'].
--
-- Rollback: revert choices to remove skill_modifier, reaction_with_skill,
-- and practices_skills from the laugh_with_doug choice.

UPDATE storylets
SET choices = (
  SELECT jsonb_agg(
    CASE
      WHEN elem->>'id' = 'laugh_with_doug' THEN
        elem
        || '{"skill_modifier": {"skill_id": "small_talk", "effect": "soften"}}'::jsonb
        || '{"practices_skills": ["small_talk"]}'::jsonb
        || '{"reaction_with_skill": "You catch the rhythm of Doug''s joke and volley back — something about the mashed potatoes looking like they were sculpted by committee. Doug lights up. Keith almost smiles, which for Keith is practically a standing ovation. Mike looks over, recalibrating.\n\nThe table shifts. You''re not the new guy listening anymore — you''re in the conversation. It''s a small thing, the kind of gear-change that happens when someone finds the right register with a group.\n\n\"Anyone figure out their schedule yet? I''ve got Chem 101 at eight AM on Tuesdays.\" Mike, taking the opening you made.\n\n\"Eight AM? That''s punishment,\" Doug says.\n\n\"It''s the section with Hadley. She''s supposed to be good.\"\n\nDoug leans back. \"So tonight. First night, we gotta do something. I heard there''s a thing at Anderson Hall — a guy on third floor is throwing a party. Beer, girls from the other dorms.\"\n\n\"There''s also some guys on our floor doing cards in the lounge,\" Mike says. \"Quieter.\"\n\nScott: \"Both sound good.\" Of course they do.\n\nThe meal is done. The afternoon opens up. Tonight you''ll have to choose."}'::jsonb
      ELSE elem
    END
  )
  FROM jsonb_array_elements(choices::jsonb) AS elem
)
WHERE storylet_key = 'lunch_floor'
  AND is_active = true;

-- ============================================================================
-- 4. Retrofit: heller_lecture — requires_skill: critical_analysis (new choice)
-- ============================================================================
-- Heller's sociology lecture. Add a new gated choice that only appears when the
-- player has trained critical_analysis. The existing class_ends choice remains
-- for all players (no content removed).
-- practices_skills: ['critical_analysis'].
--
-- Rollback: remove the raise_critical_point choice from the choices array.

UPDATE storylets
SET choices = choices::jsonb || '[{
  "id": "raise_critical_point",
  "label": "Raise your hand — Heller''s definition has a gap",
  "requires_skill": {"skill_id": "critical_analysis", "min_level": 1},
  "practices_skills": ["critical_analysis"],
  "identity_tags": ["achieve", "risk"],
  "time_cost": 0,
  "energy_cost": 0,
  "precludes": [],
  "reaction_text": "You raise your hand. Heller pauses, looks at you — not annoyed, curious. \"Yes?\"\n\n\"The definition assumes the group is voluntary,\" you say. \"But most primary groups aren''t chosen. Family, childhood neighbors, the people in this room right now. The bonds form before anyone decides anything. Doesn''t that change what ''primary'' means?\"\n\nThe room is quiet. Heller takes off his glasses, cleans them on his tie. When he puts them back on, he''s looking at you differently.\n\n\"That''s — yes. That''s Cooley''s blind spot exactly. He was writing about middle-class Protestant families in Michigan. The universality claim is aspirational, not descriptive.\" He turns to the class. \"This is what I mean about reading against the grain. Thursday, bring me a primary group that doesn''t fit Cooley''s definition.\"\n\nTomas, at the grading desk, looks up. He writes something in the margin of his notepad.\n\nPeople are packing up. You feel the weight of having said something true in a room full of strangers.",
  "outcome": {"text": "", "deltas": {"stress": -1}},
  "events_emitted": []
}]'::jsonb
WHERE storylet_key = 'heller_lecture'
  AND is_active = true;

-- ============================================================================
-- 5. Retrofit: evening_choice — skill_modifier: active_listening on go_to_cards
-- ============================================================================
-- First Night, card game choice. With Active Listening trained, the player
-- notices something small about Spider that wasn't otherwise legible.
-- practices_skills: ['active_listening'].
--
-- Rollback: revert choices to remove skill_modifier, reaction_with_skill,
-- and practices_skills from the go_to_cards choice.

UPDATE storylets
SET choices = (
  SELECT jsonb_agg(
    CASE
      WHEN elem->>'id' = 'go_to_cards' THEN
        elem
        || '{"skill_modifier": {"skill_id": "active_listening", "effect": "soften"}}'::jsonb
        || '{"practices_skills": ["active_listening"]}'::jsonb
        || '{"reaction_with_skill": "The floor lounge has carpet that smells like it''s been here since the building opened. A circle of chairs around a low table. Peterson — a tall guy with glasses and a quiet voice — is shuffling cards. Mike is there, no textbook for once. Keith arrived early and is sitting in the most solid-looking chair, because that''s what Keith does.\n\nYou watch the way Spider plays. Not his cards — his hands. He holds them loosely, almost carelessly, but his eyes track every discard. When Peterson bluffs, Spider doesn''t react to the bluff. He reacts to the half-second pause before it. You notice because you''re listening the same way — not to what people say, but to the rhythm underneath.\n\nSpider catches you watching. Doesn''t say anything. Just deals the next hand a fraction slower, like he''s giving you time to keep up.\n\nScott pops in for ten minutes, then leaves for Anderson Hall, because of course he does.\n\nThe lounge empties slowly. Peterson collects his cards. Mike says goodnight and means it. Keith holds the door.\n\nThe hallway is quiet. You brush your teeth. The face in the mirror looks like someone who noticed something tonight that most people wouldn''t.\n\nYou lie on the mattress. The plastic cover crinkles. Scott''s Return of the Jedi poster. Your side has whatever you put there today.\n\nThe melody. Still there. Fall 1983. The ceiling above your bed.\n\nTomorrow there will be more of it.\n\nYou close your eyes."}'::jsonb
      ELSE elem
    END
  )
  FROM jsonb_array_elements(choices::jsonb) AS elem
)
WHERE storylet_key = 'evening_choice'
  AND is_active = true;

-- ============================================================================
-- 6. Retrofit: money_reality_check — skill_modifier: budgeting on eat_first
-- ============================================================================
-- The Register, Day 4. With Budgeting trained, the player does the math more
-- consciously — the strategic thinking is visible, not just the behavior.
-- practices_skills: ['budgeting'].
--
-- Rollback: revert choices to remove skill_modifier, reaction_with_skill,
-- and practices_skills from the eat_first choice.

UPDATE storylets
SET choices = (
  SELECT jsonb_agg(
    CASE
      WHEN elem->>'id' = 'eat_first' THEN
        elem
        || '{"skill_modifier": {"skill_id": "budgeting", "effect": "soften"}}'::jsonb
        || '{"practices_skills": ["budgeting"]}'::jsonb
        || '{"reaction_with_skill": "You eat in the dining hall first — not just practical but calculated. Meal plan covers dinner, Sorrento''s doesn''t. That''s $4.50 you keep in the register. You run the numbers while you eat: $47 left until the check comes, fourteen days out. $3.35 a day if nothing breaks. A Coke at Sorrento''s is ninety cents.\n\nYou walk over and order the Coke and a side salad — $2.15 with tax. You''re there, present, accounted for. Nobody notices what you ordered. Cal tells a story about his high school that makes four people laugh.\n\nThe register math doesn''t make you feel better exactly. But it makes the number less shapeless. You know where you are. You know where the edges are. That''s something."}'::jsonb
      ELSE elem
    END
  )
  FROM jsonb_array_elements(choices::jsonb) AS elem
)
WHERE storylet_key = 'money_reality_check'
  AND is_active = true;
