create table if not exists public.factions (
  key text primary key,
  name text not null,
  ideology text not null,
  aesthetic text not null,
  created_at timestamptz default now()
);

insert into public.factions (key, name, ideology, aesthetic)
values
  (
    'neo_assyrian',
    'Neo-Assyrian Ledger',
    'Order through leverage. Power is a quiet instrument, not a spectacle.',
    'Ledgered steel, quiet authority, polished edges.'
  ),
  (
    'dynastic_consortium',
    'Dynastic Consortium',
    'Knowledge is inheritance. The future belongs to those who archive it.',
    'Marble stacks, ink-stained gloves, sealed correspondence.'
  ),
  (
    'templar_remnant',
    'Templar Remnant',
    'Duty before doubt. Discipline is the only reliable compass.',
    'Worn cloth, ritual cadence, a vow carried in silence.'
  ),
  (
    'bormann_network',
    'Bormann Network',
    'Survival requires secrecy. If a truth is dangerous, bury it.',
    'Smoked glass, dead drops, a room with no echoes.'
  )
on conflict (key) do update set
  name = excluded.name,
  ideology = excluded.ideology,
  aesthetic = excluded.aesthetic;

do $$ begin
  if to_regclass('public.factions') is null then
    return;
  end if;

  alter table public.factions enable row level security;

  begin
    create policy "factions_select_authenticated" on public.factions
      for select using (auth.role() = 'authenticated');
  exception when duplicate_object then null; end;
end $$;
