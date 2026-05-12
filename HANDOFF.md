# MMV — Session Handoff

> **One-page current state.** Everything older than the last entry below moves to `HANDOFF-archive.md`.
> Read in: `Start session` (SOP.md §1).
> Update at: `End session` (SOP.md §2).
> Last touched: 2026-05-11

---

## Top of stack
<!-- One sentence. What is the very next concrete thing to do. -->
`docs/SLOT-GUARANTEE-SPEC.md` committed (`ba4158c`); Option 3 (typed-slot priority) recommended. Next: PM decision on T-1778077549001 §6 open questions (confirm Option 3, started_day clamp approach, binary vs. continuous priority scale, Beat 2B Day 9 content review) — then build Phase A (started_day fix) + Phase B (priority column + engine sort).

## Branches in flight
<!-- Every non-main branch with its merge gate. Empty rows are fine; remove a branch when it merges to main. -->

| Branch | Status | Gate | Gate owner | Ticket |
|--------|--------|------|------------|--------|
| `content-studio-v2-visual` | T-CS-001–006 done + SLOT-GUARANTEE-SPEC committed (`ba4158c`); 272 tests passing | Visual QA in browser → merge to main | PM | T-CS-001–006, T-1778077549001 spike |
| `worktree/interesting-margulis-809d6f` | Spike doc committed `ff9f4e0` | Merge to main | Code | T-1778077549005 |

*(`feature/period-stance-infrastructure` merged 2026-05-01 as `3f0b420`. `time_skill` merged 2026-04-27.)*

## Active tickets
<!-- 1-5 tickets. Just IDs + one-line status. Full detail lives in Kanban. -->

- T-1778077549001 — Slot-guarantee policy spike — SPIKE DOC COMMITTED (`ba4158c`); awaiting PM decision on §6 open questions before build tickets filed
- T-1778077549002 — `expires_after_days: 0` not honored — TODO; blocked on T-1778077549001
- T-1778077549004 — Beat 2B silently dropped — TODO; blocked on T-1778077549001
- T-1778100000001 — Money-as-band engine + sidebar + transition trigger — TODO; spec landed `docs/MONEY-AS-BAND-SPEC.md`, ready for Code
- T-1778100000002–4 — Money-as-band content (2 storylets + 8 NPC commentary lines) — TODO; ready for content authoring
- T-1778100000005 — Reflection engine build (Shape 1.5, sprint_audit2) — TODO; spike closed `ff9f4e0`, ready for Sprint 2 start

## Open questions for next session
<!-- Things that need a decision before progress. Not bugs — decisions. -->

- T-1778077549001 slot-guarantee policy (Options 1/2/3) must be decided before T-1778077549002 and T-1778077549004 can close, and before the crowd-out write surface in T-1778100000005 can be implemented (vs stubbed against proposed spec).
- Whether T-1778100000001 (money engine) ships before T-1778077549001 lands. Spec §5 says yes — known/acceptable interim that transition beats may be crowded out until slot guarantee ships. Confirm at sprint plan.
- Possible Karen swap in T-1778100000004 NPC cast (Karen 4th-deferred on Herald track; her money-only commentary lines don't conflict with the deferral, but PM may prefer Danny/Miguel substitution out of caution).

## Recently merged (last 7 days)
<!-- One line per merge. Trim weekly. Older entries go to HANDOFF-archive.md. -->

- 2026-05-11 — `content-studio-v2-visual` branch: T-CS-001 shell+nav+tokens (`0008966`), T-CS-002/003/004 Calendar+Swimlane+Constellation (`bc364ef`), T-CS-005/006 4-tab editor+side panel (`771acfd`), `getScriptModeGaps` unit tests (`dcaf320`), SLOT-GUARANTEE-SPEC (`ba4158c`). Full visual revamp + slot-guarantee spike. 9 new components, 2 new libs (trackPalette, trackShapes), `getScriptModeGaps()` + 12 tests, `docs/SLOT-GUARANTEE-SPEC.md`. TypeScript clean, 272/272 tests. Awaiting Vercel preview QA and main merge.
- 2026-05-08 — `caece42` T-1778077549003 vectors sidebar surfacing closed. Two-part fix: ProgressPanel.tsx reads `life_pressure_state` as canonical (was reading dead `vectors` field), `handleTrackStoryletChoice` now writes LP via `bumpLifePressure` (was silently dropping all track-storylet identity_tags writes — pre-`caece42` traces from track-served paths cannot be trusted as evidence of LP accumulation behavior). Tests parity: tsc clean, vitest 260/1, playthrough 23/6. DECISIONS.md entry filed.
- 2026-05-08 — Money-as-band design spec landed at `docs/MONEY-AS-BAND-SPEC.md`. Resolves audit §6 #2 (Bible §3.1.3 violation) and the Current_design.md §XI line 702 open question (visible band, not friction-events-only). 4 tickets filed under epic_mmv03mc_breathes: T-1778100000001 (engine), T-1778100000002 (bite storylet), T-1778100000003 (relief storylet, 3 source variants), T-1778100000004 (8 NPC commentary lines).
- 2026-05-08 — `ff9f4e0` `docs/REFLECTION-DESIGN-SPIKE.md` committed (worktree `interesting-margulis-809d6f`). T-1778077549005 reflection spike closed; Shape 1.5 (template-registry) approved by PM. Build ticket T-1778100000005 filed (sprint_audit2). PM editorial pass landed on the prose templates — registry hard rule added (§5): "Templates must end on a concrete noun, named action, or specific physical detail — never on an abstract noun, generalized verb, or evaluative claim." `docs/CRYSTALLIZER-FLAGS.md` filed with initial `scott_noticed_something` row + deferred-crystallizers section + authoring contract. Two Kanban corruption events repaired in same session: T-1778077549001 body had reflection content pasted over slot-guarantee body; T-1778077549005 augmentation had partially-merged duplicate content. Both restored, frontmatter preserved. T-1778100000005 sprint tag corrected `sprint_2` → `sprint_audit2` (the former didn't exist in board.json).
- 2026-05-05 — T-1776329282001 period friction content shipped: 4 new belonging pool storylets, 3 retrofits, 6 new regression playthroughs passing.
- 2026-05-01 — `3f0b420` merge `feature/period-stance-infrastructure` → main (48 commits absorbed).
- 2026-04-29 — `a1c807d` Phase 1 instrumentation landed on main.
- 2026-04-28 (PATH B) — Repo + Kanban relocated `~/Documents/` (iCloud) → `~/Projects/` (local-only).

---

## Project Summary
**MMV (Many More Versions of You)** is a narrative-driven life simulation set in 1983. Players wake in a college dorm, gradually discover they've been sent back in time, and make choices that shape personal journey while uncovering what went wrong in the world. Target audience: adults 55+. Multiplayer/social planned for later phases.

## Stack
- **Framework:** Next.js 16 + React 19 + TypeScript
- **Database:** Supabase (PostgreSQL) — migrations are source of truth for content
- **Styling:** Tailwind CSS
- **Testing:** Vitest
- **Repo:** `~/Projects/V16MMV/mmv/`
- **Package manager:** npm

## Current Milestone
**Milestone A — "It Runs"** is complete. Engine supports chain mode, pool mode (with `requires_choice` gating), skill queue, skills-in-storylets, routine-week mode (activates Day 3 since Week 2 push), server-authoritative day advancement. Content runs through Day 14+ landmarks (L1–L5 PASS). Audit 2026-05-06 surfaced 19 findings; closures in progress.

## Where Things Live
| Layer | Location | Tool |
|-------|----------|------|
| **Design brain** | `~/Library/Mobile Documents/com~apple~CloudDocs/Obsidian Vault/Master mmv/` | Cowork |
| **Built content** | `~/Projects/V16MMV/mmv/` | Claude Code |
| **Bridge** | `HANDOFF.md` (this file) + `HANDOFF-archive.md` (history) | All envs |
| **PM** | claude.ai | Claude (with memory) |
| **Kanban** | `~/Projects/MMV/_assets/MMV_Docs/Kanban data/` | Kanban Pro app |
| **Decision log** | `docs/DECISIONS.md` | Code or PM |

## Conventions reminder
- HANDOFF refresh discipline: one-line entry per commit on a branch in flight, before EOD; or include `git log --since=<last-handoff>` snippet at top of next session opener (DECISIONS.md 2026-04-29).
- Don't close a ticket on intent — close on evidence (paste verifying shell output).
- Migrations are source of truth for storylet content. Schema changes go through migrations, not direct DB edits.
- DECISIONS.md replaced MemPalace as of 2026-05-07 (`/end-session` step 5 folded in).
