# MMV — Task Board

> Last updated: 2026-04-12
> Current milestone: **A — "It Runs"** (complete, awaiting playtest)
> Current branch: `time_skill` (7 commits ahead of main)

---

## Needs Breakdown

> These tasks are too large to tackle as single items. Each needs a design/planning session to decompose into concrete steps before work begins. Pick one, break it down, then move the subtasks into the Backlog.

- [x] **BREAK DOWN: Define three evening event NPCs** — RESOLVED: (1) Caps party down the hall with drinks and girls from Pemberton, (2) Memory card game hangout in Miguel's room with Spider, (3) SUB arcade trip with snake minigame. `Priority: High` `Category: Design`
- [x] **BREAK DOWN: Build mini-game UI framework** — RESOLVED: MiniGameShell wrapper, StoryletChoice.mini_game field, adaptive difficulty tracker, handleChoice integration, 3 game components (snake, caps, memory). `Priority: Medium` `Category: Engine`
- [ ] **BREAK DOWN: Write s_the_contact** — Structurally complex: who is the contact (name, appearance, personality), what are the four directives exactly, how much does he reveal, what's the dialogue/choice tree, how do academic path hints surface, what's the anomaly warning tone. Needs design decisions before prose. `Priority: High` `Category: Content`
- [ ] **BREAK DOWN: Write s_dining_hall** — The biggest single storylet in the game. Introduces multiple new NPCs, three mutually exclusive evening invitations that branch the entire evening. Depends on evening NPC designs. Needs: scene structure, NPC introductions, invitation mechanics, choice architecture. `Priority: High` `Category: Content`
- [ ] **BREAK DOWN: Complete content creation agent** — Multi-part: audit current 3-stage pipeline for gaps, verify schema-reference.md matches current DB schema, run a worked example end-to-end (stage 1→2→3→JSON), fix any issues found, document the workflow. `Priority: Medium` `Category: Tooling`
- [ ] **BREAK DOWN: Map remaining Arc One storylets** — Needs a gap analysis first: audit existing storylets by day/segment/stream, identify holes in coverage, determine collision opportunities, then create individual storylet assignments. Can't be done in one shot. `Priority: Medium` `Category: Content`

---

## Backlog

### Revised Opening Content
- [x] **Revise s1_dorm_wake** — replaced placeholders with real content, gender-corrected, segment + time fields added. `Priority: High` `Category: Content`
- [x] **Write s_quad_reveal** — Gangsta's Paradise hummed on the quad. Mind-spin. Contact (Wren) delivers four directives + anomaly warning. Two choices (ask/listen). Wired into arc_roommate beat 2. `Priority: High` `Category: Content`
- [x] **Write s_the_contact** — MERGED INTO s_quad_reveal. Wren is the contact. Four directives + anomaly warning delivered in quad scene. `Priority: High` `Category: Content`
- [x] **Write s_dining_hall** — EXISTS as s01_dining_first_dinner. Meet Miguel, three seating choices. `Priority: High` `Category: Content`
- [x] **Wire evening events into arc system** — s01_evening_choice in arc_belonging (evening segment). Three choices with mutual preclusion. `Priority: Medium` `Category: Content`

### Evening Events (Day 1 — mutually exclusive)
- [x] **Write s_evening_caps** — Caps party at Cal's. Schlitz, girls from Pemberton, win/lose branching. Lose → "Caps Guy" reputation seed. Hangover Day 2. Precludes cards + SUB. `Priority: High` `Category: Content`
- [x] **Write s_evening_cards** — Card game in Miguel's room. Spider (nickname kid) dominates. Memory mini-game win/lose. Quiet connection path. Precludes caps + SUB. `Priority: High` `Category: Content`
- [x] **Write s_evening_sub** — SUB arcade trip with Brendan's group. Snake mini-game on cabinet. Win → high score initials. Lose → quarters burned, place discovered. Precludes caps + cards. `Priority: High` `Category: Content`
- [x] **Build snake mini-game** — SnakeGame.tsx component. Green phosphor CRT aesthetic, scanlines, vignette. Adaptive difficulty, 2-min timer, WASD/arrows. `Priority: High` `Category: Engine`

### System 2: Content Volume (Milestone B)
- [ ] **Map remaining Arc One storylets** — gaps Days 1-14. Target: 30-40 additional. `Priority: Medium` `Category: Content`
- [ ] **Complete content creation agent** — three-stage pipeline. Run worked example. `Priority: Medium` `Category: Tooling`
- [ ] **Build batch content validator** — CLI script: JSON, schema, NPC names, precludes, period vocab. `Priority: Medium` `Category: Tooling`
- [ ] **Seed Week 2 storylets** — money/job gating, study group, academic pressure. `Priority: Medium` `Category: Content`
- [ ] **Seed Week 3-4 storylets** — dense collisions. Belonging narrows. Opportunities close. `Priority: Medium` `Category: Content`

### System 3: Preclusion Chain (Milestone B)
- [ ] **Implement runtime preclusion** — walk precludes field, permanently lock out storylets. `Priority: Medium` `Category: Engine`
- [ ] **Build preclusion audit view** — Content Studio graph visualization. `Priority: Low` `Category: Tooling`
- [ ] **Verify 30% inaccessibility** — two runs diverge meaningfully. `Priority: Medium` `Category: Testing`

### System 4: Resource Systems (Milestone C)
- [ ] **Implement energy system** — High/Mod/Low. Affects availability and outcomes. `Priority: Medium` `Category: Engine`
- [ ] **Implement money band** — Tight/Okay/Comfortable. Gates and friction. `Priority: Medium` `Category: Engine`
- [ ] **Implement skill flags** — 4 flags, repetition growth, probability modifiers. `Priority: Medium` `Category: Engine`
- [ ] **Verify ambient feel** — no spreadsheet management — ambient pressure only. `Priority: Medium` `Category: Testing`

### System 5: NPC Relational Engine (Milestone D)
- [ ] **Build NPC state reader** — check NPC state when deciding presentation. `Priority: Medium` `Category: Engine`
- [ ] **Implement NPC initiative decay** — repeated deferrals → stop initiating. `Priority: Medium` `Category: Engine`
- [ ] **Write Dana tone variants** — 3+ tones based on relational state. `Priority: Medium` `Category: Content`
- [ ] **Write Miguel tone variants** — 2+ approaches based on reliability. `Priority: Medium` `Category: Content`

### System 6: Reflection Engine (Milestone E)
- [ ] **Design reflection data model** — inputs, outputs, prose templates. `Priority: Low` `Category: Design`
- [ ] **Build reflection generator** — reads all state, produces narrative summary. `Priority: Low` `Category: Engine`
- [ ] **Write reflection prose templates** — literary quality. `Priority: Low` `Category: Content`

### System 7: Replay System (Milestone F)
- [ ] **Design replay intention mechanics** — bias → gameplay nudges. `Priority: Low` `Category: Design`
- [ ] **Build replay bias applier** — weighting, availability, sensitivity. Subtle. `Priority: Low` `Category: Engine`

### Mini-Game Framework (Milestone B-C)
- [x] **Build mini-game UI framework** — MiniGameShell wrapper, lazy-loaded game components, handleChoice integration. `Priority: Medium` `Category: Engine`
- [x] **Build difficulty tracker** — session-level wins/losses per type. Adjusts 0.2–0.9. `Priority: Medium` `Category: Engine`
- [x] **Build memory card mini-game** — flip pairs. Adaptive grid (4×3→5×4), timer, miss limit. `Priority: Medium` `Category: Engine`
- [x] **Build caps mini-game** — timing meter, 5 rounds, sweet spot shrinks with difficulty. `Priority: Medium` `Category: Engine`
- [x] **Add mini_game field to StoryletChoice** — type + config, wired into play page. `Priority: Medium` `Category: Engine`
- [ ] **Build sorting mini-game** — categorize under pressure. Difficulty: speed, categories, swaps. `Priority: Medium` `Category: Engine`
- [ ] **Commission mini-game art assets** — caps sprites (bottle, cap, flick anim), memory card back, towel texture. `Priority: Low` `Category: Art`

### Stream & Schema Updates
- [ ] **Add "Echoes" stream** — 7th stream for time-travel content. `Priority: Medium` `Category: Design`
- [ ] **Wire evening three-way preclusion** — cards precludes caps + SUB, etc. `Priority: Medium` `Category: Content`

### Time Model — Phased Rollout (decided 2026-04-10)
> Load-bearing system. Five phases, each independently playtestable. Critical path: 1 → 2 → 4 → 5, with 3 in parallel to 2.

**Phase 1 — Skill Queue, Standalone** `Priority: High`
- [x] **P1.1 Sandbox subset of skills** — 10 Tier 1 skills seeded: critical_analysis, close_reading, active_listening, small_talk, running_endurance, manual_dexterity, creative_writing, musical_ear, tool_proficiency, budgeting. `Category: Design`
- [x] **P1.2 Placeholder parabolic curve** — `src/core/skills/curve.ts`. Tier 1=4h, Tier 2=24h, Tier 3=168h. `NEXT_PUBLIC_SKILL_TIME_SCALE` env var for compression. `Category: Design`
- [x] **P1.3 Build skill queue engine** — `src/core/skills/queue.ts`. Pure functions: startTraining, queueNext, tick, cancelQueued. DB-level partial unique indexes enforce 1 active + 1 queued. `Category: Engine`
- [x] **P1.4 Login queue-check UI** — `SkillQueueCheck` component. Shows completed skills, active countdown, queued skill, skill picker grouped by domain. `Category: UI`
- [x] **P1.5 Character sheet: trained skills display** — `SkillsPanel` component + `/skills` page in player nav. Read-only trained list + live training countdown. `Category: UI`
- [ ] **P1.6 Playtest — does the queue produce the daily-ritual pull?** 7–10 real days, 2 testers. `Category: Testing`

**Phase 2 — Skills Matter in Storylets** `Priority: High`
- [x] **P2.1 Wire skills into storylet resolver** — `meetsRequirements()` checks `requires_skill` (storylet-level pool gating). `dailyLoop.ts` filters choices by `requires_skill` (choice-level hiding) and swaps `reaction_text` with `reaction_with_skill` when `skill_modifier` matches trained skills. `selectTrackStorylets` accepts `trainedSkillIds` param. `Category: Engine`
- [x] **P2.2 Retrofit 5 Week 1-2 storylets** — glenn_pastime_paradise (musical_ear modifier), lunch_floor (small_talk modifier + practice), heller_lecture (critical_analysis gated choice + practice), evening_choice (active_listening modifier + practice), money_reality_check (budgeting modifier + practice). No Herald/writing storylet exists — substituted money track. `Category: Content`
- [x] **P2.3 Diegetic-practice hook** — `tickPracticeCredit()` in `src/core/skills/practice.ts`. Subtracts `PRACTICE_CREDIT_SECONDS` (env var, default 900s = 15min) from active training skill's `completes_at`. Only accelerates currently active skill. Audit log: `skill_practice_events` table. Called from resolve route after choice processing. `Category: Engine`
- [ ] **P2.4 Playtest — do skills visibly matter, does the unification feel like one system?** `Category: Testing`

**Phase 3 — Daily Harvest (Bare Version)** `Priority: High`
> Runs in parallel to Phase 2 if writing bandwidth allows.
- [ ] **P3.1 Harvest pool schema + infra** — tagged templates, era/state filtering, one-per-login, no debt. `Category: Engine`
- [ ] **P3.2 First 30 harvest templates** — Claude drafts via three-stage pipeline, Monty edits. Mix of dream fragments, letters from home, Usenet posts, floor-phone messages. Voice-setting batch. `Category: Content`
- [ ] **P3.3 Login flow: queue check → harvest → optional play button** `Category: UI`
- [ ] **P3.4 Weak-version real-date texture** — harvest pool filters on real calendar month. `Category: Engine`
- [ ] **P3.5 Playtest — does a 90-second login feel like a visit or a chore?** `Category: Testing`

**Phase 4 — Routine-Week Mode (MVP)** `Priority: High`
- [x] **P4.1 Activity menu system** — 6 standing activities authored for Week 2 as test bed. `routine_activities` table + seed data. `Category: Engine`
- [x] **P4.2 Weekly time budget + per-activity deposit math** — `player_routine_schedules` table, deposit system (skill XP, energy, money effects). `Category: Engine`
- [x] **P4.3 Interruption system** — three triggers: gate threshold trips, calendar beats, NPC patience timers. `routine_week_state` table with status enum. `Category: Engine`
- [x] **P4.4 UI mode switch** — WeeklyCalendar component, activates at day_index >= 7. `Category: UI`
- [ ] **P4.5 Playtest — does routine mode feel like texture or a cutscene?** High risk phase — be ready to pause if it feels hollow. `Category: Testing`

**Phase 5 — Curve Tuning + Resource Integration** `Priority: Medium`
- [ ] **P5.1 Tune parabolic curve** with real playtest data from P1–P4. `Category: Design`
- [ ] **P5.2 Integrate energy + money bands** into routine-week schedules. `Category: Engine`
- [ ] **P5.3 Divergence verification** — study-heavy vs social-heavy Week 3 produce meaningfully different outputs. `Category: Testing`
- [ ] **P5.4 Montage/elision tier at chapter seams** — prose template between arcs. `Category: Content`
- [ ] **P5.5 Absence guardrail test** — 10-day disappearance returns to welcome, not scolding. `Category: Testing`

**Explicitly deferred past Phase 5:** Usenet multiplayer backbone, sync events + proxy, strong-version real-date events, life-experience/romance content layer, 50-year arc map. All live in the Brainstorm Queue below.

### Deferred — Brainstorm Queue (pre-build design work)
> Items identified as needing design resolution before implementation. Do NOT build until brainstormed and specced.

- [ ] **BRAINSTORM: Low-stakes "life experience" content layer** — optional scripted content (romance tracks, life vignettes) for players who want more scripted texture without meaningful mechanical impact. Open questions: coexistence with crystallizer model without diluting preclusion; authorship; procedural-with-variables vs bespoke; opt-out gating; feeds harvest pool or lives separately. `Priority: Medium` `Category: Design`
- [ ] **BRAINSTORM: Optional romance track design** — tied to above but distinct. Romance as opt-in scripted arc rather than emergent crystallizer. Interaction with crystallizer streams. Shared vs dedicated NPCs. Multiplayer implications. `Priority: Medium` `Category: Design`
- [ ] **BRAINSTORM: Medium-version diegetic/real-time compression** — compression ratio (e.g. 1 real day = 1 diegetic routine-week) between authored beats. Architecture should support turning on later even if weak version ships first. `Priority: Medium` `Category: Design`
- [ ] **BRAINSTORM: Strong-version real-date events** — post-launch. Once-a-year in-game events pegged to real dates (e.g. NYE 1983/84 on real Dec 31). Only works with active playerbase. `Priority: Low` `Category: Design`
- [ ] **BRAINSTORM: Sync multiplayer events + proxy system** — later-dev. Scheduled events require players online OR designate a proxy. Open questions: proxy consent, permissions, in-fiction feel, abuse prevention. `Priority: Low` `Category: Design`
- [ ] **BRAINSTORM: Usenet as async multiplayer backbone** — DECIDED as primary async connection layer. Needs spec: post propagation between players, board structure, Knower discovery through traces, moderation, NPC/player post mixing. `Priority: Medium` `Category: Design`
- [ ] **BRAINSTORM: Five-minute login UX flow** — worth trying. Needs prototype spec: exact sequence, always-present vs conditional content, first-login-of-day vs subsequent, mobile vs desktop. `Priority: Medium` `Category: Design`
- [ ] **BRAINSTORM: Parabolic skill cost curve** — mathematical spec. Tier 1 (114 base) cheap and fast (~4 real hours fastest). Tier 2 (25 composites) noticeably harder. Tier 3 (8 masters) near-impossible single-run. Curve shape, real-time ranges, interaction with diegetic practice. `Priority: High` `Category: Design`
- [ ] **BRAINSTORM: 50-year arc map at chapter resolution** — high-level map of authored density across 5 chapters × ~10 years each. Where are collision stretches, routine+montage stretches, crystallizers. `Priority: Medium` `Category: Design`

---

## In Progress

- **P1.6 Playtest** — Skill queue awaiting 7-10 day real-time test with 2 testers
- **P2.4 Playtest** — Skills-in-storylets awaiting browser test
- **P4.5 Playtest** — Routine-week mode awaiting browser test at Day 7+
- **Merge `time_skill` to `main`** — after playtests pass

---

## Done

### Dev Workflow
- [x] **Set up .claude/settings.json** — git/bash allowlist + git push. `Category: Tooling`
- [x] **Add .claude/ to .gitignore** `Category: Tooling`
- [x] **Create CLAUDE.md** — project brain for Claude Code. `Category: Tooling`
- [x] **Create TASKS.md** — kanban task board. `Category: Tooling`
- [x] **Create dashboard.html** — visual kanban board with click-to-move. `Category: Tooling`
- [x] **Scaffold content creation agent** — three-stage pipeline in agents/content-creator/. `Category: Tooling`
- [x] **Create 5 Claude Code skills** — `/new-storylet`, `/audit-content`, `/new-npc`, `/new-mini-game`, `/sync-board`. `Category: Tooling`

### Content (Existing)
- [x] **16 production storylets** — across 6 streams with full schema. `Category: Content`
- [x] **5 named NPCs established** — Dana, Miguel, Professor Marsh, Karen Szymanski, Pat. `Category: Content`
- [x] **6 named locations** — Caldwell 212, Dining Commons, Quad, Whitmore 101, Union 204, Sal's. `Category: Content`

### Content Studio
- [x] **Stream Collision View** — storylet-vs-stream matrix. `Category: Tooling`
- [x] **NPC Registry page** — 5 data sources, expandable cards. `Category: Tooling`
- [x] **Preview Simulator** — full state tracking, tabbed panel. `Category: Tooling`
- [x] **Choice Editor upgrade** — Identity/Narrative/NPC panels. `Category: Tooling`
- [x] **NPC name-leak audit** — migrations 0118-0120. `Category: Content`
- [x] **Arc creation + graph arc grouping** — Content Studio arc management. `Category: Tooling`

### Design
- [x] **Three-layer system architecture** — Scarcity → Tradeoffs → Consequences. `Category: Design`
- [x] **Pillar Bible framework** — 6 tensions, 3 modes each. `Category: Design`
- [x] **Chapter structure** — college through 55+. `Category: Design`
- [x] **Strategic overview** — 7 systems, 6 milestones, 5 risks, ship criteria. `Category: Design`
- [x] **Revised opening analysis** — time travel as frame, task breakdown. `Category: Design`
- [x] **Mini-game system defined** — spec in docs/MINI_GAME_DESIGN.md. `Category: Design`
- [x] **Reveal song chosen** — Gangsta's Paradise (1995). Never named in scene. `Category: Design`
- [x] **Contact character defined** — spec in docs/CONTACT_AND_REVEAL.md. `Category: Design`
- [x] **Anomaly rule established** — "History rhymes but doesn't repeat." In docs/CONTACT_AND_REVEAL.md. `Category: Design`

### System 1: Game Loop (Milestone A) — Engine
- [x] **Build the day engine** — `src/core/engine/dailyLoop.ts`. `Category: Engine`
- [x] **Build state manager** — Client + Server + Core state management. `Category: Engine`
- [x] **Build storylet availability resolver** — `src/core/storylets/selectStorylets.ts`. `Category: Engine`
- [x] **Build consequence applier** — `src/core/engine/applyOutcome.ts`. `Category: Engine`
- [x] **Connect to Supabase** — storylets from DB, player state to daily_states + storylet_runs + arc_instances. `Category: Engine`

### System 1: Game Loop (Milestone A) — Features
- [x] **Save system** — daily state, storylet runs, arc instances all persisted. Merged PR #25. `Category: Engine`
- [x] **Welcome / new game screen** — checks for existing progress, offers new game or continue. `Category: Engine`
- [x] **NPC name resolution** — introduces_npc + getDisplayBody(). Registry in src/domain/npcs/registry.ts. `Category: Engine`
- [x] **Arc system unified** — arc_steps merged into storylets as single data model + single editor. `Category: Engine`
- [x] **JSON content pipeline** — src/core/storylets/ loads and processes storylet content. `Category: Engine`
- [x] **80s preppy design system** — navy/cream/coral/mint theme. `Category: UI`
- [x] **Storylet UX polish** — progress dots, card buttons, delta chips, fade transitions, reaction text. `Category: UI`
- [x] **Segment bridge text** — src/lib/segmentBridge.ts — procedural transition flavor text. `Category: Engine`

### System 1: Time System (merged to main via PR #26)
- [x] **Phase 1 — segment state + time budget** — DevMenu control, segment tracking. `Category: Engine`
- [x] **Phase 2 — segment-gated beat selection** — beats filtered by segment + Sleep card. `Category: Engine`
- [x] **Phase 3 — allocation budget, conflict beats, DaySummaryCard** — time allocation enforced, competing beats, end-of-day summary. `Category: Engine`
- [x] **SegmentTransitionCard** — day no longer ends after first beat. `Category: Engine`

### Gender & NPC Audit
- [x] **Gender audit — Dana (roommate)** — fixed remaining she/her → he/him in all migrations, TS code, docs, exemplars. Dana is male per men's dorm rule. `Category: Content`
- [x] **Gender audit — Sandra → Scott (RA)** — renamed NPC from npc_ra_sandra to npc_ra_scott. Fixed all pronouns, descriptions, NPC ID references across TS, migrations, docs, agent content. RA is male per men's dorm rule. `Category: Content`
- [x] **Anomaly rule added to CLAUDE.md** — gender rule clarified: dorm + RA male, women exist on campus (Priya, etc.). `Category: Tooling`

### Mini-Game Framework (built 2026-03-23)
- [x] **MiniGameShell component** — generic wrapper with lazy-loading, difficulty tracking, result display. `Category: Engine`
- [x] **MiniGameProps contract** — `{ onComplete, difficulty, config? }` standard for all games. `Category: Engine`
- [x] **StoryletChoice.mini_game field** — `{ type: MiniGameType, config? }` added to types. `Category: Engine`
- [x] **handleChoice integration** — intercepts choices with mini_game, shows game, resumes flow on complete. `Category: Engine`
- [x] **CapsGame component** — timing meter, Schlitz bottles, 5 rounds, adaptive sweet spot. `Category: Engine`
- [x] **MemoryCardGame component** — pair matching, adaptive grid/timer/miss limit, playing card aesthetic. `Category: Engine`
- [x] **Adaptive difficulty tracker** — session-level win/loss per game type, clamped 0.2–0.9. `Category: Engine`

### Evening Event Storylets (drafted 2026-03-23)
- [x] **s_evening_caps prose** — 3 choices × win/lose reactions. Caps rules corrected (bottles, flick). Beer shatter in choice 2. Hangover + "Caps Guy" reputation. `Category: Content`
- [x] **s_evening_cards prose** — Miguel hosts, Spider introduced. 3 choices × win/lose reactions. Quiet connection path. `Category: Content`

### Terminology Unification (2026-03-24)
- [x] **Unified Track + Storylet model** — streams/arcs collapsed into Tracks, beats/steps collapsed into Storylets. Two-entity model: Container + Content. `Category: Engine`
- [x] **Deleted dead code** — ArcBeatCard shim, content_arcs lib+routes, selectArcBeats, legacy /api/arc-one/ route, deprecated ArcStepOption type. `Category: Engine`
- [x] **Removed all backward-compat shims** — ArcBeat alias, arcBeats field, deprecated Storylet/StoryletChoice fields, field fallbacks in dailyLoop and tracks/resolve. `Category: Engine`
- [x] **Updated Studio components** — ArcPanel, ChoiceEditor, ChoiceList, GraphView, PreviewSimulator all using track_id, storylet_key, sets_track_state, default_next_key. `Category: Engine`
- [x] **Renamed arcOne → chapter** — src/core/arcOne/ → src/core/chapter/, ArcOneState → ChapterOneState, arcOneMode → chapterOneMode, arcOneStreams.ts → chapterStreams.ts. 118 occurrences across 20 files. `Category: Engine`

### Day Lifecycle Refactor (2026-04-12)
- [x] **Server-authoritative day advancement** — `/api/day/advance-segment` and `/api/day/advance-day` endpoints with conditional UPDATEs. `Category: Engine`
- [x] **Remove `ensureCadenceUpToDate`** — wall-clock day sync removed entirely. Day advances only on sleep. `Category: Engine`
- [x] **Make `getOrCreateDailyRun` read-only** — replaced `ensureDayStateUpToDate` with `fetchDayState` + lazy fallback. `Category: Engine`
- [x] **Client-side simplification** — `handleAdvanceSegment` and `handleSleep` await server, use `queryClient.refetchQueries`. No optimistic updates. `Category: Engine`
- [x] **SupabaseClient DI** — `finalizeDay`, `createDayStateFromPrevious`, `fetchDayState`, etc. accept optional `client` param for server use. `Category: Engine`
- [x] **Fix 5 sequential bugs** — infinite loop, choice_log 400, sleep not advancing, blank screen, missing day state. `Category: Engine`

### Routine-Week Mode (Phase 4 — built 2026-04-12)
- [x] **3 new DB tables** — `routine_activities`, `player_routine_schedules`, `routine_week_state` with RLS. `Category: Engine`
- [x] **6 seeded activities** — morning_run, library_study, herald_writing, dining_commons_social, pickup_basketball, campus_job. `Category: Content`
- [x] **WeeklyCalendar UI** — weekly grid, activates at Day 7. `Category: UI`
- [x] **Deposit + interruption systems** — skill XP / energy / money deposits; gate-trip / calendar / NPC-patience triggers. `Category: Engine`
- [x] **2 NPCs added** — `npc_floor_spider` (Spider), `npc_herald_karen` (Karen). Added to NPC registry. `Category: Content`

### Snake Mini-Game Enhancement (2026-03-24)
- [x] **3-try system for snake game** — maxAttempts prop (default 3), lives counter in HUD, retry screen between attempts, instructions on first load. `Category: Engine`

### Landing Page (2026-03-24)
- [x] **Landing page for mmvstudios.com** — marketing page at /, dev hub moved to /dev. Hero, benefits, co-creation survey, CTA sections. Inter font added. `Category: UI`
- [x] **Domain connected** — mmvstudios.com pointed to Vercel via Cloudflare DNS. `Category: Tooling`

---

## Milestones

| Milestone | Name | Key Deliverable | Status |
|-----------|------|-----------------|--------|
| A | "It Runs" | Game loop works with existing storylets. Play Day 7+. | **Complete — awaiting playtest** |
| B | "It Squeezes" | Every slot has competing options. Two runs diverge. | Not started |
| C | "It Breathes" | Energy, money, skill create ambient pressure. | Not started |
| D | "They Remember" | NPCs respond to player history. | Not started |
| E | "It Means Something" | Reflection engine produces narrative summary. | Not started |
| F | "Play It Again" | Replay intention produces different-feeling run. | Not started |

---

## Notes

- **Milestone A is complete.** Engine, skills (Phase 1+2), routine-week (Phase 4), and day lifecycle refactor all built. Full walkthrough Day 0→7+ awaiting playtest.
- **All Phase 1-4 work is on `time_skill` branch** — 7 commits ahead of main. Merge after playtest.
- **Day lifecycle refactor (2026-04-12)** was the largest structural change. Fixed 5 sequential bugs by consolidating day advancement into 2 server-authoritative endpoints. `ensureCadenceUpToDate` removed — day advances only on sleep.
- **Key new API endpoints:** `/api/day/advance-segment`, `/api/day/advance-day` — both use conditional UPDATEs for concurrency control (409 on double-advance).
- **Key new DB tables (Phase 4):** `routine_activities`, `player_routine_schedules`, `routine_week_state`. Plus Phase 1-2 tables: `skill_definitions`, `player_skills`, `skill_practice_events`.
- **Gender rule:** Protagonist male. All dorm-floor NPCs and RA are male (men's dorm, 1983). Female NPCs exist on campus.
- **New NPCs:** Spider (`npc_floor_spider`) — card sharp. Karen (`npc_herald_karen`) — Herald editor.
- **Art assets needed:** caps game sprites, memory card back texture, towel background. Pixel art, 16px grid, limited palette.
- **Key env vars for testing:** `NEXT_PUBLIC_SKILL_TIME_SCALE=0.01` (compress training), `PRACTICE_CREDIT_SECONDS=900` (practice credit per choice).
- **Claude Code skills available:** `/new-storylet`, `/audit-content`, `/new-npc`, `/new-mini-game`, `/sync-board`
- **Session isolation matters.** One Claude Code session per focused task.
