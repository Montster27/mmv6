-- 0138_seed_arc_one_streams.sql
-- Seed the six simultaneous narrative streams for Arc One (First Week, 1983)
-- Each arc has 4 beats across days 1–7.
-- Options carry sets_stream_state to drive the per-stream FSM.

-- =============================================================
-- ARC DEFINITIONS (6 streams)
-- =============================================================

INSERT INTO public.arc_definitions (key, title, description, tags, is_enabled)
VALUES
  (
    'arc_roommate',
    'The Roommate',
    'A relationship you didn''t choose. The housing office did. His name is already on the whiteboard by the dorm phone when you arrive.',
    '["relationship","arc_one"]'::jsonb,
    true
  ),
  (
    'arc_academic',
    'Academic Footing',
    'You were good at school. Or you weren''t. Either way, what that meant back home no longer applies here.',
    '["academic","arc_one"]'::jsonb,
    true
  ),
  (
    'arc_money',
    'Money Reality',
    'Until now, money was your parents'' problem. Now it''s yours. The first week involves small financial moments that are actually large identity moments.',
    '["financial","arc_one"]'::jsonb,
    true
  ),
  (
    'arc_belonging',
    'Finding Your People',
    'The orientation fair is on the quad. Too many tables. Not enough information to choose intelligently. Everyone is performing confidence they may or may not feel.',
    '["belonging","arc_one"]'::jsonb,
    true
  ),
  (
    'arc_opportunity',
    'First Opportunity',
    'It appears early. Before you''ve found your footing. A flyer on a bulletin board, an offhand mention, a window that closes by Thursday.',
    '["opportunity","arc_one"]'::jsonb,
    true
  ),
  (
    'arc_home',
    'Something From Home',
    'You left. That was the choice. But leaving doesn''t mean it stopped. This stream doesn''t demand your attention. It arrives.',
    '["family","arc_one"]'::jsonb,
    true
  )
ON CONFLICT (key) DO NOTHING;


-- =============================================================
-- STREAM 1: THE ROOMMATE — 4 beats
-- =============================================================

-- Beat 1 — First Real Conversation (Day 1, due_offset=0)
INSERT INTO public.arc_steps
  (arc_id, step_key, order_index, title, body, options, default_next_step_key, due_offset_days, expires_after_days)
SELECT
  id,
  'roommate_s1_first_conversation',
  1,
  'First Real Conversation',
  'He''s there when you wake up. Small talk is inevitable — where are you from, what''s your major, did you bring a fan. You could be anyone here. But you also don''t want to say something you''ll regret for a year.',
  '[
    {
      "option_key": "volunteer_real",
      "label": "Volunteer something real about yourself",
      "energy_cost": 1,
      "sets_stream_state": {"stream": "roommate", "state": "genuine_connection"}
    },
    {
      "option_key": "keep_surface",
      "label": "Ask him questions — keep it surface for now",
      "energy_cost": 0
    },
    {
      "option_key": "brief_nod",
      "label": "Nod, get settled, find an excuse to leave",
      "energy_cost": 0
    }
  ]'::jsonb,
  'roommate_s2_first_friction',
  0,
  1
FROM public.arc_definitions WHERE key = 'arc_roommate'
ON CONFLICT (arc_id, step_key) DO NOTHING;

-- Beat 2 — The First Friction (Day 2–3, due_offset=1)
INSERT INTO public.arc_steps
  (arc_id, step_key, order_index, title, body, options, default_next_step_key, due_offset_days, expires_after_days)
SELECT
  id,
  'roommate_s2_first_friction',
  2,
  'The First Friction',
  'Something small. He plays music when you''re trying to sleep. You left wet towels on his chair. He had a friend over without warning. Not a fight. Just the first moment where you realize this requires negotiation.',
  '[
    {
      "option_key": "address_directly",
      "label": "Address it directly — name the thing",
      "energy_cost": 2,
      "sets_stream_state": {"stream": "roommate", "state": "genuine_connection"}
    },
    {
      "option_key": "let_it_go",
      "label": "Let it go — not worth a confrontation",
      "energy_cost": 0
    },
    {
      "option_key": "passive_adjust",
      "label": "Make a passive adjustment and hope he notices",
      "energy_cost": 0,
      "sets_stream_state": {"stream": "roommate", "state": "surface_tension"}
    }
  ]'::jsonb,
  'roommate_s3_revealing_moment',
  1,
  2
FROM public.arc_definitions WHERE key = 'arc_roommate'
ON CONFLICT (arc_id, step_key) DO NOTHING;

-- Beat 3 — The Revealing Moment (Day 4–5, due_offset=3)
INSERT INTO public.arc_steps
  (arc_id, step_key, order_index, title, body, options, default_next_step_key, due_offset_days, expires_after_days)
SELECT
  id,
  'roommate_s3_revealing_moment',
  3,
  'The Revealing Moment',
  'He gets a letter from home and his whole posture changes. Or he offers to show you something on campus he clearly knows well. Something happens that shows you who he actually is — or who you actually are in relation to him.',
  '[
    {
      "option_key": "engage_openly",
      "label": "Ask what happened — genuinely",
      "energy_cost": 1,
      "sets_stream_state": {"stream": "roommate", "state": "genuine_connection"}
    },
    {
      "option_key": "acknowledge_quietly",
      "label": "Acknowledge it without pressing — give him room",
      "energy_cost": 0
    },
    {
      "option_key": "pretend_not_noticed",
      "label": "Pretend you didn''t notice — stay out of it",
      "energy_cost": 0,
      "sets_stream_state": {"stream": "roommate", "state": "avoidance_pattern"}
    }
  ]'::jsonb,
  'roommate_s4_fork',
  3,
  2
FROM public.arc_definitions WHERE key = 'arc_roommate'
ON CONFLICT (arc_id, step_key) DO NOTHING;

-- Beat 4 — The Fork (Day 6–7, due_offset=5)
INSERT INTO public.arc_steps
  (arc_id, step_key, order_index, title, body, options, default_next_step_key, due_offset_days, expires_after_days)
SELECT
  id,
  'roommate_s4_fork',
  4,
  'The Shape of Things',
  'By end of the first week, the roommate relationship has taken a shape. You''re not the same kind of person, but something has been established. What is it?',
  '[
    {
      "option_key": "name_the_good",
      "label": "Tell him you''ve been glad to share the room",
      "energy_cost": 1,
      "sets_stream_state": {"stream": "roommate", "state": "genuine_connection"}
    },
    {
      "option_key": "keep_the_peace",
      "label": "Keep the peace, keep the distance — it''s working",
      "energy_cost": 0
    },
    {
      "option_key": "name_the_tension",
      "label": "Finally name the thing that''s been bothering you",
      "energy_cost": 2,
      "sets_stream_state": {"stream": "roommate", "state": "open_conflict"}
    }
  ]'::jsonb,
  null,
  5,
  1
FROM public.arc_definitions WHERE key = 'arc_roommate'
ON CONFLICT (arc_id, step_key) DO NOTHING;


-- =============================================================
-- STREAM 2: ACADEMIC FOOTING — 4 beats
-- =============================================================

-- Beat 1 — The Syllabus Moment (Day 2, due_offset=1)
INSERT INTO public.arc_steps
  (arc_id, step_key, order_index, title, body, options, default_next_step_key, due_offset_days, expires_after_days)
SELECT
  id,
  'academic_s1_syllabus',
  1,
  'The Syllabus',
  'First class. The professor distributes the course outline. The reading list is long. The paper due dates are real. There''s a midterm worth 40%. Nobody around you looks panicked — you''re not sure if that means they''re fine or also hiding it.',
  '[
    {
      "option_key": "ask_classmate",
      "label": "Ask the person next to you if this seems normal",
      "energy_cost": 1,
      "sets_stream_state": {"stream": "academic", "state": "active_engagement"}
    },
    {
      "option_key": "process_alone",
      "label": "Say nothing and process it alone",
      "energy_cost": 0
    },
    {
      "option_key": "approach_professor",
      "label": "Approach the professor after class",
      "energy_cost": 2,
      "sets_stream_state": {"stream": "academic", "state": "active_engagement"}
    }
  ]'::jsonb,
  'academic_s2_first_gap',
  1,
  2
FROM public.arc_definitions WHERE key = 'arc_academic'
ON CONFLICT (arc_id, step_key) DO NOTHING;

-- Beat 2 — The First Gap (Day 3–4, due_offset=2)
INSERT INTO public.arc_steps
  (arc_id, step_key, order_index, title, body, options, default_next_step_key, due_offset_days, expires_after_days)
SELECT
  id,
  'academic_s2_first_gap',
  2,
  'The First Gap',
  'A concept in lecture doesn''t connect. Or you do the first reading and it''s harder than expected. Or you get back a short diagnostic quiz with a mark that surprises you. This is not failure. But it''s the first signal.',
  '[
    {
      "option_key": "office_hours",
      "label": "Go to office hours — find the sheet, show up",
      "energy_cost": 2,
      "sets_stream_state": {"stream": "academic", "state": "active_engagement"}
    },
    {
      "option_key": "study_group",
      "label": "Form or join a study group",
      "energy_cost": 1,
      "sets_stream_state": {"stream": "academic", "state": "active_engagement"}
    },
    {
      "option_key": "push_through",
      "label": "Push through alone — you''ll figure it out",
      "energy_cost": 1
    },
    {
      "option_key": "minimize",
      "label": "\"It''s just the first week\" — move on",
      "energy_cost": 0,
      "sets_stream_state": {"stream": "academic", "state": "avoidance_spiral"}
    }
  ]'::jsonb,
  'academic_s3_identity_collision',
  2,
  2
FROM public.arc_definitions WHERE key = 'arc_academic'
ON CONFLICT (arc_id, step_key) DO NOTHING;

-- Beat 3 — The Identity Collision (Day 4–5, due_offset=3)
INSERT INTO public.arc_steps
  (arc_id, step_key, order_index, title, body, options, default_next_step_key, due_offset_days, expires_after_days)
SELECT
  id,
  'academic_s3_identity_collision',
  3,
  'The Identity Collision',
  'You meet someone who seems effortlessly prepared. Or someone who admits openly they have no idea what they''re doing and laughs about it. A professor singles out a student''s answer — and it''s better than what you were thinking.',
  '[
    {
      "option_key": "reach_toward",
      "label": "Introduce yourself — ask how they''re preparing",
      "energy_cost": 1,
      "sets_stream_state": {"stream": "academic", "state": "active_engagement"}
    },
    {
      "option_key": "observe_quietly",
      "label": "Note it, say nothing, recalibrate privately",
      "energy_cost": 0,
      "sets_stream_state": {"stream": "academic", "state": "quiet_doubt"}
    },
    {
      "option_key": "double_down",
      "label": "Go straight to the library — work harder",
      "energy_cost": 2,
      "sets_stream_state": {"stream": "academic", "state": "active_engagement"}
    }
  ]'::jsonb,
  'academic_s4_fork',
  3,
  2
FROM public.arc_definitions WHERE key = 'arc_academic'
ON CONFLICT (arc_id, step_key) DO NOTHING;

-- Beat 4 — The Fork (Day 6–7, due_offset=5)
INSERT INTO public.arc_steps
  (arc_id, step_key, order_index, title, body, options, default_next_step_key, due_offset_days, expires_after_days)
SELECT
  id,
  'academic_s4_fork',
  4,
  'First Week, Academic',
  'The academic stream has set its initial trajectory. Something is pulling you — or it isn''t. You know what the shape of this is going to be.',
  '[
    {
      "option_key": "found_a_thread",
      "label": "One subject has genuinely caught you — lean into it",
      "energy_cost": 1,
      "sets_stream_state": {"stream": "academic", "state": "found_a_thread"}
    },
    {
      "option_key": "functional",
      "label": "You''re keeping up. That''s enough for now.",
      "energy_cost": 0
    },
    {
      "option_key": "acknowledge_warning",
      "label": "You''re already behind on something. You know it.",
      "energy_cost": 0,
      "sets_stream_state": {"stream": "academic", "state": "avoidance_spiral"}
    }
  ]'::jsonb,
  null,
  5,
  1
FROM public.arc_definitions WHERE key = 'arc_academic'
ON CONFLICT (arc_id, step_key) DO NOTHING;


-- =============================================================
-- STREAM 3: MONEY REALITY — 4 beats
-- =============================================================

-- Beat 1 — The Bookstore (Day 1–2, due_offset=0)
INSERT INTO public.arc_steps
  (arc_id, step_key, order_index, title, body, options, default_next_step_key, due_offset_days, expires_after_days)
SELECT
  id,
  'money_s1_bookstore',
  1,
  'The Bookstore',
  'The line is long. The books are expensive. You knew this abstractly. Holding the list and doing the math is different. This is one week''s worth of summer job savings. For one class.',
  '[
    {
      "option_key": "buy_everything",
      "label": "Buy everything required — don''t fall behind day one",
      "energy_cost": 0,
      "money_effect": "worsen"
    },
    {
      "option_key": "buy_essentials",
      "label": "Buy only what seems immediately necessary",
      "energy_cost": 0
    },
    {
      "option_key": "used_copies",
      "label": "Hunt for used copies — accept the delay",
      "energy_cost": 1
    },
    {
      "option_key": "share_classmate",
      "label": "Ask someone in class if you can share",
      "energy_cost": 1,
      "sets_stream_state": {"stream": "money", "state": "not_yet_felt"}
    }
  ]'::jsonb,
  'money_s2_dining_hall',
  0,
  2
FROM public.arc_definitions WHERE key = 'arc_money'
ON CONFLICT (arc_id, step_key) DO NOTHING;

-- Beat 2 — The Dining Hall Calculation (Day 2–3, due_offset=1)
INSERT INTO public.arc_steps
  (arc_id, step_key, order_index, title, body, options, default_next_step_key, due_offset_days, expires_after_days)
SELECT
  id,
  'money_s2_dining_hall',
  2,
  'The Dining Hall Calculation',
  'Someone on your floor suggests going out for pizza. It''s $3. This is not about pizza. You don''t want money to be the reason you miss things. But you also can''t pretend it isn''t real.',
  '[
    {
      "option_key": "go_and_spend",
      "label": "Go — spend the money",
      "energy_cost": 0,
      "money_effect": "worsen"
    },
    {
      "option_key": "go_minimize",
      "label": "Go but nurse one drink — minimize the cost",
      "energy_cost": 1
    },
    {
      "option_key": "make_excuse",
      "label": "Make an excuse — skip it this time",
      "energy_cost": 0,
      "sets_stream_state": {"stream": "money", "state": "stress_background"}
    },
    {
      "option_key": "suggest_cheaper",
      "label": "Suggest somewhere cheaper without explaining why",
      "energy_cost": 1
    }
  ]'::jsonb,
  'money_s3_friction_event',
  1,
  3
FROM public.arc_definitions WHERE key = 'arc_money'
ON CONFLICT (arc_id, step_key) DO NOTHING;

-- Beat 3 — The Friction Event (Day 3–5, due_offset=2)
INSERT INTO public.arc_steps
  (arc_id, step_key, order_index, title, body, options, default_next_step_key, due_offset_days, expires_after_days)
SELECT
  id,
  'money_s3_friction_event',
  3,
  'The Friction Event',
  'A required lab fee nobody mentioned in orientation. A social invitation that assumes disposable income. You see someone buy something without thinking about it — and you realize you thought about it. Money stops being abstract.',
  '[
    {
      "option_key": "problem_solve",
      "label": "Problem-solve quietly — figure it out yourself",
      "energy_cost": 2
    },
    {
      "option_key": "tell_someone",
      "label": "Mention it to someone — be honest",
      "energy_cost": 1,
      "sets_stream_state": {"stream": "money", "state": "stress_background"}
    },
    {
      "option_key": "check_job_board",
      "label": "Check the campus job board",
      "energy_cost": 1,
      "sets_stream_state": {"stream": "money", "state": "managed_tightly"}
    },
    {
      "option_key": "absorb_stress",
      "label": "Absorb the stress and say nothing",
      "energy_cost": 0,
      "sets_stream_state": {"stream": "money", "state": "stress_background"}
    }
  ]'::jsonb,
  'money_s4_fork',
  2,
  3
FROM public.arc_definitions WHERE key = 'arc_money'
ON CONFLICT (arc_id, step_key) DO NOTHING;

-- Beat 4 — The Fork (Day 6–7, due_offset=5)
INSERT INTO public.arc_steps
  (arc_id, step_key, order_index, title, body, options, default_next_step_key, due_offset_days, expires_after_days)
SELECT
  id,
  'money_s4_fork',
  4,
  'First Week, Financial',
  'The financial stream has established its pressure level. You''re okay — or you''re not. Either way, you know more now about what money means here than you did six days ago.',
  '[
    {
      "option_key": "functional_tension",
      "label": "You''re okay but aware — money is a background presence",
      "energy_cost": 0,
      "sets_stream_state": {"stream": "money", "state": "managed_tightly"}
    },
    {
      "option_key": "job_decision",
      "label": "You''ve decided to look for campus work seriously",
      "energy_cost": 1,
      "sets_stream_state": {"stream": "money", "state": "managed_tightly"}
    },
    {
      "option_key": "called_home",
      "label": "You asked a parent for help — it resolved the immediate problem",
      "energy_cost": 1,
      "sets_stream_state": {"stream": "money", "state": "not_yet_felt"},
      "money_effect": "improve"
    }
  ]'::jsonb,
  null,
  5,
  1
FROM public.arc_definitions WHERE key = 'arc_money'
ON CONFLICT (arc_id, step_key) DO NOTHING;


-- =============================================================
-- STREAM 4: FINDING YOUR PEOPLE — 4 beats
-- =============================================================

-- Beat 1 — Orientation Fair (Day 1, due_offset=0)
INSERT INTO public.arc_steps
  (arc_id, step_key, order_index, title, body, options, default_next_step_key, due_offset_days, expires_after_days)
SELECT
  id,
  'belonging_s1_orientation_fair',
  1,
  'The Orientation Fair',
  'Too many options. Folding tables with hand-lettered signs. Pre-med study group. Debate team. Campus newspaper. A religious group with free donuts. Everyone is performing confidence. If you sign up for this, are you saying something about who you are? Or just signing up for a thing?',
  '[
    {
      "option_key": "practical_signup",
      "label": "Sign up for something practical — study group or newspaper",
      "energy_cost": 0,
      "sets_stream_state": {"stream": "belonging", "state": "open_scanning"}
    },
    {
      "option_key": "interesting_signup",
      "label": "Sign up for whatever actually seems interesting",
      "energy_cost": 0,
      "sets_stream_state": {"stream": "belonging", "state": "open_scanning"}
    },
    {
      "option_key": "people_like_you",
      "label": "Find the table where people who look like you are gathering",
      "energy_cost": 0,
      "sets_stream_state": {"stream": "belonging", "state": "first_anchor"}
    },
    {
      "option_key": "sign_up_nothing",
      "label": "Walk through it all and sign up for nothing",
      "energy_cost": 0
    }
  ]'::jsonb,
  'belonging_s2_floor_social',
  0,
  1
FROM public.arc_definitions WHERE key = 'arc_belonging'
ON CONFLICT (arc_id, step_key) DO NOTHING;

-- Beat 2 — Floor Social (Day 1–2, due_offset=0)
INSERT INTO public.arc_steps
  (arc_id, step_key, order_index, title, body, options, default_next_step_key, due_offset_days, expires_after_days)
SELECT
  id,
  'belonging_s2_floor_social',
  2,
  'The Floor Social',
  'Your RA organized a floor meeting that became an awkward social in the common room. Someone brought chips. There''s a two-liter of soda. This is everyone on your floor in a room together with nowhere to go. Some people are already paired up.',
  '[
    {
      "option_key": "one_person_deep",
      "label": "Plant yourself in one conversation and go deep",
      "energy_cost": 1,
      "sets_stream_state": {"stream": "belonging", "state": "first_anchor"}
    },
    {
      "option_key": "circulate_surface",
      "label": "Circulate — stay surface with everyone",
      "energy_cost": 1,
      "sets_stream_state": {"stream": "belonging", "state": "open_scanning"}
    },
    {
      "option_key": "find_the_lost_one",
      "label": "Find the person who also looks like they don''t know what to do",
      "energy_cost": 0,
      "sets_stream_state": {"stream": "belonging", "state": "first_anchor"}
    },
    {
      "option_key": "leave_early",
      "label": "Leave early — the pressure of it is too much",
      "energy_cost": 0,
      "sets_stream_state": {"stream": "belonging", "state": "withdrawal"}
    }
  ]'::jsonb,
  'belonging_s3_first_connection',
  0,
  2
FROM public.arc_definitions WHERE key = 'arc_belonging'
ON CONFLICT (arc_id, step_key) DO NOTHING;

-- Beat 3 — First Real Connection (Day 3–5, due_offset=2)
INSERT INTO public.arc_steps
  (arc_id, step_key, order_index, title, body, options, default_next_step_key, due_offset_days, expires_after_days)
SELECT
  id,
  'belonging_s3_first_connection',
  3,
  'The First Thread',
  'Somewhere — class, dining hall, a second visit to an orientation event — you have a conversation that feels different. Longer than expected. You said something true. You can''t find them later on social media. You have their dorm room number on a torn piece of notebook paper in your pocket, or you don''t.',
  '[
    {
      "option_key": "follow_up",
      "label": "Follow up — knock on their door or find them at the dining hall",
      "energy_cost": 1,
      "sets_stream_state": {"stream": "belonging", "state": "genuine_match"}
    },
    {
      "option_key": "keep_the_paper",
      "label": "Keep the paper — wait and see if paths cross again",
      "energy_cost": 0,
      "sets_stream_state": {"stream": "belonging", "state": "first_anchor"}
    },
    {
      "option_key": "let_it_be",
      "label": "Let it be a good moment — not every conversation is a beginning",
      "energy_cost": 0
    }
  ]'::jsonb,
  'belonging_s4_fork',
  2,
  3
FROM public.arc_definitions WHERE key = 'arc_belonging'
ON CONFLICT (arc_id, step_key) DO NOTHING;

-- Beat 4 — The Fork (Day 6–7, due_offset=5)
INSERT INTO public.arc_steps
  (arc_id, step_key, order_index, title, body, options, default_next_step_key, due_offset_days, expires_after_days)
SELECT
  id,
  'belonging_s4_fork',
  4,
  'First Week, Belonging',
  'The belonging stream has found its first shape. You know where you''re going after dinner, or you don''t. Either has a name.',
  '[
    {
      "option_key": "found_a_home",
      "label": "One person or small group has clicked — you know where you''re going",
      "energy_cost": 0,
      "sets_stream_state": {"stream": "belonging", "state": "genuine_match"}
    },
    {
      "option_key": "still_searching",
      "label": "Nothing has stuck yet — you''re present but not inside anything",
      "energy_cost": 0,
      "sets_stream_state": {"stream": "belonging", "state": "open_scanning"}
    },
    {
      "option_key": "deliberate_solitude",
      "label": "You''ve decided not to rush it — watching more than joining",
      "energy_cost": 0,
      "sets_stream_state": {"stream": "belonging", "state": "withdrawal"}
    }
  ]'::jsonb,
  null,
  5,
  1
FROM public.arc_definitions WHERE key = 'arc_belonging'
ON CONFLICT (arc_id, step_key) DO NOTHING;


-- =============================================================
-- STREAM 5: FIRST OPPORTUNITY — 4 beats
-- =============================================================

-- Beat 1 — Discovery (Day 1–2, due_offset=0)
INSERT INTO public.arc_steps
  (arc_id, step_key, order_index, title, body, options, default_next_step_key, due_offset_days, expires_after_days)
SELECT
  id,
  'opportunity_s1_discovery',
  1,
  'Discovery',
  'It appears early. A flyer on the bulletin board. An upperclassman who mentions something offhand. A professor at the academic open house who says a position is available. The window is short — by Thursday it may be gone. You notice it, and then you notice whether you''re drawn toward it or away from it.',
  '[
    {
      "option_key": "pursue_info",
      "label": "Pursue more information — find out what it actually requires",
      "energy_cost": 1,
      "sets_stream_state": {"stream": "opportunity", "state": "considering"}
    },
    {
      "option_key": "note_and_move",
      "label": "Note it and move on — not ready to commit",
      "energy_cost": 0,
      "sets_stream_state": {"stream": "opportunity", "state": "considering"}
    },
    {
      "option_key": "mention_someone",
      "label": "Mention it to your roommate or a new acquaintance",
      "energy_cost": 0,
      "sets_stream_state": {"stream": "opportunity", "state": "considering"}
    },
    {
      "option_key": "dismiss_it",
      "label": "Dismiss it — not for you, not yet",
      "energy_cost": 0,
      "sets_stream_state": {"stream": "opportunity", "state": "undiscovered"}
    }
  ]'::jsonb,
  'opportunity_s2_obstacle',
  0,
  2
FROM public.arc_definitions WHERE key = 'arc_opportunity'
ON CONFLICT (arc_id, step_key) DO NOTHING;

-- Beat 2 — The Obstacle (Day 2–4, due_offset=1)
INSERT INTO public.arc_steps
  (arc_id, step_key, order_index, title, body, options, default_next_step_key, due_offset_days, expires_after_days)
SELECT
  id,
  'opportunity_s2_obstacle',
  2,
  'The Obstacle',
  'Something makes pursuing it harder than it initially seemed. The timing conflicts with something else. It requires more confidence than you currently feel. Someone on your floor is also pursuing it — now there''s comparison. You can''t just apply online. You have to go somewhere in person, during specific hours, and talk to a person.',
  '[
    {
      "option_key": "push_through_obstacle",
      "label": "Work around it — figure out the logistics",
      "energy_cost": 2,
      "sets_stream_state": {"stream": "opportunity", "state": "pursuing"}
    },
    {
      "option_key": "gather_more_info",
      "label": "Get more information before deciding",
      "energy_cost": 1,
      "sets_stream_state": {"stream": "opportunity", "state": "considering"}
    },
    {
      "option_key": "obstacle_discourages",
      "label": "The obstacle is a sign — let the window close",
      "energy_cost": 0,
      "sets_stream_state": {"stream": "opportunity", "state": "expired"}
    }
  ]'::jsonb,
  'opportunity_s3_decision_point',
  1,
  3
FROM public.arc_definitions WHERE key = 'arc_opportunity'
ON CONFLICT (arc_id, step_key) DO NOTHING;

-- Beat 3 — The Decision Point (Day 3–5, due_offset=2)
INSERT INTO public.arc_steps
  (arc_id, step_key, order_index, title, body, options, default_next_step_key, due_offset_days, expires_after_days)
SELECT
  id,
  'opportunity_s3_decision_point',
  3,
  'The Decision Point',
  'The window is narrowing. You have to decide. This is a genuine fork with meaningful consequences in both directions. "I don''t actually know if I can do this. I''m doing it anyway." Or: "It wasn''t the right time. There will be others." (Is that true? You''re not sure.)',
  '[
    {
      "option_key": "go_for_it",
      "label": "Go for it — show up underprepared and make the case",
      "energy_cost": 2,
      "sets_stream_state": {"stream": "opportunity", "state": "pursuing"}
    },
    {
      "option_key": "prepare_first",
      "label": "Spend a day preparing — then go",
      "energy_cost": 2,
      "sets_stream_state": {"stream": "opportunity", "state": "pursuing"}
    },
    {
      "option_key": "let_it_expire",
      "label": "Let the window close — it wasn''t the right time",
      "energy_cost": 0,
      "sets_stream_state": {"stream": "opportunity", "state": "expired"},
      "sets_expired_opportunity": "academic"
    }
  ]'::jsonb,
  'opportunity_s4_fork',
  2,
  3
FROM public.arc_definitions WHERE key = 'arc_opportunity'
ON CONFLICT (arc_id, step_key) DO NOTHING;

-- Beat 4 — The Fork (Day 6–7, due_offset=5)
INSERT INTO public.arc_steps
  (arc_id, step_key, order_index, title, body, options, default_next_step_key, due_offset_days, expires_after_days)
SELECT
  id,
  'opportunity_s4_fork',
  4,
  'First Week, Opportunity',
  'The opportunity stream has resolved. You tried, or you didn''t. Either outcome contains information about yourself.',
  '[
    {
      "option_key": "tried_worked",
      "label": "You went. You''re in. The cost is real — so is the momentum.",
      "energy_cost": 0,
      "sets_stream_state": {"stream": "opportunity", "state": "claimed"}
    },
    {
      "option_key": "tried_not_in",
      "label": "You went. You''re not in. But you went.",
      "energy_cost": 0,
      "sets_stream_state": {"stream": "opportunity", "state": "expired"}
    },
    {
      "option_key": "didnt_try",
      "label": "The opportunity is gone. You tell yourself it''s fine.",
      "energy_cost": 0,
      "sets_stream_state": {"stream": "opportunity", "state": "expired"},
      "sets_expired_opportunity": "social"
    }
  ]'::jsonb,
  null,
  5,
  1
FROM public.arc_definitions WHERE key = 'arc_opportunity'
ON CONFLICT (arc_id, step_key) DO NOTHING;


-- =============================================================
-- STREAM 6: SOMETHING FROM HOME — 4 beats
-- =============================================================

-- Beat 1 — The First Contact (Day 1–3, due_offset=0)
INSERT INTO public.arc_steps
  (arc_id, step_key, order_index, title, body, options, default_next_step_key, due_offset_days, expires_after_days)
SELECT
  id,
  'home_s1_first_contact',
  1,
  'The First Contact',
  'Your mother calls the floor phone. Someone knocks on your door to get you. Or a letter arrives — postmarked before you even left, timed to arrive your first week. What do you tell them? "I''m fine" is a lie. "I''m scared" is more than they need.',
  '[
    {
      "option_key": "respond_fully",
      "label": "Respond fully and honestly — tell them what it''s actually like",
      "energy_cost": 1,
      "sets_stream_state": {"stream": "home", "state": "background_warmth"}
    },
    {
      "option_key": "respond_cheerfully",
      "label": "Respond cheerfully — edit out the hard parts",
      "energy_cost": 0,
      "sets_stream_state": {"stream": "home", "state": "guilt_current"}
    },
    {
      "option_key": "respond_briefly",
      "label": "Respond briefly — you''re fine, everything is fine",
      "energy_cost": 0
    },
    {
      "option_key": "delay",
      "label": "Delay — you''ll write back when you know what to say",
      "energy_cost": 0,
      "sets_stream_state": {"stream": "home", "state": "guilt_current"}
    }
  ]'::jsonb,
  'home_s2_contrast_moment',
  0,
  3
FROM public.arc_definitions WHERE key = 'arc_home'
ON CONFLICT (arc_id, step_key) DO NOTHING;

-- Beat 2 — The Contrast Moment (Day 2–4, due_offset=1)
INSERT INTO public.arc_steps
  (arc_id, step_key, order_index, title, body, options, default_next_step_key, due_offset_days, expires_after_days)
SELECT
  id,
  'home_s2_contrast_moment',
  2,
  'The Contrast Moment',
  'Someone on your floor has a family background very different from yours — wealthier, less stable, more educated, less supported. You catch yourself using language or framing from home that doesn''t quite fit here. You are already two people — who you were and who you''re becoming.',
  '[
    {
      "option_key": "name_the_difference",
      "label": "Name it, at least to yourself — acknowledge the gap",
      "energy_cost": 1,
      "sets_stream_state": {"stream": "home", "state": "background_warmth"}
    },
    {
      "option_key": "adjust_quietly",
      "label": "Adjust quietly — let the version of yourself that fits here take over",
      "energy_cost": 0,
      "sets_stream_state": {"stream": "home", "state": "clean_break"}
    },
    {
      "option_key": "sit_with_it",
      "label": "Sit with the dissonance — don''t resolve it yet",
      "energy_cost": 0,
      "sets_stream_state": {"stream": "home", "state": "guilt_current"}
    }
  ]'::jsonb,
  'home_s3_request',
  1,
  3
FROM public.arc_definitions WHERE key = 'arc_home'
ON CONFLICT (arc_id, step_key) DO NOTHING;

-- Beat 3 — The Request (Day 3–6, due_offset=2)
INSERT INTO public.arc_steps
  (arc_id, step_key, order_index, title, body, options, default_next_step_key, due_offset_days, expires_after_days)
SELECT
  id,
  'home_s3_request',
  3,
  'The Request',
  'Home asks something of you. A parent asks if you''re sure about your major, gently, in a way that carries weight. Your parents mention money in a way that reminds you what they''re carrying so you can be here. This is the moment where the emotional transaction becomes visible.',
  '[
    {
      "option_key": "respond_to_actual_ask",
      "label": "Respond to what they''re actually asking — be direct",
      "energy_cost": 2,
      "sets_stream_state": {"stream": "home", "state": "background_warmth"}
    },
    {
      "option_key": "respond_to_surface",
      "label": "Respond to what they said on the surface — don''t dig deeper",
      "energy_cost": 0,
      "sets_stream_state": {"stream": "home", "state": "guilt_current"}
    },
    {
      "option_key": "set_a_limit",
      "label": "Set a limit — tell them you''re okay and you''ll call on Sunday",
      "energy_cost": 1,
      "sets_stream_state": {"stream": "home", "state": "clean_break"}
    },
    {
      "option_key": "feel_the_guilt",
      "label": "Feel the guilt and do nothing with it",
      "energy_cost": 0,
      "sets_stream_state": {"stream": "home", "state": "active_pull"}
    }
  ]'::jsonb,
  'home_s4_fork',
  2,
  4
FROM public.arc_definitions WHERE key = 'arc_home'
ON CONFLICT (arc_id, step_key) DO NOTHING;

-- Beat 4 — The Fork (Day 6–7, due_offset=5)
INSERT INTO public.arc_steps
  (arc_id, step_key, order_index, title, body, options, default_next_step_key, due_offset_days, expires_after_days)
SELECT
  id,
  'home_s4_fork',
  4,
  'First Week, Home',
  'The home stream has found its shape for now. You are connected to where you came from, or you''ve begun to let the distance happen. Either is real.',
  '[
    {
      "option_key": "healthy_distance",
      "label": "You''re in contact, it''s warm. The separation is working.",
      "energy_cost": 0,
      "sets_stream_state": {"stream": "home", "state": "background_warmth"}
    },
    {
      "option_key": "carrying_quietly",
      "label": "Something from home is sitting with you. You haven''t resolved it.",
      "energy_cost": 0,
      "sets_stream_state": {"stream": "home", "state": "guilt_current"}
    },
    {
      "option_key": "pull_is_real",
      "label": "Home is competing with being here. You''re spending energy navigating it.",
      "energy_cost": 0,
      "sets_stream_state": {"stream": "home", "state": "active_pull"}
    },
    {
      "option_key": "clean_rupture",
      "label": "Something widened the gap faster than expected. You''re more alone — and not entirely sure that''s bad.",
      "energy_cost": 0,
      "sets_stream_state": {"stream": "home", "state": "identity_rupture"}
    }
  ]'::jsonb,
  null,
  5,
  1
FROM public.arc_definitions WHERE key = 'arc_home'
ON CONFLICT (arc_id, step_key) DO NOTHING;
