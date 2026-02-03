insert into public.content_arcs (key, title, description)
values (
  'anomaly_001',
  'Anomaly 001 — The Poster That Shouldn’t Exist',
  'A small inconsistency in your room refuses to stay small.'
)
on conflict (key) do update
set title = excluded.title,
    description = excluded.description;

insert into public.content_arc_steps (arc_key, step_index, title, body, choices)
values (
  'anomaly_001',
  0,
  'A Familiar Room, Slightly Misfiled',
  'You wake in your dorm room with the uneasy sense that you’ve already lived this morning once—maybe more than once.\nNothing is obviously wrong. The light is the same thin winter gray. The radiator clicks, then sighs. Your desk is where it’s always been.\n\nBut your eyes keep snagging on the wall.\n\nThere’s a poster above your bed: bold colors, sharp angles, a design you recognize instantly—except you shouldn’t.\nYou can almost remember buying it… except you can also remember the store not opening until years later.\nBoth memories sit in your head at the same time, and neither one feels like a dream.\n\nA small, irrational part of you wants to ignore it.\nA larger part of you—older, quieter, and more stubborn—knows this is the kind of detail that becomes a door if you keep staring at it.\n\nToday still has classes. People will talk to you like everything is normal.\nAnd maybe it is.\n\nBut the poster isn’t.',
  '[
    {
      "key": "write_it_down",
      "label": "Write it down exactly.",
      "flags": { "research": true, "cautious": true }
    },
    {
      "key": "ask_casually",
      "label": "Ask someone casually.",
      "flags": { "social": true, "networking": true }
    },
    {
      "key": "ignore_it",
      "label": "Ignore it. Today has enough problems.",
      "flags": { "avoid": true }
    }
  ]'::jsonb
)
on conflict (arc_key, step_index) do update
set title = excluded.title,
    body = excluded.body,
    choices = excluded.choices;
