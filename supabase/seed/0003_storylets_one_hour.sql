-- One-hour content pack storylets (run in Supabase SQL Editor)
insert into public.storylets (slug, title, body, choices, tags, is_active, requirements)
values
  (
    'arc_stranger_1',
    'You Said This Yesterday',
    'An acquaintance says you shared a private opinion yesterday. You remember no such conversation.',
    '[
      {
        "id":"A",
        "label":"Ask when you talked",
        "outcome":{
          "text":"They describe the setting with calm certainty. You nod along and feel a new edge of doubt.",
          "deltas":{"stress":0,"energy":0,"vectors":{"reflection":1}},
          "anomalies":["a_shared_memory_gap"]
        }
      },
      {
        "id":"B",
        "label":"Say you do not remember",
        "outcome":{
          "text":"Their face tightens as if you broke a small promise. You feel the loss of a thread.",
          "deltas":{"stress":1,"energy":-1},
          "anomalies":["a_shared_memory_gap"]
        }
      }
    ]'::jsonb,
    '{arc,psych,unreliable}',
    true,
    '{}'::jsonb
  ),
  (
    'arc_stranger_2',
    'The Detail You Cannot Fake',
    'They mention a detail you never told anyone. It is too specific to be a guess.',
    '[
      {
        "id":"A",
        "label":"Ask where they learned it",
        "outcome":{
          "text":"They hesitate, then cite a place you have not been in months.",
          "deltas":{"stress":0,"energy":0,"vectors":{"reflection":1}}
        }
      },
      {
        "id":"B",
        "label":"Accuse them of guessing",
        "outcome":{
          "text":"They flinch and turn away. The moment feels rehearsed and raw at once.",
          "deltas":{"stress":2,"energy":-1}
        }
      }
    ]'::jsonb,
    '{arc,psych,unreliable}',
    true,
    '{}'::jsonb
  ),
  (
    'arc_stranger_3',
    'Proof',
    'They show you a note and a blurred photo. It proves something, but you cannot say what.',
    '[
      {
        "id":"A",
        "label":"Examine the proof",
        "outcome":{
          "text":"The edges of the evidence feel familiar, but the center will not focus.",
          "deltas":{"stress":1,"energy":0,"vectors":{"reflection":1}},
          "anomalies":["a_object_out_of_context"]
        }
      },
      {
        "id":"B",
        "label":"Refuse to look",
        "outcome":{
          "text":"You look away and feel the shape of something missing settle in.",
          "deltas":{"stress":1,"energy":0},
          "anomalies":["a_object_out_of_context"]
        }
      }
    ]'::jsonb,
    '{arc,psych,unreliable}',
    true,
    '{}'::jsonb
  ),
  (
    'arc_stranger_4',
    'You Asked Me To Do This',
    'They say you asked them to intervene now. You do not remember making the request.',
    '[
      {
        "id":"A",
        "label":"Admit you do not know",
        "outcome":{
          "text":"You say it plainly. The honesty steadies you more than it should.",
          "deltas":{"stress":-1,"energy":0},
          "anomalies":["a_intervention_loop"]
        }
      },
      {
        "id":"B",
        "label":"Say they are mistaken",
        "outcome":{
          "text":"They go quiet. The silence feels like a decision you already made.",
          "deltas":{"stress":2,"energy":0},
          "anomalies":["a_intervention_loop"]
        }
      }
    ]'::jsonb,
    '{arc,psych,unreliable}',
    true,
    '{}'::jsonb
  ),
  (
    'poster_torn',
    'The Poster',
    'A poster is half torn, the headline missing. The remaining text feels aimed at you.',
    '[
      {
        "id":"A",
        "label":"Pull the rest down",
        "outcome":{
          "text":"The paper tears too easily. You fold the pieces and keep them anyway.",
          "deltas":{"stress":1,"energy":-1},
          "anomalies":["a_missing_poster"]
        }
      },
      {
        "id":"B",
        "label":"Leave it there",
        "outcome":{
          "text":"You walk away but the shape of the missing line stays with you.",
          "deltas":{"stress":0,"energy":0,"vectors":{"reflection":1}},
          "anomalies":["a_missing_poster"]
        }
      }
    ]'::jsonb,
    '{psych,unreliable}',
    true,
    '{}'::jsonb
  ),
  (
    'same_question',
    'Same Question, Different Tone',
    'Someone asks a question you already answered today, but with different urgency.',
    '[
      {
        "id":"A",
        "label":"Answer carefully",
        "outcome":{
          "text":"You choose your words like you are stepping across thin ice.",
          "deltas":{"stress":0,"energy":-1,"vectors":{"reflection":1}}
        }
      },
      {
        "id":"B",
        "label":"Brush it off",
        "outcome":{
          "text":"They accept it but the air cools.",
          "deltas":{"stress":1,"energy":0}
        }
      }
    ]'::jsonb,
    '{psych,unreliable}',
    true,
    '{}'::jsonb
  ),
  (
    'joke_you_dont_get',
    'The Joke You Do Not Get',
    'Everyone laughs at a punchline you cannot find.',
    '[
      {
        "id":"A",
        "label":"Ask them to explain",
        "outcome":{
          "text":"They explain too quickly, as if the joke is a cover story.",
          "deltas":{"stress":1,"energy":0,"vectors":{"reflection":1}}
        }
      },
      {
        "id":"B",
        "label":"Laugh anyway",
        "outcome":{
          "text":"You match their timing and feel a small drift inside.",
          "deltas":{"stress":1,"energy":-1}
        }
      }
    ]'::jsonb,
    '{psych,unreliable}',
    true,
    '{}'::jsonb
  ),
  (
    'wrong_song',
    'The Wrong Song',
    'Someone says your favorite song is one you have never heard.',
    '[
      {
        "id":"A",
        "label":"Correct them",
        "outcome":{
          "text":"They insist you are the one who told them. You are not sure anymore.",
          "deltas":{"stress":1,"energy":0},
          "anomalies":["a_wrong_song"]
        }
      },
      {
        "id":"B",
        "label":"Play along",
        "outcome":{
          "text":"You nod and feel a new story settle in your mouth.",
          "deltas":{"stress":0,"energy":0,"vectors":{"reflection":1}},
          "anomalies":["a_wrong_song"]
        }
      }
    ]'::jsonb,
    '{psych,unreliable}',
    true,
    '{}'::jsonb
  ),
  (
    'already_decided',
    'Already Decided',
    'A plan is announced as if you already agreed to it.',
    '[
      {
        "id":"A",
        "label":"Go along",
        "outcome":{
          "text":"You nod and feel your voice fall behind your face.",
          "deltas":{"stress":1,"energy":0}
        }
      },
      {
        "id":"B",
        "label":"Push back",
        "outcome":{
          "text":"They exchange a look that suggests you are late to your own decision.",
          "deltas":{"stress":2,"energy":-1}
        }
      }
    ]'::jsonb,
    '{psych,unreliable}',
    true,
    '{}'::jsonb
  ),
  (
    'the_correction',
    'The Correction',
    'Someone corrects a detail you have always remembered the same way.',
    '[
      {
        "id":"A",
        "label":"Accept the correction",
        "outcome":{
          "text":"You say thank you and feel a small shift behind your eyes.",
          "deltas":{"stress":0,"energy":0,"vectors":{"reflection":1}}
        }
      },
      {
        "id":"B",
        "label":"Insist you were right",
        "outcome":{
          "text":"They stop arguing but keep watching you.",
          "deltas":{"stress":2,"energy":0}
        }
      }
    ]'::jsonb,
    '{psych,unreliable}',
    true,
    '{}'::jsonb
  ),
  (
    'you_promised',
    'You Promised',
    'They thank you for a promise you do not remember making.',
    '[
      {
        "id":"A",
        "label":"Ask for details",
        "outcome":{
          "text":"They describe a scene you cannot place but it sounds like you.",
          "deltas":{"stress":1,"energy":0,"vectors":{"reflection":1}},
          "anomalies":["a_unkept_promise"]
        }
      },
      {
        "id":"B",
        "label":"Apologize and move on",
        "outcome":{
          "text":"You apologize and feel the apology take root in your day.",
          "deltas":{"stress":1,"energy":-1},
          "anomalies":["a_unkept_promise"]
        }
      }
    ]'::jsonb,
    '{psych,unreliable}',
    true,
    '{}'::jsonb
  ),
  (
    'familiar_look',
    'The Familiar Look',
    'A stranger stares as if you are someone they lost.',
    '[
      {
        "id":"A",
        "label":"Look back",
        "outcome":{
          "text":"You hold the gaze. The recognition feels mutual and empty.",
          "deltas":{"stress":0,"energy":0,"vectors":{"reflection":1}},
          "anomalies":["a_familiar_stranger"]
        }
      },
      {
        "id":"B",
        "label":"Avoid the gaze",
        "outcome":{
          "text":"You turn away and feel a soft ache you cannot place.",
          "deltas":{"stress":1,"energy":0}
        }
      }
    ]'::jsonb,
    '{psych,unreliable}',
    true,
    '{}'::jsonb
  ),
  (
    'rescheduled_thing',
    'The Rescheduled Thing',
    'Everyone says the meeting moved to tomorrow. You are sure it is today.',
    '[
      {
        "id":"A",
        "label":"Check the calendar",
        "outcome":{
          "text":"The calendar agrees with them, but your body does not.",
          "deltas":{"stress":1,"energy":0,"vectors":{"reflection":1}},
          "anomalies":["a_calendar_drift"]
        }
      },
      {
        "id":"B",
        "label":"Let it pass",
        "outcome":{
          "text":"You decide to trust the room, and the room moves on without you.",
          "deltas":{"stress":1,"energy":0},
          "anomalies":["a_calendar_drift"]
        }
      }
    ]'::jsonb,
    '{psych,unreliable}',
    true,
    '{}'::jsonb
  ),
  (
    'note_handwriting',
    'The Note in Your Handwriting',
    'A note appears in your handwriting, but you do not remember writing it.',
    '[
      {
        "id":"A",
        "label":"Compare the handwriting",
        "outcome":{
          "text":"The letters are yours, but the rhythm is wrong.",
          "deltas":{"stress":0,"energy":0,"vectors":{"reflection":1}},
          "anomalies":["a_handwriting_mismatch"]
        }
      },
      {
        "id":"B",
        "label":"Hide the note",
        "outcome":{
          "text":"You fold it and put it away as if it might move on its own.",
          "deltas":{"stress":1,"energy":-1},
          "anomalies":["a_handwriting_mismatch"]
        }
      }
    ]'::jsonb,
    '{psych,unreliable}',
    true,
    '{}'::jsonb
  ),
  (
    'stop_doing_that',
    'Stop Doing That',
    'Someone asks you to stop doing something you are not doing.',
    '[
      {
        "id":"A",
        "label":"Ask what they mean",
        "outcome":{
          "text":"They hesitate, then answer as if you should already know.",
          "deltas":{"stress":1,"energy":0,"vectors":{"reflection":1}}
        }
      },
      {
        "id":"B",
        "label":"Stop immediately",
        "outcome":{
          "text":"You pause anyway. They look relieved for reasons you cannot see.",
          "deltas":{"stress":1,"energy":0}
        }
      }
    ]'::jsonb,
    '{psych,unreliable}',
    true,
    '{}'::jsonb
  ),
  (
    'relief',
    'The Relief',
    'You feel relief before you know what you avoided.',
    '[
      {
        "id":"A",
        "label":"Let the relief in",
        "outcome":{
          "text":"You accept the feeling and notice the contradiction underneath it.",
          "deltas":{"stress":0,"energy":0,"vectors":{"reflection":1}},
          "anomalies":["a_self_contradiction"]
        }
      },
      {
        "id":"B",
        "label":"Hold position",
        "outcome":{
          "text":"You stay still until the relief fades and leaves a question.",
          "deltas":{"stress":1,"energy":0}
        }
      }
    ]'::jsonb,
    '{psych,unreliable}',
    true,
    '{}'::jsonb
  )
on conflict (slug) do update
set title = excluded.title,
    body = excluded.body,
    choices = excluded.choices,
    tags = excluded.tags,
    is_active = excluded.is_active,
    requirements = excluded.requirements;
