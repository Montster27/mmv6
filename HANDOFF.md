# MMV Handoff Brief
> Context bridge for claude.ai, Claude Code, and Cowork sessions.
> **Last updated:** 2026-04-03 (verified against TASKS.md, live DB, and codebase by Claude Code)

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
**Milestone A — "It Runs"** is ~95% complete. The engine supports both chain mode and pool mode (with `requires_choice` gating). Day 0 content is fully wired. Day 1 has morning-after pool storylets and roommate/academic chain endpoints. Days 2-3 need building.

---

## Live DB State (as of 2026-04-03)

### Active Storylets (10 total)

| storylet_key | Track | Segment | Day | Mode | Gates/Chains |
|-------------|-------|---------|-----|------|--------------|
| `room_214` | roommate | morning | 0 | CHAIN | → `first_morning` |
| `first_morning` | roommate | morning | 1 | CHAIN | → NULL (track completes) |
| `dorm_hallmates` | belonging | morning | 0 | CHAIN | choices → `lunch_floor` |
| `lunch_floor` | belonging | afternoon | 0 | CHAIN | → `evening_choice` |
| `evening_choice` | belonging | evening | 0 | CHAIN end | → NULL (pool takes over) |
| `morning_after_party` | belonging | morning | 1 | POOL | requires_choice: `go_to_party` |
| `morning_after_cards` | belonging | morning | 1 | POOL | requires_choice: `go_to_cards` |
| `morning_after_union` | belonging | morning | 1 | POOL | requires_choice: `go_to_union` |
| `advisor_visit` | academic | afternoon | 1 | CHAIN end | → NULL (track completes) |
| `money_reality_check` | money | evening | 4 | POOL | no gate |

### Inactive/Disabled Storylets (5)

| storylet_key | Track | Why disabled |
|-------------|-------|-------------|
| `hall_morning` | belonging | Superseded by morning_after_* pool variants (deactivated 2026-04-03) |
| `dorm_roommate` | roommate | Superseded by room_214 conversational rewrite |
| `roommate_moment` | roommate | Legacy content |
| `orientation_fair` | belonging | Not yet written — placeholder |
| `cal_midnight_knock` | belonging | Not yet written — placeholder |

### Deleted Storylets

| storylet_key | When | Why |
|-------------|------|-----|
| `bench_glenn` | 2026-04-02 | Orphaned; Contact scene needs redesign before re-adding |

### Track Status

| Track | Storylets | Content reaches | Status |
|-------|-----------|----------------|--------|
| **roommate** | 2 active | Day 1 morning → COMPLETED | Needs Day 2+ content |
| **belonging** | 5 active (3 chain + 3 pool, one fires per run) | Day 1 morning → COMPLETED | Needs Day 2+ content |
| **academic** | 1 active | Day 1 afternoon → COMPLETED | admin_errand was deleted/missing; advisor_visit is first storylet. Needs Day 2+ content |
| **money** | 1 active | Day 4 evening (money_reality_check) | First money beat exists but no chain-in |
| **opportunity** | 0 | — | Silent — no progress row created |
| **home** | 0 | — | Silent — no progress row created |

### NPC Registry (11 NPCs)

| NPC ID | Display Name | Introduced In | Notes |
|--------|-------------|---------------|-------|
| `npc_roommate_scott` | Scott | room_214 | Roommate |
| `npc_contact_glenn` | Glenn | *(needs scene)* | The Contact — bench_glenn deleted, needs new storylet |
| `npc_floor_doug` | Doug | dorm_hallmates | Social organizer |
| `npc_floor_mike` | Mike | dorm_hallmates | Studious, careful |
| `npc_floor_keith` | Keith | dorm_hallmates | Farm background |
| `npc_anderson_bryce` | Bryce | *(never via introduces_npc)* | Party host — named in evening_choice body only |
| `npc_floor_peterson` | Peterson | *(never via introduces_npc)* | Card game host — named in morning_after_cards only |
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

### Content (Day 0-1)
- Day 0 chain: room_214 → dorm_hallmates → lunch_floor → evening_choice (3 mini-games)
- Day 1 morning: first_morning (roommate), morning_after_* pool variants (belonging)
- Day 1 afternoon: advisor_visit (academic)
- Day 4: money_reality_check (money track entry point)

### Docs & Tooling
- CLAUDE.md project bible with testing process (4-tier: SQL → vitest → SQL simulation → ask user)
- CONTENT-RULES.md: authoritative chain/pool placement rules
- CHAIN-MAP.md, ENGINE-SPEC.md, CONTENT-INVENTORY.md
- Content creator agent (3-stage pipeline)
- 5 Claude Code skills: `/new-storylet`, `/audit-content`, `/new-npc`, `/new-mini-game`, `/sync-board`

---

## What's In Progress

- **Phase 1 playtest (P1.6)** — Skill queue built and deployed. Needs 7–10 real days with 2 testers. Set `NEXT_PUBLIC_SKILL_TIME_SCALE=0.01` in Vercel env vars for compressed testing.
- **Phase 2 playtest (P2.4)** — Skills wired into storylets: 5 retrofits, diegetic practice hook, Content Studio controls. Set `PRACTICE_CREDIT_SECONDS` env var to tune practice credit (default 900 = 15 min). Awaiting playtest.
- **hall_morning bug fix** — deactivated hall_morning (ungated pool storylet beating gated morning-after scenes). Migration applied. Awaiting user browser playtest to confirm morning_after_party fires on Day 2. (2026-04-03)

---

## What's Next (probable, pending review)

### Immediate (complete Milestone A)
1. **User playtests Day 0 → Day 1** — confirm morning-after scenes fire correctly after evening choice
2. **Fix admin_errand** — storylet is missing from DB (deleted somewhere). Either re-create or accept advisor_visit as academic track entry point
3. **Fix bench_glenn / Contact scene** — deleted as orphan, but the Contact reveal is a critical narrative beat. Needs: design decision on when/where it fires, then new storylet on correct track
4. **Add Bryce and Peterson to introduces_npc** on relevant storylets

### Next milestone work (Milestone B — "It Squeezes")
5. **Map remaining Arc One storylets** — gap analysis for Days 2-14
6. **Build Day 2-3 content** — extend all active tracks past their current COMPLETED endpoints
7. **Implement runtime preclusion** — walk precludes field, permanently lock out storylets
8. **Fill opportunity and home tracks** — at least one entry storylet each
9. **Build batch content validator** — CLI script for schema/NPC/period checks

---

## Recent Decisions

| Date | Decision | Context |
|------|----------|---------|
| 2026-04-11 | **Phase 2 skills-in-storylets built** | 5 storylets retrofitted with skill gates/modifiers/practice credits. Diegetic practice hook accelerates active training. Audit table for tuning. Content Studio updated with 3 skill controls. No Herald storylet — substituted money_reality_check. |
| 2026-04-10 | **Phase 1 skill queue built** | 10 Tier 1 skills, real-time wall-clock queue (1 active + 1 queued), lazy tick on fetch, /skills page added to player nav. Skills standalone — no storylet impact yet. Branch: `time_skill`. |
| 2026-04-03 | **hall_morning deactivated** | Ungated pool storylet was beating gated morning-after variants. Fix: disable it; pool scan now only serves the correct choice-gated variant. |
| 2026-04-03 | **Testing process: 4-tier, no browser automation** | Claude Code cannot reliably run browser playtests (auth, PATH, Chrome MCP issues). Process: Tier 1 SQL verification → Tier 2 vitest → Tier 3 SQL simulation → Tier 4 ask user. Added to CLAUDE.md. |
| 2026-04-02 | **evening_choice.default_next_key set to NULL** | Was pointing to hall_morning, which made it a chain (bypassing pool scan). Set to NULL so pool scan finds morning-after variants via requires_choice. |
| 2026-04-02 | **Pool-based morning-after storylets added** | Three belonging track pool storylets gated by requires_choice (go_to_party/cards/union). First use of pool mode in the game. |
| 2026-04-02 | **bench_glenn deleted** | Orphaned storylet with no track_id and no chain references. Contact scene needs complete redesign before re-adding. |
| 2026-04-02 | **Legacy column sync** | default_next_step_key synced with default_next_key across all storylets. Admin API now writes default_next_key directly. |
| 2026-04-01 | **Day 1 content added** | first_morning (roommate), hall_morning (belonging — later superseded), advisor_visit (academic). Extended all three tracks to Day 1. |
| 2026-03-31 | Game opens in dorm not quad. Orientation is Days 0-3 before classes. |
| 2026-03-31 | Obsidian vault = design brain; repo = built content. claude.ai = PM. |
| 2026-03-24 | Terminology unified: streams/arcs → Tracks, beats/steps → Storylets. |

---

## Engine Model (quick reference)

### Two selection modes
1. **Chain mode**: storylet served via `next_key_override` on `track_progress`. Set when a prior storylet's choice has `next_key` or the storylet has `default_next_key`.
2. **Pool mode**: storylet served via pool scan when `next_key_override` is NULL. Filtered by: is_active, due_offset_days window, segment, `meetsRequirements()` (requires_choice).

### Key constraint: CONTENT-RULES.md
A storylet is **either chained OR pooled**. Never both. If anything chains to it, the pool will never reach it. See `docs/CONTENT-RULES.md` for the full 10-rule spec.

### ENGINE-SPEC.md accuracy note
ENGINE-SPEC.md says "requirements not read by track engine" (§2). **This is now outdated.** The pool scan in `selectTrackStorylets.ts` reads `requirements.requires_choice` via `meetsRequirements()`. The pool scan also checks `is_active`. Both were added in the pool-mode implementation (2026-04-01/02).

---

## Known Issues

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| 1 | **ENGINE-SPEC.md outdated** — says requirements not read by track engine; they are now | Medium | Needs update |
| 2 | **CONTENT-INVENTORY.md outdated** — lists 7 storylets; there are now 10 active + 5 inactive | Medium | Needs regeneration |
| 3 | **CHAIN-MAP.md partially outdated** — still shows evening_choice → hall_morning chain; that's been broken (evening_choice.default_next_key = NULL, hall_morning deactivated) | Medium | Needs update |
| 4 | **admin_errand missing from DB** — referenced in docs but not in live storylets table | High | Investigate: was it deleted? Need to verify migration history |
| 5 | **Contact scene (Glenn) has no storylet** — bench_glenn deleted, no replacement written | High | Design decision needed: when/where does the Contact reveal fire? |
| 6 | **Bryce and Peterson never formally introduced** — in registry, named in text, but no introduces_npc | Low | Add to relevant storylets |
| 7 | **precludes arrays reference non-existent slugs** — evening_choice choices preclude slugs that don't exist | Medium | Preclusion not yet implemented; fix when it is |
| 8 | **DECISIONS.md nearly empty** — only 1 entry despite months of development | Low | Accumulate over time |
| 9 | **first_morning.expires_after_days is NULL** — engine treats as 0, meaning it expires same day it's due | Medium | Should be 7 for orientation content |
| 10 | **opportunity and home tracks have 0 storylets** — enabled but empty, no progress rows created | Medium | Need at least entry storylets |
| 11 | **Duplicate skill** — mmv-content-builder in both repo and ~/.claude/skills/ | Low | Repo is canonical |

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
