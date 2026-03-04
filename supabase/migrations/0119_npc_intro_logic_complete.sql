-- /supabase/migrations/0119_npc_intro_logic_complete.sql
-- Complete NPC introduction logic audit and fix.
--
-- RULES enforced:
--   R1. If body text names an NPC, that NPC must already be met/known at
--       that point in the story flow, OR the choice text/reaction must not
--       leak the name.
--   R2. Every choice that constitutes a first meeting emits INTRODUCED_SELF
--       (sets met + knows_name + knows_face).
--   R3. Choices that expose the player to an NPC without introduction emit
--       NOTICED_FACE (sets knows_face) or OVERHEARD_NAME (sets knows_name).
--   R4. reaction_text_conditions gate narrative text on npc state where the
--       outcome differs depending on prior contact.
--   R5. Choice labels must not name an NPC the player may not know yet.
--
-- AUDIT FINDINGS:
--   s1  -- Dana named in body. OK: Dana is met:true at run start.
--           All 4 choices need WOKE_IN_SAME_ROOM so her state is seeded.
--   s2  -- Phone body correct (name not known yet). answer_phone reaction
--           already gated by 0115. ignore/tell_dana choices: no name leaked.
--           BUG: tell_dana_answer fires AWKWARD_MOMENT on Dana even when
--           she has only just been introduced -- magnitude should be 1, OK.
--   s3  -- CRITICAL: body text says "You spot Miguel -- the guy from
--           yesterday" and choice label says "Walk straight toward Miguel's
--           table". If player never answered the phone, they do NOT know
--           Miguel's name. Body is static so we fix by:
--           (a) replacing the body with a name-free version, and
--           (b) gating the "approach" choice label via reaction_text_conditions
--               on the approach_miguel choice.
--           sit_alone fires trust -1 on Miguel even when player hasn't met
--           him -- remove that (can't snub someone you don't know).
--   s7  -- wait_someone_else emits nothing. Must emit OVERHEARD_NAME for
--           Marsh (his name is on the board). Fixed in 0118 -- verify.
--           Priya introduced via NOTICED_FACE only on raise_hand. OK.
--   s8  -- engage_sandra uses SHOWED_UP. Should be INTRODUCED_SELF (she
--           says her name, hands out a clipboard).
--           sit_quiet emits nothing -- add NOTICED_FACE for Sandra and Cal.
--           Fixed in 0118 -- sit_quiet fix missing, re-apply.
--   s9  -- CRITICAL: body text says "Miguel is already at three tables".
--           If player skipped dining hall AND phone, they do not know Miguel.
--           Fix body to be name-free for Miguel reference. Jordan reference
--           in body ("someone is standing alone") is OK -- no name used.
--           follow_miguel choice: INTRODUCED_SELF already added in 0118
--           with reaction_text_conditions. Re-apply cleanly.
--   s10 -- Parent is met:true from start. perform_fine fires two events --
--           simplify to single AWKWARD_MOMENT. ask_for_something fires
--           SHOWED_UP -- OK. keep_it_short fires DEFERRED_TENSION -- OK.
--           tell_truth_hard fires CONFIDED_IN -- OK.
--   s11 -- CRITICAL: body text says "It is Cal." Name leaked before
--           INTRODUCED_SELF fires. Fix body to be name-free.
--           go_with_cal and invite_in_instead both add INTRODUCED_SELF --
--           OK as long as body does not pre-leak the name.
--           decline_cal_politely: player sees him and turns him down.
--           Should emit NOTICED_FACE so face is known even on decline.

-- ============================================================
-- s1: Dana already met at start. Seed WOKE_IN_SAME_ROOM on all choices.
-- ============================================================
UPDATE public.storylets
SET choices = (
  SELECT jsonb_agg(
    jsonb_set(
      choice,
      '{events_emitted}',
      jsonb_build_array(
        jsonb_build_object('npc_id', 'npc_roommate_dana', 'type', 'WOKE_IN_SAME_ROOM', 'magnitude', 1)
      )
    )
  )
  FROM jsonb_array_elements(choices) AS choice
)
WHERE slug = 's1_dorm_wake_dislocation';

-- ============================================================
-- s3: Fix body (name-free Miguel), fix choice label, remove
--     spurious trust -1 on sit_alone, add sit_with_dana SHARED_MEAL,
--     gate approach_miguel reaction on prior Miguel knowledge.
-- ============================================================
UPDATE public.storylets
SET
  body = $$The dining hall is louder than you expected.

Trays clatter. Plastic cups scrape. The smell is coffee, eggs, and something overcooked.

Clusters have already formed.

Across the room, one table is louder and looser than the others -- a guy in the middle of it is laughing like he has been here for years. He looks up, briefly, in your direction.

Dana hangs half a step behind you.

There are a hundred ways this moment can go.

You have the strange feeling you have already chosen one.$$
WHERE slug = 's3_dining_hall';

UPDATE public.storylets
SET choices = (
  SELECT jsonb_agg(
    CASE
      WHEN choice->>'id' = 'approach_miguel' THEN
        jsonb_set(
          jsonb_set(
            jsonb_set(
              choice,
              '{label}',
              to_jsonb('Walk straight toward the loud table and introduce yourself.'::text)
            ),
            '{events_emitted}',
            jsonb_build_array(
              jsonb_build_object('npc_id', 'npc_connector_miguel', 'type', 'INTRODUCED_SELF', 'magnitude', 1)
            )
          ),
          '{reaction_text_conditions}',
          jsonb_build_array(
            jsonb_build_object(
              'if', jsonb_build_object('requires_npc_known', jsonb_build_array('npc_connector_miguel')),
              'text', $$He grins like he expected you.

"Knew you'd come over," Miguel says. Like you two already have a bit.

You do not know where that comes from.$$
            ),
            jsonb_build_object(
              'if', jsonb_build_object(
                'not', jsonb_build_object('requires_npc_known', jsonb_build_array('npc_connector_miguel'))
              ),
              'text', $$You walk straight up before you can talk yourself out of it.

"Hey -- mind if I sit?"

He breaks into an easy grin.

"Miguel," he says, like you should have met weeks ago.$$
            )
          )
        )
      WHEN choice->>'id' = 'sit_with_dana' THEN
        jsonb_set(
          choice,
          '{events_emitted}',
          jsonb_build_array(
            jsonb_build_object('npc_id', 'npc_roommate_dana', 'type', 'SHARED_MEAL', 'magnitude', 1)
          )
        )
      WHEN choice->>'id' = 'hover_near_table' THEN
        jsonb_set(
          choice,
          '{events_emitted}',
          jsonb_build_array(
            jsonb_build_object('npc_id', 'npc_connector_miguel', 'type', 'NOTICED_FACE', 'magnitude', 1)
          )
        )
      WHEN choice->>'id' = 'sit_alone' THEN
        -- Remove the relational_effect trust -1 on Miguel when player hasn't met him.
        -- sit_alone is a withdrawal, not a snub of a specific person.
        choice - 'relational_effects'
      ELSE choice
    END
  )
  FROM jsonb_array_elements(choices) AS choice
)
WHERE slug = 's3_dining_hall';

-- ============================================================
-- s7: Ensure all three choices emit correct Marsh / Priya events.
--     wait_someone_else: OVERHEARD_NAME for Marsh (name on board, all see it).
--     raise_hand: SHOWED_UP for Marsh + NOTICED_FACE for Priya.
--     speak_wrong: SHOWED_UP for Marsh.
-- ============================================================
UPDATE public.storylets
SET choices = (
  SELECT jsonb_agg(
    CASE
      WHEN choice->>'id' = 'raise_hand_answer' THEN
        jsonb_set(
          choice,
          '{events_emitted}',
          jsonb_build_array(
            jsonb_build_object('npc_id', 'npc_prof_marsh',     'type', 'SHOWED_UP',    'magnitude', 1),
            jsonb_build_object('npc_id', 'npc_studious_priya', 'type', 'NOTICED_FACE', 'magnitude', 1)
          )
        )
      WHEN choice->>'id' = 'wait_someone_else' THEN
        jsonb_set(
          choice,
          '{events_emitted}',
          jsonb_build_array(
            jsonb_build_object('npc_id', 'npc_prof_marsh', 'type', 'OVERHEARD_NAME', 'magnitude', 1)
          )
        )
      WHEN choice->>'id' = 'speak_wrong' THEN
        jsonb_set(
          choice,
          '{events_emitted}',
          jsonb_build_array(
            jsonb_build_object('npc_id', 'npc_prof_marsh', 'type', 'SHOWED_UP', 'magnitude', 1)
          )
        )
      ELSE choice
    END
  )
  FROM jsonb_array_elements(choices) AS choice
)
WHERE slug = 's7_first_class';

-- ============================================================
-- s8: engage_sandra -> INTRODUCED_SELF (not SHOWED_UP).
--     talk_with_cal -> INTRODUCED_SELF + NOTICED_FACE for Sandra.
--     sit_quiet -> NOTICED_FACE for both (already in 0118, re-apply clean).
-- ============================================================
UPDATE public.storylets
SET choices = (
  SELECT jsonb_agg(
    CASE
      WHEN choice->>'id' = 'engage_sandra' THEN
        jsonb_set(
          jsonb_set(
            choice,
            '{events_emitted}',
            jsonb_build_array(
              jsonb_build_object('npc_id', 'npc_ra_sandra', 'type', 'INTRODUCED_SELF', 'magnitude', 1),
              jsonb_build_object('npc_id', 'npc_floor_cal', 'type', 'NOTICED_FACE',    'magnitude', 1)
            )
          ),
          '{reaction_text}',
          to_jsonb($$You raise your hand with a question about quiet hours.

Sandra answers without hesitation. She has done this before.

The guy next to you introduced himself as Cal before the meeting started. He leans back now like he is watching to see what kind of person you are.$$::text)
        )
      WHEN choice->>'id' = 'talk_with_cal' THEN
        jsonb_set(
          jsonb_set(
            choice,
            '{events_emitted}',
            jsonb_build_array(
              jsonb_build_object('npc_id', 'npc_floor_cal', 'type', 'INTRODUCED_SELF', 'magnitude', 1),
              jsonb_build_object('npc_id', 'npc_ra_sandra', 'type', 'NOTICED_FACE',    'magnitude', 1)
            )
          ),
          '{reaction_text}',
          to_jsonb($$Cal has opinions about everything the RA says. None of them are mean -- he just has a running commentary.

You find yourself laughing once.

The RA notices.$$::text)
        )
      WHEN choice->>'id' = 'sit_quiet' THEN
        jsonb_set(
          choice,
          '{events_emitted}',
          jsonb_build_array(
            jsonb_build_object('npc_id', 'npc_ra_sandra', 'type', 'NOTICED_FACE', 'magnitude', 1),
            jsonb_build_object('npc_id', 'npc_floor_cal', 'type', 'NOTICED_FACE', 'magnitude', 1)
          )
        )
      ELSE choice
    END
  )
  FROM jsonb_array_elements(choices) AS choice
)
WHERE slug = 's8_floor_meeting';

-- ============================================================
-- s9: Fix body (Miguel reference name-free), fix follow_miguel events
--     and reaction_text_conditions, approach_radio_table already correct.
--     sign_up_something: NOTICED_FACE for Jordan.
-- ============================================================
UPDATE public.storylets
SET
  body = $$The quad is louder than a quad should be.

Tables for everything: debate team, newspaper, campus radio, intramural sports, the Newman Center, the film club, something called the Free Thinkers Society.

One guy is already at three tables, it looks like -- talking to everyone, collecting flyers he will never read.

Near the edge of things, someone is standing alone in front of the campus radio table, looking at a sign-up sheet like they are deciding something.

You notice them because they are not performing ease.

Everyone else here is performing ease.

This person is not.$$
WHERE slug = 's9_orientation_fair';

UPDATE public.storylets
SET choices = (
  SELECT jsonb_agg(
    CASE
      WHEN choice->>'id' = 'follow_miguel' THEN
        jsonb_set(
          jsonb_set(
            choice,
            '{events_emitted}',
            jsonb_build_array(
              jsonb_build_object('npc_id', 'npc_connector_miguel', 'type', 'INTRODUCED_SELF', 'magnitude', 1)
            )
          ),
          '{reaction_text_conditions}',
          jsonb_build_array(
            jsonb_build_object(
              'if', jsonb_build_object('requires_npc_met', jsonb_build_array('npc_connector_miguel')),
              'text', $$Miguel moves through the fair like he has been here for years.

He remembers your name already. That should feel normal. It does not quite.$$
            ),
            jsonb_build_object(
              'if', jsonb_build_object(
                'not', jsonb_build_object('requires_npc_met', jsonb_build_array('npc_connector_miguel'))
              ),
              'text', $$You fall in beside the guy from three tables at once.

"Miguel," he says when he clocks you, hand out, not slowing down.

You give your name. He moves on. You follow.$$
            )
          )
        )
      WHEN choice->>'id' = 'sign_up_something' THEN
        jsonb_set(
          choice,
          '{events_emitted}',
          jsonb_build_array(
            jsonb_build_object('npc_id', 'npc_ambiguous_jordan', 'type', 'NOTICED_FACE', 'magnitude', 1)
          )
        )
      ELSE choice
    END
  )
  FROM jsonb_array_elements(choices) AS choice
)
WHERE slug = 's9_orientation_fair';

-- ============================================================
-- s10: Simplify parent event logic. Parent is met:true at start.
--      perform_fine: single AWKWARD_MOMENT (remove duplicate SHOWED_UP).
--      ask_for_something: SHOWED_UP already correct.
--      keep_it_short: DEFERRED_TENSION already correct.
--      tell_truth_hard: CONFIDED_IN already correct.
-- ============================================================
UPDATE public.storylets
SET choices = (
  SELECT jsonb_agg(
    CASE
      WHEN choice->>'id' = 'perform_fine' THEN
        jsonb_set(
          choice,
          '{events_emitted}',
          jsonb_build_array(
            jsonb_build_object('npc_id', 'npc_parent_voice', 'type', 'AWKWARD_MOMENT', 'magnitude', 1)
          )
        )
      WHEN choice->>'id' = 'keep_it_short' THEN
        jsonb_set(
          choice,
          '{events_emitted}',
          jsonb_build_array(
            jsonb_build_object('npc_id', 'npc_parent_voice', 'type', 'DEFERRED_TENSION', 'magnitude', 1)
          )
        )
      WHEN choice->>'id' = 'ask_for_something' THEN
        jsonb_set(
          choice,
          '{events_emitted}',
          jsonb_build_array(
            jsonb_build_object('npc_id', 'npc_parent_voice', 'type', 'SHOWED_UP', 'magnitude', 1)
          )
        )
      ELSE choice
    END
  )
  FROM jsonb_array_elements(choices) AS choice
)
WHERE slug = 's10_parent_call_w1';

-- ============================================================
-- s11: Fix body to not name Cal before introduction.
--      go_with_cal: INTRODUCED_SELF + SHOWED_UP with conditional reaction.
--      invite_in_instead: INTRODUCED_SELF + SMALL_KINDNESS.
--      decline_cal_politely: NOTICED_FACE (they see him but decline).
-- ============================================================
UPDATE public.storylets
SET
  body = $$11:14 PM.

Three knocks on your door.

You were not asleep. You were almost asleep, which is worse.

A guy from the floor is standing there -- you may have seen him at the meeting -- wearing a jacket like he is going somewhere, holding two cans of something.

"There's a thing," he says. "Not a party. Just -- a thing. Second floor of Whitmore."

He is not pressuring you. He just exists at 11pm, apparently, and wants company.

The light under Dana's door is already off.

You look at your schedule on the desk.

First class is at 8.$$
WHERE slug = 's11_cal_midnight';

UPDATE public.storylets
SET choices = (
  SELECT jsonb_agg(
    CASE
      WHEN choice->>'id' = 'go_with_cal' THEN
        jsonb_set(
          jsonb_set(
            choice,
            '{events_emitted}',
            jsonb_build_array(
              jsonb_build_object('npc_id', 'npc_floor_cal', 'type', 'INTRODUCED_SELF', 'magnitude', 1),
              jsonb_build_object('npc_id', 'npc_floor_cal', 'type', 'SHOWED_UP',       'magnitude', 1)
            )
          ),
          '{reaction_text_conditions}',
          jsonb_build_array(
            jsonb_build_object(
              'if', jsonb_build_object('requires_npc_met', jsonb_build_array('npc_floor_cal')),
              'text', $$The thing at Whitmore is about twelve people in a common room with a cassette player too loud.

It is fine. Better than fine.

You get back at 1:30.

Morning arrives like a consequence.$$
            ),
            jsonb_build_object(
              'if', jsonb_build_object(
                'not', jsonb_build_object('requires_npc_met', jsonb_build_array('npc_floor_cal'))
              ),
              'text', $$He tells you his name on the way over. Cal. Like that explains everything.

The thing at Whitmore is about twelve people in a common room with a cassette player too loud.

It is fine. Better than fine.

You get back at 1:30.

Morning arrives like a consequence.$$
            )
          )
        )
      WHEN choice->>'id' = 'decline_cal_politely' THEN
        jsonb_set(
          choice,
          '{events_emitted}',
          jsonb_build_array(
            jsonb_build_object('npc_id', 'npc_floor_cal', 'type', 'NOTICED_FACE', 'magnitude', 1)
          )
        )
      WHEN choice->>'id' = 'invite_in_instead' THEN
        jsonb_set(
          choice,
          '{events_emitted}',
          jsonb_build_array(
            jsonb_build_object('npc_id', 'npc_floor_cal', 'type', 'INTRODUCED_SELF', 'magnitude', 1),
            jsonb_build_object('npc_id', 'npc_floor_cal', 'type', 'SMALL_KINDNESS',  'magnitude', 1)
          )
        )
      ELSE choice
    END
  )
  FROM jsonb_array_elements(choices) AS choice
)
WHERE slug = 's11_cal_midnight';
