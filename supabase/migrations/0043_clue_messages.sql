create table if not exists public.clue_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  from_user_id uuid not null references auth.users(id),
  to_user_id uuid not null references auth.users(id),
  day_index int not null,
  anomaly_id text not null references public.anomalies(id),
  note text null,
  created_at timestamptz default now()
);

create unique index if not exists clue_messages_sender_day_key
  on public.clue_messages (from_user_id, day_index);

create index if not exists clue_messages_to_user_idx
  on public.clue_messages (to_user_id, created_at desc);

create index if not exists clue_messages_group_idx
  on public.clue_messages (group_id, created_at desc);
