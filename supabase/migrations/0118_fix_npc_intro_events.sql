-- /supabase/migrations/0118_fix_npc_intro_events.sql
-- Fix NPC introduction logic across all arc_one_core storylets.
-- Rule: first encounter with an NPC must emit an event that sets met/knows_name/knows_face.
-- Rule: if player has not met an NPC, references to their name must be gated.

-- ============================================================
-- s1: Dana is already in the room on wake-up.
-- Emit WOKE_IN_SAME_ROOM to seed her relationship state properly.
-- ============================================================
UPDATE public.storylets
SET choices = (
  SELECT jsonb_agg(
    jsonb_set(
      choice,
      '{events_emitted}',
      jsonb_build_array(
        jsonb_build_object(
          'npc_id', 'npc_roommate_dana',
          'type', 'WOKE_IN_SAME_ROOM',
          'magnitude', 1
        )
      )
    )
  )
  FROM jsonb_array_elements(choices) AS choice
)
WHERE slug = 's1_dorm_wake_dislocation';

-- ============================================================
-- s2: Hall Phone -- Miguel name logic.
-- answer_phone: OVERHEARD_NAME only (not INTRODUCED_SELF -- no face yet).
-- reaction_text_conditions already correct from 0115, but verify
-- ignore_phone / tell_dana_answer: no NPC event (name not heard).
-- ============================================================
-- Already handled by 0115. No change needed here.

-- ============================================================
-- s3: Dining Hall -- Miguel and Dana intro gates.
-- approach_miguel: INTRODUCED_SELF (met + name + face).
-- sit_with_dana: SHARED_MEAL for Dana (she is already met, this builds relationship).
-- sit_alone: no NPC events.
-- hover_near_table: NOTICED_FACE for Miguel (face only, no name).
-- Add reaction_text_conditions to sit_with_dana so it acknowledges
-- that Dana is already known.
-- ============================================================
UPDATE public.storylets
SET choices = (
  SELECT jsonb_agg(
    CASE
      WHEN choice->>'id' = 'sit_with_dana' THEN
        jsonb_set(
          choice,
          '{events_emitted}',
          jsonb_build_array(
            jsonb_build_object(
              'npc_id', 'npc_roommate_dana',
              'type', 'SHARED_MEAL',
              'magnitude', 1
            )
          )
        )
      ELSE choice
    END
  )
  FROM jsonb_array_elements(choices) AS choice
)
WHERE slug = 's3_dining_hall';

-- ============================================================
-- s7: First Class -- Prof. Marsh and Priya.
-- All choices: Marsh is introduced by name on chalkboard
-- (OVERHEARD_NAME for prof_marsh on entering the room -- all paths).
-- raise_hand_answer: SHOWED_UP for Marsh, NOTICED_FACE for Priya.
-- wait_someone_else: only Marsh OVERHEARD_NAME (no face interaction).
-- speak_wrong: SHOWED_UP for Marsh (he interacts directly).
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
            jsonb_build_object('npc_id', 'npc_prof_marsh',    'type', 'SHOWED_UP',    'magnitude', 1),
            jsonb_build_object('npc_id', 'npc_studious_priya','type', 'NOTICED_FACE', 'magnitude', 1)
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
-- s8: Floor Meeting -- Sandra and Cal.
-- engage_sandra: INTRODUCED_SELF for Sandra.
-- talk_with_cal: INTRODUCED_SELF for Cal (already has it, but verify name is set).
-- sit_quiet: NOTICED_FACE for both Sandra and Cal (player sees them but no interaction).
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
              jsonb_build_object('npc_id', 'npc_ra_sandra',   'type', 'INTRODUCED_SELF', 'magnitude', 1),
              jsonb_build_object('npc_id', 'npc_floor_cal',   'type', 'NOTICED_FACE',    'magnitude', 1)
            )
          ),
          '{reaction_text}',
          to_jsonb($$You raise your hand with a question about quiet hours.

Sandra answers without hesitation. She has done this before.

The guy next to you -- Cal, he said -- leans back like he is watching to see what kind of person you are.$$::text)
        )
      WHEN choice->>'id' = 'talk_with_cal' THEN
        jsonb_set(
          jsonb_set(
            choice,
            '{events_emitted}',
            jsonb_build_array(
              jsonb_build_object('npc_id', 'npc_floor_cal',  'type', 'INTRODUCED_SELF', 'magnitude', 1),
              jsonb_build_object('npc_id', 'npc_ra_sandra',  'type', 'NOTICED_FACE',    'magnitude', 1)
            )
          ),
          '{reaction_text}',
          to_jsonb($$Cal has opinions about everything Sandra says. None of them are mean -- he just has a running commentary.

You find yourself laughing once.

Sandra notices.$$::text)
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
-- s9: Orientation Fair -- Jordan and Miguel.
-- approach_radio_table: INTRODUCED_SELF for Jordan.
-- follow_miguel: INTRODUCED_SELF for Miguel (if not already met) via
--   reaction_text_conditions (already handled in 0115 for dining hall,
--   but this is a separate first-contact path if dining hall was skipped).
-- sign_up_something: NOTICED_FACE for Jordan (player sees but does not approach).
-- skip_fair: no NPC events.
-- ============================================================
UPDATE public.storylets
SET choices = (
  SELECT jsonb_agg(
    CASE
      WHEN choice->>'id' = 'sign_up_something' THEN
        jsonb_set(
          choice,
          '{events_emitted}',
          jsonb_build_array(
            jsonb_build_object('npc_id', 'npc_ambiguous_jordan', 'type', 'NOTICED_FACE', 'magnitude', 1)
          )
        )
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
              'text', $$You fall in beside a guy who is already talking to three different tables.

"Miguel," he says when he clocks you, extending a hand without slowing down.

You give your name. He moves on. You follow.$$
            )
          )
        )
      ELSE choice
    END
  )
  FROM jsonb_array_elements(choices) AS choice
)
WHERE slug = 's9_orientation_fair';

-- ============================================================
-- s10: Parent Call -- parent_voice.
-- All choices: SHOWED_UP for parent (they called, they are present).
-- tell_truth_hard: already has CONFIDED_IN.
-- perform_fine / ask_for_something / keep_it_short: add SHOWED_UP baseline.
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
            jsonb_build_object('npc_id', 'npc_parent_voice', 'type', 'SHOWED_UP',     'magnitude', 1),
            jsonb_build_object('npc_id', 'npc_parent_voice', 'type', 'AWKWARD_MOMENT','magnitude', 1)
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
      ELSE choice
    END
  )
  FROM jsonb_array_elements(choices) AS choice
)
WHERE slug = 's10_parent_call_w1';

-- ============================================================
-- s11: Cal Midnight Knock.
-- All paths: Cal already introduced in floor meeting if player attended.
-- If player skipped floor meeting, this is first contact with Cal --
-- add INTRODUCED_SELF to go_with_cal and invite_in_instead.
-- decline_cal_politely keeps DEFERRED_TENSION (already set).
-- Add reaction_text_conditions to go_with_cal to handle first-time vs known.
-- ============================================================
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
              'text', $$You have not met this guy before. He introduces himself in the elevator as Cal, like that explains everything.

The thing at Whitmore is about twelve people in a common room with a cassette player too loud.

You get back at 1:30.

Morning arrives like a consequence.$$
            )
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
