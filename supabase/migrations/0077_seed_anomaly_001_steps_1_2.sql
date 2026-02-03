insert into public.content_arc_steps (arc_key, step_index, title, body, choices)
values (
  'anomaly_001',
  1,
  'The Same Answer, Twice',
  'By late afternoon you’ve tested the poster in small ways—asking, checking, thinking you misremembered.\nEvery answer is smooth. Too smooth. The kind of smooth that makes you feel like you’re the problem.\n\nAnd then you hear a phrase you’re certain you’ve heard before, in a different year, from a different mouth:\n\n“Don’t chase the edges. The edges chase back.”\n\nThe person who says it doesn’t notice anything strange about it.\nBut they look at you, just once, like they’re checking whether you understood.',
  '[
    {
      "key": "buy_coffee_probe",
      "label": "Buy them coffee and ask where they got the poster.",
      "costs": { "money": 3 },
      "rewards": { "social_capital": 2 },
      "vector_deltas": { "social": 2, "curiosity": 1, "agency": 1 },
      "flags": { "social": true, "networking": true }
    },
    {
      "key": "library_catalog",
      "label": "Go to the library and hunt for the poster’s origin.",
      "costs": { "energy": 8, "stress": 3 },
      "rewards": { "study_progress": 3 },
      "vector_deltas": { "focus": 2, "curiosity": 2, "stability": -1 },
      "flags": { "research": true }
    },
    {
      "key": "push_it_down",
      "label": "Push it down and focus on what’s due tomorrow.",
      "costs": { "stress": -2, "energy": -2 },
      "rewards": { "study_progress": 2 },
      "vector_deltas": { "focus": 2, "stability": 1, "curiosity": -1 },
      "flags": { "cautious": true }
    },
    {
      "key": "late_walk_clear_head",
      "label": "Take a late walk to clear your head.",
      "costs": { "energy": 4 },
      "rewards": { "stress": -6, "health": 2 },
      "vector_deltas": { "reflection": 2, "stability": 2 },
      "flags": { "recover": true }
    }
  ]'::jsonb
)
on conflict (arc_key, step_index) do update
set title = excluded.title,
    body = excluded.body,
    choices = excluded.choices;

insert into public.content_arc_steps (arc_key, step_index, title, body, choices)
values (
  'anomaly_001',
  2,
  'A Thread You Can Pull',
  'That night you try to sleep, but your mind keeps returning to the poster like a tongue finding a sore tooth.\nIf it’s real, then your memory is wrong.\nIf it isn’t real, then something else is.\n\nA thought arrives with the calm certainty of a decision you didn’t know you’d made:\nYou don’t need proof yet.\nYou need a pattern.',
  '[
    {
      "key": "make_evidence_folder",
      "label": "Start an evidence folder. Dates, names, details.",
      "costs": { "energy": 3 },
      "rewards": { "study_progress": 1 },
      "vector_deltas": { "curiosity": 2, "focus": 1, "agency": 1 },
      "flags": { "research": true, "cautious": true }
    },
    {
      "key": "call_old_friend",
      "label": "Call someone you trust and test the story out loud.",
      "costs": { "money": 2 },
      "rewards": { "social_capital": 2, "stress": -2 },
      "vector_deltas": { "social": 2, "reflection": 1 },
      "flags": { "social": true }
    },
    {
      "key": "double_down_on_work",
      "label": "Pick up extra work hours and stop thinking.",
      "costs": { "energy": 6, "stress": 3 },
      "rewards": { "money": 5 },
      "vector_deltas": { "ambition": 2, "stability": -1, "reflection": -1 },
      "flags": { "work": true }
    },
    {
      "key": "confront_the_source",
      "label": "Ask directly: ‘Who told you to say that line?’",
      "costs": { "stress": 4 },
      "rewards": { "social_capital": 1 },
      "vector_deltas": { "agency": 2, "curiosity": 1, "stability": -1 },
      "flags": { "decisive": true }
    },
    {
      "key": "sleep_early_reset",
      "label": "Go to bed early. Deal with this when you’re clearer.",
      "costs": { "money": 0 },
      "rewards": { "energy": 6, "stress": -3, "health": 2 },
      "vector_deltas": { "stability": 2, "reflection": 1 },
      "flags": { "recover": true }
    }
  ]'::jsonb
)
on conflict (arc_key, step_index) do update
set title = excluded.title,
    body = excluded.body,
    choices = excluded.choices;
