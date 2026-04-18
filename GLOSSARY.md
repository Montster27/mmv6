# MMV — Glossary
> Canonical vocabulary. If a term isn't here, it's not official.
> When you catch yourself using a synonym, stop and use the term from this file.
> Last updated: 2026-04-16

---

## Game Structure

| Term | Definition | ~~Don't say~~ |
|------|-----------|---------------|
| **Track** | One of the six narrative threads running through the game. Each track has its own progress state and storylets. The six tracks are: roommate, academic, money, belonging, opportunity, home. A possible 7th ("Echoes" — time-travel frame) is in brainstorm. | ~~stream~~, ~~arc~~, ~~storyline~~, ~~thread~~, ~~narrative line~~ |
| **Storylet** | A single scene on a track. Contains prose (nodes or flat body), micro-choices, and terminal choices. Stored as a row in the `storylets` table. Has a unique `storylet_key`. | ~~beat~~, ~~step~~, ~~scene~~, ~~passage~~, ~~card~~, ~~encounter~~ |
| **Storylet key** | The unique string identifier for a storylet (e.g., `room_214`, `morning_after_party`). Used in code, migrations, and all references. | ~~slug~~, ~~storylet ID~~, ~~storylet name~~ |
| **Chain mode** | A storylet served because a prior storylet's `next_key` or `default_next_key` explicitly names it. Scenes in a chain MUST play in fixed sequence. | ~~linked mode~~, ~~sequential mode~~ |
| **Pool mode** | A storylet served because it matches the current day, segment, and requirements. No storylet points to it. Nothing chains to a pool storylet. | ~~free mode~~, ~~floating mode~~, ~~dynamic mode~~ |
| **Segment** | One of three time slots in a game day: `morning`, `afternoon`, `evening`. The engine serves up to 2 storylets per segment across all tracks. | ~~slot~~, ~~period~~, ~~phase~~, ~~time of day~~ |
| **Day index** | Zero-based game day counter. Day 0 = arrival/orientation. Day 1 = first full day. Day 7 = routine-week mode activates. | ~~day number~~, ~~game day~~ (acceptable informally) |
| **Track progress** | The per-user, per-track state row that tracks where the player is on that track. Contains `next_key_override` (chain pointer) and resolved storylet history. | ~~player state~~, ~~arc progress~~ |

---

## Content Concepts

| Term | Definition | ~~Don't say~~ |
|------|-----------|---------------|
| **Conversational node** | A dialogue tree structure within a storylet. Players navigate micro-choices before reaching terminal choices. Max 4 sentences per node, 2-4 micro-choices, 200-350 words total. | ~~dialogue tree~~, ~~node tree~~, ~~conversation tree~~ |
| **Micro-choice** | A low-stakes choice within a conversational node. Shapes tone and sets walk-local flags. No resource cost, no preclusion, no track progression. Cheap and ephemeral. | ~~dialogue option~~, ~~node choice~~, ~~conversation choice~~ |
| **Terminal choice** | A high-stakes choice at the end of a storylet. Controls track progression, resource changes, preclusion. The only type of choice with real consequences. | ~~final choice~~, ~~endpoint choice~~, ~~outcome choice~~ |
| **Walk flag** | A temporary flag set during conversational node traversal. Exists only during the current storylet walk. Used to gate terminal choices via `requires_flag` / `excludes_flag`. Does NOT persist after the storylet resolves. | ~~temp flag~~, ~~node flag~~ |
| **Preclusion** | Permanently locking out a storylet based on a prior terminal choice. "By being here, you can't be there." The 30% inaccessibility target means ~1/3 of content is unreachable per playthrough. Not yet implemented in engine. | ~~exclusion~~, ~~blocking~~, ~~lock-out~~ |
| **Collision** | When two or more tracks have content due in the same segment on the same day. Max 2 shown at once; the rest queue. Deliberate collisions create tension ("miss this to be at that"). | ~~conflict~~, ~~overlap~~, ~~competition~~ |
| **Miss path** | What the player experiences (or doesn't) when they miss a gated or preclusion-locked storylet. Explicit design for what absence feels like. | ~~skip path~~, ~~fallback~~, ~~alternative path~~ |
| **Crystallizer** | A high-consequence storylet that forces a meaningful choice, shaping the player's trajectory. The emotional peaks of a track. Designed backward from the impact. | ~~climax~~, ~~turning point~~, ~~key moment~~ |

---

## Game Systems

| Term | Definition | ~~Don't say~~ |
|------|-----------|---------------|
| **Skill queue** | The real-time wall-clock training system. One skill active (training), one queued. Training completes based on wall-clock time, not game time. 10 Tier 1 skills. | ~~skill tree~~, ~~skill system~~ |
| **Diegetic practice** | When resolving a storylet that practices a skill, the active training skill gets time credit subtracted. The story action *is* the training. | ~~practice credit~~, ~~story-based training~~ |
| **Routine-week mode** | Activates at Day 7. Player commits to a weekly schedule of standing activities. Deposits (skill XP, energy, money) apply on commit. Interrupted by narrative events. | ~~weekly mode~~, ~~schedule mode~~, ~~Week 2 mode~~ |
| **Standing activity** | A recurring weekly activity available in routine-week mode (e.g., morning_run, library_study, herald_writing). Seeded in `routine_activities` table. | ~~routine~~, ~~weekly activity~~, ~~recurring event~~ |
| **Interruption** | An event that breaks the player out of routine-week mode back into storylet mode. Three triggers: gate threshold trips, calendar beats, NPC patience timers. | ~~break~~, ~~disruption~~, ~~narrative interrupt~~ |
| **Daily Harvest** | Phase 3 of the time model. A 90-second login flow: queue check → harvest pool → optional play session. Not yet built. | ~~daily check-in~~, ~~login loop~~ |
| **Day advancement** | Server-authoritative, sleep-driven only. No wall-clock catch-up. If a player is away 3 days, they return to the day they last slept on. | ~~day progression~~, ~~time advance~~ |

---

## NPCs

| Term | Definition | ~~Don't say~~ |
|------|-----------|---------------|
| **NPC registry** | The `npc_registry` table. Every named character has an entry with ID, display name, and introduction storylet. | ~~character list~~, ~~cast list~~ |
| **introduces_npc** | The field on a storylet that formally introduces an NPC. Before this fires, the NPC's name appears as "???" via `getDisplayBody()`. | ~~reveals NPC~~, ~~first appearance~~ |
| **NPC initiative decay** | (Not yet built.) When a player repeatedly defers an NPC's invitations, that NPC stops initiating. Planned for Milestone D. | ~~relationship decay~~, ~~NPC cooldown~~ |

---

## Infrastructure

| Term | Definition | ~~Don't say~~ |
|------|-----------|---------------|
| **Kanban Pro** | The markdown-based ticket board at `~/Documents/MMV/_assets/MMV_Docs/Kanban data/`. Tickets are `.md` files with YAML frontmatter. Watched by Chokidar. | ~~the board~~, ~~task board~~ (acceptable informally) |
| **MAPPING.md** | Auto-generated ticket index in the Kanban directory. Read this first for board triage — it's the token-efficient overview. | ~~ticket list~~, ~~board summary~~ |
| **Epic** | A large grouping of related tickets in Kanban Pro. Each epic corresponds to a milestone or major system. Defined in `board.json`. | ~~milestone~~ (overlaps but not identical — an epic can be a milestone, but not all are) |
| **Sprint** | A time-boxed iteration (1-2 weeks) in Kanban Pro. Tickets pulled from backlog into sprint during sprint planning. Defined in `board.json`. | ~~cycle~~, ~~iteration~~ |
| **MemPalace** | Local open-source AI memory system. Stores decision rationale — the "why" behind choices. Not for task state (that's Kanban). Not for current status (that's HANDOFF). | ~~memory system~~, ~~context memory~~ |
| **HANDOFF.md** | Session bridge file. Current state of the project, what's done, what's next. Updated at end of every Code session. | ~~status file~~, ~~context file~~, ~~state file~~ |
| **Content Studio** | The admin UI for authoring (`/admin` routes). Collision view, NPC registry, preview simulator, choice editor. | ~~admin panel~~, ~~authoring tool~~ |
| **Playthrough runner** | Headless test runner that executes scripted choice sequences against the real engine. YAML scripts in `scripts/playthroughs/`. Sub-second vitest runs. | ~~test runner~~ (too generic), ~~integration tests~~ |

---

## Environment Names

| Term | What it is | When to use it |
|------|-----------|---------------|
| **claude.ai** | This chat interface. The PM layer. | Planning, decisions, routing, sprint planning, drift checks |
| **Claude Code** | The terminal-based coding agent. Works in the repo. | All code changes, migrations, tests, HANDOFF updates |
| **Cowork** | Claude Desktop with Obsidian vault access. The "MMV Design Brain" project. | Design docs, specs, phase plans, research, teaching materials |

---

## Milestones (in order)

| Label | Name | Meaning |
|-------|------|---------|
| **A** | It Runs | Game loop works. Play Day 7+. **Complete.** |
| **B** | It Squeezes | Every slot has competing options. Two runs diverge. Content volume + preclusion. |
| **C** | It Breathes | Energy, money, skill create ambient pressure. |
| **D** | They Remember | NPCs respond to player history. |
| **E** | It Means Something | Reflection engine produces narrative summary. |
| **F** | Play It Again | Replay intention produces different-feeling run. |

---

## Deprecated Terms

These terms appeared in older docs or conversations. They are **wrong** now. If you see them, correct them.

| ~~Old term~~ | Correct term | When changed |
|-------------|-------------|-------------|
| ~~stream~~ | **Track** | 2026-03-24 |
| ~~arc~~ | **Track** (or **Epic** if referring to a Kanban grouping) | 2026-03-24 |
| ~~beat~~ | **Storylet** | 2026-03-24 |
| ~~step~~ | **Storylet** (or **segment** if referring to morning/afternoon/evening) | 2026-03-24 |
| ~~slug~~ | **Storylet key** | 2026-03-24 |
| ~~arc_id~~ / ~~arc_instance_id~~ | Removed from schema (stale columns in choice_log, fixed 2026-04-12) | 2026-04-12 |
| ~~ensureCadenceUpToDate~~ | Removed entirely. Day advancement is sleep-driven only. | 2026-04-12 |
| ~~ArmsterFlow~~ | **AmsterFlow** | Typo that keeps recurring |
| ~~Dana~~ (roommate) | **Scott** | Gender audit, 2026-03-24 |
| ~~Sandra~~ (RA) | **Scott** (RA is now male) | Gender audit, 2026-03-24 |
