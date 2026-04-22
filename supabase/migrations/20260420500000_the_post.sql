-- ================================================================
-- Week 2 Content Brief — Part 4: L5 `the_post` (Day 14 afternoon)
--
-- The "Delphi Group" forecasting quiz. Player returns to the Whitmore
-- basement terminal and finds a forecasting challenge that functions
-- as Knower authentication: three questions whose correct answers only
-- a time traveler would know, unlocking a restricted Usenet archive.
--
-- Engine features used (two small extensions added in this session):
--   DialogueNode.condition.all_flags  — compound walk-flag gate (quiz
--     passes only when all three q*_correct flags are set)
--   DialogueNode.else_next             — explicit branch when condition
--     is NOT met (submit_answers fail-path → submit_answers_fail)
--
-- The terminal choice log_off_shaken is walk-flag-gated on
-- `delphi_archive_seen`, which is set only when the player reads the
-- archive (i.e. reached after passing the quiz). Quiz-failed and
-- walked-away players see only log_off_quick. The arc flag
-- `delphi_archive_accessed` is written solely by log_off_shaken's
-- persistent sets_flag[], so it fires only on the quiz-passed path.
--
-- Idempotent via ON CONFLICT DO UPDATE.
-- ================================================================

BEGIN;

INSERT INTO public.storylets (
  slug, title, body, choices, nodes,
  tags, requirements, weight, is_active,
  introduces_npc,
  arc_id, track_id,
  step_key, storylet_key,
  order_index, due_offset_days, expires_after_days,
  default_next_step_key, default_next_key,
  segment, time_cost_hours
)
VALUES (
  'the_post',
  'The Delphi Group',

  $body$The basement is empty. Tuesday afternoon — everyone's in class or at the dining hall. The terminal hums, green phosphor warming the cinder block.

You log on. The Usenet index scrolls by — net.philosophy, net.misc, rec.music, the familiar groups you've browsed before. But today you go deeper. Glenn's direction was to look for things that don't fit. People who know things they shouldn't.

Buried three pages into the newsgroup list, between net.futures and net.games, there's a group you haven't noticed before: net.futures.delphi. The description reads: "Structured forecasting and scenario analysis. Challenge thread active."$body$,

  $choices$[
    {
      "id": "log_off_shaken",
      "label": "Log off. Sit in the basement for a while.",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": ["risk", "investigate"],
      "precludes": [],
      "requires_flag": "delphi_archive_seen",
      "sets_flag": ["the_post_resolved", "delphi_archive_accessed"],
      "reaction_text": "The monitor dims to screensaver. Green phosphor fading. You sit in the folding chair and listen to the building breathe — the pipes, the fluorescent hum, a door closing somewhere upstairs.\n\nYou came here looking for traces. You found a community. People who have been doing this — whatever this is — longer than you. Who built a system. Who are waiting to see who else passes the test.\n\nThey'll see your answers. They'll know someone at Harwick got 3/3.\n\nThe walk back to the dorm feels longer than the walk here.",
      "outcome": { "text": "", "deltas": {} },
      "events_emitted": []
    },
    {
      "id": "log_off_quick",
      "label": "Log off and leave. Don't look back at the screen.",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": ["safety"],
      "precludes": [],
      "sets_flag": ["the_post_resolved"],
      "reaction_text": "You're up the stairs and into daylight before you've finished thinking about what you just read. The quad is full of students walking to afternoon classes, backpacks and sneakers and someone throwing a frisbee. Normal. Ordinary. 1983.\n\nDownstairs, in a basement, on a network most of these people don't know exists, there are people who know what's coming. And now they know someone else is here.",
      "outcome": { "text": "", "deltas": {} },
      "events_emitted": []
    }
  ]$choices$::jsonb,

  $nodes$[
    {
      "id": "browse_delphi",
      "text": "The group has maybe forty posts. Most read like academic exercises — long-winded arguments about technological adoption curves and geopolitical modeling. The kind of thing a poli-sci grad student would write after too much coffee.\n\nBut one thread is pinned: \"FORECASTING CHALLENGE — Q4 1983. Complete to access restricted archive.\"",
      "micro_choices": [
        {
          "id": "open_challenge",
          "label": "Open the challenge thread.",
          "next": "challenge_intro"
        },
        {
          "id": "read_posts_first",
          "label": "Read the other posts first.",
          "next": "scan_posts"
        }
      ]
    },
    {
      "id": "scan_posts",
      "text": "You scroll through. Most of it is dense and theoretical. But a few posts stop you.\n\nOne user — handle 'cassandra_7' — keeps flagging news items. An AP wire story about a CDC investigation into immune deficiency cases. A brief about semiconductor trade negotiations with Japan. A note about a local zoning decision in Northern California, near some place called Stanford Research Park.\n\nNone of these are front-page news. All of them are things you recognize.\n\nAnother user — 'heraclitus' — writes about historical cycles. Their analysis of how surveillance states collapse reads like a history textbook. Except the history hasn't happened yet.",
      "next": "challenge_intro"
    },
    {
      "id": "challenge_intro",
      "text": "The challenge thread has simple rules:\n\n\"The following questions concern near-term developments in technology, geopolitics, and culture. Respondents who demonstrate consistent forecasting accuracy will receive access credentials for the Delphi restricted archive. Submit answers via the reply form below.\"\n\nThree questions. Multiple choice. Academic framing. But you read them and your stomach drops. These aren't guesses for a 1983 person. For you, they're memory.",
      "micro_choices": [
        {
          "id": "take_challenge",
          "label": "Start answering.",
          "next": "question_1"
        },
        {
          "id": "hesitate",
          "label": "Sit back from the terminal.",
          "next": "hesitation"
        }
      ]
    },
    {
      "id": "hesitation",
      "text": "If you answer correctly, someone will know. Not just that someone is smart — lots of people are smart. That someone knows what's coming. That's a different thing entirely.\n\nGlenn said to find the others. He didn't say what happens when they find you.",
      "micro_choices": [
        {
          "id": "proceed_anyway",
          "label": "Type your answers.",
          "next": "question_1",
          "sets_flag": "delphi_hesitated"
        },
        {
          "id": "walk_away",
          "label": "Log off. Not today.",
          "next": "walk_away_node",
          "sets_flag": "delphi_refused"
        }
      ]
    },
    {
      "id": "question_1",
      "text": "\"QUESTION 1: Which of the following technologies will achieve the widest civilian adoption by 1990?\"\n\nA) Videodisc / LaserDisc home systems\nB) Personal computing platforms\nC) Satellite-based mobile telephony\nD) Home robotics",
      "micro_choices": [
        {
          "id": "q1_a",
          "label": "A — Videodisc",
          "next": "question_2"
        },
        {
          "id": "q1_b",
          "label": "B — Personal computing",
          "next": "question_2",
          "sets_flag": "delphi_q1_correct"
        },
        {
          "id": "q1_c",
          "label": "C — Satellite telephony",
          "next": "question_2"
        },
        {
          "id": "q1_d",
          "label": "D — Home robotics",
          "next": "question_2"
        }
      ]
    },
    {
      "id": "question_2",
      "text": "\"QUESTION 2: Current CDC investigations into immune deficiency cases will, within five years, most likely:\"\n\nA) Resolve as a regional public health anomaly\nB) Expand into a global epidemic affecting millions\nC) Be reclassified as an environmental exposure issue\nD) Remain a low-priority research concern",
      "micro_choices": [
        {
          "id": "q2_a",
          "label": "A — Regional anomaly",
          "next": "question_3"
        },
        {
          "id": "q2_b",
          "label": "B — Global epidemic",
          "next": "question_3",
          "sets_flag": "delphi_q2_correct"
        },
        {
          "id": "q2_c",
          "label": "C — Environmental exposure",
          "next": "question_3"
        },
        {
          "id": "q2_d",
          "label": "D — Low-priority concern",
          "next": "question_3"
        }
      ]
    },
    {
      "id": "question_3",
      "text": "\"QUESTION 3: The most significant geopolitical realignment in Europe before 1992 will be driven primarily by:\"\n\nA) Economic integration of Western European markets\nB) Internal reform and collapse of Eastern Bloc governance\nC) NATO expansion triggering a conventional arms race\nD) A pan-European labor movement",
      "micro_choices": [
        {
          "id": "q3_a",
          "label": "A — Economic integration",
          "next": "submit_answers"
        },
        {
          "id": "q3_b",
          "label": "B — Eastern Bloc collapse",
          "next": "submit_answers",
          "sets_flag": "delphi_q3_correct"
        },
        {
          "id": "q3_c",
          "label": "C — NATO arms race",
          "next": "submit_answers"
        },
        {
          "id": "q3_d",
          "label": "D — Labor movement",
          "next": "submit_answers"
        }
      ]
    },
    {
      "id": "submit_answers",
      "text": "You hit RETURN. The terminal processes for a moment — longer than it should, the cursor blinking. Then a new line appears.",
      "condition": { "all_flags": ["delphi_q1_correct", "delphi_q2_correct", "delphi_q3_correct"] },
      "next": "access_granted",
      "else_next": "submit_answers_fail"
    },
    {
      "id": "submit_answers_fail",
      "text": "You hit RETURN. The terminal processes. Then:\n\n> FORECASTING SCORE: INSUFFICIENT FOR ARCHIVE ACCESS.\n> CHALLENGE RESETS MONTHLY. THANK YOU FOR YOUR PARTICIPATION.\n\nThe cursor blinks. The screen returns to the thread index. Whatever is behind that gate, you didn't get the combination right.",
      "next": "choices"
    },
    {
      "id": "access_granted",
      "text": "The screen clears. New text:\n\n> FORECASTING SCORE: 3/3.\n> ACCURACY PROFILE: CONSISTENT WITH STRUCTURED KNOWLEDGE.\n> ARCHIVE ACCESS GRANTED.\n> PASSWORD: CASSANDRA\n\nThe word sits there on the screen, green on black. Then the archive loads.\n\nIt's a sub-thread. Thirty, maybe forty posts. No dates older than six months. The tone is different from the public forum — less academic, more careful. People talking around something without ever naming it directly.",
      "next": "archive_content"
    },
    {
      "id": "archive_content",
      "text": "You read. Your eyes adjust to the green glow. Time passes and you don't notice.\n\nA thread about historical inflection points — someone argues that societies change not through single events but through the accumulation of small decisions that make the event inevitable. The examples are from the past. The implications are not.\n\nA thread about physics. Closed timelike curves. Information theory. Whether a signal can exist before its source. The math is real. The questions are framed as hypothetical. But the hypotheticals are very specific.\n\nA thread where 'cassandra_7' lists nine things. Nine current events, all minor, all buried in back pages. You recognize seven of them. They are the seeds of everything that comes next.",
      "micro_choices": [
        {
          "id": "keep_reading",
          "label": "Keep reading. All of it.",
          "next": "the_realization",
          "sets_flag": "delphi_archive_seen"
        },
        {
          "id": "stop_at_the_list",
          "label": "Go back to the list of nine things.",
          "next": "the_realization",
          "sets_flag": "delphi_archive_seen"
        }
      ]
    },
    {
      "id": "the_realization",
      "text": "These people know.\n\nNot all of them, maybe. Some could be genuine forecasters — smart, well-read, lucky. But cassandra_7 isn't lucky. Heraclitus isn't guessing. The questions they ask have the shape of answers turned inside out.\n\nYou are not the only one here.\n\nThe terminal hums. The basement is still empty. The clock on the wall says you've been here ninety minutes.",
      "next": "choices"
    },
    {
      "id": "walk_away_node",
      "text": "You pull your hands back from the keyboard. The questions glow on the screen. You know the answers to all of them.\n\nThat's exactly why you don't type them.\n\nYou log off. The terminal returns to its blinking cursor. The basement is quiet. Whatever is behind that gate will still be there next week. Or it won't. Either way, today you chose not to announce yourself.",
      "next": "choices"
    }
  ]$nodes$::jsonb,

  ARRAY['arc_one', 'opportunity', 'week2', 'landmark', 'frame', 'investigation'],
  '{"requires_flag": "tuesday_terminal"}'::jsonb,
  200, true,
  ARRAY[]::text[],
  (SELECT id FROM public.tracks WHERE key = 'opportunity'),
  (SELECT id FROM public.tracks WHERE key = 'opportunity'),
  'the_post', 'the_post',
  30, 14, 7,
  NULL, NULL,
  'afternoon', 2
)
ON CONFLICT (slug) DO UPDATE SET
  title              = EXCLUDED.title,
  body               = EXCLUDED.body,
  choices            = EXCLUDED.choices,
  nodes              = EXCLUDED.nodes,
  tags               = EXCLUDED.tags,
  requirements       = EXCLUDED.requirements,
  weight             = EXCLUDED.weight,
  is_active          = EXCLUDED.is_active,
  introduces_npc     = EXCLUDED.introduces_npc,
  order_index        = EXCLUDED.order_index,
  due_offset_days    = EXCLUDED.due_offset_days,
  expires_after_days = EXCLUDED.expires_after_days,
  default_next_step_key = EXCLUDED.default_next_step_key,
  default_next_key      = EXCLUDED.default_next_key,
  segment            = EXCLUDED.segment,
  time_cost_hours    = EXCLUDED.time_cost_hours;


-- ══════════════════════════════════════════════════════════════════════
-- Verification — confirm shape of the inserted row.
-- ══════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  node_count integer;
  choice_count integer;
  has_all_flags integer;
  has_else_next integer;
  has_walk_gate integer;
BEGIN
  SELECT jsonb_array_length(nodes)
    INTO node_count
    FROM public.storylets WHERE storylet_key = 'the_post';

  SELECT jsonb_array_length(choices)
    INTO choice_count
    FROM public.storylets WHERE storylet_key = 'the_post';

  IF node_count <> 13 THEN
    RAISE WARNING 'the_post: expected 13 nodes, got %', node_count;
  END IF;

  IF choice_count <> 2 THEN
    RAISE WARNING 'the_post: expected 2 terminal choices, got %', choice_count;
  END IF;

  -- Confirm submit_answers node carries the compound all_flags gate.
  SELECT COUNT(*) INTO has_all_flags
  FROM public.storylets, jsonb_array_elements(nodes) AS n
  WHERE storylet_key = 'the_post'
    AND n->>'id' = 'submit_answers'
    AND n->'condition'->'all_flags' IS NOT NULL;

  IF has_all_flags = 0 THEN
    RAISE WARNING 'the_post: submit_answers is missing condition.all_flags';
  END IF;

  -- Confirm else_next wired to submit_answers_fail.
  SELECT COUNT(*) INTO has_else_next
  FROM public.storylets, jsonb_array_elements(nodes) AS n
  WHERE storylet_key = 'the_post'
    AND n->>'id' = 'submit_answers'
    AND n->>'else_next' = 'submit_answers_fail';

  IF has_else_next = 0 THEN
    RAISE WARNING 'the_post: submit_answers is missing else_next=submit_answers_fail';
  END IF;

  -- Confirm log_off_shaken is walk-flag-gated on delphi_archive_seen.
  SELECT COUNT(*) INTO has_walk_gate
  FROM public.storylets, jsonb_array_elements(choices) AS c
  WHERE storylet_key = 'the_post'
    AND c->>'id' = 'log_off_shaken'
    AND c->>'requires_flag' = 'delphi_archive_seen';

  IF has_walk_gate = 0 THEN
    RAISE WARNING 'the_post: log_off_shaken is missing requires_flag=delphi_archive_seen';
  END IF;
END $$;

COMMIT;
