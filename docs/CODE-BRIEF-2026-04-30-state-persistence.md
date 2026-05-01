# Code session brief — state persistence diagnosis

> **Date note:** Filename says 2026-04-30; today may be 2026-04-29. Use whenever; the brief stands.

## Context

Phase 1–4 playtest on 2026-04-29 surfaced critical bug T-1777400000001 (session/restart state corruption). Three symptoms point at one root cause:

- Exit and restart → game state resets to end of Day 1
- Dining hall storylets re-appear after resolution + navigation
- Day 2 may have been skipped (or experienced as skipped)

This is the third or fourth time time/day slip has been investigated. Each prior pass found a surface bug and fixed it. The bug keeps coming back in different forms.

**Even more importantly:** between the last claude.ai session and this brief, **six fix commits shipped** on `feature/period-stance-infrastructure`:

- `c7a11d50` — remount SegmentTransitionCard per segment
- `fcfa7ef` — compress tier-1 skill durations for playtest
- `5c224ee` — gate SegmentTransitionCard auto-advance on resolved beats
- `bcfc171` — **reset endpoints must reset segment + hours alongside day_index**
- `6f1723f` — revert SegmentTransitionCard to explicit Continue button
- `cb10dc2` — gate SegmentTransitionCard on `!isFetching`
- `6a11f53` — T-1 queue lock-out, T-3 walk state persistence

`bcfc171` is directly relevant — it claims to fix reset endpoints to reset segment + hours alongside day_index. **If the "restart resets to end of Day 1" symptom is still occurring after this fix, that's evidence the fix didn't cover all reset paths or there's a second mechanism.** Diagnosis must explicitly verify against this fix.

The five-commit iteration on SegmentTransitionCard behavior in a single afternoon also means subtle bugs could have been introduced and not fully caught. Diagnosis must consider the segment-transition surface.

**That pattern means the problem is observability, not code-reading.** Without instrumentation, every diagnosis starts from "let me read these files and guess." We need to stop guessing and start measuring.

## This session has two phases. Don't start Phase 2 until Phase 1 is committed.

---

## Phase 1 — Observability instrumentation (do this FIRST, no fixes)

Before touching any logic, ship the instrumentation that lets us actually see what's happening to state across the lifecycle.

### What to instrument

Every state-mutating operation in the day/session lifecycle needs a structured log entry. The six surfaces that matter:

1. **Day advance** — `advanceDay`, segment-advance handlers. Log: previous `day_index`, new `day_index`, segment, who called it (server route, client mutation, lazy tick), timestamp.
2. **Reset endpoints** — `bcfc171` fixed reset to align segment + hours with day_index. Log: when reset fires, what it reset, what it left untouched, prior state, post state.
3. **Storylet resolve** — every write to `track_progress.resolved_storylet_keys`. Log: storylet_key, track_id, day_index, segment, prior array length, new array length, timestamp.
4. **Choice log writes** — every insert into `choice_log`. Log: storylet_key, choice_key, day_index, segment, walk_flags state at write time.
5. **Walk state writes** — every sessionStorage write from `DialogueNodeView` (the recent T-1777320000003 fix). Log: storylet_key, currentNodeId, walk_flags keys, timestamp.
6. **Session restoration** — when `play/page.tsx` mounts. Log: what it reads from `daily_states`, `track_progress`, `characters`, sessionStorage. Timestamps on each read.

Plus one cross-cutting requirement:

- **Every log entry includes the build SHA** (commit at HEAD when build was made). This is critical because we've had 6 fixes ship in 5 hours; we need to be able to correlate observed behavior to specific commits when reading logs after the fact.

### How to instrument

Add a `[STATE]` log namespace. All six surfaces use it. Logs go to:

- **Server-side:** structured JSON via existing logging (pino/console — use whatever is already there).
- **Client-side:** `console.log` with `[STATE]` prefix, plus push to a session-local ring buffer that survives navigation (sessionStorage works for this — `mmv:state-log:<timestamp>`). The ring buffer is what we'll want to read on restart, *before* the state corrupts further, to see the history.
- **Build SHA** included in every entry as a separate field. Read from `git rev-parse HEAD` at build time, expose via env var.

Don't gold-plate the logging system. A consistent prefix and JSON-stringified payload is enough. The point is: every state mutation leaves a trail.

### What good Phase 1 output looks like

After Phase 1 ships, a Code engineer (or Monty) can:

1. Play through Day 1, exit, restart.
2. Open browser console + server logs.
3. Read through the `[STATE]` entries in time order and see exactly what wrote, what read, and when.
4. Identify the divergence point — the moment where what got written is not what got read.
5. Correlate the divergence to a specific build SHA (helpful for "did this work before commit X?")

If Phase 1 ships and that workflow doesn't work, Phase 1 isn't done. Add more logging.

### Acceptance for Phase 1

- [ ] All six surfaces have `[STATE]` logging.
- [ ] Logs are structured (JSON-stringified payload after the prefix).
- [ ] Build SHA included in every entry.
- [ ] Client-side ring buffer survives navigation and is readable from console (`window.__stateLog` or similar dev affordance).
- [ ] Server-side logs visible in whatever the project's standard log output is.
- [ ] **Commit Phase 1 instrumentation by itself.** Do not bundle with any fix. The commit should be reverted-able if the logging itself causes a problem.

### Why "no fixes in Phase 1"

Two reasons:

1. We need to *see* the bug with the existing code in place. If you fix something during instrumentation, you've changed what the logs would have shown. The bug becomes harder to verify.
2. The fix you'd make based on suspicion is exactly the kind of fix that's been failing for several rounds. Read-and-guess fixes are why we're here. Stop guessing.

---

## Phase 2 — Diagnosis (only after Phase 1 commits)

Once instrumentation is in place, use zen mcp `thinkdeep` again, but this time give it the logs as input.

### Diagnostic procedure

1. Reset the user state to clean (drop the test user's rows, recreate fresh, or use a fresh user).
2. Play through Day 1 normally. Capture: server logs, client console logs, and the sessionStorage ring buffer at the end.
3. Exit (close tab).
4. Re-open the play page. Capture: server logs from the mount sequence, client console logs, sessionStorage contents on read.
5. Compare snapshots:
   - Snapshot A: state at end of Day 1 (after step 2).
   - Snapshot B: state at re-open (after step 4).
   - Snapshot C: state after the "phantom Day 2" or "reset to Day 1 end" symptom appears.

Use zen mcp `thinkdeep` with the logs as context. The question to ask it is not "where is the bug" — it's **"according to the logs, at what specific timestamp does state diverge from what it should be, and which write or read caused that divergence?"**

That question is answerable from logs in a way that "find the bug" never is.

### Specific check: did `bcfc171` cover all reset paths?

That commit's claim is "reset endpoints must reset segment + hours alongside day_index." If the "restart resets to end of Day 1" symptom is still present, one of:

- (a) The commit did fix the reset path, but there's a *second* code path that bypasses the reset (e.g., on-mount logic in `play/page.tsx` that rebuilds state from a stale source).
- (b) The commit covered some reset endpoints but not all (e.g., `/api/reset` was fixed but `/api/restart` wasn't).
- (c) The fix is correct but the symptom Monty observed is actually a different bug that *looks* like a reset issue but isn't.

The logs from the reset surface (Phase 1, surface #2) will pick exactly one of these.

### What the logs should reveal (one of these)

- **Persistence bug:** state writes happen but don't land in DB (logs show write fired, but post-write SELECT shows old value). Suggests transaction issue, missing await, or write going to wrong table.
- **Resume-read bug:** state is in DB correctly, but mount-time reads pull stale or wrong data. Suggests cache layer, wrong query, or race between multiple reads.
- **Resume-write bug:** mount triggers a write that overwrites valid state with stale state. Suggests resume logic is rebuilding state from a stale source.
- **sessionStorage contamination (T-1777320000003 risk):** the recent walk-state fix is writing to sessionStorage in a way that desyncs from server state. Logs show divergent values.
- **Day-advance double-fire:** something is calling `advanceDay` twice or out-of-order. Logs show two day_index increments where one should occur.
- **Reset-path gap:** `bcfc171` fixed one reset endpoint but another exists that wasn't covered. Logs show a reset firing without the segment+hours alignment.
- **Segment transition desync:** the five-commit iteration on SegmentTransitionCard left a subtle bug that affects segment advance. Logs show segment changes that don't align with day_index changes.

The logs will pick exactly one of these (or surface an eighth possibility no one has imagined). At that point, the fix is targeted: *this specific write at this specific timestamp is wrong.* Not "let me read this file."

### Acceptance for Phase 2

- [ ] Reproduction recorded with full log capture (server + client + ring buffer).
- [ ] Divergence point identified to a specific log entry / timestamp.
- [ ] Root cause hypothesis stated and justified by the logs.
- [ ] Hypothesis correlated to a specific build SHA / commit.
- [ ] Fix designed *to address that specific divergence* (not refactoring nearby code).
- [ ] Fix shipped, regression test added (a playthrough script that exercises the exit-and-restart sequence and asserts state is preserved).

---

## Important: do not skip ahead

If you find yourself in Phase 2 thinking "I think I see the bug, let me just fix it without the logs" — stop. Multiple prior passes have done exactly that and we're still here. The logs are not optional.

Even if you find a bug while writing Phase 1 instrumentation: don't fix it. Note it for Phase 2. Ship the instrumentation. Then verify the bug with logs, *then* fix.

This is the discipline that's been missing.

---

## Other tickets touched in playtest

After T-1777400000001 ships and Phase 1–4 re-runs cleanly:

- **Then** T-1777320000001/02/03/04 can be verified or closed-as-resolved-by-parent.
- **Then** the merge gate (T-1777300000001) can clear.
- **Then** the period-stance branch can land on main.

Don't touch other tickets until T-1777400000001 is closed. The merge cascade depends on this one.

The remaining playtest findings (T-1777400000002 through T-1777400000007 + the audio/caps tickets) are real but not blocking. Address them after the merge.

---

## Process improvement: HANDOFF refresh discipline

Between the last claude.ai session and this one, six fix commits shipped on `feature/period-stance-infrastructure` that weren't reflected in HANDOFF. That made it harder to draft this brief with full context.

Going forward: any commit that meaningfully changes behavior on a branch in flight should be reflected in HANDOFF "Branches in flight" or "What's done" before EOD. Doesn't need to be elaborate — a one-line entry per commit is enough.

If that's too much process overhead, the alternative is for Code's session-opener summary to include a `git log --since` of unmentioned commits. Either way, the next claude.ai session should be able to know what shipped without reading the full git log.

---

## Time budget

Phase 1: half-day at most. Instrumentation should be a focused, non-clever pass.

Phase 2: half-day to full day, depending on what the logs show.

If Phase 2 takes more than a full day after instrumentation: surface to Monty. The bug may be wider than expected and need scope adjustment.

---

## Branch state

Continue on `feature/period-stance-infrastructure`. Both phases of this work commit there.

When the bug fix lands and Phase 1–4 re-runs cleanly: amend or follow-up commit on the playtest results, then proceed to merge per T-1777300000001.

The instrumentation itself can stay on main after merge — it's good infrastructure to have.

---

## Begin with Phase 1.
