# MMV Handoff Brief
> Context bridge for claude.ai, Claude Code, and Cowork sessions.
> **Last updated:** 2026-04-24 (Period-stance infrastructure + player identity selection — branch `feature/period-stance-infrastructure`, uncommitted. Implements the 7 steps of `docs/specs/CODE-SPEC-period-stance-infrastructure.md`: identity columns (race/gender/sexuality) on `characters`; character-creation UI step; `period_stance_state` JSONB counter on `daily_states` + PERIOD_STANCE events on `choice_log`; conditional `events_emitted` groups (discriminated union, first-match-wins); DialogueNode `text_variants` + MicroChoice `label_variants`; new node-condition predicates (`identity`, `period_stance`, `prior_period_stance`); centralized evaluator at `src/lib/nodeConditions.ts`; playthrough-runner test hooks (`set_identity`, `expect_period_stance`, `expect_walk_flag`, `expect_prior_period_stance`). 36 new tests, 231 total green. Does not merge until content briefs land and the friction beat wires as an integration test.)

---

## Project Summary
**MMV (Many More Versions of You)** is a narrative-driven life simulation set in 1983.
Players wake up in a college dorm room, gradually discover they've been sent back in time,
and make choices that shape their personal journey while uncovering what went wrong in the
world. Target audience: adults 55+. Multiplayer/social elements planned for later phases.

## Stack
- **Framework:** Next.js 16 + React 19 + TypeScript
- **Database:** Supabase (PostgreSQL) — migrations are source of truth for content
- **Styling:** Tailwind CSS
- **Testing:** Vitest
- **Repo:** `V16MMV/mmv/`
- **Package manager:** npm

---

## Where Things Live

| Layer | Location | Tool | What's there |
|-------|----------|------|--------------|
| **Design brain** | `/Users/montysharma/Obsidian/Obsidian Vault/` | Cowork Project ("MMV Design Brain") | Specs, phase plans, research, design docs, AmsterFlow teaching tool |
| **Built content** | `V16MMV/mmv/` | Claude Code | Code, Supabase migrations (source of truth for storylets), CLAUDE.md, TASKS.md |
| **Bridge** | `V16MMV/mmv/HANDOFF.md` (this file) | All three environments | Current status, what's done, what's next |
| **PM** | claude.ai | Claude (with memory) | Priority calls, routing, decision capture, status checks |
| **Assets** | `Documents/MMV/_assets/` (once consolidated) | Cowork | Investor decks, logos, promo videos |
| **Archive** | `Documents/_archive/mmv-legacy/` (once cleaned up) | None — cold storage | V6–V12 old versions |

### Key repo paths
```
V16MMV/mmv/
├── CLAUDE.md              ← project bible (Claude Code reads this automatically)
├── TASKS.md               ← live task board
├── HANDOFF.md             ← this file
├── docs/
│   ├── CONTENT-RULES.md   ← chain vs pool placement rules (authoritative)
│   ├── CHAIN-MAP.md       ← current chain wiring + flags
│   ├── ENGINE-SPEC.md     ← engine behavior spec (partially outdated — see note)
│   ├── CONTENT-INVENTORY.md ← storylet inventory (outdated — see live DB below)
│   ├── DECISIONS.md       ← design rationale (needs population!)
│   └── [other docs]
├── agents/
│   └── content-creator/   ← 3-stage pipeline + reference docs
├── skills/
│   └── mmv-content-builder/  ← canonical copy of the content skill
├── supabase/
│   └── migrations/        ← SOURCE OF TRUTH for all storylet content
└── src/                   ← application code
```

---

## Current Milestone
**Milestone A — "It Runs"** is complete. The engine supports chain mode, pool mode (with `requires_choice` gating), skill queue, skills-in-storylets, routine-week mode, and server-authoritative day advancement. Content runs through Day 7+. Routine-week mode activates at Day 7.

---

## Live DB State (as of 2026-04-20)

### Active Storylets: 45 total (see `docs/GAP-ANALYSIS.md` for full matrix)

| Track | Active | Day range | Key storylets |
|-------|--------|-----------|---------------|
| **roommate** | 10 | 0–14 | room_214 (chain), first_morning, scott_day2_morning (Day 2), roommate_evening_day3, dana_cereal, dana_letter_* (3 variants), tuesday_night_dana_movie, **scott_notices** (Day 11 evening — crystallizer) |
| **belonging** | 15 | 0–14 | dorm_hallmates→lunch_floor→evening_choice (chain), morning_after_* (3 pool), miguel_guitar, priya_dining_hall, doug_coach_story, tuesday_commitment, tuesday_night_study, floor_lunch_day2, hallway_morning_day3, miguel_afternoon_day3, **orientation_fair** (Day 1 afternoon pool — quad-overwhelm, flags) |
| **academic** | 7 | 1–8 | advisor_visit, heller_lecture, western_civ_day1, reading_or_lounge, second_morning_class, study_group_forming, catch_up_or_coast (gated by `skipped_reading` flag) |
| **money** | 8 | 2–14 | money_reality_check, job_board, first_shift_* (4 variants), tuesday_night_shift, bookstore_line |
| **opportunity** | 5 | 0–14 | glenn_pastime_paradise, terminal_first_visit, glenn_the_walk, tuesday_night_terminal, **the_post** (Day 14 afternoon — Delphi Group quiz) |
| **home** | 1 | 7 | pay_phone_line |

### Inactive/Disabled Storylets (3)
hall_morning, roommate_moment (superseded by `roommate_evening_day3`), cal_midnight_knock. (`dorm_roommate` deleted 2026-04-20 — superseded by `room_214`, identical slot. `orientation_fair` reactivated 2026-04-24 as Day 1 afternoon pool storylet.)

### Deleted Storylets
bench_glenn (2026-04-02), dorm_roommate (2026-04-20 — duplicate of room_214).

### New DB Tables (Phase 1-4)

| Table | Purpose | Added |
|-------|---------|-------|
| `skill_definitions` | 10 Tier 1 skill catalog | Phase 1 (2026-04-10) |
| `player_skills` | Per-user skill queue (1 active, 1 queued, N trained) | Phase 1 (2026-04-10) |
| `skill_practice_events` | Audit log for diegetic practice credit | Phase 2 (2026-04-11) |
| `routine_activities` | Standing activity catalog (6 seeded) | Phase 4 (2026-04-12) |
| `player_routine_schedules` | Per-user committed weekly schedules | Phase 4 (2026-04-12) |
| `routine_week_state` | Per-user weekly state machine | Phase 4 (2026-04-12) |
| `harvest_items` | Dream / letter / usenet pool (28 seeded) | Phase 3 (2026-04-19) |
| `harvest_seen` | Per-player seen-item junction (prevents repeats) | Phase 3 (2026-04-19) |
| `player_arc_flags` | **Arc-scoped** flags (unlike track-scoped choice_log FLAG_SET) — used by 6 harvest traces | Phase 3 (2026-04-19) |

### NPC Registry (13 NPCs)

| NPC ID | Display Name | Introduced In | Notes |
|--------|-------------|---------------|-------|
| `npc_roommate_scott` | Scott | room_214 | Roommate |
| `npc_contact_glenn` | Glenn | *(needs scene)* | The Contact — bench_glenn deleted, needs new storylet |
| `npc_floor_doug` | Doug | dorm_hallmates | Social organizer |
| `npc_floor_mike` | Mike | dorm_hallmates | Studious, careful |
| `npc_floor_keith` | Keith | dorm_hallmates | Farm background |
| `npc_anderson_bryce` | Bryce | *(never via introduces_npc)* | Party host — named in evening_choice body only |
| `npc_floor_peterson` | Peterson | *(never via introduces_npc)* | Card game host — named in morning_after_cards only |
| `npc_floor_spider` | Spider | evening_choice (cards path) | Nickname-only floormate, sharp at cards |
| `npc_herald_karen` | Karen | *(routine-week content)* | Herald editor, writing track |
| `npc_prof_marsh` | Marsh | — | English lecturer — no storylet yet |
| `npc_studious_priya` | Priya | — | Sociology section — no storylet yet |
| `npc_ambiguous_jordan` | Jordan | — | Mystery character — no storylet yet |
| `npc_parent_voice` | your parent | — | Hallway phone — no storylet yet |

---

## What's Done

### Engine (Milestone A — complete)
- Core storylet engine: schema, evaluation, branching, save/load
- **Dual-mode selection**: chain (next_key_override) AND pool (requires_choice gating)
- Pool scan with `meetsRequirements()` — track-scoped requires_choice evaluation
- Three-segment time system (morning/afternoon/evening)
- Resource system: energy, stress, cashOnHand, knowledge, socialLeverage, physicalResilience
- Track state transitions (sets_track_state)
- Playthrough log (auto-records to `playthrough_log` table + `docs/PLAYTHROUGH-LOG.md`)
- Mini-game framework: MiniGameShell + 3 games (snake, caps, memory)
- Adaptive difficulty tracker (session-level, 0.2–0.9)
- Content Studio: collision view, NPC registry, preview simulator, choice editor
- Welcome/new game screen, save system, NPC name resolution
- 80s preppy design system, storylet UX polish

### Skill Queue (Phase 1 — built 2026-04-10)
- **DB:** `skill_definitions` (10 Tier 1 skills) + `player_skills` tables with RLS and partial unique indexes (1 active, 1 queued max)
- **Engine:** `src/core/skills/queue.ts` — pure functions: startTraining, queueNext, tick, cancelQueued. No decay, no pay-to-speed, no acceleration
- **Curve:** `src/core/skills/curve.ts` — placeholder values (Tier 1=4h). `NEXT_PUBLIC_SKILL_TIME_SCALE` env var compresses for testing (e.g. 0.01 → ~2.4 min)
- **API:** `/api/skill-queue` (GET state + lazy tick), `/api/skill-queue/train` (POST start/queue), `/api/skill-queue/cancel` (POST)
- **UI:** `SkillQueueCheck` (picker + progress + celebration), `SkillsPanel` (character sheet read-only), `/skills` page in player nav
- **Types:** `src/types/skills.ts` — SkillDefinition, PlayerSkill, TickResult
- **Status:** Built, migration applied, not yet playtested.

### Skills in Storylets (Phase 2 — built 2026-04-11)
- **Resolver:** `meetsRequirements()` in `selectTrackStorylets.ts` checks `requires_skill` for storylet-level pool gating. `trainedSkillIds` param passed through.
- **Choice filtering:** `dailyLoop.ts` loads trained skills from `player_skills`, filters out choices with unmet `requires_skill` (hidden, not grayed), swaps `reaction_text` with `reaction_with_skill` when `skill_modifier` matches.
- **Diegetic practice:** `src/core/skills/practice.ts` — `tickPracticeCredit()`. Called from resolve route. Subtracts `PRACTICE_CREDIT_SECONDS` (env var, default 900s) from active training skill. Only active skill, not queued/trained.
- **Audit table:** `skill_practice_events` (user_id, skill_id, storylet_key, choice_id, credit_seconds, applied_at). For Phase 5 tuning.
- **Content Studio:** ChoiceEditor has three new controls: Skill Requirement picker (dropdown, gates choice), Skill Modifier picker (dropdown + effect + alt text), Practices Skills multi-select.
- **Retrofitted storylets (5):**
  1. `glenn_pastime_paradise` — `skill_modifier: musical_ear` on `head_to_evening`. Alternate text: recognizes harmonic structure. No practice credit.
  2. `lunch_floor` — `skill_modifier: small_talk` on `laugh_with_doug`. Alternate text: lands a joke, table opens up. Practices: small_talk.
  3. `heller_lecture` — NEW gated choice `raise_critical_point` with `requires_skill: critical_analysis`. Only visible when trained. Practices: critical_analysis.
  4. `evening_choice` — `skill_modifier: active_listening` on `go_to_cards`. Alternate text: reads Spider's card tells. Practices: active_listening.
  5. `money_reality_check` — `skill_modifier: budgeting` on `eat_first`. Alternate text: does the register math consciously. Practices: budgeting.
- **No Herald/writing storylet** exists in Week 1-2. Substituted money_reality_check (budgeting). Flag for PR.
- **Status:** Built, migration applied, awaiting playtest (P2.4).

### Routine-Week Mode (Phase 4 — built 2026-04-12)
- **DB:** 3 new tables — `routine_activities` (6 seeded standing activities), `player_routine_schedules` (committed weekly slot assignments), `routine_week_state` (per-user weekly state machine with status enum: `pending | committed | active | interrupted | completed`)
- **Seeded activities (6):** morning_run, library_study, herald_writing, dining_commons_social, pickup_basketball, campus_job
- **UI:** `WeeklyCalendar` component — weekly grid view for slot assignment. Activates when `day_index >= 7` (start of Week 2)
- **Deposit system:** Per-activity deposits applied on schedule commit (skill XP, energy effects, money effects)
- **Interruption system:** Three triggers — gate threshold trips, calendar beats, NPC patience timers. Interruptions break out of routine mode back to storylet mode
- **Types:** `src/types/routine.ts` — RoutineActivity, PlayerRoutineSchedule, RoutineWeekState, RoutineDeposit
- **NPCs added:** `npc_floor_spider` (Spider — card sharp), `npc_herald_karen` (Karen — Herald editor)
- **Status:** Built, migration applied, awaiting playtest (P4.5).

### Day Lifecycle Refactor (built 2026-04-12)
- **Architectural invariant:** Only `/api/day/advance-segment` and `/api/day/advance-day` may write to `daily_states.day_index` or `player_day_state.current_segment`. No client-side mutations.
- **New endpoints:**
  - `POST /api/day/advance-segment` — atomic segment advance with conditional UPDATE (`WHERE current_segment = $current`). Returns 409 on race.
  - `POST /api/day/advance-day` — finalize + create next day + increment day_index with conditional UPDATE (`WHERE day_index = $current`). Returns 409 on race.
- **`ensureCadenceUpToDate` removed entirely** — day advancement is exclusively sleep-driven. No wall-clock catch-up.
- **`getOrCreateDailyRun` made read-only** — replaced `ensureDayStateUpToDate` with `fetchDayState`. Falls back to `createDayStateFromPrevious` if row missing (handles pre-refactor state).
- **Client simplified** — `handleAdvanceSegment` and `handleSleep` in `play/page.tsx` await server response, then `queryClient.refetchQueries`. No hand-rolled optimistic `setDayState`. No `setRefreshTick` after mutations.
- **Concurrency control** — conditional UPDATEs prevent double-advance from two tabs or double-clicks.
- **SupabaseClient DI** — `finalizeDay`, `createDayStateFromPrevious`, `fetchDayState`, `fetchUnresolvedTensions`, `fetchPosture` all accept optional `client` parameter (defaults to browser client) so server endpoints can pass `supabaseServer`.
- **Bugs fixed (5):**
  1. Infinite auto-advance loop (Day 1) — optimistic `setDayState` + init effect race
  2. `choice_log` 400 (Day 3) — stale `arc_id`/`arc_instance_id` columns
  3. Sleep not advancing (Day 3→4) — `handleSleep` called admin-only endpoint
  4. Permanent blank screen (Day 4) — `sleepCardDone` never reset
  5. "Failed to load play state" (Day 7) — hard assert on missing `player_day_state` row
- **Status:** Deployed and verified through Day 7+.

### Content (Day 0-7+)
- Day 0 chain: room_214 → dorm_hallmates → lunch_floor → evening_choice (3 mini-games)
- Day 1 morning: first_morning (roommate), morning_after_* pool variants (belonging)
- Day 1 afternoon: advisor_visit (academic)
- Day 4: money_reality_check (money track entry point)
- Day 7+: routine-week mode activates (weekly calendar, standing activities)

### Playthrough Runner (built 2026-04-12)
Headless Node-only test runner that executes scripted choice sequences against the real MMV engine. Converts 15-minute manual click-throughs into sub-second vitest runs.

**Location:** `src/core/playthrough-runner/`
- `types.ts` — discriminated union step types, script/fixture/failure types
- `client.ts` — service-role Supabase client (reads `.env.local`)
- `loader.ts` — loads tracks, storylets, choice_log from DB (cached per run)
- `harness.ts` — `PlaythroughHarness` class: test user lifecycle, choose, advanceSegment, sleep, snapshotState
- `executor.ts` — YAML script loader, step dispatcher, failure formatter
- `cli.ts` — CLI entry point (single script, `--all`, `--snapshot`)
- `playthrough.test.ts` — vitest integration (globs all scripts)

**Scripts:** `scripts/playthroughs/` (9 scripts)
| Script | What it tests |
|--------|---------------|
| `day0_party_path` | Full Day 0 → go_to_party → morning_after_party via pool |
| `day0_cards_path` | Full Day 0 → go_to_cards → morning_after_cards via pool |
| `day0_union_path` | Full Day 0 → go_to_union → morning_after_union via pool |
| `glenn_directive_people` | Glenn beat 1 — pastime_paradise resolves, pool mode enters |
| `glenn_directive_knowledge` | Glenn beats 1+2 — terminal_first_visit via pool at Day 1 |
| `glenn_directive_independence` | Glenn all 3 beats through Day 5+ → glenn_the_walk |
| `glenn_miss_path` | Skip Glenn — override persists, blocks pool scan |
| `glenn_knowledge_from_fixture` | Same as knowledge but starts from fixture (`extends`) |
| `cross_track_chain_regression` | Prevents cross-track chain contamination (evening_choice on opportunity track) |

**Fixtures:** `scripts/playthroughs/fixtures/` (4 snapshots)
- `after_fresh_day0_start.snapshot.json` — pristine Day 0 morning
- `after_day0_party_path.snapshot.json` — after full party path, Day 1 morning
- `after_day0_cards_path.snapshot.json` — after full cards path, Day 1 morning
- `after_glenn_directive_people.snapshot.json` — after Glenn beat 1, Day 0 afternoon

**Invocation:**
```bash
npm run playthrough scripts/playthroughs/day0_party_path.yaml  # single script
npm run playthrough:all                                         # all scripts
npm run playthrough:snapshot scripts/playthroughs/X.yaml        # run + save fixture
npm run playthrough:test                                        # vitest integration
```

**Architecture notes:**
- Invokes `selectTrackStorylets()` directly — no HTTP, no browser
- Replicates `/api/tracks/resolve` logic for choose (resource deltas, track state, same-track validation)
- Real Supabase with service role key; creates/deletes auth users per script (CASCADE teardown)
- `requires_flag` is NOT enforced by engine — Glenn storylets using it pass regardless (known limitation)
- Same-track validation in both engine and harness prevents cross-track chain bugs even with bad DB data

### Days 2-3 Content (built 2026-04-20)
- **Migration:** `supabase/migrations/20260420200000_days_2_3_content.sql` — 10 new active storylets, applied clean
- **Brief:** `docs/DAYS-2-3-CONTENT-BRIEF.md` is the authoring spec (body text, nodes, choices, flags, NPC events)
- **Academic (5):** `western_civ_day1` (Day 2 morning, intro `npc_prof_western_civ`), `reading_or_lounge` (Day 2 evening — body+choices only, no nodes; sets `skipped_reading` flag on lounge path), `second_morning_class` (Day 3 morning), `study_group_forming` (Day 3 afternoon, intro `npc_studious_priya`), `catch_up_or_coast` (Day 3 evening, pool-gated by `requires_flag: "skipped_reading"`)
- **Belonging (3):** `floor_lunch_day2` (Day 2 afternoon), `hallway_morning_day3` (Day 3 morning), `miguel_afternoon_day3` (Day 3 afternoon)
- **Money (1):** `bookstore_line` (Day 2 afternoon — introduces Karen via choice-level NPC event, not `introduces_npc`)
- **Roommate (1):** `roommate_evening_day3` (Day 3 evening — supersedes inactive `roommate_moment`; idempotent UPDATE in migration keeps `roommate_moment.is_active=false`)
- **Pattern:** all 10 use pool mode (`default_next_key=NULL`). 8 have conversational nodes; `reading_or_lounge` and `catch_up_or_coast` are body+choices only.
- **Status:** Migration applied. Active storylet count 33 → 43 (+10 new). (Prior HANDOFF snapshot said 31; the roommate row undercounted by 2 — it was actually 8 pre-session, not 6.) All 10 verified by `storylets` query.

### Week 2 Content Push (built 2026-04-20)
Driven by `docs/WEEK-2-CONTENT-BRIEF.md`. Five parts — all shipped.

- **Part 1 — Routine activation moved Day 7 → Day 3.** `ROUTINE_MODE_START_DAY` constant changed. Classes start Day 3; the mechanic now matches the fiction.
- **Part 2 — Activity roster expansion.** Added `activities.segment_lock` column. 6 existing activities updated + 8 new authored (14 total: 3 morning, 5 afternoon, 6 evening). Every segment has more valid activities than slots. Migration includes `NOT NULL` default where appropriate + backfill UPDATEs.
- **Part 3 — `scott_notices` (Day 11 evening, roommate track, 2h).** `supabase/migrations/20260420400000_scott_notices.sql`. Roommate crystallizer with 10 nodes + 2 terminals. Three entry paths (`scott_opens` if `trust_high`, `scott_opens_low` if `trust_low`, `scott_absent` as unconditional fallback via node ordering). Micro-choices pair `sets_flag` (walk-local) with `set_npc_memory` (persistent) so the `noticed_something` / `roommate_avoids` signal survives beyond the scene. Migration also (a) retrofits `scott_day2_morning` + 3 dana_letter_* terminals to write `trust_high`/`trust_low` NPC memory so scott_notices' entry gates have something to branch on, and (b) sweeps the final Known Issue #12 residue (4 rows still carried `npc_roommate_dana` in choices/nodes).
- **Part 4 — `the_post` / "The Delphi Group" (Day 14 afternoon, opportunity track, 2h).** `supabase/migrations/20260420500000_the_post.sql`. Forecasting-quiz landmark with 13 nodes + 2 terminals. Gated by `requires_flag: tuesday_terminal`. Three quiz questions; correct answers set walk-flags `delphi_q{1,2,3}_correct`; `submit_answers` uses new `condition.all_flags` to gate success vs `else_next: submit_answers_fail`. Archive-reading path sets walk-flag `delphi_archive_seen`, which gates the `log_off_shaken` terminal — that terminal's persistent `sets_flag: [the_post_resolved, delphi_archive_accessed]` is how the arc flag fires only on the quiz-passed path. Walk-away path (`walk_away_node`) available from hesitation node. Introduces `cassandra_7` / `heraclitus` as future NPCs (handles-only, no `introduces_npc` yet — not yet real NPCs in the registry).
- **Part 4 engine side — two schema additions on `DialogueNode`:**
  - `condition.all_flags: string[]` — compound walk-flag gate; all listed flags must be set.
  - `else_next: string` — explicit fallback target when condition fails (overrides `.next`).
  Both evaluators updated for parity: `DialogueNodeView` (player UI) + `playthrough-runner/harness.ts` (test harness). `tsc --noEmit` clean. No content using pre-existing node conditions is affected.
- **Part 5 — 2 entries added to `docs/DECISIONS.md`** (Week 2 push rollup + engine extension rationale).
- **Known limitation carried forward:** `tuesday_terminal` is set by a micro-choice inside `tuesday_commitment` (pre-existing content, belonging track). Micro-choice `sets_flag` is scene-local, so the flag never reaches `choice_log` as a persistent FLAG_SET. Even if it did, flagsByTrack scoping is per-track (`src/core/engine/dailyLoop.ts:547`: "cross-track gating is a future extension"), so an opportunity-track storylet couldn't read a belonging-track flag. Both gaps block the `requires_flag: tuesday_terminal` gate on `tuesday_night_terminal` (pre-existing) and `the_post` (new) from firing in a real run. Fix options: (a) rewrite `tuesday_commitment`'s terminal choice into four walk-flag-gated terminals that each persist their tuesday_* flag, and (b) extend `dailyLoop.ts` to union a global flag set onto each track's flag set before `meetsRequirements`. Not done in this session — scope outside the Week 2 content brief.

### job_board + dana_cereal walk-flag persistence (built 2026-04-22)
- **Migration:** `supabase/migrations/20260422200000_job_board_and_dana_cereal_flag_persistence.sql`. Closes Known Issue #13.
- **Pattern:** same as the 2026-04-22 `tuesday_commitment` rewrite — replace a single terminal choice with walk-flag-gated terminals that each carry both `requires_flag` (to match the scene-local walk flag from the micro-choice) and `sets_flag` (to persist the same flag to `choice_log` so downstream storylets read it).
- **job_board:** single `leave_board` terminal → 4 terminals (`leave_board_library`, `leave_board_dining`, `leave_board_grounds`, `leave_board_research`). Unblocks all four Day 10 `first_shift_*` storylets (library/dining/grounds/research).
- **dana_cereal:** added `sets_flag: dana_cereal_neutral` to the `no_thanks` micro-choice so every path now writes exactly one walk flag. Single `cereal_continue` terminal → 3 terminals (cold / engaged / neutral). `cereal_continue_cold` persists `dana_cereal_cold` → unlocks `dana_letter_avoidance` on Day 9 evening.
- **Verification:** Tier 1 SQL join confirmed every persisted flag has a live consumer. Tier 2 vitest 196/197 green.

### Vitest environment repaired (2026-04-22)
- `node_modules/vite/dist/client/client.mjs` was missing (only `env.mjs` present). `rm -rf node_modules && npm install` restored both. Full `npx vitest run` now clean in ~1.2s.
- Unblocks CI-style verification for all engine work going forward. Closes Known Issue #14.

### Time-architecture refactor (2026-04-23)

This session chased a cascade of stuck-state bugs back to a root architectural problem — **multiple writers of `daily_states.day_index` and split reads between `daily_states` and `player_day_state`** — and fixed it. Four commits on `main`: `aa062d8`, `0fd818c`, `f6c65aa`, `b24b301`.

#### Symptoms observed this session (all fixed)
1. **Multi-beat dismiss race** — When a segment had 2+ resolved outcome cards (e.g. afternoon with `lunch_floor` + `glenn_pastime_paradise`), clicking Continue on one dismissed it but the remaining card's segment-advance button arrived inconsistently on the re-render. Player was stuck with two plain "Continue" buttons, no path to the next segment.
2. **Day 0 Night stuck** — `daily_states.day_index` could be reset to 0 by `performSeasonReset` auto-firing on page load when `user_seasons` drifted. `createDayStateFromPrevious(userId, 0)` then invented a phantom `player_day_state` row with `DEFAULT_STATE` values (energy 70, stress 20, random cash 200–600), which the player could never legitimately reach. Sleep appeared to "loop" because each click advanced through each saved end-of-day snapshot in order.
3. **Routine interruption loop on resolved storylet** — `routine_week_state.status = "interrupted"` pointing at `scott_day2_morning` (already in `track_progress.resolved_storylet_keys`). `checkInterruptions` had no filter against resolved keys, so the interruption kept re-firing every tick.
4. **Day_index drift across tabs / stale cache** — `/api/tracks/resolve` trusted client-supplied `day_index` in the payload. A stale React Query cache or concurrent tab could write `choice_log.day` / `track_progress.updated_day` against the wrong day. (The earlier "Day 3 skip" pattern from 2026-04-22's playthrough.)

#### Root cause

At least **eight different code paths** were writing `daily_states.day_index` (advance-day, advance-segment indirectly, seasonReset, dev/test endpoints, reset, weeklyTick twice, cadence.ts — half of which were dead or racing each other). Segment info lived in `player_day_state` while the day pointer lived in `daily_states`, so reads could disagree across the two tables. The earliest design had a single writer but the codebase accumulated layers without tearing out the old ones.

#### Changes shipped

**`aa062d8` — Multi-beat dismiss fix (client-side UX)**
- When all storylets in a segment are resolved and ≥1 outcome is still pending dismissal, per-card Continue buttons are hidden and a single bottom "Continue to {next} →" CTA dismisses all pending beats AND advances the segment atomically.
- File: `src/app/(player)/play/page.tsx` (around the `pendingDismissalBeats.map` render).
- Verified working on fresh playthrough.

**`0fd818c` — seasonReset neutered + DB CHECK constraint + dead cadence paths removed**
- `src/lib/cadence.ts` reduced to `utcToday` only. `ensureCadenceUpToDate` and `computeDayIndex` deleted (were dead code per prior session comments but still shipped in the bundle).
- Migration `20260423100000_daily_states_day_index_nonneg_check.sql`: `CHECK (day_index >= 1)` on `daily_states`. Any future code attempting to write 0 now fails loudly with a constraint violation instead of silently corrupting state.
- `performSeasonReset` in `src/core/season/seasonReset.ts` no longer updates `daily_states`. It still updates `user_seasons` (so the drift loop stops) and still returns the recap, but season rollover no longer wipes player progress. `buildResetPayload` helper + corresponding test removed.

**`f6c65aa` — Single `/api/time/advance` endpoint + `daily_states` as canonical for segment**
- Migration `20260423110000_daily_states_segment_columns.sql`: adds `current_segment text`, `hours_remaining int`, `hours_committed int` to `daily_states` with CHECK constraints. Backfilled from `player_day_state.day_index = daily_states.day_index` per-user.
- `src/app/api/time/advance/route.ts` (new): reads current `(day_index, current_segment, hours_remaining)` from `daily_states` and decides internally whether to bump segment or roll the day. Conditional UPDATEs on `current_segment` / `day_index` prevent double-advance on retries or tab races. Returns 409 when the client's intent has already been applied by a concurrent caller.
- **Deleted:** `/api/day/advance-segment` and `/api/day/advance-day` routes. Only one endpoint writes time now.
- `src/core/engine/dailyLoop.ts`: `getOrCreateDailyRun` reads `current_segment` / `hours_remaining` / `hours_committed` from `daily_states` (canonical) instead of `player_day_state`. `player_day_state` becomes a historical per-day log.
- `src/core/routine/weeklyTick.ts` — `runWeek` no longer writes `daily_states.day_index`. Both the interruption branch and the end-of-week branch have the direct `daily_states.update({ day_index })` calls removed. The routine tick still tracks internal progress via `routine_week_state.current_week_day` and applies deposits; the player's canonical day only advances when they sleep (via `/api/time/advance`). Dual-writer race eliminated.
- `src/core/routine/checkInterruptions.ts` accepts `resolvedStoryletKeys?: Set<string>` and skips any gate/beat/patience trigger whose `storylet_key` is already resolved. `weeklyTick.runWeek` loads the union of `track_progress.resolved_storylet_keys` for the user and passes it in.
- Client `handleAdvanceSegment` + `handleSleep` route through a shared `postAdvanceTime` helper that calls `/api/time/advance`. The server decides the action; the client only sets intent-specific UI state (bridge text for segment, sleep-card animation for day rollover).

**`b24b301` — Server-authoritative `day_index` on `/api/tracks/resolve`**
- `day_index` removed from the request body. Server reads it from `daily_states` at the top of the handler and uses that canonical value everywhere (resource snapshot lookup, `choice_log.day`, `stream_states` update, `playthrough_log` write, `track_progress.updated_day`).
- Client stops sending `day_index` in the `/api/tracks/resolve` payload.
- Kills the class of bug where stale React Query cache or a multi-tab race writes log entries against a drifted day.

#### Test status
- `npx tsc --noEmit` clean on all touched files (pre-existing errors in `.next/types/*` and `playwright.config.ts` are unrelated).
- `npx vitest run`: 42 files, 195 passed / 1 skipped in ~1.1s.
- User playtested through Day 5+ on `f6c65aa` and reported "worked clean continue"; `b24b301` ships the tracks/resolve cleanup on top but wasn't independently playtested this session.

#### What's NOT done (steps 7-8 of the original plan)
Deferred to a future session per user's decision to pause after step 6:
- **Step 7**: Replace ~10 `setDailyState({...dailyState, fieldX})` mid-session mutations in `play/page.tsx` with `queryClient.invalidateQueries({ queryKey: ["daily-run", userId] })` after the server mutation succeeds. Currently the client silently patches its cached copy of `daily_states` for `relationships` / `life_pressure_state` / `skill_flags` / `preclusion_gates` etc. after each storylet resolve. This works but creates a divergence window between client render and server truth — another class of latent drift.
- **Step 8**: Delete `dayIndexState` / `dayStateRef` / `refreshTick` from `play/page.tsx`. Depends on step 7 being in. Once state is read exclusively from React Query, these fallback/mirror variables are dead weight. ~30 min of work.

### scott_day2_morning Storylet (built 2026-04-17)
- First Day 2 content, filling the Days 2-3 content desert on the roommate track
- **Engine extension:** `DialogueNode.condition` now supports `npc_memory` checks (format: `"npc_id.memory_key"`)
- `DialogueNodeView` evaluates npc_memory conditions on initial node selection and during advance transitions
- Three conditional entry nodes branch on NPC memory from room_214: warm (started_warm), neutral (played_cool), absent (fallback)
- Room_214 retrofitted: `brief` and `look_around` micro-choices now set `npc_roommate_scott.played_cool` NPC memory
- Terminal gating uses `scott_engaged` walk flag (fallback for unsupported `requires_flag_mode:"any"`)
- `read_scotts_note` persisted as FLAG_SET via `sets_flag` on terminal choice — future Day 4-5 callback will check it
- Playthrough script: `scott_day2_warm_breakfast.yaml` — warm path → breakfast with Scott
- 31 active storylets total (was 30)

### requires_flag Enforcement (built 2026-04-17)
- `meetsRequirements()` now checks `requires_flag` alongside `requires_choice` and `requires_skill`
- Flag storage: `choice_log` with `event_type='FLAG_SET'`, track-scoped
- Resolve route writes FLAG_SET entries when choice has `sets_flag` array
- Playthrough runner harness updated to load/write flags
- 3 new unit tests (invariant 6 additions)
- Glenn chain fixed: `glenn_pastime_paradise` sets `glenn_gave_direction`, `terminal_first_visit` sets `found_terminal`

### Phase 3 Harvest Pool — Schema + 28 Templates (built 2026-04-19)
- **Migration:** `supabase/migrations/20260419100000_phase3_harvest_pool.sql` — ran clean against live DB
- **New tables (3):**
  - `harvest_items` — slug PK, type ∈ {dream, letter, usenet}, subtype, day_min/max window, gate_requires, weight, body, attribution, sets_flag, identity_tags JSONB
  - `harvest_seen` — (player_id, slug) junction — one-per-player-per-item
  - `player_arc_flags` — **arc-scoped** flag table (distinct from track-scoped FLAG_SET in `choice_log`). Used for the 6 harvest trace flags so Arc Two can do compound checks.
- **Draw function:** `public.draw_harvest_item(p_player_id, p_current_day) RETURNS harvest_items` (SECURITY DEFINER)
  - Filters by day window, gate_requires (checks `player_arc_flags`), excludes already-seen
  - Weighted random via cumulative `SUM() OVER (ORDER BY slug)` against `random() * total_weight`
  - Returns NULL on empty pool (caller falls through to "no visit today")
- **Seeded content (28 items from `docs/harvest_templates_draft.md`):**
  - 8 dreams (textures of returning / half-memory / déjà vu — no gates)
  - 6 letters from home (1 each of mom, dad, sibling, high_school_friend, grandparent, ex)
  - 8 usenet texture posts (net.philosophy / net.misc / rec.music — no gates)
  - 6 usenet trace posts (all gated by `terminal_accessed`, each sets a unique `saw_trace_*` arc flag: NV, sports_anomaly, arc_terminology, contact_signal, harwick_mention, nv_three)
- **RLS:** harvest_items/items public read; harvest_seen/player_arc_flags each user sees only own rows; writes restricted via auth.uid() policies
- **Not built (intentional):** login-flow caller, Usenet display slot, UI. This migration is read-only infra — wiring happens in P3.3 (T-1776329281038).
- **Status:** Migration applied. Draw function verified: Day 1 returns one of {dream_001, dream_002, dream_006, texture_001}; Day 14 pool = 22 (no gate) / 28 (with terminal_accessed); empty pool returns NULL. 28 templates (draft only had 28, not 30 as ticket originally specified).

### Period-stance infrastructure + player identity (built 2026-04-24, branch `feature/period-stance-infrastructure`)

Spec: `docs/specs/CODE-SPEC-period-stance-infrastructure.md`. Decisions log: `docs/specs/CODE-SPEC-period-stance-infrastructure-DECISIONS.md`. **Branch is uncommitted.** Does not merge until content briefs land and the first friction beat wires as an integration test.

- **Step 1 — identity columns on `characters`.** Migration adds `identity_race text`, `identity_gender text`, `identity_sexuality text`, all defaulting to `'unspecified'`. `src/types/identity.ts` defines `PlayerIdentity` + `RACE_OPTIONS` (9) / `GENDER_OPTIONS` (4) / `SEXUALITY_OPTIONS` (5). `src/lib/playerIdentity.ts` exports `fetchPlayerIdentity`, `saveCharacterIdentity`, and the pure predicate `playerHasIdentity(identity, attribute, values)` used by node conditions.
- **Step 2 — character creation UI.** New identity-selection step in the new-game flow (race / gender / sexuality pickers, all with an "unspecified" default). Persisted to `characters` via `saveCharacterIdentity`. Non-blocking: a player can skip every field and the defaults carry through.
- **Step 3 — `period_stance` tracking.** Two-surface hybrid per DECISIONS §Q2. **Counter:** `daily_states.period_stance_state` JSONB with keys `challenged | deflected | absorbed` (int). Helpers: `bumpPeriodStance(state, tag)`, `periodStanceCount(state, tag)`, `getDominantPeriodStance(state)` in `src/core/chapter/state.ts`. **Temporal:** `choice_log` entries with `event_type = 'PERIOD_STANCE'` and `option_key = <tag>` for first/last/most-recent queries. Writers in `src/lib/play.ts`: `updatePeriodStanceState`, `logPeriodStanceEvent`, `getPriorPeriodStance`. Both surfaces are populated at the micro-choice apply site in `src/app/(player)/play/page.tsx` (`handleMicroEffects`), mirroring the existing `identity_tags → life_pressure_state` write pattern.
- **Step 4 — conditional `events_emitted` groups.** Schema extended in `src/types/storylets.ts`: `StoryletChoice.events_emitted` now accepts either the legacy flat `EventEmission[]` or a new `ConditionalEmissionGroup[]` (discriminated on `{ condition?, events }`). Resolver in `src/lib/eventsEmitted.ts` is first-match-wins top-to-bottom with an optional unconditional tail group as the else. `flattenAllEvents` preserves pre-existing iteration semantics where they still apply. 7 unit tests cover flat passthrough, single-group match, first-match-wins, else fallback, and empty-group defaults.
- **Step 5 — DialogueNode variants + new condition predicates.** Shared `NodeCondition` type now supports six predicate kinds, all ANDed: `flag`, `all_flags`, `npc_memory` (dotted key), `identity` (`{attribute, in}`), `period_stance` (`{tag, min=1}`), `prior_period_stance`. `DialogueNode.text_variants` + `MicroChoice.label_variants` are first-match-wins overrides with fallback to `.text` / `.label`. Central evaluator at `src/lib/nodeConditions.ts` exports `evaluateNodeCondition`, `resolveNodeText`, `resolveMicroLabel`, and the `PlayerContext` type (identity + periodStance + priorPeriodStance snapshot). 15 unit tests cover every predicate kind and both variant resolvers.
- **Step 6 — storylet engine integration.** `DialogueNodeView` + `TrackStoryletCard` + `play/page.tsx` consume the evaluator directly. `playerContext` is pre-fetched once (`fetchPlayerIdentity` + `getPriorPeriodStance` in parallel) on `userId` change and threaded down via props. Local `priorPeriodStance` state updates optimistically on each micro-choice so variant gates reflect the most recent stance without re-fetch. Smoke test at `src/core/chapter/stanceIdentityApi.test.ts` documents the public API surface (5 tests — `playerHasIdentity` / `fetchPlayerIdentity` / `saveCharacterIdentity`, `periodStanceCount` / `getDominantPeriodStance` / `bumpPeriodStance`, `getPriorPeriodStance` / `updatePeriodStanceState` / `logPeriodStanceEvent`, `evaluateNodeCondition` / `resolveNodeText` / `resolveMicroLabel`, `resolveEventsEmitted` / `flattenAllEvents`) — failing this test means a helper moved or lost its export.
- **Step 7 — playthrough-runner test hooks.** Four new YAML script steps in `src/core/playthrough-runner/types.ts`: `set_identity` (race/gender/sexuality patch), `expect_period_stance` (tag + op + value), `expect_walk_flag` (flag + present), `expect_prior_period_stance` (value or null). Harness gets three new methods — `setIdentity` (upsert on `characters`), `getPeriodStanceCount(tag)`, `getPriorPeriodStance()`. `chooseNode` now applies `micro.period_stance` (bumps counter on `daily_states.period_stance_state` + inserts a PERIOD_STANCE `choice_log` event) so harness-driven tests exercise the same write surface the UI does. `seedFreshState` seeds `period_stance_state: {}` on the `daily_states` insert. Executor dispatches the new step types with deterministic trace entries.
- **Write-path parity (load-bearing invariant).** The render-time write site (`handleMicroEffects` in `play/page.tsx`) and the harness write site (`chooseNode` in `playthrough-runner/harness.ts`) are the only two places that bump the stance counter + insert a PERIOD_STANCE event. They use the same JSONB shape and the same `event_type`/`option_key` convention. If they drift, conditional gates will serve different prose in playtest vs playthrough scripts.
- **Test status.** `npx tsc --noEmit` clean on project source (pre-existing `.next/types/*` and `playwright.config.ts` errors are unrelated). `npx vitest run` → 46 files, 231 passed / 1 skipped in ~1.4s. 36 new tests total: 7 eventsEmitted + 9 periodStance + 15 nodeConditions + 5 stanceIdentityApi smoke tests.
- **§7 schema-discovery answers** are captured in full in `docs/specs/CODE-SPEC-period-stance-infrastructure-DECISIONS.md`. Key choices at a glance: (Q1) predicates use the literal string `"unspecified"`, not null, so author tooling treats it as a first-class value; (Q2) hybrid counter+event storage — counter for threshold gates, events for prior/first/last queries; (Q3) micro-choice `period_stance` is a single string on the micro level (not an array), and it fires alongside any `identity_tags` — both dimensions can increment on the same tap; (Q4) variants are first-match-wins top-to-bottom with fallback to `.text`/`.label`, matching how `text_variants` works elsewhere in the engine; (Q5) `PlayerContext` is fetched once per walk and threaded top-down — no lazy per-evaluator DB hits during render; (Q6) playthrough hooks assert at the DB surface, not at an in-memory harness state, so they fail the way the real render would.
- **What's NOT done in this branch (intentional).**
  - No content uses `period_stance`, `identity`, `text_variants`, or `label_variants` yet. The infrastructure is live but passive until a content brief lands. First user: the Week 2 friction beats (`T-1776329281009` / `T-1776329282001`).
  - No integration playthrough script exercises the new step types end-to-end. One is planned when the friction beat ships — that script is what gates merging this branch.
  - No migration row backfills `period_stance_state: {}` on existing `daily_states` rows; existing users with null will fall through to an empty object on the first read. If a dev profile shows this, hit reset to re-seed.

### Runtime Preclusion (T-016, built 2026-04-17)
- When a choice has `precludes: ["storylet_key", ...]`, those keys are appended to `daily_states.preclusion_gates`
- Pool scan in `selectTrackStorylets()` skips precluded keys (cross-track)
- Preclusion is permanent per run, cleared on game reset
- `evening_choice` precludes fixed: phantom keys replaced with actual `morning_after_*` keys
- 3 new unit tests (invariant 8)
- No new tables — uses existing `preclusion_gates` JSONB column on `daily_states`

### Gap Analysis (T-006, built 2026-04-17)
- Full Day 0-14 coverage matrix at `docs/GAP-ANALYSIS.md`
- 30 active storylets, 42% slot coverage, 26 empty slots
- Critical gaps: Days 2-3 completely empty, academic/roommate dark Days 2-7
- Preclusion math: 30% inaccessibility achievable with existing fork points
- Issues found: Dana/Scott naming regression (5 storylets), 11 flag-gated storylets, Day 14 4-track pileup

### Docs & Tooling
- CLAUDE.md project bible with testing process (4-tier: SQL → vitest → SQL simulation → ask user)
- CONTENT-RULES.md: authoritative chain/pool placement rules (+ Rule 11 for conv nodes)
- GAP-ANALYSIS.md: Day 0-14 coverage matrix, collision map, preclusion status
- CHAIN-MAP.md, ENGINE-SPEC.md, CONTENT-INVENTORY.md
- Content creator agent (3-stage pipeline)
- 5 Claude Code skills: `/new-storylet`, `/audit-content`, `/new-npc`, `/new-mini-game`, `/sync-board`

---

## What's In Progress

- **Phase 1 playtest (P1.6)** — Skill queue built and deployed. Needs 7–10 real days with 2 testers. Set `NEXT_PUBLIC_SKILL_TIME_SCALE=0.01` in Vercel env vars for compressed testing.
- **Phase 2 playtest (P2.4)** — Skills wired into storylets: 5 retrofits, diegetic practice hook, Content Studio controls. Set `PRACTICE_CREDIT_SECONDS` env var to tune practice credit (default 900 = 15 min). Awaiting playtest.
- **Phase 4 playtest (P4.5)** — Routine-week mode built. Needs browser testing at Day 7+ to confirm weekly calendar loads, schedule commit works, deposits apply, and interruptions fire.
- **Conversational nodes playtest (T-1776329281008)** — PASSED. lunch_floor conv-nodes work. All 3 paths (Doug ally, Keith defender, Observer) tested. Flag-gating on terminal choices works. Gate passed: "conversation not friction." Week 2 content unblocked.

---

## What's Next (probable, pending review)

### Immediate (post-refactor stabilization)
0. **Playtest confirmation** — `f6c65aa` was user-verified through Day 5+ this session; `b24b301` (server-authoritative day_index on `/api/tracks/resolve`) ships on top but wasn't independently playtested. Next session: reset + play through Day 7+ again, confirm routine mode activation on Day 3 (`ROUTINE_MODE_START_DAY = 3`) doesn't surface the old interruption-loop symptoms.
0a. **Step 7 cleanup** (~1–1.5h, medium risk) — replace ~10 `setDailyState({...dailyState, X})` mid-session mutations in `play/page.tsx` with `queryClient.invalidateQueries` after server mutation. See Known Issue #19 and the "Time-Architecture Invariants" section for context.
0b. **Step 8 cleanup** (~30 min, low risk, depends on 0a) — delete `dayIndexState` / `dayStateRef` / `refreshTick` once React Query is the sole client-side source of truth. See Known Issue #20.

### Immediate (playtesting)
1. **Playtest Day 0 → Day 7+** — full walkthrough confirming: morning-after scenes, day advancement, skill queue, routine-week mode activation
2. **Phase 3 (Daily Harvest) — continue:** schema + 28 templates shipped 2026-04-19. Next: P3.3 login flow caller (T-1776329281038), P3.4 weak real-date texture (T-1776329281039), P3.5 90-second feel playtest (T-1776329281040). Authoring 2 more templates to hit 30 is a small content top-up, not a blocker.
3. **Merge `time_skill` branch to `main`** — all phases 1-4 are on this branch

### Next milestone work (Milestone B — "It Squeezes")
4. **Map remaining Arc One storylets** — gap analysis for Days 4-14 (Days 2-3 now filled)
5. ~~**Build Day 2-3 content**~~ — DONE 2026-04-20 (`20260420200000_days_2_3_content.sql`, +10 storylets)
6. **Implement runtime preclusion** — walk precludes field, permanently lock out storylets
7. **Fill opportunity and home tracks** — at least one entry storylet each
8. **Build batch content validator** — CLI script for schema/NPC/period checks
9. **Fix bench_glenn / Contact scene** — deleted as orphan, needs design decision on when/where it fires
10. **Playtest Day 2-3 flow** — walk the new content in the browser, confirm pool scan serves the right storylet per segment; verify `skipped_reading` flag properly gates `catch_up_or_coast`

---

## Recent Decisions

| Date | Decision | Context |
|------|----------|---------|
| 2026-04-24 | **Period-stance infrastructure + identity selection shipped on `feature/period-stance-infrastructure` (uncommitted)** | Implements all 7 steps of `docs/specs/CODE-SPEC-period-stance-infrastructure.md`. Identity columns on `characters` (race / gender / sexuality, default `unspecified`). Character-creation UI step. Hybrid storage for `period_stance`: counter JSONB on `daily_states.period_stance_state` + temporal `PERIOD_STANCE` events on `choice_log`. Conditional `events_emitted` groups (first-match-wins). DialogueNode `text_variants` + MicroChoice `label_variants`. Three new node-condition predicates (`identity`, `period_stance`, `prior_period_stance`) — all ANDed with the existing flag/all_flags/npc_memory predicates via a central evaluator at `src/lib/nodeConditions.ts`. Four new playthrough-runner script steps (`set_identity`, `expect_period_stance`, `expect_walk_flag`, `expect_prior_period_stance`) plus harness parity writes on `chooseNode`. 36 new tests (7+9+15+5), 231 total green. `tsc --noEmit` clean. §7 schema-discovery answers captured in `docs/specs/CODE-SPEC-period-stance-infrastructure-DECISIONS.md`. **Branch does not merge** until content briefs land and the Week 2 friction beat wires as an integration playthrough. |
| 2026-04-24 | **Gate 0 playtest fixes — 10 items across P1/P2/P3** (`ad97554` + follow-up) | P1.1 optimistic UI flip (track-storylet choice handler reorders state updates ahead of `updateRelationships` network round-trip; pending + unresolved render consolidated into one array so cards keep position across resolve→outcome without a remount blink). P1.2 serialized multi-beat segments (only the first unresolved renders until all resolved, then pending dismissals render together under one collapsed bottom CTA — fixes Anderson-Hall-vs-first_morning contradictory-directions). P1.3 `InterruptionTransitionCard` gated behind new `featureFlags.routineInterruptionCardEnabled` (default false, env `NEXT_PUBLIC_ROUTINE_INTERRUPTION_CARD`). P1.4 two-part fix for `first_morning` + `morning_after_*` conflict: `selectTrackStorylets` chain-override branch now falls through to pool scan when `next_key_override` is in `precludedKeys`, and migration `20260424100000_preclude_first_morning_after_evening_choice.sql` adds `first_morning` to every `evening_choice` option's `precludes`. P1.5 `SegmentTransitionCard` auto-advances after 300ms fade (local `firedRef` + page-level `advanceInFlightRef` guard concurrent advances; Continue button removed). P2.6 new `SkillsNudge` (Day 1 post-first-beat, dismissible localStorage, links to `/skills`). P2.7 new `EarlyBuildBanner` in `(player)/layout.tsx` (dismissible localStorage). P3.8 `room_214` body rewrite — industrial cleaner + fresh carpet + cologne sensory layering; cassette detail moved into the lived-in side. P3.9 `orientation_fair` reactivated as Day 1 afternoon belonging pool storylet ("The Quad, at One") — 4 choices each `sets_flag` (herald, job_board, film_society, walk_through) for downstream Day 2+ consequence gating; skipping is a visible loss. P3.10 pre-game friction statement card on welcome flow — full-screen card between "Begin, September 4th →" and the actual new-game reset, single "Begin" button, no checkbox. |
| 2026-04-23 | **Server-authoritative `day_index` on `/api/tracks/resolve`** (`b24b301`) | Client stops sending `day_index` in the payload; server reads it from `daily_states` at handler top. Kills the stale-cache / multi-tab drift class of bug where `choice_log.day` could be written against the wrong day (the earlier "Day 3 skip" pattern). |
| 2026-04-23 | **Single `/api/time/advance` endpoint + `daily_states` is canonical for segment** (`f6c65aa`) | Migration adds `current_segment` / `hours_remaining` / `hours_committed` to `daily_states`; new endpoint decides internally whether to bump segment or roll day; old `/api/day/advance-segment` and `/api/day/advance-day` deleted. `dailyLoop.ts` reads segment canonical from `daily_states`. `weeklyTick.runWeek` no longer writes `daily_states.day_index` — player's day only advances via sleep. `checkInterruptions` now filters out already-resolved storylets via `resolvedStoryletKeys`. Eliminates the three most painful architecture bugs (Day 0 stuck, multi-beat race, routine interruption loop) by reducing 8 `day_index` writers to 1. |
| 2026-04-23 | **`performSeasonReset` no longer wipes `daily_states` + `CHECK (day_index >= 1)` constraint + dead cadence paths removed** (`0fd818c`) | Season rollover used to auto-set `daily_states.day_index = 0` and zero the stats, which combined with a race on `user_seasons` sync could silently nuke a player's progress mid-session and create phantom day-0 state. Now it only updates `user_seasons`. DB constraint throws loudly if anything writes 0. `lib/cadence.ts` reduced to `utcToday` only (removed `ensureCadenceUpToDate` and `computeDayIndex` — documented as dead but still shipped). `buildResetPayload` removed. |
| 2026-04-23 | **Multi-beat segment dismiss collapsed into single bottom CTA** (`aa062d8`) | When 2+ outcome cards share a segment, per-card Continue is hidden and a single bottom "Continue to {next} →" dismisses all pending and advances atomically. The previous per-card sequence relied on a refetch race to surface the segment-advance button on the last remaining card, which failed inconsistently. |
| 2026-04-22 | **Walk-flag bridge extended to job_board + dana_cereal; vitest env repaired** | Closes Known Issues #13 and #14. Migration `20260422200000_job_board_and_dana_cereal_flag_persistence.sql` applies the tuesday_commitment pattern to the two remaining walk-flag-bridge storylets. `job_board`: single terminal → 4 flag-gated terminals (`has_job_library/dining/grounds/research` now persist, unblocking the Day 10 `first_shift_*` variants). `dana_cereal`: added `dana_cereal_neutral` walk flag to the `no_thanks` micro-choice so every path writes exactly one flag; single terminal → 3 flag-gated terminals (cold persists `dana_cereal_cold`, unblocking `dana_letter_avoidance` on Day 9 evening). SQL flag-path join confirms every persisted flag has a live consumer. Separately, `rm -rf node_modules && npm install` restored missing `vite/dist/client/client.mjs`; full vitest suite now runs green (42 files, 196 passed / 1 skipped). |
| 2026-04-22 | **Cross-track `requires_flag` now resolves (globalFlags union) + `tuesday_commitment` terminal rewrite** | Two coordinated changes. (1) Engine: `dailyLoop.ts` drops the `.in("track_id", trackIds)` filter on its FLAG_SET query and now builds a `globalFlags` set alongside the per-track `flagsByTrack` map. `selectTrackStorylets.ts` unions `globalFlags` onto each track's flag set before `meetsRequirements`. This unblocks `the_post` and `tuesday_night_terminal` (opportunity track, `requires_flag: tuesday_terminal`) and the other two Week 2 tuesday_night variants (`tuesday_night_shift` on money, `tuesday_night_dana_movie` on roommate) which all gate on flags set by `tuesday_commitment` (belonging). (2) Content: `20260422100000_tuesday_commitment_flag_persistence.sql` — `tuesday_commitment`'s single terminal `tuesday_decided` is replaced with four walk-flag-gated terminals (`tuesday_decided_study/terminal/shift/movie`), each carrying `requires_flag` (so `DialogueNodeView` shows the right one) AND persistent `sets_flag` (so the downstream storylet gate fires). Same migration also wires `introduces_npc` for Bryce (`evening_choice`) and Peterson (`morning_after_cards`) — closes Known Issue #5. |
| 2026-04-20 | **Days 2-3 content shipped (+10 storylets)** | `20260420200000_days_2_3_content.sql` adds 5 academic (western_civ_day1, reading_or_lounge, second_morning_class, study_group_forming, catch_up_or_coast), 3 belonging (floor_lunch_day2, hallway_morning_day3, miguel_afternoon_day3), 1 money (bookstore_line), 1 roommate (roommate_evening_day3). All pool-mode (default_next_key NULL). 8 use conversational nodes; 2 (reading_or_lounge, catch_up_or_coast) are body+choices only. `catch_up_or_coast` pool-gated by `requires_flag: "skipped_reading"` (set by `reading_or_lounge` on the lounge path) — first content usage of Phase 2 requires_flag enforcement. `roommate_moment` (Day 3 evening placeholder) kept inactive — superseded by new `roommate_evening_day3`. Karen introduced in `bookstore_line` via choice-level event, not `introduces_npc` (she appears conditionally). |
| 2026-04-20 | **Dana→Scott regression re-patched; dorm_roommate deleted** | 2026-04-17 rename migration only updated `body` and `choices`, leaving `nodes` untouched, and missed `tuesday_night_terminal` (choices only). Follow-up migration `20260420100000_fix_dana_scott_regression_and_cleanup.sql` scrubs all three columns on the six affected storylets. `dorm_roommate` (inactive, same Day 0 morning slot as active `room_214`) deleted after verifying no inbound references. `hall_morning`, `orientation_fair`, `cal_midnight_knock`, `roommate_moment` audited and kept (all orphaned; comment in migration file). Known Issue #12 closed. |
| 2026-04-19 | **Arc-scoped flag table (`player_arc_flags`) added for harvest traces** | Existing `sets_flag` writes to `choice_log` with a `track_id` — track-scoped. Harvest trace flags (`saw_trace_*`) need to persist across tracks and into Arc Two for compound reveal checks. Rather than overload `choice_log`, added `player_arc_flags` (player_id, flag_name, source_slug, set_at). `draw_harvest_item()` writes to it; the existing track FLAG_SET path is untouched. Future arc-scope flags (non-harvest) should use this table too. |
| 2026-04-19 | **Phase 3 Harvest Pool infra shipped (schema + 28 templates)** | `harvest_items`, `harvest_seen`, `player_arc_flags` tables + `draw_harvest_item()` SQL function. 28 items (8 dreams, 6 letters, 14 usenet — 8 texture + 6 terminal-gated traces). Login-flow caller, UI, and Usenet slot explicitly NOT built yet (P3.3 / P3.4 work). Migration ran clean, no schema conflicts. P3.2 ticket originally specified 30 templates; draft only contained 28 — not a blocker, flagged on ticket. |
| 2026-04-17 | **scott_day2_morning: npc_memory conditions on dialogue nodes** | Extended `DialogueNode.condition` to support `npc_memory` checks (format: `"npc_id.key"`). Entry nodes branch on NPC memory from prior storylets. Used Option A (single storylet with router-style fallthrough) over Option C (three pool variants) — cleaner, no pool gating issues, forward-looking for future conditional content. Terminal choice gating uses `scott_engaged` walk flag as fallback for unsupported `requires_flag_mode:"any"`. `read_scotts_note` persisted via `sets_flag` for future Day 4-5 callback. Room_214 retrofitted with `played_cool` NPC memory on non-warm paths. |
| 2026-04-17 | **Runtime preclusion + requires_flag enforcement (T-016)** | `meetsRequirements()` now enforces `requires_flag` (track-scoped, stored as FLAG_SET events in choice_log). Preclusion writes to `daily_states.preclusion_gates` (cross-track, per-run). Pool scan filters precluded keys. Evening_choice phantom precludes fixed. Glenn chain wired with `sets_flag`. 37 unit tests, all 209 tests pass. |
| 2026-04-17 | **Gap analysis completed (T-006)** | 30 active storylets across all 6 tracks (was reported as 10+). Coverage matrix at `docs/GAP-ANALYSIS.md`. Critical: Days 2-3 empty, home track has 1 storylet, Dana/Scott naming regression in 5 storylets. 30% inaccessibility achievable with 4 fork points once content fills gaps. |
| 2026-04-17 | **Auto-advance timer removed; segment transitions are explicit clicks** | The 400ms setTimeout auto-advance effect fired with state captured at render time (stale closure). After dismiss+advance merged click, the timer raced against the advance-segment POST, causing segment cascades (morning → afternoon → evening → night in ~1 second, skipping lunch_floor). Fixed via: (1) `resolvedTrackStoryletIds` tracks `storylet_key` not `progress_id`, (2) `advanceInFlightRef` guards concurrent `handleAdvanceSegment` calls, (3) auto-advance useEffect deleted entirely. SegmentTransitionCard handles empty segments with an explicit click. Playwright integration test added to guard against regression. |
| 2026-04-12 | **Day advancement is exclusively sleep-driven** | `ensureCadenceUpToDate` (wall-clock) removed entirely. Day advances only when player clicks sleep. No "catch up" after absence. If a player is away 3 days, they return to the day they last slept on. Correct for narrative game. |
| 2026-04-12 | **Server-authoritative day lifecycle invariant** | Only `/api/day/advance-segment` and `/api/day/advance-day` may write to `daily_states.day_index` or `player_day_state.current_segment`. Conditional UPDATEs for concurrency. No hand-rolled optimistic updates on client. |
| 2026-04-12 | **Phase 4 routine-week mode built** | 3 new tables, 6 seeded activities, WeeklyCalendar UI, deposit system, interruption triggers. Activates at Day 7. 2 NPCs added: Spider, Karen. |
| 2026-04-12 | **5 day-advancement bugs fixed** | Infinite loop, choice_log 400, sleep not advancing, blank screen, missing day state. All structural — caused by scattered client-side day mutations. Refactor prevents recurrence. |
| 2026-04-11 | **Phase 2 skills-in-storylets built** | 5 storylets retrofitted with skill gates/modifiers/practice credits. Diegetic practice hook accelerates active training. Audit table for tuning. Content Studio updated with 3 skill controls. No Herald storylet — substituted money_reality_check. |
| 2026-04-10 | **Phase 1 skill queue built** | 10 Tier 1 skills, real-time wall-clock queue (1 active + 1 queued), lazy tick on fetch, /skills page added to player nav. Skills standalone — no storylet impact yet. Branch: `time_skill`. |
| 2026-04-03 | **hall_morning deactivated** | Ungated pool storylet was beating gated morning-after variants. Fix: disable it; pool scan now only serves the correct choice-gated variant. |
| 2026-04-03 | **Testing process: 4-tier, no browser automation** | Claude Code cannot reliably run browser playtests (auth, PATH, Chrome MCP issues). Process: Tier 1 SQL verification → Tier 2 vitest → Tier 3 SQL simulation → Tier 4 ask user. Added to CLAUDE.md. |
| 2026-04-02 | **evening_choice.default_next_key set to NULL** | Was pointing to hall_morning, which made it a chain (bypassing pool scan). Set to NULL so pool scan finds morning-after variants via requires_choice. |
| 2026-04-02 | **Pool-based morning-after storylets added** | Three belonging track pool storylets gated by requires_choice (go_to_party/cards/union). First use of pool mode in the game. |
| 2026-04-02 | **bench_glenn deleted** | Orphaned storylet with no track_id and no chain references. Contact scene needs complete redesign before re-adding. |
| 2026-04-01 | **Day 1 content added** | first_morning (roommate), hall_morning (belonging — later superseded), advisor_visit (academic). Extended all three tracks to Day 1. |
| 2026-03-31 | Game opens in dorm not quad. Orientation is Days 0-3 before classes. |
| 2026-03-31 | Obsidian vault = design brain; repo = built content. claude.ai = PM. |
| 2026-03-24 | Terminology unified: streams/arcs → Tracks, beats/steps → Storylets. |

---

## Engine Model (quick reference)

### Two selection modes
1. **Chain mode**: storylet served via `next_key_override` on `track_progress`. Set when a prior storylet's choice has `next_key` or the storylet has `default_next_key`.
2. **Pool mode**: storylet served via pool scan when `next_key_override` is NULL. Filtered by: is_active, due_offset_days window, segment, `meetsRequirements()` (requires_choice, requires_skill).

### Day lifecycle (post-2026-04-23 refactor, server-authoritative)
- **Single endpoint:** `POST /api/time/advance` — decides internally whether this is a segment bump or a day rollover based on `daily_states.(current_segment, hours_remaining)`. Conditional UPDATEs prevent double-advance. Returns 409 on race. Replaced the former `/api/day/advance-segment` + `/api/day/advance-day` split (both deleted).
- **Single source of truth:** `daily_states` row (one per user) holds `day_index`, `current_segment`, `hours_remaining`, `hours_committed`. `player_day_state` is now a historical per-day log for stats; segment info is derived from `daily_states`.
- **DB invariant:** `CHECK (day_index >= 1)` on `daily_states` — any code that attempts to write 0 fails loudly.
- **`getOrCreateDailyRun()` in `dailyLoop.ts` is read-only** — never writes to day_index or current_segment.
- **`weeklyTick.runWeek` does not write `daily_states.day_index`.** The routine tick tracks abstract week progression via `routine_week_state.current_week_day` and applies deposits; the player's canonical day advances only when they sleep.
- **`performSeasonReset` does not write `daily_states`.** Season rollover preserves progress; only `user_seasons` is updated.
- Day advancement is sleep-driven only. No wall-clock catch-up.

### Key constraint: CONTENT-RULES.md
A storylet is **either chained OR pooled**. Never both. If anything chains to it, the pool will never reach it. See `docs/CONTENT-RULES.md` for the full 10-rule spec.

### ENGINE-SPEC.md accuracy note
**Refreshed 2026-04-22.** `docs/ENGINE-SPEC.md` §2 "requirements" now documents the current `meetsRequirements()` behaviour (requires_choice, requires_flag, requires_skill) and the cross-track `globalFlags` union added this session. §1 step 3 also rewritten to describe the pool scan properly. §9 (Conversational Node Walk / Invariants) distinguishes storylet-level `requires_flag` from choice-level walk-local `requires_flag`.

---

## Time-Architecture Invariants & Diagnostic Patterns (post-2026-04-23)

**This section is load-bearing for future debugging. It documents the invariants established by the 2026-04-23 refactor and the recurring bug patterns we fixed, so they can be recognised fast if something similar resurfaces.**

### Invariants (what MUST hold; violations are bugs)

1. **`daily_states` is the single source of truth for current time.** The one row per user answers "what day / segment / hours is the player on right now?" via `(day_index, current_segment, hours_remaining, hours_committed)`. Anything that reads time from `player_day_state` for the "current" (not historical) state is a bug.
2. **`/api/time/advance` is the only code path that writes `daily_states.day_index` or `current_segment` during normal play.** Dev/admin reset endpoints are the only other legitimate writers. If you find a new writer, it's probably the cause of whatever bug you're chasing.
3. **`daily_states.day_index >= 1` always.** Enforced by a CHECK constraint. If you see day 0 anywhere, the constraint has been bypassed (shouldn't be possible) or the bug is in how something reads `day_index` from a different table.
4. **`weeklyTick.runWeek` does NOT write `daily_states`.** Routine tick tracks internal progress in `routine_week_state`. The player's canonical day advances only via sleep (`/api/time/advance`).
5. **`performSeasonReset` does NOT write `daily_states`.** Season rollover only syncs `user_seasons`. Progress is preserved across season changes.
6. **`/api/tracks/resolve` ignores any `day_index` in the request body.** Server reads it from `daily_states`. Client should not send it; if it does, the value is discarded.
7. **`checkInterruptions` filters out already-resolved storylets** via the `resolvedStoryletKeys` parameter. An interruption that keeps re-firing on the same storylet is either (a) a resolved storylet slipping through this filter, or (b) a new storylet that never resolved because resume isn't running.

### Bug patterns this session uncovered (and how to recognise them)

| Symptom | Likely cause | First thing to check |
|---------|-------------|----------------------|
| Player sees "Day 0 Night, 4h, energy 70, stress 20" | Phantom `player_day_state` row from `createDayStateFromPrevious(userId, 0)`; `daily_states.day_index` was 0 at some moment | `SELECT day_index FROM daily_states WHERE user_id=X` — should be ≥1. If you see day-0 rows in `player_day_state`, something wrote `daily_states.day_index = 0`. |
| Sleep button appears to loop (each click shows another "Day N Night, 4h, Sleep?") | Player had multiple `player_day_state` rows with `current_segment='night'` from prior session's segment advances; each sleep bumps day_index and shows the next saved snapshot | `SELECT day_index, current_segment, hours_remaining FROM player_day_state WHERE user_id=X ORDER BY day_index` |
| Two resolved outcome cards, each with plain "Continue", clicking either doesn't advance segment | Multi-beat dismiss race (the pre-`aa062d8` bug pattern). The single bottom CTA should render when `allResolved && canAdvance`. | Check `pendingDismissalBeats` length and `trackStorylets.every(resolved)` evaluation in render. |
| Routine interruption keeps re-firing on a storylet the player already resolved | `checkInterruptions` not receiving `resolvedStoryletKeys`, or the keys query is wrong | `SELECT storylet_key FROM routine_week_state WHERE user_id=X` — confirm it matches a key in `track_progress.resolved_storylet_keys` for ANY track. |
| `choice_log.day` entries written against wrong day (e.g. Day 3 skipped, or day bouncing 1→2→3→0→1 in events) | Pre-`b24b301` — client sent stale `day_index` in `/api/tracks/resolve` payload. Shouldn't happen post-refactor, but if it does, check the client isn't somehow falling back to a stale cache. | `SELECT day_index, event_type, ts FROM events WHERE user_id=X ORDER BY ts` — any non-monotonic day_index sequence is a red flag. |
| Game mode / routine state disagrees with day_index | Leftover `routine_week_state` from an old run not cleared on reset, or `ROUTINE_MODE_START_DAY=3` activating when not expected | `SELECT * FROM routine_week_state WHERE user_id=X` — status should be `committed` / `interrupted` / `completed`. If `interrupted` is stuck, check the interruption storylet_key vs `track_progress.resolved_storylet_keys`. |
| Any of the above after a playtest of a pre-deployed branch | Deployment timing. Vercel takes ~1-2 min after push. Stale client bundle from before the fix. | Check: `git log --oneline origin/main`, compare deployment timestamp (`mcp__vercel__list_deployments`) against when the bug was observed. Hard refresh (⌘⇧R) forces new bundle. |

### Debug SQL toolkit (copy-paste for future sessions)

```sql
-- Current state snapshot for one user
SELECT day_index, current_segment, hours_remaining, hours_committed FROM daily_states WHERE user_id='X';
SELECT day_index, current_segment, hours_remaining, energy, stress, resolved_at FROM player_day_state WHERE user_id='X' ORDER BY day_index;
SELECT status, current_week_day, interruption_storylet_key, interruption_reason, deposits_applied_through_day FROM routine_week_state WHERE user_id='X';
SELECT t.key, tp.state, tp.resolved_storylet_keys, tp.next_key_override, tp.updated_day FROM track_progress tp JOIN tracks t ON t.id=tp.track_id WHERE tp.user_id='X' ORDER BY t.key;

-- Client-side day_index drift signal (any non-monotonic sequence is suspect)
SELECT ts, day_index, event_type FROM events WHERE user_id='X' AND day_index IS NOT NULL ORDER BY ts;

-- Choice log ordered by creation — day column should be monotonically non-decreasing
SELECT day, step_key, option_key, created_at FROM choice_log WHERE user_id='X' ORDER BY created_at ASC;

-- Who is the latest active user? (Useful when you don't know the user_id)
SELECT user_id, COUNT(*) AS entries, MAX(created_at) AS latest FROM choice_log GROUP BY user_id ORDER BY latest DESC LIMIT 5;

-- Surgical reset for one user (equivalent to hitting the in-game reset button, minus the UI roundtrip)
-- See src/app/api/run/reset/route.ts for the canonical delete list; keep this query in sync if tables are added.
```

### When adding new time-related writes, remember

- **Don't write `daily_states.day_index` or `current_segment` directly.** Call `/api/time/advance` or use its Postgres-level equivalent (inline the conditional UPDATE pattern). If you need a new advancement semantic, extend `/api/time/advance` rather than adding a parallel writer.
- **Don't write `player_day_state.current_segment` or `hours_remaining`.** The `/api/time/advance` endpoint does this as a backward-compat mirror; new code should treat those fields on `player_day_state` as read-only.
- **Don't trust client-supplied `day_index` in API request bodies.** Read it from `daily_states` server-side.
- **Don't mutate `dailyState` client-side via `setDailyState({...dailyState, X})`.** This is the last remaining anti-pattern (step 7 of the original cleanup plan) — use `queryClient.invalidateQueries` instead. Existing call sites still doing this are a known risk; don't add new ones.

---

## Known Issues

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| 1 | ~~**ENGINE-SPEC.md outdated**~~ | ~~Medium~~ | **FIXED 2026-04-22** — §1, §2, §9 rewritten. Documents current meetsRequirements + cross-track globalFlags. |
| 2 | ~~**CONTENT-INVENTORY.md outdated**~~ | ~~Medium~~ | **FIXED 2026-04-22** — regenerated from live DB (45 active / 4 inactive / 6 tracks / Day 0–14). |
| 3 | ~~**CHAIN-MAP.md outdated**~~ | ~~Medium~~ | **FIXED 2026-04-22** — full rewrite with current wiring, cross-track flag index, pool-scan model. |
| 4 | **Contact scene (Glenn) has no storylet** — bench_glenn deleted, no replacement written | High | NOT a gap anymore — `glenn_pastime_paradise` (Day 0 aft) and `glenn_the_walk` (Day 5 morn) carry the contact thread. Entry `bench_glenn` hook still absent. Reframe or close. |
| 5 | ~~**Bryce and Peterson never formally introduced**~~ | ~~Low~~ | **FIXED 2026-04-22** — `evening_choice.introduces_npc = [npc_anderson_bryce]`, `morning_after_cards.introduces_npc = [npc_floor_peterson]`. |
| 6 | ~~**precludes arrays reference non-existent slugs**~~ | ~~Medium~~ | **FIXED 2026-04-17** — updated to real storylet keys + preclusion engine built |
| 7 | ~~**first_morning.expires_after_days is NULL**~~ | ~~Medium~~ | **FIXED** (in `20260414200000`) — value is 7. Prior HANDOFF entry was stale. Verified by SQL 2026-04-22. |
| 8 | **opportunity and home tracks have 0 storylets** | Low | Now stale — opportunity has 5 (glenn_pastime_paradise, terminal_first_visit, glenn_the_walk, the_post, tuesday_night_terminal); home has 1 (pay_phone_line). Home still sparse; opportunity covered. |
| 9 | **`time_skill` branch not yet merged to `main`** | High | Check: `git branch` shows `main` clean; this session's commits may already be on `main`. Verify merge state. |
| 10 | **Phase 1-4 playtests outstanding** — skill queue, skills-in-storylets, routine-week all built but not playtested | High | Block content work until verified |
| 11 | ~~**`requires_flag` not enforced by engine**~~ | ~~Medium~~ | **FIXED 2026-04-17 (track-scoped), extended 2026-04-22 (cross-track via `globalFlags`)**. |
| 12 | ~~**Dana/Scott naming regression**~~ | ~~Medium~~ | **FIXED 2026-04-20** — `20260420100000_fix_dana_scott_regression_and_cleanup.sql` scrubs all six storylets (body + choices + nodes). |
| 13 | ~~**Remaining `sets_flag` wiring**~~ | ~~Medium~~ | **FIXED 2026-04-22** — `20260422200000_job_board_and_dana_cereal_flag_persistence.sql`. `job_board` now has 4 walk-flag-gated terminals persisting `has_job_{library,dining,grounds,research}` (unblocks Day 10 `first_shift_*`). `dana_cereal` now has 3 walk-flag-gated terminals; cold path persists `dana_cereal_cold` (unblocks `dana_letter_avoidance`). SQL join confirms every persisted flag has a live consumer. |
| 14 | ~~**Vitest environment broken — vite install missing `client.mjs`**~~ | ~~Low~~ | **FIXED 2026-04-22** — `rm -rf node_modules && npm install` restored `client.mjs`. Full suite: 42 files, 196 passed / 1 skipped in ~1.2s. Engine change from prior session now green. |
| 15 | ~~**Multi-beat dismiss race — two plain "Continue" buttons, neither advances segment**~~ | ~~High~~ | **FIXED 2026-04-23** (`aa062d8`) — single bottom CTA when `allResolved`. User-verified. |
| 16 | ~~**Day 0 Night stuck / sleep loops**~~ | ~~High~~ | **FIXED 2026-04-23** (`0fd818c`) — `performSeasonReset` no longer wipes `daily_states`; `CHECK (day_index >= 1)` catches any future regression loudly. |
| 17 | ~~**Routine interruption re-fires on already-resolved storylet**~~ | ~~High~~ | **FIXED 2026-04-23** (`f6c65aa`) — `checkInterruptions` accepts `resolvedStoryletKeys` and `runWeek` passes it in. |
| 18 | ~~**`daily_states.day_index` has 8 writers; `choice_log.day` can drift across tabs**~~ | ~~High~~ | **FIXED 2026-04-23** (`f6c65aa`, `b24b301`) — single `/api/time/advance` endpoint is the sole day-time writer. `/api/tracks/resolve` reads `day_index` server-side; client stops sending it. |
| 19 | **Step 7 cleanup deferred: ~10 `setDailyState({...dailyState, X})` mid-session mutations in `play/page.tsx`** | Medium | NOT DONE 2026-04-23. Mutations silently patch client's cached `daily_states` after storylet resolves (`relationships`, `life_pressure_state`, `skill_flags`, `preclusion_gates` etc.). Replace with `queryClient.invalidateQueries` after server mutation. ~1–1.5h, medium risk (touches ~10 features). |
| 20 | **Step 8 cleanup deferred: delete `dayIndexState` / `dayStateRef` / `refreshTick`** | Low | NOT DONE 2026-04-23. Blocked by #19. Once state is read exclusively from React Query, these fallback/mirror variables are dead weight. ~30 min. |
| 21 | **Allocation path (`saveTimeAllocation`) still writes `hours_committed` / `hours_remaining` to `player_day_state`, not `daily_states`** | Low | Not hit in Chapter One day-by-day play (gated by `featureFlags.resources`). Fold into step 7 cleanup or handle when allocation flow is next touched. Don't forget if routine-week allocation is re-enabled. |

---

## Six Narrative Tracks
1. **Roommate** — Scott, dorm life, first relationships
2. **Academic** — Classes, professors, intellectual growth
3. **Money** — Part-time work, financial pressure
4. **Belonging** — Social groups, identity, fitting in
5. **Opportunity** — Career hints, networking, future seeds
6. **Home** — Family ties, homesickness, independence

---

## Environment Playbook

### Starting a Code session
```
Read TASKS.md and HANDOFF.md. Today I'm working on [specific task].
Before we start, confirm: what's the current state of [relevant area]?
```

### Starting a Cowork session (in MMV Design Brain project)
```
Check your project memory for where we left off.
Today I need to [specific task — write a spec / produce a deck / organize docs].
```

### Starting a claude.ai session
```
[paste this file or describe what you need]
PM check-in: where do things stand and what should I work on next?
```

### Closing ANY session
```
Before we wrap:
1. Update HANDOFF.md with what we did and what's next
2. Log any decisions to docs/DECISIONS.md
3. Update TASKS.md status
4. Flag anything that needs attention in the next session
```

---

## Working Style Notes
Monty's process is exploratory and prototype-driven. He often needs to see something
before knowing what's next. PM approach: short build > look > decide cycles.
Don't over-plan ahead; surface the next 1-2 things and let him react.
Mode varies by day: sometimes builds rough versions, sometimes asks for mockups,
sometimes writes narrative to see if it feels right. Match the energy.

## Other Active Projects
- **ArmsterFlow** — React+Vite+Supabase "pivot kit" teaching tool
- **AmsterFlow** — Older Next.js version, likely superseded
- **Teaching** — MADE program courses, UAE game dev students, "Applied AI" master's course design
