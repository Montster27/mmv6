-- 0142_add_reaction_text_to_arc_beat_choices.sql
-- Add reaction_text to all 24 FSM arc beat step choices.
-- These steps were seeded in 0138 without reaction_text and migrated to
-- the storylets table by 0139.  ArcBeatCard.tsx renders chosenOption.reaction_text
-- after a player selects an option; without this data nothing was displayed.
--
-- Strategy: for each step, rebuild the choices array by merging a
-- reaction_text field into each choice object (keyed by choice.id,
-- which was remapped from option_key in 0139).

-- ─── Helper macro (inline subquery reused 24 times) ──────────────────────────
-- UPDATE public.storylets
-- SET choices = (
--   SELECT jsonb_agg(
--     c || jsonb_build_object('reaction_text',
--       CASE c->>'id' WHEN 'key' THEN 'text' ... END)
--   )
--   FROM jsonb_array_elements(choices) AS c
-- )
-- WHERE slug = '...';


-- ═══════════════════════════════════════════════════════════════════
-- STREAM 1: THE ROOMMATE
-- ═══════════════════════════════════════════════════════════════════

-- Beat 1 – First Real Conversation
UPDATE public.storylets
SET choices = (
  SELECT jsonb_agg(
    c || jsonb_build_object('reaction_text',
      CASE c->>'id'
        WHEN 'volunteer_real'  THEN 'Something shifted in the room when you said it. Not much. But enough to make it a real conversation instead of a checklist.'
        WHEN 'keep_surface'    THEN 'You asked the questions. He answered. You still don''t know much about him, but he doesn''t know much about you either. That''s fine for now.'
        WHEN 'brief_nod'       THEN 'You got settled. The conversation ended before it started. That''s probably for the best — you have the whole year.'
        ELSE c->>'reaction_text'
      END
    )
  )
  FROM jsonb_array_elements(choices) AS c
)
WHERE slug = 'arc_roommate_roommate_s1_first_conversation';

-- Beat 2 – The First Friction
UPDATE public.storylets
SET choices = (
  SELECT jsonb_agg(
    c || jsonb_build_object('reaction_text',
      CASE c->>'id'
        WHEN 'address_directly' THEN 'It was awkward for about thirty seconds. Then it was done. He nodded. You nodded. Something small was established.'
        WHEN 'let_it_go'        THEN 'You let it go. The thing is still there, but smaller now. You''re not sure if ignoring it was the right call or just the easier one.'
        WHEN 'passive_adjust'   THEN 'You moved your stuff. He didn''t say anything. Neither did you. The room is a little quieter than it was.'
        ELSE c->>'reaction_text'
      END
    )
  )
  FROM jsonb_array_elements(choices) AS c
)
WHERE slug = 'arc_roommate_roommate_s2_first_friction';

-- Beat 3 – The Revealing Moment
UPDATE public.storylets
SET choices = (
  SELECT jsonb_agg(
    c || jsonb_build_object('reaction_text',
      CASE c->>'id'
        WHEN 'engage_openly'       THEN 'He talked more than you expected. You learned something. Not everything, but something real. The room felt different for a little while.'
        WHEN 'acknowledge_quietly' THEN 'You said something small — enough to show you noticed. He appreciated it without making it a thing.'
        WHEN 'pretend_not_noticed' THEN 'You stayed in your lane. The moment passed. You''re not sure if that was respectful or cowardly.'
        ELSE c->>'reaction_text'
      END
    )
  )
  FROM jsonb_array_elements(choices) AS c
)
WHERE slug = 'arc_roommate_roommate_s3_revealing_moment';

-- Beat 4 – The Shape of Things
UPDATE public.storylets
SET choices = (
  SELECT jsonb_agg(
    c || jsonb_build_object('reaction_text',
      CASE c->>'id'
        WHEN 'name_the_good'    THEN 'He looked surprised. Then he smiled — the real one, not the floor-meeting kind. Something settled between you.'
        WHEN 'keep_the_peace'   THEN 'It''s working because neither of you pushed past what it needs to be. That''s not nothing.'
        WHEN 'name_the_tension' THEN 'It came out rougher than you planned. He got quiet. Then he said you were right. You''re not sure what comes next.'
        ELSE c->>'reaction_text'
      END
    )
  )
  FROM jsonb_array_elements(choices) AS c
)
WHERE slug = 'arc_roommate_roommate_s4_fork';


-- ═══════════════════════════════════════════════════════════════════
-- STREAM 2: ACADEMIC FOOTING
-- ═══════════════════════════════════════════════════════════════════

-- Beat 1 – The Syllabus
UPDATE public.storylets
SET choices = (
  SELECT jsonb_agg(
    c || jsonb_build_object('reaction_text',
      CASE c->>'id'
        WHEN 'ask_classmate'      THEN 'She laughed — "I have no idea, honestly." You felt immediately better. You still have no answers, but now you have company.'
        WHEN 'process_alone'      THEN 'You sat with it. The numbers are real. The workload is real. You''ll deal with it when it gets here.'
        WHEN 'approach_professor' THEN 'He took a minute with you. Told you the reading could be done in sections. Suggested the most critical chapters. Something clarified.'
        ELSE c->>'reaction_text'
      END
    )
  )
  FROM jsonb_array_elements(choices) AS c
)
WHERE slug = 'arc_academic_academic_s1_syllabus';

-- Beat 2 – The First Gap
UPDATE public.storylets
SET choices = (
  SELECT jsonb_agg(
    c || jsonb_build_object('reaction_text',
      CASE c->>'id'
        WHEN 'office_hours'  THEN 'You went. It was less intimidating than you expected. The TA explained the same thing three different ways until you got it. You left knowing something you didn''t before.'
        WHEN 'study_group'   THEN 'There were four of you around a table in the library basement. You understood less than them on two things and more on one. That one felt good.'
        WHEN 'push_through'  THEN 'You got through it. Whether you actually understand it is a different question. That question can wait.'
        WHEN 'minimize'      THEN 'You moved on. The quiz mark is already fading. You''re fine. You''ll be fine.'
        ELSE c->>'reaction_text'
      END
    )
  )
  FROM jsonb_array_elements(choices) AS c
)
WHERE slug = 'arc_academic_academic_s2_first_gap';

-- Beat 3 – The Identity Collision
UPDATE public.storylets
SET choices = (
  SELECT jsonb_agg(
    c || jsonb_build_object('reaction_text',
      CASE c->>'id'
        WHEN 'reach_toward'    THEN 'She described her preparation method. You went back to your room and wrote it down. Something you''d been doing wrong became clear.'
        WHEN 'observe_quietly' THEN 'You noted it. You''re recalibrating. That''s uncomfortable and probably necessary.'
        WHEN 'double_down'     THEN 'You spent three hours in the library. You''re not sure you''re prepared. You''re sure you''re trying.'
        ELSE c->>'reaction_text'
      END
    )
  )
  FROM jsonb_array_elements(choices) AS c
)
WHERE slug = 'arc_academic_academic_s3_identity_collision';

-- Beat 4 – First Week, Academic
UPDATE public.storylets
SET choices = (
  SELECT jsonb_agg(
    c || jsonb_build_object('reaction_text',
      CASE c->>'id'
        WHEN 'found_a_thread'      THEN 'One class has started to feel like it''s yours. That''s new. That''s something.'
        WHEN 'functional'          THEN 'You''re keeping up. The grade sheet is clean. You''ll take it.'
        WHEN 'acknowledge_warning' THEN 'You wrote it down: you''re behind on the reading. You''ll deal with it this weekend. Maybe.'
        ELSE c->>'reaction_text'
      END
    )
  )
  FROM jsonb_array_elements(choices) AS c
)
WHERE slug = 'arc_academic_academic_s4_fork';


-- ═══════════════════════════════════════════════════════════════════
-- STREAM 3: MONEY REALITY
-- ═══════════════════════════════════════════════════════════════════

-- Beat 1 – The Bookstore
UPDATE public.storylets
SET choices = (
  SELECT jsonb_agg(
    c || jsonb_build_object('reaction_text',
      CASE c->>'id'
        WHEN 'buy_everything'  THEN 'You spent the money. The stack of books on your desk is real. The number in your head is also real.'
        WHEN 'buy_essentials'  THEN 'You bought two of the four required texts. The others can wait until you know whether you actually need them.'
        WHEN 'used_copies'     THEN 'The bookstore was out. There''s a board outside the library. You put your name on it. It''ll take a few days.'
        WHEN 'share_classmate' THEN 'She said yes without hesitating. You exchanged numbers. One problem solved, and unexpectedly, maybe a study partner.'
        ELSE c->>'reaction_text'
      END
    )
  )
  FROM jsonb_array_elements(choices) AS c
)
WHERE slug = 'arc_money_money_s1_bookstore';

-- Beat 2 – The Dining Hall Calculation
UPDATE public.storylets
SET choices = (
  SELECT jsonb_agg(
    c || jsonb_build_object('reaction_text',
      CASE c->>'id'
        WHEN 'go_and_spend'    THEN 'You went. You spent the money. The pizza was good. It was worth it — you think.'
        WHEN 'go_minimize'     THEN 'You nursed a Coke for two hours. Nobody noticed or cared. You were there, which was the point.'
        WHEN 'make_excuse'     THEN 'You said you had reading to do. They went without you. The dorm room was very quiet.'
        WHEN 'suggest_cheaper' THEN 'You mentioned the dining hall was just as close. They shrugged and agreed. Crisis averted, no explanation required.'
        ELSE c->>'reaction_text'
      END
    )
  )
  FROM jsonb_array_elements(choices) AS c
)
WHERE slug = 'arc_money_money_s2_dining_hall';

-- Beat 3 – The Friction Event
UPDATE public.storylets
SET choices = (
  SELECT jsonb_agg(
    c || jsonb_build_object('reaction_text',
      CASE c->>'id'
        WHEN 'problem_solve'  THEN 'You figured it out. It cost you three hours and some stress, but you handled it without asking anyone.'
        WHEN 'tell_someone'   THEN 'She didn''t have the answer but she listened. That helped more than you expected.'
        WHEN 'check_job_board' THEN 'There''s a library assistant position. Applications due Friday. You wrote down the hours.'
        WHEN 'absorb_stress'  THEN 'You absorbed it. It''s in you now, quieter than it was, but it didn''t go anywhere.'
        ELSE c->>'reaction_text'
      END
    )
  )
  FROM jsonb_array_elements(choices) AS c
)
WHERE slug = 'arc_money_money_s3_friction_event';

-- Beat 4 – First Week, Financial
UPDATE public.storylets
SET choices = (
  SELECT jsonb_agg(
    c || jsonb_build_object('reaction_text',
      CASE c->>'id'
        WHEN 'functional_tension' THEN 'It''s there. You''re aware of it. That''s the honest version of "okay."'
        WHEN 'job_decision'       THEN 'You put in the application. Waiting is its own kind of action.'
        WHEN 'called_home'        THEN 'Your dad picked up on the second ring. He said he''d send something. It resolved the immediate problem. It created a different kind of feeling.'
        ELSE c->>'reaction_text'
      END
    )
  )
  FROM jsonb_array_elements(choices) AS c
)
WHERE slug = 'arc_money_money_s4_fork';


-- ═══════════════════════════════════════════════════════════════════
-- STREAM 4: FINDING YOUR PEOPLE
-- ═══════════════════════════════════════════════════════════════════

-- Beat 1 – The Orientation Fair
UPDATE public.storylets
SET choices = (
  SELECT jsonb_agg(
    c || jsonb_build_object('reaction_text',
      CASE c->>'id'
        WHEN 'practical_signup'   THEN 'You put your name on the campus newspaper list. It''s practical. It might also lead somewhere.'
        WHEN 'interesting_signup' THEN 'You signed up for the philosophy club and the hiking group. Neither is strategic. Both of them sound like you, actually.'
        WHEN 'people_like_you'    THEN 'There were five of them at the table. You recognized something in their posture. You signed up. You''ll see.'
        WHEN 'sign_up_nothing'    THEN 'You walked through the whole thing and left with nothing. It wasn''t the right day. Or you''re not a signup-sheet kind of person. Hard to tell yet.'
        ELSE c->>'reaction_text'
      END
    )
  )
  FROM jsonb_array_elements(choices) AS c
)
WHERE slug = 'arc_belonging_belonging_s1_orientation_fair';

-- Beat 2 – The Floor Social
UPDATE public.storylets
SET choices = (
  SELECT jsonb_agg(
    c || jsonb_build_object('reaction_text',
      CASE c->>'id'
        WHEN 'one_person_deep'   THEN 'You talked to one person for forty minutes about where you were both from. You don''t remember her major. You remember she grew up ten miles from your grandmother.'
        WHEN 'circulate_surface' THEN 'You talked to everyone a little. Nobody knows you better but you know them slightly. That''s what surfaces are for.'
        WHEN 'find_the_lost_one' THEN 'You found him over by the window. He''d been there twenty minutes with nowhere to go. You both recognized the situation. Conversation was easy after that.'
        WHEN 'leave_early'       THEN 'You made it forty minutes. That''s something. You''ll try again tomorrow.'
        ELSE c->>'reaction_text'
      END
    )
  )
  FROM jsonb_array_elements(choices) AS c
)
WHERE slug = 'arc_belonging_belonging_s2_floor_social';

-- Beat 3 – The First Thread
UPDATE public.storylets
SET choices = (
  SELECT jsonb_agg(
    c || jsonb_build_object('reaction_text',
      CASE c->>'id'
        WHEN 'follow_up'      THEN 'You knocked on her door. She was surprised. You both pretended you weren''t nervous. You ended up talking for another hour.'
        WHEN 'keep_the_paper' THEN 'It''s in your jacket pocket. You haven''t thrown it away. That means something.'
        WHEN 'let_it_be'      THEN 'It was a good conversation. Those exist. Not every one needs to be the beginning of something.'
        ELSE c->>'reaction_text'
      END
    )
  )
  FROM jsonb_array_elements(choices) AS c
)
WHERE slug = 'arc_belonging_belonging_s3_first_connection';

-- Beat 4 – First Week, Belonging
UPDATE public.storylets
SET choices = (
  SELECT jsonb_agg(
    c || jsonb_build_object('reaction_text',
      CASE c->>'id'
        WHEN 'found_a_home'        THEN 'You know where you''re going after dinner. That''s more than most people can say at the end of the first week.'
        WHEN 'still_searching'     THEN 'You''re not inside anything yet, but you''re looking. That''s a kind of presence that tends to pay off.'
        WHEN 'deliberate_solitude' THEN 'You''ve chosen to watch before you join. That''s not the same as not belonging. It''s a different pace.'
        ELSE c->>'reaction_text'
      END
    )
  )
  FROM jsonb_array_elements(choices) AS c
)
WHERE slug = 'arc_belonging_belonging_s4_fork';


-- ═══════════════════════════════════════════════════════════════════
-- STREAM 5: FIRST OPPORTUNITY
-- ═══════════════════════════════════════════════════════════════════

-- Beat 1 – Discovery
UPDATE public.storylets
SET choices = (
  SELECT jsonb_agg(
    c || jsonb_build_object('reaction_text',
      CASE c->>'id'
        WHEN 'pursue_info'     THEN 'You found the flyer, found the office, found out what it actually requires. It''s real. The question is whether you are.'
        WHEN 'note_and_move'   THEN 'You noted it. It''s in the back of your mind now. You''ll see if it''s still there tomorrow.'
        WHEN 'mention_someone' THEN 'He said "you should definitely do that" in the way people say it when they mean it. That helped.'
        WHEN 'dismiss_it'      THEN 'You walked past it. You''re not sure if that was a decision or just inertia.'
        ELSE c->>'reaction_text'
      END
    )
  )
  FROM jsonb_array_elements(choices) AS c
)
WHERE slug = 'arc_opportunity_opportunity_s1_discovery';

-- Beat 2 – The Obstacle
UPDATE public.storylets
SET choices = (
  SELECT jsonb_agg(
    c || jsonb_build_object('reaction_text',
      CASE c->>'id'
        WHEN 'push_through_obstacle' THEN 'You figured out the logistics. It took an hour and a map printout. The window is still open.'
        WHEN 'gather_more_info'      THEN 'You know more now. What you do with that is still undecided.'
        WHEN 'obstacle_discourages'  THEN 'You let it be a sign. Maybe it was. The window is closed.'
        ELSE c->>'reaction_text'
      END
    )
  )
  FROM jsonb_array_elements(choices) AS c
)
WHERE slug = 'arc_opportunity_opportunity_s2_obstacle';

-- Beat 3 – The Decision Point
UPDATE public.storylets
SET choices = (
  SELECT jsonb_agg(
    c || jsonb_build_object('reaction_text',
      CASE c->>'id'
        WHEN 'go_for_it'     THEN 'You went. You said you were interested and new and didn''t have all the experience yet. She said she appreciated the honesty. You''re waiting to hear.'
        WHEN 'prepare_first' THEN 'You spent a day on it. The preparation helped. You felt less like you were faking it when you showed up.'
        WHEN 'let_it_expire' THEN 'The window closed. You''re telling yourself there will be others. There will be. Whether that makes this one okay is a different question.'
        ELSE c->>'reaction_text'
      END
    )
  )
  FROM jsonb_array_elements(choices) AS c
)
WHERE slug = 'arc_opportunity_opportunity_s3_decision_point';

-- Beat 4 – First Week, Opportunity
UPDATE public.storylets
SET choices = (
  SELECT jsonb_agg(
    c || jsonb_build_object('reaction_text',
      CASE c->>'id'
        WHEN 'tried_worked'  THEN 'You got in. The next question is what you''ll do with that. The first answer is: show up.'
        WHEN 'tried_not_in'  THEN 'They said no. You went, and that part is real, and you''ll hold onto it.'
        WHEN 'didnt_try'     THEN 'It''s gone. You''re fine. You''re not entirely fine. Both of those things are true.'
        ELSE c->>'reaction_text'
      END
    )
  )
  FROM jsonb_array_elements(choices) AS c
)
WHERE slug = 'arc_opportunity_opportunity_s4_fork';


-- ═══════════════════════════════════════════════════════════════════
-- STREAM 6: SOMETHING FROM HOME
-- ═══════════════════════════════════════════════════════════════════

-- Beat 1 – The First Contact
UPDATE public.storylets
SET choices = (
  SELECT jsonb_agg(
    c || jsonb_build_object('reaction_text',
      CASE c->>'id'
        WHEN 'respond_fully'      THEN 'You told her more than you meant to. She got quiet in the way she gets quiet when she''s listening hard. You felt less alone after.'
        WHEN 'respond_cheerfully' THEN 'You told her everything was great. She said she was glad. You both played your parts.'
        WHEN 'respond_briefly'    THEN 'You kept it short. She heard what you weren''t saying and let it go. She''ll call again Thursday.'
        WHEN 'delay'              THEN 'You haven''t written back yet. It''s been two days. You''ll do it tonight. Or tomorrow.'
        ELSE c->>'reaction_text'
      END
    )
  )
  FROM jsonb_array_elements(choices) AS c
)
WHERE slug = 'arc_home_home_s1_first_contact';

-- Beat 2 – The Contrast Moment
UPDATE public.storylets
SET choices = (
  SELECT jsonb_agg(
    c || jsonb_build_object('reaction_text',
      CASE c->>'id'
        WHEN 'name_the_difference' THEN 'You said it quietly, to yourself, in the stairwell. The gap is real. Naming it doesn''t close it, but it makes you the person who can see it.'
        WHEN 'adjust_quietly'      THEN 'You let the new version of yourself take over, just for that moment. It was easier than you expected. You''re not sure if that''s good.'
        WHEN 'sit_with_it'         THEN 'You didn''t resolve it. Both versions of you are here right now, and neither one fits perfectly anywhere. That''s probably true for longer than a week.'
        ELSE c->>'reaction_text'
      END
    )
  )
  FROM jsonb_array_elements(choices) AS c
)
WHERE slug = 'arc_home_home_s2_contrast_moment';

-- Beat 3 – The Request
UPDATE public.storylets
SET choices = (
  SELECT jsonb_agg(
    c || jsonb_build_object('reaction_text',
      CASE c->>'id'
        WHEN 'respond_to_actual_ask' THEN 'You said what you actually thought. It took more out of you than expected. She paused, then said she was glad you told her.'
        WHEN 'respond_to_surface'    THEN 'You answered the question they asked. The one underneath it is still there.'
        WHEN 'set_a_limit'           THEN 'You said you''d call Sunday. You felt guilty for about an hour. Then you stopped. That''s the deal you made.'
        WHEN 'feel_the_guilt'        THEN 'You felt it. You''re still feeling it. You put it in the drawer with everything else and closed the drawer.'
        ELSE c->>'reaction_text'
      END
    )
  )
  FROM jsonb_array_elements(choices) AS c
)
WHERE slug = 'arc_home_home_s3_request';

-- Beat 4 – First Week, Home
UPDATE public.storylets
SET choices = (
  SELECT jsonb_agg(
    c || jsonb_build_object('reaction_text',
      CASE c->>'id'
        WHEN 'healthy_distance' THEN 'You''re connected and you''re here. Both things are true and neither one cancels the other.'
        WHEN 'carrying_quietly' THEN 'Something from home is with you. You''re carrying it. You''ll put it down eventually.'
        WHEN 'pull_is_real'     THEN 'Home is louder than it was supposed to be. You''re spending energy on it. That''s just the truth of the first week.'
        WHEN 'clean_rupture'    THEN 'Something widened the gap. You didn''t plan it. You''re not sure how you feel about it. You''re here, and that''s where you are.'
        ELSE c->>'reaction_text'
      END
    )
  )
  FROM jsonb_array_elements(choices) AS c
)
WHERE slug = 'arc_home_home_s4_fork';
