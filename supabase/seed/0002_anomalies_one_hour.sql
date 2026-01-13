-- One-hour content pack anomalies (run in Supabase SQL Editor)
insert into public.anomalies (id, title, description, severity)
values
  (
    'a_shared_memory_gap',
    'Shared Memory Gap',
    'Someone remembers a moment you do not — vividly.',
    2
  ),
  (
    'a_object_out_of_context',
    'Object Out of Context',
    'An item exists without a clear origin in your memory.',
    2
  ),
  (
    'a_intervention_loop',
    'Intervention Loop',
    'Someone is acting because you told them to — later.',
    3
  ),
  (
    'a_missing_poster',
    'Missing Poster',
    'Evidence of intent without recollection.',
    1
  ),
  (
    'a_wrong_song',
    'Wrong Song',
    'Taste, preference, and identity do not line up.',
    1
  ),
  (
    'a_unkept_promise',
    'Unkept Promise',
    'Obligation without consent.',
    2
  ),
  (
    'a_calendar_drift',
    'Calendar Drift',
    'Time shifts socially, not physically.',
    2
  ),
  (
    'a_handwriting_mismatch',
    'Handwriting Mismatch',
    'Authorship without ownership.',
    2
  ),
  (
    'a_familiar_stranger',
    'Familiar Stranger',
    'Recognition without relationship.',
    3
  ),
  (
    'a_self_contradiction',
    'Self-Contradiction',
    'Evidence that you are inconsistent over time.',
    2
  )
on conflict (id) do update
set title = excluded.title,
    description = excluded.description,
    severity = excluded.severity;
