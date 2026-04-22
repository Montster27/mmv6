# MMV Handoff Brief
> Context bridge for claude.ai, Claude Code, and Cowork sessions.
> **Last updated:** 2026-04-22 (vitest env repaired; job_board + dana_cereal walk-flag bridges — Known Issues #13 and #14 closed; 196 tests green)

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
| **belonging** | 14 | 0–14 | dorm_hallmates→lunch_floor→evening_choice (chain), morning_after_* (3 pool), miguel_guitar, priya_dining_hall, doug_coach_story, tuesday_commitment, tuesday_night_study, floor_lunch_day2, hallway_morning_day3, miguel_afternoon_day3 |
| **academic** | 7 | 1–8 | advisor_visit, heller_lecture, western_civ_day1, reading_or_lounge, second_morning_class, study_group_forming, catch_up_or_coast (gated by `skipped_reading` flag) |
| **money** | 8 | 2–14 | money_reality_check, job_board, first_shift_* (4 variants), tuesday_night_shift, bookstore_line |
| **opportunity** | 5 | 0–14 | glenn_pastime_paradise, terminal_first_visit, glenn_the_walk, tuesday_night_terminal, **the_post** (Day 14 afternoon — Delphi Group quiz) |
| **home** | 1 | 7 | pay_phone_line |

### Inactive/Disabled Storylets (4)
hall_morning, roommate_moment (superseded by `roommate_evening_day3`), orientation_fair, cal_midnight_knock. (`dorm_roommate` deleted 2026-04-20 — superseded by `room_214`, identical slot.)

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

### Day lifecycle (server-authoritative)
- `POST /api/day/advance-segment` — advances morning→afternoon→evening. Conditional UPDATE prevents double-advance.
- `POST /api/day/advance-day` — finalizes current day + creates next day state + increments day_index. Conditional UPDATE prevents double-advance.
- `getOrCreateDailyRun()` in `dailyLoop.ts` is **read-only** — never writes to day_index or current_segment.
- Day advancement is sleep-driven only. No wall-clock catch-up.

### Key constraint: CONTENT-RULES.md
A storylet is **either chained OR pooled**. Never both. If anything chains to it, the pool will never reach it. See `docs/CONTENT-RULES.md` for the full 10-rule spec.

### ENGINE-SPEC.md accuracy note
**Refreshed 2026-04-22.** `docs/ENGINE-SPEC.md` §2 "requirements" now documents the current `meetsRequirements()` behaviour (requires_choice, requires_flag, requires_skill) and the cross-track `globalFlags` union added this session. §1 step 3 also rewritten to describe the pool scan properly. §9 (Conversational Node Walk / Invariants) distinguishes storylet-level `requires_flag` from choice-level walk-local `requires_flag`.

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
