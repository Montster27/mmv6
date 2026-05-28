# MMV — Session Handoff

> **One-page current state.** Everything older than the last entry below moves to `HANDOFF-archive.md`.
> Read in: `Start session` (SOP.md §1).
> Update at: `End session` (SOP.md §2).
> Last touched: 2026-05-28

---

## Top of stack
<!-- One sentence. What is the very next concrete thing to do. -->
T-1776329282002 NewsNet shipped to main (`65680ff`). Next: tester walkthrough by the 5–8 hand-picked Gate-2 testers — pull main (or use the Vercel deployment), fresh-account → handle → board → post → reload — to close AC#8 fully and surface real-use feedback on the board mix. Before tester session: ~5-min curl pass against the Vercel URL to upgrade AC#2 (reserved-handle 422) and AC#4 (server-stamped `in_game_day`) from code-inspection to live-server evidence.

## Branches in flight
<!-- Every non-main branch with its merge gate. Empty rows are fine; remove a branch when it merges to main. -->

| Branch | Status | Gate | Gate owner | Ticket |
|--------|--------|------|------------|--------|
| `content-studio-v2-visual` | T-CS-001–006 done + SLOT-GUARANTEE-SPEC committed (`ba4158c`); 272 tests passing | Visual QA in browser → merge to main | PM | T-CS-001–006, T-1778077549001 spike |
| `worktree/interesting-margulis-809d6f` | Spike doc committed `ff9f4e0` | Merge to main | Code | T-1778077549005 |

*(`feature/newsnet-multiuser` merged 2026-05-28 as `65680ff` and deleted. `feature/period-stance-infrastructure` merged 2026-05-01 as `3f0b420`.)*

## Active tickets
<!-- 1-5 tickets. Just IDs + one-line status. Full detail lives in Kanban. -->

- T-1779926400001 — Resolve `20260503*` migration divergence (next `db push` will sweep or conflict on 7 files) — TODO; recommend back-apply
- T-1778077549001 — Slot-guarantee policy spike — SPIKE DOC COMMITTED (`ba4158c`); awaiting PM decision on §6 open questions
- T-1778077549002 — `expires_after_days: 0` not honored — TODO; blocked on T-1778077549001
- T-1778077549004 — Beat 2B silently dropped — TODO; blocked on T-1778077549001
- T-1778100000001 — Money-as-band engine + sidebar + transition trigger — TODO; spec landed `docs/MONEY-AS-BAND-SPEC.md`, ready for Code
- T-1778100000005 — Reflection engine build (Shape 1.5, sprint_audit2) — TODO; spike closed `ff9f4e0`, ready for Sprint 2

## Open questions for next session
<!-- Things that need a decision before progress. Not bugs — decisions. -->

- T-1778077549001 slot-guarantee policy (Options 1/2/3) must be decided before T-1778077549002 and T-1778077549004 can close, and before the crowd-out write surface in T-1778100000005 can be implemented (vs stubbed against proposed spec).
- Whether T-1778100000001 (money engine) ships before T-1778077549001 lands. Spec §5 says yes — known/acceptable interim that transition beats may be crowded out until slot guarantee ships.
- NewsNet `rec.music` thinness is structural, not polish: only 2 of 14 NPC rows mapped there cleanly (`texture_002` Police review, `texture_006` Patti Smith carpool). PM call on whether to seed more music textures, accept it as an organic-growth board, or revisit the topic→board mapping.
- NewsNet follow-ons from spec §7 (threading, moderation, diegetic entry, handle-protection list, rate limit) are NOT yet filed as tickets — sprint plan input needed before filing.

## Recently merged (last 7 days)
<!-- One line per merge. Trim weekly. Older entries go to HANDOFF-archive.md. -->

- 2026-05-28 — `65680ff` merge `feature/newsnet-multiuser` → main (T-1776329282002). 4 commits absorbed: Phase A migrations (`b824a30` — newsnet_posts, player_handles, harvest_items.board column + 14-row backfill 6/6/2 across net.philosophy/net.misc/rec.music), Phase B API (`561fb2c` — GET/POST /api/newsnet/{posts,handle}, JS-side merge of player + NPC harvest_items, server-stamped in_game_day, case-insensitive handle uniqueness, NPC-attribution reservation list, 28 new vitest tests), Phase C UI (`8817b6d` — modal/tabs/feed/compose/handle-setup, NewsNetButton wired into play/page.tsx header), flicker fix (`90a2289` — `handleState.kind` removed from NewsNetModal useEffect deps; was infinite-loop on no-handle path). tsc clean, vitest 305/1 (+28). SQL acceptance evidence captured per AC against fixture user `f208bd3e`. Migration files named for actual application timestamps (`20260527154342`, `20260527154400`) because applied via MCP, not `db push`, to avoid sweeping up the 7 pre-existing unpushed `20260503*` migrations (now tracked as T-1779926400001). Two pre-existing unpushed main commits caught up: `03d3803` fix, `5b4ec3d` EOD.

*(All earlier entries moved to HANDOFF-archive.md.)*

---

## Project Summary
**MMV (Many More Versions of You)** is a narrative-driven life simulation set in 1983. Players wake in a college dorm, gradually discover they've been sent back in time, and make choices that shape personal journey while uncovering what went wrong in the world. Target audience: adults 55+. **NewsNet (Gate 2) is the first multiplayer surface, shipped 2026-05-28.**

## Stack
- **Framework:** Next.js 16 + React 19 + TypeScript
- **Database:** Supabase (PostgreSQL) — migrations are source of truth for content
- **Styling:** Tailwind CSS
- **Testing:** Vitest
- **Repo:** `~/Projects/V16MMV/mmv/`
- **Package manager:** npm

## Current Milestone
**Milestone A — "It Runs"** is complete. Engine supports chain mode, pool mode (with `requires_choice` gating), skill queue, skills-in-storylets, routine-week mode (activates Day 3 since Week 2 push), server-authoritative day advancement. Content runs through Day 14+ landmarks (L1–L5 PASS). Gate 2 (NewsNet async board) shipped 2026-05-28.

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
