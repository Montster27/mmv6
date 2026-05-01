<!-- /docs/PHASE-1-4-PLAYTEST-RUNBOOK.md -->

# Phase 1–4 Browser Playtest Runbook

> **Purpose:** Step-by-step verification protocol for the Phase 1–4 browser playtest that gates merging `feature/period-stance-infrastructure` to `main`.
> 
> **Owner:** Monty (Code cannot browser-playtest reliably — auth, PATH, Chrome MCP issues per `CLAUDE.md` Tier 4 testing process).
> 
> **Gate ticket:** T-1777300000001 (period-stance merge prerequisites).
> 
> **Time budget:** 90–120 minutes for a clean run. Add 30–60 min buffer if you hit a regression.
> 
> **Last updated:** 2026-04-27

---

## Why this exists

The period-stance branch (`feature/period-stance-infrastructure`) is ahead of `main` and contains: identity columns + character creation, the period_stance counter + event infrastructure, conditional `events_emitted` groups, DialogueNode `text_variants`, three new node-condition predicates, playthrough-runner test hooks, the `navigateTo` harness patch, five Week 2 landmark playthrough scripts, and Beat 2A wired into `hallway_morning_day3`.

The branch's gate condition has two parts:

1. **Already satisfied:** content briefs landed and the friction beat wired as an integration playthrough (PASS 21/21 on 2026-04-25).
2. **Not yet satisfied:** browser playtest of Phases 1–4 against the branch, confirming nothing on `main` regressed and the new engine surface plays cleanly under real user input.

Without (2), merging risks landing the branch's engine changes onto `main` with a regression that headless tests can't catch (timing, layout, auth, race conditions on real user clicks).

---

## Pre-flight (do this first, ~15 min)

Before opening a browser:

### 1. Verify branch state

```bash
cd ~/Projects/V16MMV/mmv
git fetch origin
git checkout feature/period-stance-infrastructure
git pull origin feature/period-stance-infrastructure
git log --oneline main..HEAD                # should show your branch's commits ahead of main
git log --oneline HEAD..main                # should be empty (no main commits we don't have)
```

If `HEAD..main` is non-empty: **stop.** Main has commits the branch doesn't. Rebase the branch onto main first, re-run the headless test suite, then return here.

### 2. Confirm the headless suite still passes on the branch

```bash
npx tsc --noEmit                                    # expect: clean (ignore .next/types/* + playwright.config.ts)
npx vitest run                                      # expect: 246 passed / 1 skipped (or higher)
npm run playthrough:all                             # expect: 13 pass / 7 fail (the 7 are pre-existing day0/glenn — T-1777297557482)
npm run playthrough scripts/playthroughs/hallway_friction_challenged.yaml  # expect: PASS 21/21
```

If any of these regress vs the numbers above: **stop.** The branch has drifted. Diagnose before continuing.

### 3. Set environment variables

For browser playtest to be observable in a single session, skill timing must be compressed. In Vercel project env vars (or `.env.local` for local dev):

```
NEXT_PUBLIC_SKILL_TIME_SCALE=0.01
PRACTICE_CREDIT_SECONDS=60
```

`SKILL_TIME_SCALE=0.01` makes Tier-1 skills (nominal 4h) complete in ~2.4 min. `PRACTICE_CREDIT_SECONDS=60` means each diegetic practice subtracts 60s from training (smaller than default 900 so multiple practices in a session show visible movement on the bar).

If using Vercel preview deployment: redeploy after setting these so the preview picks them up.

### 4. Deploy the branch to a Vercel preview

```bash
git push origin feature/period-stance-infrastructure
```

Wait ~90s for Vercel deploy. Confirm preview URL is live by visiting it once and seeing the welcome screen render.

### 5. Reset state to clean

In the browser, on the deployed preview:

- If you have an existing user, hit the in-game reset button.
- If not, create a fresh account — the character-creation flow now includes the identity step (race / gender / sexuality), which is part of what we're verifying.

---

## The five verification items

Run these **in order** during a single play session. Don't skip ahead — Phase 1 needs to be queued before Phase 2's diegetic practice can demonstrate anything.

### Phase 1 — Skill queue daily-ritual feel

**What you're verifying:** Logging in feels like a visit, not a chore. The queue check pulls you in. Picking a skill feels meaningful, not arbitrary.

**Steps:**

1. From the welcome flow, complete character creation through the identity step. Note which race / gender / sexuality you picked — you'll need this for Phase 5 (Beat 2A). **Pick something other than `unspecified` at least once** so identity-gated content can fire if any exists.
2. After landing in the dorm room (Day 0 morning), navigate to `/skills`.
3. Confirm you see the skill picker with 10 Tier-1 skills available: musical_ear, small_talk, critical_analysis, active_listening, budgeting, plus 5 others. (Exact list per `skill_definitions` table.)
4. Pick **`small_talk`** as your active training. Pick **`active_listening`** as queued.
5. Confirm progress bar starts moving on `small_talk`. With `SKILL_TIME_SCALE=0.01`, you should see visible movement within 30–60s.
6. Navigate back to `/play`. Confirm the skill panel in the character sheet shows `small_talk: training` and `active_listening: queued`.

**Pass criteria:**

- [ ] Identity step rendered with all three pickers + "unspecified" default
- [ ] Skill picker rendered 10 skills
- [ ] Active + queued slots both populated; partial unique index didn't reject
- [ ] Progress bar visibly moves
- [ ] Character sheet reflects queue state

**If you fail here:** Phase 1 regressed. File ticket, branch from period-stance, fix. Don't continue — Phases 2 and 4 depend on Phase 1.

---

### Phase 2 — Skills modify storylets visibly

**What you're verifying:** Trained / training skills produce observable changes in storylet outcomes. Not just under the hood — the player sees different prose, different choices, or different effects.

**The five retrofitted storylets** (per HANDOFF "Skills in Storylets" section):

|Storylet|Day/Segment|Skill|What changes|
|---|---|---|---|
|`glenn_pastime_paradise`|Day 0 afternoon|musical_ear|Alternate text on `head_to_evening` (recognizes harmonic structure)|
|`lunch_floor`|Day 0 afternoon|small_talk|Alternate text on `laugh_with_doug` (lands a joke, table opens up)|
|`evening_choice`|Day 0 evening|active_listening|Alternate text on `go_to_cards` (reads Spider's card tells)|
|`money_reality_check`|Day 4 morning|budgeting|Alternate text on `eat_first` (does register math consciously)|
|`heller_lecture`|Week 2 academic|critical_analysis|Gated choice `raise_critical_point` only visible if trained|

**Steps:**

1. With `small_talk` training (Phase 1), advance to Day 0 afternoon. Take the path to `lunch_floor` (via the dorm hallmates → lunch chain on belonging).
2. When the `laugh_with_doug` choice appears, read its text. **Confirm the alternate text fires** — should reference landing a joke / table opening up, NOT the default.
3. Note: practice credit should subtract 60s from `small_talk` on resolve. Check `/skills` after the storylet — bar should have moved noticeably.
4. Advance to Day 0 evening. Path to `evening_choice`. Take cards path (`go_to_cards`).
5. Confirm alternate text fires (reads Spider's tells). `active_listening` was queued, not active, so practice credit goes to `small_talk` (the active skill) per the diegetic practice rules.
6. Advance through to Day 4 (skill_time_scale should let `small_talk` finish training by then; `active_listening` will start training automatically).
7. Reach `money_reality_check` on Day 4 morning. Take `eat_first`.
8. Confirm alternate text fires (register math).

**Pass criteria:**

- [ ] At least 3 distinct storylets show alternate text from skill modifiers
- [ ] Practice credit visibly reduces training time on the active skill
- [ ] Auto-promotion: queued skill becomes active when prior skill finishes

**Skip the gated `heller_lecture` test** unless you reach Week 2 academic content (Day 7+). It's a bonus, not a gate.

**If you fail here:** Phase 2 regressed. Likely culprits: `meetsRequirements()` not loading trained skills, choice filter not running, alternate text not swapping. Diagnose at the resolve route.

---

### Phase 3 — Daily harvest fires

**What you're verifying:** The harvest pool produces at least one item per session, gates work, and items don't repeat.

**Note:** Per HANDOFF, the login-flow caller (P3.3 — T-1776329281038) is **NOT YET BUILT**. This means there's no automatic harvest draw on login. You'll need to verify infrastructure works by inspecting DB state and/or hitting the draw function directly.

**Steps (DB-side verification, since UI isn't wired):**

1. In Supabase SQL editor, with your test user_id:
    
    ```sql
    SELECT public.draw_harvest_item('<your-user-id>', 1);
    ```
    
    Confirm returns one of: `dream_001`, `dream_002`, `dream_006`, `texture_001` (the Day 1 unguarded pool).
2. Re-run with day=14:
    
    ```sql
    SELECT public.draw_harvest_item('<your-user-id>', 14);
    ```
    
    Confirm returns from a wider pool (no terminal_accessed gate yet so trace posts excluded).
3. Insert a fake terminal_accessed flag:
    
    ```sql
    INSERT INTO player_arc_flags (player_id, flag_name, source_slug)VALUES ('<your-user-id>', 'terminal_accessed', 'manual_test');
    ```
    
4. Re-run draw at day=14. Confirm trace posts (`saw_trace_*` items) now eligible.
5. Check `harvest_seen` rows accumulate — each successful draw should write one row. Re-running shouldn't return the same item twice.

**Pass criteria:**

- [ ] `draw_harvest_item` returns valid items (not NULL on Day 1 / Day 14)
- [ ] Gating works (no traces without `terminal_accessed`; traces with it)
- [ ] `harvest_seen` accumulates; no repeats within a player

**Skip if:** P3.3 ships before this playtest runs. In that case, verify in browser instead of SQL.

**If you fail here:** Phase 3 schema regressed. Lower priority for the merge gate (UI not wired anyway). Note in ticket and proceed.

---

### Phase 4 — Routine-week mode

**What you're verifying:** Routine-week activates at `ROUTINE_MODE_START_DAY` (per HANDOFF, this is **Day 3** since 2026-04-20, NOT Day 7 as some older docs say), the weekly calendar renders, schedule commit applies deposits, and interruptions break out cleanly.

**Steps:**

1. Advance to Day 3 morning. Confirm a routine-week prompt or weekly calendar surfaces. (If Day 3 has more storylet content queued, you may need to resolve those before the routine UI takes over — check the play page for the WeeklyCalendar component.)
2. Open the weekly calendar. Confirm 14 standing activities appear across 3 morning / 5 afternoon / 6 evening slots.
3. Commit a schedule with at least:
    - `library_study` in one morning slot (practices critical_analysis)
    - `dining_commons_social` in one afternoon slot (practices small_talk)
    - `morning_run` in another slot (energy effect)
4. Confirm deposits apply on commit — energy / skill XP / money should reflect the week's nominal output. Check character sheet.
5. Continue play. At some point an interruption should fire (gate threshold trip, calendar beat, or NPC patience timer). Confirm it breaks out of routine mode back to storylet mode.
6. **Critical:** the interruption must NOT re-fire on the same storylet once resolved. Per the 2026-04-23 fix (Known Issue #17 / `f6c65aa`), `checkInterruptions` filters out resolved keys. Resolve the interruption storylet, advance time, confirm no re-fire.
7. After interruption resolves, return to routine mode (or start a new week).

**Pass criteria:**

- [ ] Routine UI activates Day 3+ (not Day 7 — verify constant)
- [ ] 14 activities visible, segment-locked correctly
- [ ] Schedule commit applies all deposits atomically
- [ ] Interruption fires at least once during the week
- [ ] Resolved interruption does NOT re-fire (Known Issue #17 regression check)

**If you fail here:** Phase 4 regressed. Most likely culprits:

- Routine doesn't activate → `ROUTINE_MODE_START_DAY` constant or weekly calendar gate
- Interruption loops → `checkInterruptions` not receiving `resolvedStoryletKeys`
- Deposits don't apply → schedule commit transaction

---

### Phase 5 (bonus) — Beat 2A `hallway_morning_day3` browser play

**What you're verifying:** The first period-stance friction beat plays cleanly under real user input — text_variants resolve, micro-choices fire, walk flags set, terminal applies the right `ConditionalEmissionGroup[]` event.

**Steps:**

1. Reach Day 4 morning belonging-track content. The friction beat is wired into `hallway_morning_day3` (despite the name, lives at Day 4 morning per the storylet's `due_offset_days`).
2. Walk through the entry → friction → aftermath flow.
3. At the friction node, three micro-choices appear: challenge / deflect / absorb. **Pick `challenge`** (the costliest path — the one that exercises the most conditional plumbing).
4. Confirm the aftermath node text reflects `hallway_challenged` walk flag (challenger-specific prose, not absorber/deflector).
5. Resolve the terminal. **Verify NPC relationship effects** — Keith `AWKWARD_MOMENT`, Doug `DEFERRED_TENSION`, Mike `SMALL_KINDNESS`. Check the character sheet relationships panel.
6. Check `daily_states.period_stance_state` in DB — should show `{"challenged": 1}`.
7. Replay (reset + new game). This time pick `absorb`. Verify no NPC events fire on the terminal. Confirm `period_stance_state.absorbed = 1`.

**Pass criteria:**

- [ ] Three micro-choices visible at friction node
- [ ] `text_variants` on aftermath reflect the chosen path
- [ ] Terminal applies different events per friction path
- [ ] `period_stance_state` JSONB increments correctly per tag
- [ ] Mike's relationship row created (HANDOFF caveat: `npc_floor_mike` not in `ALL_YEAR_ONE_NPCS`, but `applyRelationshipEvents` should default- initialize it)

**If you fail here:** Beat 2A regressed in deployment. Most likely culprits: node condition evaluator, conditional events_emitted resolver, walk flag storage. This is the new content surface so it gets the closest scrutiny.

---

## After the playtest

### If everything passes

1. Capture the playtest results in the T-1777300000001 ticket comment with:
    - Date and approximate duration
    - Which Phase 5 path you took (challenge / deflect / absorb)
    - Any incidental observations not tied to pass/fail (UX rough edges, timing surprises, prose flags)
2. Proceed to T-1777300000001 step 3 (pre-merge audit) — re-run the headless suite one more time on the branch tip, confirm clean.
3. Open PR `feature/period-stance-infrastructure` → `main`. Paste headless suite results + this playtest's pass log into PR description.
4. Merge per repo convention.
5. Post-merge: re-run headless suite on `main`, browser-spot-check Beat 2A (one last time on `main` deploy, ~5 min), update HANDOFF "What's Done" with merge commit hash.
6. Move T-1776329282001 (Beats 2B–2F) from blocked-state to actively-buildable in the next sprint plan.

### If something fails

1. Don't merge. File a regression ticket with concrete repro steps:
    - Which Phase failed
    - What you saw vs what was expected
    - Browser console errors if any
    - DB state if relevant
2. Branch from `feature/period-stance-infrastructure`, name it `fix/<phase-N>-<short-description>`.
3. Code session to fix. Re-run headless suite + the failing Phase's checks.
4. Once green: rebase fix branch onto period-stance, re-run this runbook from Phase 1 (yes, the whole thing — regression in one Phase is signal that something else might be subtly off).
5. Pass → merge. Fail → repeat.

### If the playtest reveals something taking >½ day to fix

Surface to claude.ai for triage. Options on the table:

- **Descope the failing piece.** If Phase 3 fails (UI not wired anyway), note in ticket and proceed with merge. P3.3 is a separate ticket.
- **Hold the merge.** If Phase 4 routine-week regressed and fix is non- trivial, keep period-stance unmerged and tackle the regression first. The cost is that Beats 2B–2F stay blocked.
- **Revert specific commits.** If one of the 7 branch commits is the culprit and others are independent, cherry-pick the safe ones onto a new branch and merge that subset. Last resort — adds complexity.

The decision rule: **don't merge with known regressions, don't let the perfect be the enemy of the good.** A clean Phase 1/2/4 with Phase 3 deferred is a healthy merge. A failing Phase 4 is not.

---

## Notes / known gotchas

- **`ROUTINE_MODE_START_DAY = 3`**, not 7. T-1777300000001's checklist still says Day 7+ — that's stale. Verify activation on Day 3.
- **`time_skill` branch:** Issue #9 flags the merge state as unknown. Verify with `git log main` for Phase 1/2/4 commit messages before assuming. If unmerged, that's a precursor merge that has to happen first.
- **Mike's relationship default-init:** `npc_floor_mike` not in `ALL_YEAR_ONE_NPCS` per HANDOFF. `applyRelationshipEvents` handles missing state by creating defaults, so the Beat 2A `SMALL_KINDNESS` event should succeed — but if it errors, that's the cause. Fix by adding Mike to `ALL_YEAR_ONE_NPCS` in `src/lib/relationships.ts`.
- **Vercel deploy timing:** ~90s after push. Hard refresh (⌘⇧R) the preview URL after redeploy to bypass cached client bundle.
- **Reset between phases if needed:** If Phase 2 left the player in a state that complicates Phase 4 (e.g., low energy, missed a key flag), reset and fast-forward to the relevant Day. Resetting is cheap; chasing a tangled state is not.

---

## Acceptance for closing T-1777300000001

This runbook's role in the ticket lifecycle:

- [x] Runbook exists (this document)
- [ ] Pre-flight section run; branch state confirmed; headless suite green
- [ ] Phase 1 verified
- [ ] Phase 2 verified (≥3 storylets)
- [ ] Phase 3 verified (or explicitly deferred with note)
- [ ] Phase 4 verified
- [ ] Phase 5 (Beat 2A) verified
- [ ] Pre-merge audit complete (T-1777300000001 step 3)
- [ ] PR opened, reviewed, merged
- [ ] Post-merge verification on `main` complete
- [ ] HANDOFF updated with merge commit
- [ ] T-1776329282001 unblocked in sprint planning
