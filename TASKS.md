# MMV — Task Board

> Last updated: 2026-03-23
> Current milestone: **A — "It Runs"**
> Current branch: `main`

---

## Needs Breakdown

> These tasks are too large to tackle as single items. Each needs a design/planning session to decompose into concrete steps before work begins. Pick one, break it down, then move the subtasks into the Backlog.

- [ ] **BREAK DOWN: Define three evening event NPCs** — 3 separate NPC designs (cards host, caps host, study host), each needing personality, voice, role tag, stream connections, what they notice, preclusion relationships, mini-game linkage. Unblocks: s_dining_hall, s_evening_cards/caps/study, evening preclusion wiring. `Priority: High` `Category: Design`
- [ ] **BREAK DOWN: Write s_the_contact** — Structurally complex: who is the contact (name, appearance, personality), what are the four directives exactly, how much does he reveal, what's the dialogue/choice tree, how do academic path hints surface, what's the anomaly warning tone. Needs design decisions before prose. `Priority: High` `Category: Content`
- [ ] **BREAK DOWN: Write s_dining_hall** — The biggest single storylet in the game. Introduces multiple new NPCs, three mutually exclusive evening invitations that branch the entire evening. Depends on evening NPC designs. Needs: scene structure, NPC introductions, invitation mechanics, choice architecture. `Priority: High` `Category: Content`
- [ ] **BREAK DOWN: Complete content creation agent** — Multi-part: audit current 3-stage pipeline for gaps, verify schema-reference.md matches current DB schema, run a worked example end-to-end (stage 1→2→3→JSON), fix any issues found, document the workflow. `Priority: Medium` `Category: Tooling`
- [ ] **BREAK DOWN: Build mini-game UI framework** — Entire subsystem: interrupt flow (how storylets trigger mini-games), component architecture (shared shell, game-specific renderers), result handling (success/failure → branch to different storylets), difficulty system (adaptive tracker, invisible to player), integration with storylet engine. At least 4-5 subtasks. `Priority: Medium` `Category: Engine`
- [ ] **BREAK DOWN: Map remaining Arc One storylets** — Needs a gap analysis first: audit existing storylets by day/segment/stream, identify holes in coverage, determine collision opportunities, then create individual storylet assignments. Can't be done in one shot. `Priority: Medium` `Category: Content`

---

## Backlog

### Design Decisions (Revised Opening)
- [ ] **Define three evening event NPCs** — who invites to cards, caps, study. Named characters with Dana/Miguel-level care. Host NPC, social dynamic, stream connections, associated mini-game, preclusion chains. `Priority: High` `Category: Design`

### Revised Opening Content
- [ ] **Revise s1_dorm_wake** — add dining hall plan with Dana, establish admin building errand across quad. `Priority: High` `Category: Content`
- [ ] **Write s_quad_reveal** — Gangsta's Paradise hummed on the quad. The mind-spin. No choices — cutscene. `Priority: High` `Category: Content`
- [ ] **Write s_the_contact** — cagey upperclassman. Four directives. Academic path hints. Anomaly warning. `Priority: High` `Category: Content`
- [ ] **Write s_dining_hall** — bad food realization, meet people, three invitations. New named NPCs. `Priority: High` `Category: Content`
- [ ] **Write s_evening_cards** — intimate card game, personal reveal, memory card mini-game. `Priority: Medium` `Category: Content`
- [ ] **Write s_evening_caps** — loud socializing, caps timing mini-game. `Priority: Medium` `Category: Content`
- [ ] **Write s_evening_study** — intellectual spark, sorting mini-game. `Priority: Medium` `Category: Content`
- [ ] **Wire floor meeting + phone call** — existing storylets into evening sequence. `Priority: Medium` `Category: Content`

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
- [ ] **Build mini-game UI framework** — interrupt, present, collect result, branch. Adaptive difficulty. `Priority: Medium` `Category: Engine`
- [ ] **Build difficulty tracker** — wins/losses per type. Adjust silently. `Priority: Medium` `Category: Engine`
- [ ] **Build memory card mini-game** — flip pairs. Difficulty: peek time, grid size. `Priority: Medium` `Category: Engine`
- [ ] **Build caps mini-game** — timing/aim. Difficulty: target, timing, speed. `Priority: Medium` `Category: Engine`
- [ ] **Build sorting mini-game** — categorize under pressure. Difficulty: speed, categories, swaps. `Priority: Medium` `Category: Engine`

### Stream & Schema Updates
- [ ] **Add "Echoes" stream** — 7th stream for time-travel content. `Priority: Medium` `Category: Design`
- [ ] **Add mini_game field to schema** — type, difficulty, retries, on_success, on_failure. `Priority: Medium` `Category: Engine`
- [ ] **Wire evening three-way preclusion** — cards precludes caps + study, etc. `Priority: Medium` `Category: Content`

---

## In Progress

*(nothing currently in progress)*

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

---

## Milestones

| Milestone | Name | Key Deliverable | Status |
|-----------|------|-----------------|--------|
| A | "It Runs" | Game loop works with existing storylets. Play Day 1. | **~95% — engine + time system merged, needs opening content** |
| B | "It Squeezes" | Every slot has competing options. Two runs diverge. | Not started |
| C | "It Breathes" | Energy, money, skill create ambient pressure. | Not started |
| D | "They Remember" | NPCs respond to player history. | Not started |
| E | "It Means Something" | Reflection engine produces narrative summary. | Not started |
| F | "Play It Again" | Replay intention produces different-feeling run. | Not started |

---

## Notes

- **Milestone A is nearly complete.** The day engine, state manager, storylet resolver, consequence applier, save system, Supabase integration, and time system are all built and merged to main (PR #26). Remaining: opening content (revised dorm wake, quad reveal, contact, dining hall).
- **Only one design decision remains:** the three evening event NPCs (cards, caps, study hosts).
- **Gender rule:** Protagonist male. All dorm-floor NPCs and RA are male. Female NPCs exist on campus (classrooms, library, events). Sandra renamed to Scott.
- **Anomaly rule needs propagation.** Must be added to content-creator agent docs before new content.
- **Claude Code skills available:** `/new-storylet`, `/audit-content`, `/new-npc`, `/new-mini-game`, `/sync-board`
- **Session isolation matters.** One Claude Code session per focused task.
