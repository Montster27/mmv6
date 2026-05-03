# Code session brief — T-1777564800228 terminal scheduler bug

## Context

Two playtesters in two days couldn't reach `terminal_first_visit` despite playing builds where the gate flag write was already in place. Earlier this session, claude.ai initially misframed the bug as a missing flag-setter; Code's investigation correctly disproved that and surfaced the real shape: the storylet is never served despite all eligibility conditions appearing met.

This is the most narratively-loaded scene in Arc One (the terminal is the player's main investigation surface for the entire frame story), and it's currently unreachable in production.

## Hard rules

1. **Diagnostic before fix.** Same pattern as the Phase 1 instrumentation work. Find the actual failure mode before designing the fix.
2. **No speculative fixes.** If a candidate root cause matches the symptom but you haven't confirmed it via reading the code path or instrumenting the eligibility filter, mark it as a hypothesis and verify before acting.
3. **Don't bundle unrelated changes.** Whatever the fix is, it ships as a focused commit. CONTENT-RULES updates, related ticket fixes, etc. ship separately.

## What we already know

From the earlier investigation this session (do not redo this; reference for context):

- `terminal_first_visit` storylet row (migration 20260403100000_glenn_terminal_opportunity_storylets.sql:347-362):
  - `segment: afternoon`
  - `due_offset_days: 1`
  - `expires_after_days: 14`
  - `time_cost_hours: 1`
  - `is_active: true`
  - `weight: 100`
  - `requirements: {"requires_flag": "glenn_gave_direction"}`
  - No identity gates, no NPC gates
- `glenn_gave_direction` flag is set via `sets_flag: ["glenn_gave_direction"]` on the `head_to_evening` choice of `glenn_pastime_paradise`. Migration 20260417100001_add_sets_flag_to_choices.sql, comment: "These were missing — the requires_flag values existed on storylets but no choice ever set them."
- 2026-04-29 playthrough capture (`docs/PLAYTHROUGH-LOG.md`):
  - Day 2 PM: player resolved `glenn_pastime_paradise` via `head_to_evening` choice. Flag write should have fired here.
  - Day 3 PM: engine served `Trays Again` (belonging) and `Room 108` (academic). `terminal_first_visit` was eligible but never offered.
- Day 3 is the first eligible afternoon for `terminal_first_visit` (`due_offset_days: 1` from started_day, but the player's actual progression put Day 2 afternoon as the Glenn beat — so Day 3 afternoon is the first opportunity for the terminal to surface post-flag-write).

## Hypothesis space

Four candidate root causes, in order of estimated likelihood:

### Hypothesis A: `requires_flag` in storylet `requirements` is not consumed by the eligibility filter

The storylet `requirements` JSONB supports several documented predicates (e.g., `requires_choice` per CONTENT-RULES Rule 6). `requires_flag` may have been added at some point as a content-author convention but never wired into the pool-scan filter. Result: the storylet appears in every eligible pool regardless of flag state, BUT may be deprioritized vs. other storylets with explicit gates.

Wait — that doesn't fit the symptom. If the gate is unconsumed, the storylet should be served *more* often, not never. Unless there's a separate path that filters it out.

Refined Hypothesis A: `requires_flag` is unconsumed AND the eligibility filter has a separate exclusion path (e.g., "if storylet declares a `requirements.requires_flag`, exclude it unless the engine explicitly marks the flag satisfied" — a defensive but broken check).

### Hypothesis B: `requires_flag` is consumed but reads from a different storage surface than `sets_flag` writes to

This is the original speculation from earlier in the session. `MicroChoice.sets_flag` is documented as writing to walk-local state (CONTENT-RULES Rule 11 — "Walk flags are ephemeral. They exist only during the node walk and are used to gate terminal choices via `requires_flag` / `excludes_flag`. They do not persist after the storylet resolves.")

But the `head_to_evening` `sets_flag` is on a TERMINAL choice, not a micro-choice. Does terminal-choice `sets_flag` write to a persistent surface (choice_log, NPC memory, daily_states)? Or does it inherit the walk-local semantics?

If terminal-choice `sets_flag` is also walk-local, that's the bug. The flag fires, the walk completes, the flag clears, the storylet resolves, and the next storylet's eligibility check sees no flag.

### Hypothesis C: Some other gate is excluding the storylet

Could be:
- The storylet gets filtered by `expires_after_days` reading from the wrong reference (e.g., from arrival rather than from track-start)
- A `precludes` rule on another storylet is silently blocking it
- Track-state machinery: `terminal_first_visit` is on `opportunity` track, and the track may be in a state that doesn't allow this storylet to surface

Lower likelihood but worth ruling out.

### Hypothesis D: The flag IS being set and IS being read correctly, but never makes it to the eligibility check at the right moment

Race condition or query staleness. The flag is in the database after the Day 2 PM resolve, but the Day 3 PM eligibility query reads from a stale cache or a different state surface.

Lowest likelihood given the persistence of the symptom across two sessions on different builds.

## Diagnostic procedure

### Phase 1: Read the eligibility filter

Find where storylets are selected for the daily pool. Likely candidates (verify, don't trust this list):
- `src/core/engine/selectTrackStorylets.ts` (named in earlier session)
- `src/lib/storylets.ts`
- `src/core/dailyLoop.ts` or similar

In whichever file is the actual filter:

1. Find the function that takes `(userId, dayIndex, segment)` (or equivalent) and returns the eligible storylets.
2. List every predicate it evaluates against a storylet. Specifically look for: handling of `storylet.requirements`, what fields inside that JSONB are read, where each field is matched against state.
3. **Answer concretely:** is `requires_flag` in `requirements` evaluated? If yes, what state surface does it read from?

### Phase 2: Read the flag-write path

Find where `sets_flag` on a terminal choice (not a micro-choice) is processed:

1. Likely path: `/api/tracks/resolve` route handler reading `choice.sets_flag` and writing somewhere.
2. **Answer concretely:** when a terminal choice has `sets_flag: ["X"]`, where does X get written? `walk_state` (ephemeral)? `choice_log` (persistent, scoped to track)? `daily_states.preclusion_gates` (persistent, daily-scoped)? `npc_memory` (persistent, NPC-scoped)? Some other table?

### Phase 3: Compare

If Phase 1 says "the eligibility filter reads `requires_flag` from surface X" and Phase 2 says "terminal-choice `sets_flag` writes to surface Y," and X ≠ Y — that's the bug. Hypothesis B confirmed.

If Phase 1 says "the eligibility filter does not evaluate `requires_flag` at all" — that's Hypothesis A confirmed. Then read what *does* filter the storylet out.

If Phases 1 and 2 are consistent — Hypotheses C or D, dig further (check track state, expiration logic, cache invalidation).

### Phase 4: Confirm via [STATE] instrumentation

Once you have a hypothesis with code-reading evidence, add a temporary `[STATE]` log entry in the eligibility filter that emits the read state surface and the predicate result for `terminal_first_visit` specifically. Re-run a playthrough that resolves Glenn → advances to Day 3 → checks afternoon pool. The log entry will confirm whether your hypothesis matches runtime behavior.

If the hypothesis holds: design the fix.
If it doesn't: refine and repeat Phase 1-3.

## Designing the fix

The fix shape depends on which hypothesis confirms. Don't pre-design — let the diagnosis lead.

That said, two plausible fix surfaces if Hypothesis A or B confirms:

### If Hypothesis A: implement `requires_flag` in the eligibility filter

Decide on the storage surface first (probably `choice_log` for parity with `requires_choice`, OR a new persistent flag table). Add the predicate evaluation. Make sure `sets_flag` on terminal choices writes to the same surface. Document in CONTENT-RULES (extend Rule 6 to cover `requires_flag` alongside `requires_choice`).

### If Hypothesis B: align surfaces

Either:
- (a) Change `sets_flag` semantics on terminal choices to write to the persistent surface that `requires_flag` reads from. Walk-local stays for micro-choices; terminal becomes persistent.
- (b) Migrate the `requires_flag` predicate to read from walk-local state. Doesn't make sense across days, so probably not the right fix.
- (c) Migrate the gate to a different syntax that already works (e.g., `requires_choice` if applicable).

(a) is the structurally correct move if the design intent is "terminal-choice flag-writes can gate future content." (c) is the pragmatic fix if design intent is fuzzier.

### Either way: regression test

Add a playthrough script (`scripts/playthroughs/glenn_to_terminal.yaml` or similar) that:
1. Resolves `glenn_pastime_paradise` with `head_to_evening`
2. Advances to Day 3 afternoon (or wherever first eligible)
3. Asserts `terminal_first_visit` is in the served pool

This is the regression that prevents this bug from recurring.

## Out of scope

- Fixing the underlying CONTENT-RULES gap (extending Rule 6 to document `requires_flag`) is a follow-up commit, not part of this fix
- Auditing other storylets that may have the same broken pattern — file as a follow-up ticket
- Any work on T-1777400000001 — Sentry watches it
- Any content authoring beyond the regression playthrough script

## Verification

- [ ] Hypothesis confirmed via Phase 1-4 diagnostic
- [ ] Fix designed against the confirmed hypothesis, not speculation
- [ ] Migration written if fix requires SQL changes
- [ ] Regression playthrough script created and passing
- [ ] `tsc --noEmit` clean
- [ ] `vitest run` parity (246 / 1)
- [ ] `playthrough:all` parity plus the new regression script
- [ ] Browser spot-check: fresh user, walk Glenn, advance to Day 3, see `terminal_first_visit` in afternoon pool
- [ ] T-1777564800228 closed in Kanban with diagnosis summary and fix description
- [ ] CONTENT-RULES follow-up ticket filed if the fix surfaced a documentation gap

## Time budget

Phase 1-3 (diagnosis): 1-2 hours
Phase 4 (instrumented confirmation): 30 minutes
Fix + regression: 1-2 hours

If diagnosis takes more than 2 hours, surface to monty before continuing. The bug may be wider than expected (e.g., `requires_flag` is dead syntax across many storylets and the fix scope expands).

## Begin with Phase 1.
