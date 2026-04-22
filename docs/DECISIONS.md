# Decisions Log

## `requires_flag` is cross-track (globalFlags union) + `tuesday_commitment` rewrite

- **Date:** 2026-04-22
- **Context:** The Week 2 push (2026-04-20) landed `the_post`, `tuesday_night_terminal`, `tuesday_night_shift`, and `tuesday_night_dana_movie` on three different tracks, all gated on flags that `tuesday_commitment` (belonging track) was supposed to write. Two latent problems stopped any of them from firing in a real run. (a) The tuesday_* walk-flags were set by micro-choices inside the node walk — those are scene-local and never reach `choice_log` as `FLAG_SET`. (b) Even if they did, `dailyLoop.ts` scoped its FLAG_SET query to the *current* track IDs and `selectTrackStorylets.ts → meetsRequirements` only saw per-track flags, so an opportunity-track storylet couldn't read a belonging-track flag regardless. The HANDOFF 2026-04-20 "Known limitation" flagged both gaps and proposed the two-part fix.
- **Decision:** Implemented both halves together.
  - **Engine:** `dailyLoop.ts` now queries *all* FLAG_SET events for the user (dropped the `.in("track_id", trackIds)` filter) and builds a `globalFlags: Set<string>` alongside the per-track `flagsByTrack: Map<string, Set<string>>`. `selectTrackStorylets.ts` gained a `globalFlags` parameter; inside the pool-scan loop it unions `globalFlags` onto each track's own flag set before calling `meetsRequirements`. Per-track map is preserved — it's still available for any future track-scoped check — but the default evaluation path sees the union. The playthrough-runner loader + harness were updated in parallel so headless scripts see the same behaviour.
  - **Content:** `20260422100000_tuesday_commitment_flag_persistence.sql` rewrites `tuesday_commitment.choices` from a single terminal `tuesday_decided` into four walk-flag-gated terminals (`tuesday_decided_study/terminal/shift/movie`). Each terminal carries `requires_flag: "tuesday_<path>"` so `DialogueNodeView`'s walk filter shows only the one matching the commitment the player made, AND `sets_flag: ["tuesday_<path>"]` so that walk-flag is persisted to `choice_log.FLAG_SET` on resolve. Same migration wires `introduces_npc` for `evening_choice` (Bryce) and `morning_after_cards` (Peterson) — a pending Known Issue #5 item, bundled because the migration was already touching those tables.
- **Alternatives considered:**
  - *Rewrite the micro-choice engine to persist walk-flags past the scene.* Rejected — breaks the clean separation between scene-local dialogue state and durable run state, and a walk-flag is by design a tool for local conditional rendering. The problem wasn't walk-flag semantics; it was that the **terminal** didn't persist.
  - *Leave flags strictly per-track and duplicate the gate flags onto multiple tracks.* Rejected — requires coordinated multi-track writes on every commitment choice, multiplies the surface for drift, and the narrative truth is "I committed my Tuesday evening" (global) not "I committed my belonging-track Tuesday evening."
  - *Replace per-track flags entirely with globalFlags.* Rejected as too invasive for this session — kept the per-track map so existing track-scoped checks keep working, and added the union at the evaluation site. Future refactor can consolidate if no check actually needs track scoping.
- **Impact:** All four Week 2 tuesday_night_* variants are now reachable in real play. The cross-track gate pattern (`sets_flag` on one track → `requires_flag` on another) is now the canonical way to coordinate story beats across tracks. `docs/ENGINE-SPEC.md` §1/§2/§9 and `docs/CHAIN-MAP.md` were rewritten to document the new behaviour; `docs/CONTENT-INVENTORY.md` regenerated. Engine unit test `requires_flag is track-scoped` was repurposed to `requires_flag is cross-track via globalFlags`. SQL verification confirms DB state post-migration. Vitest could not be run this session due to an unrelated corrupted `node_modules/vite` (Known Issue #14); the change is small, SQL-verified, and the playthrough-runner harness was updated in lockstep.

---

## Week 2 content push: routine activation, activity roster, crystallizers

- **Date:** 2026-04-20
- **Context:** `docs/WEEK-2-CONTENT-BRIEF.md` scoped the Week 2 shape — when routine mode activates, what activities exist, where it collides, and two landmark storylets (L2 scott_notices Day 11 eve, L5 the_post Day 14 aft). Seven discrete decisions landed in the same session; rolling them up under one heading with the per-decision lines preserved.
- **Decisions:**
  1. **Routine mode activates Day 3** (was Day 7). Classes start Day 3 — the fiction matches the mechanic. Short first week (Days 3–6) is training.
  2. **Activities are time-locked to segments** (new `activities.segment_lock` column). morning_run is morning-only, floor_hangout is evening-only, etc. Creates natural collisions.
  3. **14 activities total (6 existing + 8 new).** 3 morning, 5 afternoon, 6 evening. Every segment has more valid activities than slots — afternoon and evening are the sharpest squeeze.
  4. **L2 `scott_notices` placed Day 11 evening.** Roommate crystallizer. Three entry paths (trust_high / trust_low / absent) keyed on NPC memory accumulated across the prior 9 days. Sets `scott_noticed_something` via persistent NPC memory — the single most important roommate flag for the 50-year arc. Bundled with a trust-retrofit across prior Scott terminals (`scott_day2_morning`, `dana_letter_connected`, `dana_letter_surface`, `dana_letter_avoidance`) and a final sweep of Known Issue #12 residue (four `npc_roommate_dana` references in choices/nodes).
  5. **L5 `the_post` placed Day 14 afternoon.** Investigation landmark. Gated by `tuesday_terminal` flag (chose terminal path on `tuesday_commitment`). Separate from the Day 14 evening `tuesday_night_*` pileup.
  6. **L5 (`the_post`) designed as "The Delphi Group."** Forecasting quiz as Knower authentication: 3 questions about near-term future events — only a time traveler gets all 3 right. Unlocks a password-protected Usenet archive of oblique discussions (historical forces, temporal physics, flagged "minor" current events). The arc flag `delphi_archive_accessed` is carried only by the walk-flag-gated terminal `log_off_shaken` (visible only after reading the archive), so the flag fires only on the quiz-passed path. Introduces cassandra_7 and heraclitus as future NPCs. Walk-away path available — player can refuse to announce themselves.
  7. **DEFERRED: Minimum weekly activity frequency for meaningful deposits.** Revisit after Week 2 playtest. Current deposits apply per-slot regardless of weekly frequency.
- **Impact:** Two landmark storylets inserted, 8 new activities, routine activation four days earlier. Content now depends on two fresh engine hooks (compound walk-flag gating + explicit else-branch on conditional nodes) — see the separate "Node conditions: `all_flags` + `else_next`" decision below for the engine side.

---

## Node conditions: `all_flags` compound gate and `else_next` fallback routing

- **Date:** 2026-04-20
- **Context:** `the_post` needs two behaviors the existing node engine didn't support: (1) a mid-walk gate that requires *all three* quiz correct-answer flags (not just one), and (2) an explicit branch when the gate fails so the flow routes to `submit_answers_fail` instead of falling through to the success path. Without (1), every correct quiz flag would need its own chained conditional node. Without (2), the engine would render `submit_answers` on success and then `.next` (= `access_granted`) on both pass and fail — so quiz failures would still show "access granted" text.
- **Decision:** Extended `DialogueNode.condition` with optional `all_flags: string[]` (all named walk-flags must be set) and added a sibling field `DialogueNode.else_next: string` (advance target when condition is not met, overrides `.next`). Both evaluators updated for parity: `DialogueNodeView.evaluateNodeCondition` + the `advance` callback (player UI), and the playthrough-runner harness's in-walk condition check (test harness).
- **Alternatives considered:** (1) Sequential conditional nodes, one per quiz flag (brief's fallback option 2) — rejected because it's three nodes and three hops per quiz submit, and the flag-list semantic is natural. (2) Implicit sibling fallthrough (scan next node in array on condition fail, like `findInitialNode` does at walk start) — rejected because it conflates routing with node ordering and makes flow reordering risky; `else_next` is explicit at the callsite.
- **Impact:** Two small schema additions, two small evaluator changes, same behavior for all existing content (neither field required). First content using both: `the_post.submit_answers`. This is the engine-side half of decision #6 above.

---

## Days 2-3 content: pool-mode everywhere; first requires_flag content usage
- **Date:** 2026-04-20
- **Context:** The 2026-04-17 gap analysis (T-1776329281006) flagged Days 2-3 as a total content desert — zero storylets across any track between Day 1 afternoon and Day 4 evening. Ten new storylets authored per `docs/DAYS-2-3-CONTENT-BRIEF.md` to cover all four active-at-that-range tracks (academic, belonging, money, roommate).
- **Decision:** All 10 shipped as **pool-mode storylets** (`default_next_key=NULL`), relying on the pool scan's `segment + due_offset_days + requirements` gating. No chain wiring added. `catch_up_or_coast` uses `requires_flag: "skipped_reading"` (set by `reading_or_lounge` on the lounge path) — the first production content use of Phase 2's requires_flag enforcement. `roommate_evening_day3` supersedes the inactive `roommate_moment` placeholder; the migration includes an idempotent UPDATE to keep `roommate_moment.is_active=false` as defense.
- **Alternatives considered:** (1) Author some as chains (e.g. `western_civ_day1 → reading_or_lounge` on the academic track) — rejected because the 2026-04-02 engine shift was explicitly away from chaining, and chains would hide the content from any player whose earlier choices skipped the entry point. (2) Use `introduces_npc` for Karen on `bookstore_line` — rejected because Karen only appears on one branch; using `introduces_npc` would force-introduce her even when the player doesn't take that branch. Introduced her at choice-level instead.
- **Impact:** Active storylet count 33 → 43. Days 2-3 go from 0% coverage to fully populated across academic/belonging/money/roommate (opportunity and home remain sparse per their existing pattern). First live test of `requires_flag` in content — watch for regressions in pool scan on the specific `catch_up_or_coast` gate during next playtest.

---

## Arc-scoped flag storage (`player_arc_flags`) added alongside track-scoped FLAG_SET
- **Date:** 2026-04-19
- **Context:** Phase 3 Harvest Pool introduced trace usenet posts that each set a `saw_trace_*` flag when drawn. Arc Two will read those flags to compute compound reveals (e.g. "player has seen NV + contact_signal + nv_three → unlock Arc Two opening beat"). The existing `sets_flag` mechanism writes FLAG_SET rows into `choice_log` with a `track_id`, making flags **track-scoped**. Harvest items don't belong to a track — they're drawn outside the storylet/track system — and the downstream reads are cross-arc, not cross-storylet-within-arc.
- **Decision:** Added a new table `player_arc_flags (player_id, flag_name, source_slug, set_at)` with arc-scope semantics (flags persist indefinitely within a player, readable from any track or arc). The `draw_harvest_item()` SQL function writes into this table when a drawn item has `sets_flag`. The existing track-scoped FLAG_SET path in `choice_log` is untouched — storylet choices still use it.
- **Alternatives considered:** (1) Overload `choice_log` with a sentinel `track_id` like NULL or `"__arc__"` — rejected because the column is NOT NULL and a FK to tracks, and because mixing scope semantics in one table invites subtle reader bugs. (2) Add an `arc_scoped` boolean to `choice_log` — rejected for the same reason: it complicates every query that reads track flags. (3) Compute trace status by scanning `harvest_seen` + joining `harvest_items.sets_flag` at read time — rejected because Arc Two read paths want fast `flag_name IN (...)` lookups, and this couples arc logic to harvest schema.
- **Impact:** New table, new RLS policy, one new SQL function write path. Three lines of friction for future authors: if you want a flag readable cross-arc (not just within a track's chain), write to `player_arc_flags`; otherwise keep using `sets_flag` on the choice. This convention should be added to CLAUDE.md when a second cross-arc flag use case lands.

---

## Auto-advance timer removed; segment transitions require explicit clicks
- **Date:** 2026-04-17
- **Context:** The play page had a `useEffect` + `setTimeout(400ms)` that auto-advanced through empty segments. During the lunch_floor conv-node playtest, this caused segment cascades — morning → afternoon → evening → night in ~1 second — because the timer fired with state captured at render time (React stale closure), not at fire time. Three successive patches (storylet_key filter, isFetching guard, ref guard) were needed before the root cause was clear.
- **Decision:** Removed the auto-advance timer entirely. Segment transitions now require explicit player clicks via the existing `SegmentTransitionCard` (empty segments) or the dismiss button's "Continue to afternoon →" (last pending card). Added a Playwright integration test to catch regressions.
- **Alternatives considered:** (1) Longer timer delay (1500ms) — rejected because the race window scales with network latency, not timer duration. (2) Server-side orchestrator endpoint — correct long-term but over-scoped for this fix. (3) State machine refactor — also correct but higher blast radius.
- **Impact:** Tiny UX regression (player clicks one extra button for empty segments). Eliminates an entire class of timing bugs. `advanceInFlightRef` remains as defense-in-depth for the dismiss+advance path.

---

## Engine extended from chain-based to pool-based selection
- **Date:** 2026-04-01
- **Context:** The chain engine required every storylet to be explicitly wired via `next_key`. Tracks died permanently when chains ended. This made multi-path orientation design impossible without extensive manual wiring.
- **Decision:** Extended the engine with pool-based selection. Storylets now surface based on day, segment, and requirements (`requires_choice` gating). `next_key` still works as a priority override for sequential scenes. Tracks stay alive as long as unresolved future content exists.
- **Alternatives considered:** Continuing with chain-only (Option A) — rejected because it would require 3× content for the same coverage and couldn't support the braided-path architecture.
- **Impact:** All future content can be placed by day/segment without chaining. The three different morning-after scenes, the activities fair, and the path-split architecture from the passage map are now buildable.

---

## Conversational nodes added to storylet system
- **Date:** 2026-04-13
- **Context:** Week 2 content (Tuesday Commitment, The Post, Scott's thing) needs dialogue density that flat body + 3 choices can't carry. Writing without nodes means shipping flat and rewriting, or embedding dialogue-as-narration that flattens scenes.
- **Decision:** Added optional `nodes` jsonb column to storylets. When present, renders as an interactive dialogue tree (micro-choices) before terminal choices. Micro-choices are cheap (no costs, no preclusion) and shape tone + NPC memory. Terminal choices remain expensive and life-shaping. Walk-local flags gate terminal choice visibility via `requires_flag` / `excludes_flag`.
- **Impact:** All existing flat storylets unchanged. Retrofitted `lunch_floor` as smoke test. Week 2 content can now be written with dialogue density from day one.

---

## Phase One scope lock
- **Decision:** We will not add new systems unless they serve the daily loop.
- **Date:** 2026-01-06

---

## Dana→Scott rename migration is `nodes`-unsafe
- **Date:** 2026-04-20
- **Context:** The 2026-04-17 Dana→Scott rename (`20260417200000_rename_dana_to_scott.sql`) scrubbed the `body` and `choices` columns but not `nodes`. When the `nodes` jsonb was added on 2026-04-13 for conversational storylets, any blanket rename migration that walks content text must update `nodes::text` too. The regression surfaced in gap analysis (T-006) and was re-fixed on 2026-04-20 with a six-storylet patch that also caught `tuesday_night_terminal` (missed by the original rename entirely).
- **Decision:** Future content-text migrations (rename, scrub, period corrections) MUST update body, choices, and nodes together. The 2026-04-20 follow-up is the template. Adding a column-level convention: any new jsonb column that holds prose text must be listed in a central migration checklist before the next rename lands.
- **Alternatives considered:** Leaving it as a one-off fix — rejected because conversational nodes will keep expanding and future renames will repeat the bug unless the convention is locked.
- **Impact:** One follow-up migration (`20260420100000_fix_dana_scott_regression_and_cleanup.sql`). Closes Known Issue #12. Informs any future rename PR that touches the `storylets` table.
