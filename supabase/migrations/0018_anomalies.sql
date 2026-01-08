-- Phase Two: anomaly catalog
create table if not exists public.anomalies (
    id text primary key,
    title text not null,
    description text not null,
    severity int not null default 1,
    created_at timestamptz not null default now()
);

insert into public.anomalies (id, title, description, severity)
values
  ('a_clock_skips', 'Clock Skips', 'For a blink, the hour hand jumps forward and back again.', 2),
  ('a_familiar_stranger', 'Familiar Stranger', 'Someone greets you by name, then vanishes into the crowd.', 1),
  ('a_news_rewrite', 'News Rewrite', 'A headline changes between pages, as if it was never there.', 2),
  ('a_missing_poster', 'Missing Poster', 'A poster you passed daily is suddenly gone, leaving a clean rectangle.', 1),
  ('a_wrong_song', 'Wrong Song', 'The radio plays a tune you do not recognize, but everyone hums along.', 2),
  ('a_same_day_twice', 'Same Day Twice', 'You catch the same moment repeating, half a beat out of sync.', 3)
on conflict (id) do nothing;
