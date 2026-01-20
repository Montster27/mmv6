insert into public.content_arcs (key, title, description, tags, is_active)
values (
  'anomaly_001',
  'The Borrowed Memory',
  'A small inconsistency keeps returning-like a word you remember differently than everyone else.',
  array['anomaly','investigation','memory'],
  true
)
on conflict (key) do update set
  title = excluded.title,
  description = excluded.description,
  tags = excluded.tags,
  is_active = excluded.is_active;

insert into public.content_arc_steps (arc_key, step_index, title, body, choices)
values
  (
    'anomaly_001',
    0,
    'A detail that will not sit still',
    $$In the hallway you pass a flyer for a campus talk you are sure happened last semester, but the date says next week. You stop, read it twice, and feel the same faint pressure behind your eyes you have noticed on other almost-right days. A friend waves you over and mentions the speaker casually, as if you have never heard the name. You try to play it normal, but the mismatch sticks. It is not dramatic-no lightning, no visions-just the steady sense that something is being edited in the margins.

You try to remember the last time something felt this off. It was small then too: a schedule, a nickname, a familiar face with a different story. Those slips have a shape now, a rhythm, like edits happening between breaths. If you ignore it, the day will go on. If you track it, the day will change. You decide what kind of day this becomes.$$,
    '[{"key":"log_it","label":"Write it down somewhere you will not lose.","flags":{"arc_anomaly_001_logged":true}},
      {"key":"ask_gently","label":"Ask one careful question without sounding strange.","flags":{"arc_anomaly_001_asked":true}},
      {"key":"ignore","label":"Ignore it. You have enough going on.","flags":{"arc_anomaly_001_ignored":true}}]'::jsonb
  ),
  (
    'anomaly_001',
    1,
    'The second mismatch',
    $$Later, in the library, you pull a book you remember clearly-same cover, same author-but a chapter title is different. Not rewritten. Different. Like it always was. For a moment you consider how easy it would be to doubt yourself. That may even be the point. But the feeling returns: someone is making small changes that only matter if you are watching.

You notice a student at a nearby table making notes in a tidy grid, pausing whenever you pause. When you look up, they look down. Maybe coincidence. Maybe not. You feel the urge to map the differences, to protect your memory against the slow drift of the room. But you also feel the pull of ordinary work. The contradiction sits beside you like a quiet companion. You decide how close you are willing to stand to it today.$$,
    '[{"key":"compare_notes","label":"Make a quick comparison: old memory vs. what you see now.","flags":{"arc_anomaly_001_compared":true}},
      {"key":"watch_them","label":"Pay attention to the other student. Do not engage.","flags":{"arc_anomaly_001_watched":true}},
      {"key":"move_on","label":"Move on. You cannot afford to spiral today.","flags":{"arc_anomaly_001_moved_on":true}}]'::jsonb
  ),
  (
    'anomaly_001',
    2,
    'A tiny invitation',
    $$As you pack up, a slip of paper falls from your book. You did not put it there. It has only two lines: "You are not the only one who notices." "Meet where the posters peel." No time, no date. Just that. It is either a prank, or the first direct proof you have had that the anomalies are meant to be found.

You fold the paper once. It feels too light to matter and too deliberate to ignore. The invitation is not a command; it is a test of what you are willing to risk for confirmation. You imagine the place, the sound of paper tearing, the edges of glue curling from a wall. You decide what kind of person you are going to be about this: the one who steps closer, the one who leaves a trace, or the one who burns the evidence before it can burn you.$$,
    '[{"key":"go","label":"Go. Not today, but soon. You will make time.","flags":{"arc_anomaly_001_commit":true}},
      {"key":"test","label":"Test it indirectly-leave a sign you were here without showing up.","flags":{"arc_anomaly_001_tested":true}},
      {"key":"burn","label":"Destroy it. If this is real, it is also dangerous.","flags":{"arc_anomaly_001_burned":true}}]'::jsonb
  )
on conflict (arc_key, step_index) do update set
  title = excluded.title,
  body = excluded.body,
  choices = excluded.choices;

insert into public.content_initiatives (key, title, description, goal, duration_days, tags, is_active)
values (
  'campus_signal_watch',
  'Campus Signal Watch',
  'A quiet, collective habit: each day, a few people record one small inconsistency. Individually it is nothing. Together, it becomes a pattern.',
  120,
  7,
  array['anomaly','community','investigation'],
  true
)
on conflict (key) do update set
  title = excluded.title,
  description = excluded.description,
  goal = excluded.goal,
  duration_days = excluded.duration_days,
  tags = excluded.tags,
  is_active = excluded.is_active;
