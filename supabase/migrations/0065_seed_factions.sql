insert into public.factions (key, name, ideology, aesthetic)
values
  (
    'neo_assyrian',
    'Neo-Assyrian Magnates',
    $$Stability through capital control. Markets are the cleanest instrument of power: impersonal, deniable, and durable.
Crises are not disasters but moments of transfer, where assets move from the impatient to the prepared.
The world is safest when credit flows are guided by steady hands that think in generations, not quarters.$$,
    $$Gold and deep carnelian tones. Ancient symbols abstracted into modern finance: winged bulls rendered as logos,
cuneiform lines embedded in contracts, private rooms that feel older than the buildings around them.$$
  ),
  (
    'dynastic_consortium',
    'Asian Dynastic Consortium',
    $$Endurance through knowledge networks. Power survives not by ruling openly, but by outlasting regimes.
Scholarship, trade, and technical mastery form a lattice that empires rise and fall upon.
Information moves quietly, through trust, patronage, and obligation rather than force.$$,
    $$Silk, ink, and jade. Lantern light, calligraphic marks, layered ledgers.
The visual language of scholars and merchants—measured, elegant, and intentionally opaque.$$
  ),
  (
    'templar_remnant',
    'Templar Remnant',
    $$Order through moral clarity. History drifts when belief weakens.
Societies require anchors—ritual, hierarchy, and doctrine—to resist decay.
Power is legitimate only when it serves a higher truth, and compromise is the first step toward collapse.$$,
    $$Gothic geometry and stark contrasts. Stone, iron, red and white cloth.
Symbols of faith stripped of ornament and repurposed as emblems of resolve.$$
  ),
  (
    'bormann_network',
    'Bormann Network',
    $$Purity through elimination. Institutions rot from hidden enemies within.
Systems built by the weak must be dismantled so stronger orders can emerge.
Secrecy, discipline, and uncompromising loyalty are the only safeguards against infiltration.$$,
    $$Black, silver, and concrete. Brutalist forms, underground spaces, symbols reduced to sharp angles and sigils.
Everything functional, nothing sentimental.$$
  )
on conflict (key) do update set
  name = excluded.name,
  ideology = excluded.ideology,
  aesthetic = excluded.aesthetic;
