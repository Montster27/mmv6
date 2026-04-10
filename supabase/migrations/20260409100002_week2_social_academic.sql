-- ================================================================
-- Week 2, Part 3: Social + Academic Beats
-- Home track (day 7), Academic track (day 8),
-- Belonging track (days 10-12)
-- The warm receiver. The pen that stops. The scratched guitar.
-- ================================================================

-- ============================================================
-- DAY 7: THE PAY PHONE LINE (Beat — evening, home track)
-- The alcove by the stairwell. A warm receiver.
-- Three options: call home, call Pat, hang up.
-- ============================================================
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
  'pay_phone_line',
  'The Alcove',

  $body$The floor phone is in a little alcove by the stairwell, and there is a line. Two guys ahead of you, both leaning against the wall. One of them is arguing with someone, trying to keep his voice down and failing — "no, Ma, I told you, I told you that already" — and the other is reading a paperback with the cover bent back, not looking up.

You are waiting. You do not know yet if you are going to call.

The first guy hangs up and walks past without making eye contact. His jaw is set. The paperback guy goes next and is on for maybe ninety seconds — says "yeah" four times and "okay" once and hangs up.

When he steps away, the receiver is warm.$body$,

  $choices$[
    {
      "id": "phone_continue",
      "label": "Head back",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": [],
      "precludes": [],
      "outcome": {
        "text": "",
        "deltas": {}
      }
    }
  ]$choices$::jsonb,

  $nodes$[
    {
      "id": "receiver_warm",
      "text": "The receiver is warm in your hand. The dial tone hums. The alcove smells like the wall — old plaster and something that might be cigarette smoke that has been here since the seventies.",
      "micro_choices": [
        {
          "id": "call_home",
          "label": "Dial home",
          "next": "mom_answers",
          "sets_flag": "called_home_week2"
        },
        {
          "id": "call_pat",
          "label": "Dial Pat at Ohio State",
          "next": "pat_out",
          "sets_flag": "called_pat"
        },
        {
          "id": "hang_up_phone",
          "label": "Put the receiver back",
          "next": "walk_back",
          "sets_flag": "didnt_call"
        }
      ]
    },
    {
      "id": "mom_answers",
      "text": "She picks up on the fourth ring. You talk for six minutes about nothing. She asks if you are eating. You say yes. She asks if you need anything. You say no. She tells you your father fixed the screen door and that Mrs. Bartoli's daughter is getting married. You say that is nice.\n\nWhen you hang up the receiver is warm from you now. The dial tone comes back like it was waiting.",
      "next": "choices"
    },
    {
      "id": "pat_out",
      "text": "Pat's roommate answers. \"He's out.\" The roommate's voice is flat and far away — Columbus is a long-distance call and it sounds like it. You say tell him I called. The roommate says \"sure\" in a way that means he will not.\n\nYou hang up. The dime drops inside the phone with a small sound.",
      "next": "choices"
    },
    {
      "id": "walk_back",
      "text": "You put the receiver back on the hook. The dial tone cuts off. You walk back down the hall past a door that has a Farrah Fawcett poster on it that has been there since 1978. The tape at the top corner has yellowed and the paper has a curl to it. Farrah's hair is eternal.",
      "next": "choices"
    }
  ]$nodes$::jsonb,

  ARRAY['arc_one', 'home', 'week2', 'beat', 'day7'],
  '{}'::jsonb,
  100, true,
  ARRAY[]::text[],
  (SELECT id FROM public.tracks WHERE key = 'home'),
  (SELECT id FROM public.tracks WHERE key = 'home'),
  'pay_phone_line', 'pay_phone_line',
  10, 7, 3,
  NULL, NULL,
  'evening', 0
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title, body = EXCLUDED.body, choices = EXCLUDED.choices,
  nodes = EXCLUDED.nodes, tags = EXCLUDED.tags, requirements = EXCLUDED.requirements,
  weight = EXCLUDED.weight, is_active = EXCLUDED.is_active,
  introduces_npc = EXCLUDED.introduces_npc,
  order_index = EXCLUDED.order_index, due_offset_days = EXCLUDED.due_offset_days,
  expires_after_days = EXCLUDED.expires_after_days,
  default_next_step_key = EXCLUDED.default_next_step_key,
  default_next_key = EXCLUDED.default_next_key,
  segment = EXCLUDED.segment, time_cost_hours = EXCLUDED.time_cost_hours;


-- ============================================================
-- DAY 8: HELLER'S LECTURE (Beat — morning, academic track)
-- Primary group dynamics. The pen that stops moving.
-- No micro-choice. Eight sentences. Pure texture.
-- ============================================================
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
  'heller_lecture',
  'Primary Groups',

  $body$Professor Heller is doing the week on primary and secondary group dynamics. It is a good lecture — she has a way of saying things that sound offhand and are not — and you are half-listening and half-thinking about the job you just took.

Tomas is at the TA desk at the side of the room, grading something from another section. He has not looked up in twenty minutes. His pen moves in a steady rhythm — check, note, flip, check, note, flip.

At one point Heller says something about how the durability of primary group bonds is usually underestimated by students at the beginning of college and overestimated by the end. She says it dryly, like a joke that is not really a joke. A few people laugh.

Tomas's pen stops moving. For maybe three seconds.

Then it starts again.

You are the only one who notices. Heller has moved on to Tonnies. The lecture continues.$body$,

  $choices$[
    {
      "id": "class_ends",
      "label": "Class ends",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": [],
      "precludes": [],
      "outcome": {
        "text": "People are packing up. Heller says something about the reading for Thursday. Tomas is still at the desk, still grading.",
        "deltas": {}
      }
    }
  ]$choices$::jsonb,

  NULL,

  ARRAY['arc_one', 'academic', 'week2', 'beat', 'day8', 'texture'],
  '{}'::jsonb,
  80, true,
  ARRAY['npc_prof_heller', 'npc_ta_tomas']::text[],
  (SELECT id FROM public.tracks WHERE key = 'academic'),
  (SELECT id FROM public.tracks WHERE key = 'academic'),
  'heller_lecture', 'heller_lecture',
  20, 8, 2,
  NULL, NULL,
  'morning', 1
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title, body = EXCLUDED.body, choices = EXCLUDED.choices,
  nodes = EXCLUDED.nodes, tags = EXCLUDED.tags, requirements = EXCLUDED.requirements,
  weight = EXCLUDED.weight, is_active = EXCLUDED.is_active,
  introduces_npc = EXCLUDED.introduces_npc,
  order_index = EXCLUDED.order_index, due_offset_days = EXCLUDED.due_offset_days,
  expires_after_days = EXCLUDED.expires_after_days,
  default_next_step_key = EXCLUDED.default_next_step_key,
  default_next_key = EXCLUDED.default_next_key,
  segment = EXCLUDED.segment, time_cost_hours = EXCLUDED.time_cost_hours;


-- ============================================================
-- DAY 10: MIGUEL'S GUITAR (Beat — afternoon, belonging track)
-- "Stairway to Heaven." Failing in the same place.
-- Keith's door is closed. That is the joke and the point.
-- ============================================================
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
  'miguel_guitar',
  'Stairway',

  $body$Miguel's door is open, which is Miguel's normal state. He is sitting on his bed with an acoustic guitar — the finish is scratched in a pattern that suggests it has been leaned against things carelessly for years, and one tuning peg is off-color like it has been replaced. He is trying to play the opening of "Stairway to Heaven" and failing in the same place every time.

Keith, two doors down, has his door closed.

Miguel sees you walking past. "Hey. You play?"$body$,

  $choices$[
    {
      "id": "guitar_continue",
      "label": "Continue down the hall",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": [],
      "precludes": [],
      "outcome": {
        "text": "",
        "deltas": {}
      }
    }
  ]$choices$::jsonb,

  $nodes$[
    {
      "id": "miguel_asks",
      "text": "He is holding the guitar like someone who learned from a book — fingers too high on the neck, thumb wrapped over the top.",
      "micro_choices": [
        {
          "id": "say_a_little",
          "label": "A little",
          "next": "try_guitar"
        },
        {
          "id": "say_no_guitar",
          "label": "No",
          "next": "miguel_keeps_trying"
        },
        {
          "id": "walk_past",
          "label": "Keep walking",
          "next": "same_four_notes"
        }
      ]
    },
    {
      "id": "try_guitar",
      "text": "Miguel hands you the guitar. It is lighter than you expected. The strings are old — the high E has a dull spot where someone has been pressing the same fret for too long.",
      "micro_choices": [
        {
          "id": "actually_play",
          "label": "Play the opening",
          "next": "miguel_delighted",
          "sets_flag": "can_play_guitar"
        },
        {
          "id": "fumble_it",
          "label": "Try and fumble",
          "next": "miguel_laughs"
        }
      ]
    },
    {
      "id": "miguel_delighted",
      "text": "You get through the first phrase. It is not perfect but it is the right notes in the right order and Miguel's face opens up.\n\n\"See, that — that is the part I cannot get. The transition. Show me the transition.\"\n\nYou show him. He tries it. He does not get it. He tries it again. Keith's door is still closed.",
      "speaker": "npc_floor_miguel",
      "next": "choices"
    },
    {
      "id": "miguel_laughs",
      "text": "You get about four notes in before the chord change defeats you. The sound the guitar makes is not exactly music.\n\nMiguel laughs. \"Okay, okay, I see you.\" He takes the guitar back. \"So we are both terrible. That is actually better. I thought it was just me.\"",
      "speaker": "npc_floor_miguel",
      "next": "choices"
    },
    {
      "id": "miguel_keeps_trying",
      "text": "\"Me neither, apparently.\" He grins and goes back to it. The same four notes, the same stumble at the transition. You stand in the doorway for a moment and then move on.\n\nKeith's door is still closed.",
      "speaker": "npc_floor_miguel",
      "next": "choices"
    },
    {
      "id": "same_four_notes",
      "text": "You keep walking. Behind you, the same four notes start again. The stumble. A pause. The same four notes.\n\nForty minutes later, when you come back down the hall, Miguel's door is still open and he is still playing. The same part. Keith's door is still closed.",
      "next": "choices"
    }
  ]$nodes$::jsonb,

  ARRAY['arc_one', 'belonging', 'week2', 'beat', 'day10'],
  '{}'::jsonb,
  100, true,
  ARRAY[]::text[],
  (SELECT id FROM public.tracks WHERE key = 'belonging'),
  (SELECT id FROM public.tracks WHERE key = 'belonging'),
  'miguel_guitar', 'miguel_guitar',
  24, 10, 2,
  NULL, NULL,
  'afternoon', 0
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title, body = EXCLUDED.body, choices = EXCLUDED.choices,
  nodes = EXCLUDED.nodes, tags = EXCLUDED.tags, requirements = EXCLUDED.requirements,
  weight = EXCLUDED.weight, is_active = EXCLUDED.is_active,
  introduces_npc = EXCLUDED.introduces_npc,
  order_index = EXCLUDED.order_index, due_offset_days = EXCLUDED.due_offset_days,
  expires_after_days = EXCLUDED.expires_after_days,
  default_next_step_key = EXCLUDED.default_next_step_key,
  default_next_key = EXCLUDED.default_next_key,
  segment = EXCLUDED.segment, time_cost_hours = EXCLUDED.time_cost_hours;


-- ============================================================
-- DAY 11: PRIYA IN THE DINING HALL (Beat — afternoon, belonging)
-- Grilled cheese. Beauvoir. The study group seed.
-- Priya is a complete character in ninety seconds.
-- ============================================================
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
  'priya_dining_hall',
  'Grilled Cheese',

  $body$Priya comes through the line with a tray and a book under her arm. She sees you and comes over. "Can I sit?" She sits before you answer, which is Priya.

She is reading The Second Sex. Library copy — you can see the Dewey decimal sticker on the spine. She is not reading it for class.

She tells you, unprompted, that her sister got engaged over the summer to a guy Priya does not like, and that her mother keeps asking her if she has met anyone nice at college and she has been here eleven days. She says all of this while eating a dining hall grilled cheese and the monologue takes about two minutes and requires nothing from you except to be a person sitting across from her.

Then she puts the sandwich down and wipes her fingers on a paper napkin.

"There is a study group forming for Western Civ. Tuesday nights at eight. Keith is in it. You should come."$body$,

  $choices$[
    {
      "id": "priya_continue",
      "label": "Continue",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": [],
      "precludes": [],
      "outcome": {
        "text": "She finishes the grilled cheese, tucks The Second Sex back under her arm, picks up her tray. \"Tuesday. Eight. Keith's room.\" She is gone before you have decided whether you said yes or maybe.",
        "deltas": {}
      },
      "events_emitted": [
        { "npc_id": "npc_studious_priya", "type": "SHARED_MEAL", "magnitude": 1 }
      ]
    }
  ]$choices$::jsonb,

  $nodes$[
    {
      "id": "study_invite",
      "text": "She is looking at you the way Priya looks at people — direct, a little impatient, already three steps ahead in a conversation you have not started yet.",
      "micro_choices": [
        {
          "id": "say_yes_study",
          "label": "Sure, I will be there",
          "next": "priya_nods",
          "sets_flag": "study_group_invited"
        },
        {
          "id": "say_maybe_study",
          "label": "Maybe",
          "next": "priya_maybe",
          "sets_flag": "study_group_invited"
        },
        {
          "id": "say_no_study",
          "label": "I can not, Tuesdays are bad",
          "next": "priya_shrug"
        },
        {
          "id": "ask_about_keith",
          "label": "Keith Hollis?",
          "next": "priya_keith",
          "sets_flag": "study_group_invited"
        }
      ]
    },
    {
      "id": "priya_nods",
      "text": "\"Good.\" She picks up the grilled cheese again. The matter is settled. She moves on to telling you about the reading for Thursday and how Heller assigns twice as much as anyone can actually do, which Priya clearly takes as a personal challenge.",
      "speaker": "npc_studious_priya",
      "next": "choices"
    },
    {
      "id": "priya_maybe",
      "text": "\"Maybe means yes but you want to feel like you are choosing. Tuesday. Eight. Keith's room.\" She picks up the grilled cheese again. The matter, in Priya's mind, is settled.",
      "speaker": "npc_studious_priya",
      "next": "choices"
    },
    {
      "id": "priya_shrug",
      "text": "She shrugs. \"Your loss. The reading for next week is forty pages and Heller cold-calls.\" She picks up the grilled cheese. The conversation moves to something else. But you notice she does not invite you again.",
      "speaker": "npc_studious_priya",
      "next": "choices"
    },
    {
      "id": "priya_keith",
      "text": "\"You know another Keith?\" She does not wait for an answer. \"He is bringing the notes from last week. I am bringing the highlighters. There is a system.\"",
      "speaker": "npc_studious_priya",
      "next": "choices"
    }
  ]$nodes$::jsonb,

  ARRAY['arc_one', 'belonging', 'week2', 'beat', 'day11'],
  '{}'::jsonb,
  100, true,
  ARRAY[]::text[],
  (SELECT id FROM public.tracks WHERE key = 'belonging'),
  (SELECT id FROM public.tracks WHERE key = 'belonging'),
  'priya_dining_hall', 'priya_dining_hall',
  25, 11, 2,
  NULL, NULL,
  'afternoon', 1
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title, body = EXCLUDED.body, choices = EXCLUDED.choices,
  nodes = EXCLUDED.nodes, tags = EXCLUDED.tags, requirements = EXCLUDED.requirements,
  weight = EXCLUDED.weight, is_active = EXCLUDED.is_active,
  introduces_npc = EXCLUDED.introduces_npc,
  order_index = EXCLUDED.order_index, due_offset_days = EXCLUDED.due_offset_days,
  expires_after_days = EXCLUDED.expires_after_days,
  default_next_step_key = EXCLUDED.default_next_step_key,
  default_next_key = EXCLUDED.default_next_key,
  segment = EXCLUDED.segment, time_cost_hours = EXCLUDED.time_cost_hours;


-- ============================================================
-- DAY 12: DOUG'S STORY ABOUT HIS COACH
-- (Beat — evening, belonging track)
-- Common room. Saturday Night Live. Mr. Petrocelli.
-- Three false endings. Doug is a storyteller.
-- ============================================================
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
  'doug_coach_story',
  'Mr. Petrocelli',

  $body$Some of the floor is in the common room — Doug, Mike, Keith, a couple of guys you do not know well yet. The TV is on, Saturday Night Live, but nobody is really watching. Eddie Murphy is doing something. The sound is turned down enough that you can hear the radiator ticking.

Doug is telling a story about his high school baseball coach, a guy named Mr. Petrocelli, who once made the whole team run until one kid threw up because someone had left a bat on the infield dirt.

"So Petrocelli" — Doug is leaning forward, his elbows on his knees — "Petrocelli sees the bat and he does not say anything. He just points. And we all look at the bat and then we look at each other and then he says 'run.'"

The story is long. It has three false endings — the part where you think the kid is going to quit the team, the part where you think Petrocelli is going to apologize, the part where you think the season is over. None of these things happen. What happens is the kid picks up the bat the next day and puts it in the rack and Petrocelli nods at him once and that is it.

Doug tells it well. He is not a good talker but he is a good storyteller, which are different things. Mike has heard it before and is laughing anyway. Keith is half-listening, picking at a bag of Doritos.$body$,

  $choices$[
    {
      "id": "doug_story_end",
      "label": "Head back to your room",
      "time_cost": 0,
      "energy_cost": 0,
      "identity_tags": [],
      "precludes": [],
      "outcome": {
        "text": "You stand up and nobody really notices. The TV is still on. Mike is telling a shorter, worse version of a similar story. Keith is still working on the Doritos. The common room does what common rooms do — it keeps going without you.",
        "deltas": { "stress": -3 }
      }
    }
  ]$choices$::jsonb,

  $nodes$[
    {
      "id": "story_moment",
      "text": "Doug is at the part where Petrocelli makes them run. He is doing Petrocelli's voice, which is a voice Doug clearly practiced in high school. Mike is shaking his head already.",
      "micro_choices": [
        {
          "id": "laugh_along",
          "label": "Laugh at the right moments",
          "next": "doug_gets_it",
          "sets_flag": "engaged_doug_story"
        },
        {
          "id": "ask_about_kid",
          "label": "Wait, what happened to the kid?",
          "next": "doug_epilogue",
          "sets_flag": "engaged_doug_story"
        },
        {
          "id": "tell_your_own",
          "label": "When he finishes, tell one of yours",
          "next": "your_story",
          "sets_flag": "engaged_doug_story"
        },
        {
          "id": "just_listen",
          "label": "Just sit and listen",
          "next": "story_ends"
        }
      ]
    },
    {
      "id": "doug_gets_it",
      "text": "Doug points at you mid-story — \"this guy gets it\" — without breaking stride. He is already into the third false ending, the one where the season is supposedly over, and the way he tells it you almost believe it even though you can see from Mike's face that everything turns out fine.\n\nThe story ends. Mike says \"every time\" and shakes his head.",
      "speaker": "npc_floor_doug",
      "next": "choices"
    },
    {
      "id": "doug_epilogue",
      "text": "Doug stops. His face changes — not annoyed, delighted. \"Oh, you want to know about the kid? The kid is the best part.\" He tells the epilogue, which is that the kid went on to play at Akron and still calls Petrocelli every Christmas.\n\n\"Every Christmas,\" Doug says. He lets it sit.\n\nMike says \"every time\" and shakes his head.",
      "speaker": "npc_floor_doug",
      "next": "choices"
    },
    {
      "id": "your_story",
      "text": "Doug finishes and you tell one. It is not as good — you do not have Doug's sense of timing, the pauses in the right places — but Doug listens. He nods in the places where a storyteller nods, which is not where most people would nod. When you finish he says \"that is a good one\" and it sounds like he means it.\n\nMike says something about his own coach and Keith finally looks up from the Doritos.",
      "next": "choices"
    },
    {
      "id": "story_ends",
      "text": "The story ends the way Doug's stories end — with a fact that sounds like nothing and means everything. The kid picks up the bat. Petrocelli nods. That is it.\n\nMike says \"every time\" and shakes his head. Keith finishes the Doritos and folds the bag into a neat triangle. Someone turns the TV up.",
      "next": "choices"
    }
  ]$nodes$::jsonb,

  ARRAY['arc_one', 'belonging', 'week2', 'beat', 'day12'],
  '{}'::jsonb,
  100, true,
  ARRAY[]::text[],
  (SELECT id FROM public.tracks WHERE key = 'belonging'),
  (SELECT id FROM public.tracks WHERE key = 'belonging'),
  'doug_coach_story', 'doug_coach_story',
  26, 12, 2,
  NULL, NULL,
  'evening', 1
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title, body = EXCLUDED.body, choices = EXCLUDED.choices,
  nodes = EXCLUDED.nodes, tags = EXCLUDED.tags, requirements = EXCLUDED.requirements,
  weight = EXCLUDED.weight, is_active = EXCLUDED.is_active,
  introduces_npc = EXCLUDED.introduces_npc,
  order_index = EXCLUDED.order_index, due_offset_days = EXCLUDED.due_offset_days,
  expires_after_days = EXCLUDED.expires_after_days,
  default_next_step_key = EXCLUDED.default_next_step_key,
  default_next_key = EXCLUDED.default_next_key,
  segment = EXCLUDED.segment, time_cost_hours = EXCLUDED.time_cost_hours;
