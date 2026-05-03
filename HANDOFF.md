# MMV — Session Handoff

> **One-page current state.** Everything older than the last entry below moves to `HANDOFF-archive.md`.
> Read in: `Start session` (SOP.md §1).
> Update at: `End session` (SOP.md §2).
> Last touched: 2026-05-03

---

## Top of stack
<!-- One sentence. What is the very next concrete thing to do. -->
Phase 2 root-cause investigation of the Day-2-evening state-resume bug. Phase 1 instrumentation (commit `a1c807d`) is on `main`; Vercel preview READY. Pick exactly one of: persistence bug, resume-read bug, resume-write bug, sessionStorage contamination, day-advance double-fire, segment transition desync.

## Branches in flight
<!-- Every non-main branch with its merge gate. Empty rows are fine; remove a branch when it merges to main. -->

| Branch | Status | Gate | Gate owner | Ticket |
|--------|--------|------|------------|--------|

*(No branches in flight. `feature/period-stance-infrastructure` merged to `main` 2026-05-01 as `3f0b420`. Branch retained 24h for rollback; scheduled deletion 2026-05-02. `time_skill` fully merged 2026-04-27.)*

## Active tickets
<!-- 1-5 tickets. Just IDs + one-line status. Full detail lives in Kanban. -->

- _(populate from MAPPING.md `col_doing` at session start)_

## Open questions for next session
<!-- Things that need a decision before progress. Not bugs — decisions. -->

- _(none right now)_

## Recently merged (last 7 days)
<!-- One line per merge. Trim weekly. Older entries go to HANDOFF-archive.md. -->

- 2026-05-01 — `3f0b420` merge `feature/period-stance-infrastructure` → main (48 commits absorbed)
- 2026-04-29 — `a1c807d` Phase 1 instrumentation landed on main; Vercel preview READY
- 2026-04-29 — `cb10dc2`..`a1c807d` SegmentTransitionCard fixes + reset endpoint parity (`bcfc171`, `5c224ee`, `6f1723f`, `6a11f53`)
- 2026-04-28 (PATH B) — Repo + Kanban relocated `~/Documents/` (iCloud) → `~/Projects/` (local-only). T-1777382919259 closed.
- 2026-04-27 — Sprint b2c3d closer: 5 tickets shipped (Dana→Scott prose scrub, branches-in-flight section, node-usage review, ticket-vs-disk audit, MAPPING regen)
- 2026-04-25 — Beat 2A "Hallway Comment" wired into `hallway_morning_day3` — first period-stance friction beat in Arc One
- 2026-04-24 — Period-stance infrastructure (36 new tests, 231 green) on `feature/period-stance-infrastructure`

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
**Milestone A — "It Runs"** is complete. Engine supports chain mode, pool mode (with `requires_choice` gating), skill queue, skills-in-storylets, routine-week mode (activates Day 3 since Week 2 push), server-authoritative day advancement. Content runs through Day 14+ landmarks (L1–L5 PASS).

## Where Things Live
| Layer | Location | Tool |
|-------|----------|------|
| **Design brain** | `~/Library/Mobile Documents/com~apple~CloudDocs/Obsidian Vault/Master mmv/` | Cowork |
| **Built content** | `~/Projects/V16MMV/mmv/` | Claude Code |
| **Bridge** | `HANDOFF.md` (this file) + `HANDOFF-archive.md` (history) | All envs |
| **PM** | claude.ai | Claude (with memory) |
| **Kanban** | `~/Projects/MMV/_assets/MMV_Docs/Kanban data/` | Kanban Pro app |
| **Decision log** | `docs/DECISIONS.md` | Code or PM |
| **Memory** | MemPalace | Code or PM |

## Conventions reminder
- HANDOFF refresh discipline: one-line entry per commit on a branch in flight, before EOD; or include `git log --since=<last-handoff>` snippet at top of next session opener (DECISIONS.md 2026-04-29).
- Don't close a ticket on intent — close on evidence (paste verifying shell output).
- Migrations are source of truth for storylet content. Schema changes go through migrations, not direct DB edits.
