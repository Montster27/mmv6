# Code session brief — Week 2 playthrough scripts (re-build)

> Paste this into the next Code session. Single ticket but two phases.

## Context

T-1777215600001 was previously closed without execution. Audit on 2026-04-27 found no scripts on disk and no harness patch in `harness.ts`. Ticket has been reopened with the original spec preserved minus the false PASS lines.

T-1777215600002 (node review) was closed in the same edit window and has also been reopened — verdicts may be correct but need re-running. Tackle T-1777215600001 first; the node review can be folded into the same Code session as a final pass once scripts are green.

T-1777215600100 is a new process ticket (audit step in `drift check`). Don't tackle it in the same session — it's separate work; flag it after this sprint.

## Phase 1 — Harness patch (do first)

File: `src/core/playthrough-runner/harness.ts`

Add a private method `navigateTo(dest: string)` and wire `beginNodeWalk` and the navigation tail of `chooseNode` through it.

**Behavior:**

- If `dest === "choices"` or `dest === "exit"`, set `walkState.terminal = dest`, clear `currentNodeId`, return.
- If `dest` is unknown (no node by that ID), fall through to `terminal = "choices"`.
- Otherwise, look up the node. If it has a `condition`:
  - For `flag` and `all_flags` predicates, evaluate against `walkState.flags`.
  - For `npc_memory` and `period_stance` and `prior_period_stance` predicates: treat as met. Tests are exercising specific paths; real game behavior still gates these correctly because `chooseNode` writes the underlying state on each micro-choice.
  - If condition fails, recurse on `node.else_next ?? node.next`.
- If condition is met (or absent), and the node has `micro_choices`, set `currentNodeId = dest` and return — this is a player input point.
- If condition is met but no `micro_choices` (text-only intro/coda node), recurse on `node.next`. This is the auto-advance fix.

Edge cases:

- A text-only node with no `next` (terminal text node): treat as `terminal = "exit"`.
- Cycle protection: cap recursion at, say, 32 hops; throw if exceeded. (Indicates malformed content.)

**Wire-up:**

- `beginNodeWalk(storyletKey)` — after seeding `walkState`, call `this.navigateTo(nodes[0].id)`. The walk's starting `currentNodeId` is whatever `navigateTo` lands on.
- `chooseNode` — at the end where it currently does `ws.currentNodeId = dest`, replace with `this.navigateTo(dest)` and read the result from `walkState`. Same for the condition-fail branch.

**Unit tests** (new file or extend existing harness tests):

- Text-only chain advances to first interactive node.
- Condition-met node is the landing point.
- Condition-failed node is skipped via `else_next`.
- Terminal `choices` short-circuits.
- Unknown destination falls through to `choices`.
- Recursion cap throws on cycles.

Run `npx tsc --noEmit` and `npx vitest run` to confirm the change is clean and doesn't regress existing playthrough tests.

## Phase 2 — Five scripts

After Phase 1 is green, write each script in `scripts/playthroughs/`. Use `scripts/playthroughs/scott_day2_warm_breakfast.yaml` and `hallway_friction_challenged.yaml` as references for the pattern.

For each, the workflow is the same: read the storylet's content from the live DB (or `supabase/migrations/`) to confirm node IDs, micro-choice IDs, and terminal IDs. Then write the script. Then run it. If it fails, debug. Don't write all five and run at the end — write one, run it, fix it, then move on.

### `week2_l1_job_board.yaml`

- Storylet: `job_board` (Day 8 afternoon, money track)
- Path: walk `scan_board` (auto-advances) → `pick_card` micro `pick_library` → `card_taken` (auto-advances) → terminal `leave_board_library`
- Asserts:
  - `expect_storylet_available` for `job_board` at Day 8 afternoon money track, served_by pool
  - `expect_walk_flag` for `has_job_library` (present: true) after micro-choice
  - Resolve cleanly at terminal

### `week2_l2_scott_notices.yaml`

- Storylet: `scott_notices` (Day 13 evening, roommate track, 2h)
- Setup: needs `npc_roommate_scott.trust_high` set in NPC memory before Day 13. Easiest path is to extend `after_day0_party_path.snapshot.json` and hand-author the trust state at fixture time, OR walk through `scott_day2_morning` warm path first (which sets trust deposits).
- Path: warm entry → 2–3 response nodes → resolve at one of the two terminals
- Asserts: storylet available, NPC memory writes that signal "noticed_something" or equivalent persist post-resolve

### `week2_l3_first_shift.yaml`

- Storylet: `first_shift_library` (Day 11 evening, money track)
- Setup: requires `has_job_library` walk flag from L1. Inline the L1 path (full job_board walk through library terminal) at the start of this script — duplication is easier to debug than fixture composition for a single shared flag.
- Path: storylet has no nodes (per the L1 brief), so just `choose` the terminal directly
- Asserts: `cashOnHand` increases per the brief, terminal resolves

### `week2_l4_tuesday_commitment.yaml`

- Storylet: `tuesday_commitment` (Day 14 evening, belonging track)
- Path: walk `schedule_scan` (auto-advances) → `the_choice` micro `commit_terminal` → `choice_made` (auto-advances) → terminal `tuesday_decided_terminal`
- Asserts:
  - `expect_walk_flag` for `tuesday_terminal` (present: true)
  - After resolve, the persistent FLAG_SET in `choice_log` carries `tuesday_terminal` (this is the cross-track flag L5 needs)

### `week2_l5_the_post.yaml`

- Storylet: `the_post` (Day 15 afternoon, opportunity track)
- Setup: requires `tuesday_terminal` flag from L4. Inline L4's full path at the start.
- Path: walk `browse_delphi` (auto-advances) → through three quiz questions answering correctly → `submit_answers` (condition gate, all three `delphi_q*_correct` set) → `access_granted` → `archive_content` → `the_realization` → terminal `log_off_shaken`
- Asserts:
  - Storylet available at Day 15 afternoon opportunity track via cross-track globalFlags
  - `delphi_q1_correct`, `delphi_q2_correct`, `delphi_q3_correct` walk flags all set
  - After resolve: `the_post_resolved` and `delphi_archive_accessed` arc flags persist

This is the regression check on the cross-track flag union — if it fails, the engine has regressed since 2026-04-22.

## Closing

After all five are green:

1. Run `npm run playthrough:all` end-to-end, capture pass/fail counts and runtime, paste into the ticket close note.
2. Run `npm run playthrough:coverage`, paste the per-track coverage table into the close note.
3. Update HANDOFF.md `What's Done` with what landed and the actual test results.
4. Per T-1777215600100's pre-close audit step, paste the output of `ls scripts/playthroughs/week2_l*.yaml` and `grep -n "navigateTo" src/core/playthrough-runner/harness.ts` into the close note.
5. Move T-1777215600001 to `col_done`. `modifiedBy: claude-code`.

Then, in the same session if there's room:

6. Re-perform the L1–L5 node review per T-1777215600002. Read each storylet's `nodes` JSONB. Note node IDs and counts inspected. Confirm or overturn each prior verdict. Cite at least one specific node by ID in any "PASS" verdict. Move that ticket to `col_done` with the verification paste.

If the node review wants its own session, that's fine — just leave T-1777215600002 in `col_todo`.
