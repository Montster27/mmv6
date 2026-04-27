# L1–L5 Node-Usage Review (re-performed 2026-04-27)

> Closes T-1777215600002 (re-execution after 2026-04-27 ticket reopening).
> Original 2026-04-24 close was associated with the fabricated-work incident
> on T-1777215600001. This pass reads each landmark's `nodes` JSONB from the
> live DB and re-verifies the verdicts node-by-node.

## Method

Each landmark's `nodes` JSONB pulled from `dztobkowaemgvvylgvcx.supabase.co` via
`mcp__execute_sql` on 2026-04-27. Node count cross-checked against ticket's
draft verdict counts; all matched (job_board=3, scott_notices=10,
first_shift_*=0, tuesday_commitment=3, the_post=13). Each node evaluated for:

1. Load-bearing — does it carry texture, mechanic, or prose that would be
   lost if collapsed?
2. Period-detail issues — anachronisms, vocabulary slips
3. NPC naming leaks — names appearing before `introduces_npc`
4. Anti-patterns from `WEEK-2-LANDMARKS-BRIEF.md` §8 + `CLAUDE.md` blacklist

## Verdicts

### L1 — `job_board` — PASS

**3 nodes + 4 terminals.** Each node earns its place.

- `scan_board` (text-only intro): Four-paragraph diegetic info dump where each
  job card has unique sensory specificity — typed white card / faded ink for
  the library; handwritten lined paper torn from a notebook for dining;
  coffee-ringed card for grounds; "IBM Selectric, each letter bitten in
  clean" for research. Without this node, micro-choices on `pick_card` would
  be unlabeled abstractions. The cards' details ARE the decision-grounding
  texture.
- `pick_card` (player input): Four micros each set a `has_job_*` flag that
  unlocks the corresponding `first_shift_*`. The label "Take the card from
  the bottom right" (research) is spatial-not-categorical — player picks by
  position before committing to the field. Right call.
- `card_taken` (text-only coda): "The card comes off the pushpin with a
  small tearing sound where the pin went through. You fold it once and put
  it in your back pocket." Period-physical, gives the choice closure.

NPC leak audit: "R. Chen" appears on the research card. `npc_econ_rebecca`
(display name "Rebecca") is introduced downstream in `first_shift_research`.
Player seeing an initial+surname on a posted job card before meeting in
person is consistent with NPC name discipline (the player is reading text
in the world, not a speaker line).

### L2 — `scott_notices` — PASS, with one period-detail finding

**10 nodes + 2 terminals.** This is the roommate crystallizer. Three
condition-gated entry openers (`scott_opens` on `npc_memory: trust_high`,
`scott_opens_low` on `trust_low`, `scott_absent` as unconditional fallback
via node ordering). The crystallizer fork on `the_question` carries four
micros, each with `set_npc_memory` (`noticed_something` or `roommate_avoids`)
so the persistent-NPC signal survives beyond the scene.

All ten nodes are load-bearing. Aftermath nodes (`scott_reads_silence`,
`scott_accepts`, `scott_drops_it`, `scott_files_it`) each render a different
texture of Scott's recognition shifting (or not), tuned to the specific
choice path. The high-trust path's `scott_reads_silence` ends "the
not-answering told him more than an answer would have" — walks close to the
evaluative-one-liner anti-pattern but lands clean because it's specific to
what just happened, not generic ("It was the kind of moment that changes
things"). Low-trust path's `scott_files_it` closes with "the room feels
different. Not uncomfortable. Just... observed." — the protagonist's
life-now-watched is the crystallizer outcome.

**Period-detail finding to file as separate ticket:**
`alone_in_214.text` mentions "Springsteen, Born in the U.S.A., slightly
crooked" as a poster on Scott's wall. *Born in the U.S.A.* (album) released
June 4, 1984; game is set fall 1983. Two readings:
1. **Authoring slip** — likely. Scott's plausible Springsteen poster pre-1984
   would be *The River* (1980), *Nebraska* (1982), or *Born to Run* (1975).
2. **Intentional alternate-history texture** — per CLAUDE.md "Cultural events
   shifted." Possible but unsignalled in surrounding prose; the player
   time-traveler should plausibly notice "wait, that album doesn't exist
   yet" and the text doesn't gesture at it.

Recommend filing as a small content ticket — one-line fix to swap the album
title (or add a beat where the protagonist clocks the anomaly, if intentional).

### L3 — `first_shift_dining` / `first_shift_grounds` / `first_shift_library` / `first_shift_research` — PASS

**0 nodes + 1 terminal each.** The decision NOT to use nodes is itself
load-bearing — the work *is* the storylet. Body text carries the scene; the
single terminal closes it.

- `first_shift_dining`: industrial dishwasher, hairnet, apron, steam trays,
  fluorescent lights "the bad kind — the kind that make everything look
  like evidence" (Carver-tonal period detail). Closer beat: Doug at the
  breakfast line not making a joke about the hairnet. "Which is somehow
  worse than if he had." Doug introduced earlier in the run (dorm_hallmates),
  so name-discipline check passes. Terry introduced via `introduces_npc`.
- `first_shift_grounds`: persistent cold, work gloves, Walkman clipped to
  belt, "could be Springsteen, could be anything" — narrator uncertainty,
  not a specific album reference, so no anachronism risk here. Vince
  introduced via `introduces_npc`. "you'll get used to it" — period-tonal
  ambiguity.
- `first_shift_library`: returns cart sorted by call number, "third floor
  smells like old carpet," radiators clicking. Mrs. Doerr introduced via
  `introduces_npc`. "Mrs. Doerr has a system. She explains it twice." —
  authority-figure register, period-correct.
- `first_shift_research`: photocopied articles from *Journal of Monetary
  Economics*, yellow legal pad, fluorescent light "the good kind that does
  not hum," "DEPARTMENT OF ECONOMICS in serif letters." Rebecca introduced
  via `introduces_npc`. The closer "She is watching you work" earns its
  bluntness — sets up the recurring-shift texture.

### L4 — `tuesday_commitment` — PASS, with bug confirmed

**3 nodes + 4 terminals.** All three nodes load-bearing.

- `schedule_scan`: post-T-1777055123000 prose now reads Scott in both
  paragraph-positions ("Scott mentioned a movie at the Union on Tuesday..."
  and "as close as Scott gets to an invitation"). Verified via SQL:
  ```
  SELECT n->>'text' FROM jsonb_array_elements(nodes) n
  WHERE n->>'id' = 'schedule_scan' AND s.storylet_key = 'tuesday_commitment';
  ```
- `the_choice`: four micros, each `sets_flag` on a `tuesday_*` walk flag.
  This is the central decision point.
- `choice_made`: "The other three things will happen without you. That is
  the math of it. You fold the schedule and the creases give easily — the
  paper remembers." This single node IS the scarcity-and-preclusion design
  philosophy in three sentences. "The math of it" earns its bluntness —
  literally, the schedule is a math problem.

**Bug confirmed and carried forward (out of scope):** The
`commit_dana.label` micro-choice on `the_choice` still reads "Go to the
movie with Dana." Identified and flagged in the T-1777055123000 close as a
follow-up — two-line fix (label only, choice ID `commit_dana` left
untouched per the visible-prose-only scope rule). Recommend a small
follow-up ticket.

### L5 — `the_post` — PASS

**13 nodes + 2 terminals.** All 13 load-bearing.

The structure: `browse_delphi` (entry, fork) → optional `scan_posts`
detour → `challenge_intro` → optional `hesitation` gate → quiz triplet
(`question_1` / `_2` / `_3`) → `submit_answers` (compound `all_flags`
condition with `else_next: submit_answers_fail`) → success path
(`access_granted` → `archive_content` → `the_realization`) or failure
(`submit_answers_fail`). Miss path `walk_away_node` reachable from
`hesitation`.

Each node carries either:
- A texture-bearing scan of the rising-dread reveal (`scan_posts`,
  `archive_content`)
- A meaningful fork (`browse_delphi`, `challenge_intro`, `hesitation`,
  `archive_content`)
- A quiz step that registers a walk-flag (`question_1`/`_2`/`_3`)
- A condition-gate node that routes via `condition.all_flags` +
  `else_next` (`submit_answers`)
- A specific aftermath rendering of the consequence (`access_granted`,
  `submit_answers_fail`, `the_realization`, `walk_away_node`)

NPC name discipline: `cassandra_7`, `heraclitus`, password `CASSANDRA` are
all usenet handles, not real NPC display names. `introduces_npc` is empty
on `the_post` — correct, no real NPCs are introduced here. Future content
may turn the handles into NPCs (per HANDOFF Week 2 notes); current state
is fine.

Period detail: blinking cursor, green-on-black terminal, RETURN key,
"FORECASTING SCORE: 3/3," archive thread structure — all 1983-correct.

Anti-pattern audit: prose is restrained throughout. Climactic line "You
are not the only one here." earns its directness because what just landed
IS that big.

## Findings filed for follow-up

1. **Born in the U.S.A. anachronism in `scott_notices.alone_in_214`** —
   recommend small content ticket to swap album title (or signal the
   anomaly explicitly). Estimated effort: 2 minutes (text-only fix in a
   migration).
2. **`commit_dana.label` Dana leak in `tuesday_commitment.the_choice`** —
   already noted in T-1777055123000 close. Same shape: label-only fix,
   choice ID `commit_dana` left untouched.

Both are textual / discoverable-in-prose, not engine bugs.

## Audit-step verification (per T-1777215600100 protocol)

- All five landmarks' `nodes` JSONB read from live DB on 2026-04-27 via
  `execute_sql`. Each verdict cites at least one specific node ID by name.
- Node counts in this doc match the live DB query result:
  `SELECT storylet_key, jsonb_array_length(coalesce(nodes,'[]'::jsonb)),
  jsonb_array_length(coalesce(choices,'[]'::jsonb)) FROM storylets WHERE
  storylet_key IN (...)` returned the same numbers used in each section
  header.
- This doc is the artifact the T-1777215600002 close references — not an
  inline ticket-body claim.
