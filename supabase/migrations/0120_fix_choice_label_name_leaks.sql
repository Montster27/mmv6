-- /supabase/migrations/0120_fix_choice_label_name_leaks.sql
-- Fix choice labels that leak NPC names before the player could know them.
--
-- Rule: choice labels are visible BEFORE reaction_text fires.
-- Therefore a label must never name an NPC unless that NPC is guaranteed
-- to be known by all players who can reach that choice.
--
-- FINDINGS:
--   s9_orientation_fair: "Follow Miguel around the tables." leaks Miguel's
--     name. Player may not know Miguel at all (skipped phone + dining hall).
--     Fix: replace label with name-free version.
--
--   s4_midday_choice: "Go to the freshman social with Miguel." leaks name.
--     Player reaches s4 after s3 (dining hall). At s3, they could have
--     met Miguel (approach_miguel, hover_near_table) or not (sit_with_dana,
--     sit_alone). So Miguel is NOT guaranteed known here.
--     Fix: replace label with name-free version. Miguel introduces himself
--     in the reaction_text_conditions already wired via 0115/0119.
--
--   s3_dining_hall: "Walk straight toward the loud table and introduce yourself."
--     already fixed in 0119 (was "Walk straight toward Miguel's table...").
--     Verify no regression.
--
--   s8_floor_meeting: "Talk with Cal during the meeting." -- Cal has JUST
--     introduced himself in the body text ("Cal," he says), so the label
--     is fine. Sandra is introduced by title in body ("Sandra -- the RA").
--     Labels reference "Sandra" and "Cal" but body already names them
--     before the choice appears. ACCEPTABLE -- no change needed.
--
--   s11_cal_midnight: Labels say "Go with him." / "Tell him not tonight." /
--     "Tell him to come in for a bit instead." -- all name-free. GOOD.

-- ============================================================
-- s9: Fix "Follow Miguel" choice label
-- ============================================================
UPDATE public.storylets
SET choices = (
  SELECT jsonb_agg(
    CASE
      WHEN choice->>'id' = 'follow_miguel' THEN
        jsonb_set(
          choice,
          '{label}',
          to_jsonb('Follow the guy working the whole fair.'::text)
        )
      ELSE choice
    END
  )
  FROM jsonb_array_elements(choices) AS choice
)
WHERE slug = 's9_orientation_fair';

-- ============================================================
-- s4: Fix "freshman social with Miguel" choice label
-- ============================================================
UPDATE public.storylets
SET choices = (
  SELECT jsonb_agg(
    CASE
      WHEN choice->>'id' = 'freshman_social' THEN
        jsonb_set(
          choice,
          '{label}',
          to_jsonb('Go to the freshman social.'::text)
        )
      ELSE choice
    END
  )
  FROM jsonb_array_elements(choices) AS choice
)
WHERE slug = 's4_midday_choice';
