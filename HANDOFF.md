# MMV — Session Handoff

> **One-page current state.** Everything older than the last entry below moves to `HANDOFF-archive.md`.
> Read in: `Start session` (SOP.md §1).
> Update at: `End session` (SOP.md §2).
> Last touched: 2026-06-30

---

## Top of stack
<!-- One sentence. What is the very next concrete thing to do. -->
Multiplayer MP-01→08 merged to main (`17db5ee`). Next real task: **Step 8 — port the `mp.module.css` high-fidelity treatments into the component system** (the campaign board UI shipped functionally, but the Claude Design visual port may be incomplete — confirm scope before building). Then: Step 7 exposure is largely shipped (verify/tune, not build); Steps 9–12 (content fill, win/loss endgame, hardening, discoverability) remain; plus the in-flight clubs-multi-membership work already in the working tree.

## Branches in flight
<!-- Every non-main branch with its merge gate. Empty rows are fine; remove a branch when it merges to main. -->

| Branch | Status | Gate | Gate owner | Ticket |
|--------|--------|------|------------|--------|
| `content-studio-v2-visual` | T-CS-001–006 done + SLOT-GUARANTEE-SPEC committed (`ba4158c`); 272 tests passing | Visual QA in browser → merge to main | PM | T-CS-001–006, T-1778077549001 spike |
| `worktree/interesting-margulis-809d6f` | Spike doc committed `ff9f4e0` | Merge to main | Code | T-1778077549005 |

*(`clubs-heatmap` merged 2026-06-30 as `17db5ee` (MP-01→08). `feature/newsnet-multiuser` merged 2026-05-28 as `65680ff` and deleted. `feature/period-stance-infrastructure` merged 2026-05-01 as `3f0b420`.)*

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

- 2026-06-30 — `17db5ee` merge `clubs-heatmap` → main. **The multiplayer campaign system, MP-01 through MP-08.** Slices:
  - **MP-01** (`8419e71`) — clubs system: player-created clubs, one-per-player, founder = coordinator, application/accept-reject flow. SCA (Society for Creative Anachronism) seeded as the universal auto-join onboarding club.
  - **MP-02 / MP-03** (`2f7fe70`, `f6579a0`) — campaign board (`mp_events`, `mp_event_locations`; location states contested / leaning_pro|con / locked_pro|con) + coordinator assignment and member self-selection (`mp_event_assignments`). "First Renfaire" seed event with six locations.
  - **MP-05** (`ed14141`) — event phase machine (`mp_event_rounds`: planning → active → resolving), Supabase Realtime board sync, server-stamped movement-with-lag (`mp_event_transit`), lazy-expiry boundary resolution, algorithmic AI opposition (con-drift + one paced escalation per boundary). Two fixes landed: Tailwind safelist for locked-state colors (`2469e1e`) and the transit realtime-publication fix.
  - **MP-06** (`f4757e0`) — first playable encounter (Merchant Row reframe-to-legitimize): `mp_location_games` + `mp_encounter_runs`, Level-1 base-skill binding (unlock / soften / reskin), real encounter pressure replacing the placeholder for that one location. 12 new tests.
  - **MP-07** (`b786358`) — exposure persistence (`mp_event_exposure`, per-(event,player) row), split/drift schema, location-state rename.
  - **MP-08** (`a7f56df`) — campaign board UI (blueprint map, gamebar, signal discipline); coordinator Reset button with inline confirm (`b64e9d0`).
  - **Verification:** Tier-4 verified live two-browser — synced countdown, cross-client board sync, transit, auto-resolve. MP-06 verified live.
  - **New DB tables (11):** `clubs`, `club_members`, `club_applications`, `mp_events`, `mp_event_locations`, `mp_event_assignments`, `mp_event_rounds`, `mp_event_transit`, `mp_location_games`, `mp_encounter_runs`, `mp_event_exposure`.
  - **Design:** a Claude Design pass produced a high-fidelity visual prototype (campaign board, deploy, encounter, resolution, club screens) built on the two-signal system — exposure (warm/personal) vs. contention (cool/territorial). Visual port into the component system is pending (Step 8).
  - **Doc-placement pending:** the MP-* prompt files (MP-01…MP-08) and the two design docs (`MP-06-encounter-screen-brief.md`, `MP-campaign-visual-port-notes.md`) are **not yet in the repo** — to be copied into `docs/prompts/` and `docs/design/` when available (deferred from this docsync; source files were not on hand).
- 2026-05-28 — `65680ff` merge `feature/newsnet-multiuser` → main (T-1776329282002). 4 commits absorbed: Phase A migrations (`b824a30` — newsnet_posts, player_handles, harvest_items.board column + 14-row backfill 6/6/2 across net.philosophy/net.misc/rec.music), Phase B API (`561fb2c` — GET/POST /api/newsnet/{posts,handle}, JS-side merge of player + NPC harvest_items, server-stamped in_game_day, case-insensitive handle uniqueness, NPC-attribution reservation list, 28 new vitest tests), Phase C UI (`8817b6d` — modal/tabs/feed/compose/handle-setup, NewsNetButton wired into play/page.tsx header), flicker fix (`90a2289` — `handleState.kind` removed from NewsNetModal useEffect deps; was infinite-loop on no-handle path). tsc clean, vitest 305/1 (+28). SQL acceptance evidence captured per AC against fixture user `f208bd3e`. Migration files named for actual application timestamps (`20260527154342`, `20260527154400`) because applied via MCP, not `db push`, to avoid sweeping up the 7 pre-existing unpushed `20260503*` migrations (now tracked as T-1779926400001). Two pre-existing unpushed main commits caught up: `03d3803` fix, `5b4ec3d` EOD.

*(All earlier entries moved to HANDOFF-archive.md.)*

---

## Project Summary
**MMV (Many More Versions of You)** is a narrative-driven life simulation set in 1983. Players wake in a college dorm, gradually discover they've been sent back in time, and make choices that shape personal journey while uncovering what went wrong in the world. Target audience: adults 55+. **Multiplayer is an active, partly-shipped milestone** — NewsNet (Gate 2, the async social surface) shipped 2026-05-28, and the synchronous collective-action layer (clubs + campaign board + encounters, MP-01→08) merged to main 2026-06-30. See `docs/MULTIPLAYER-DESIGN.md`.

## Stack
- **Framework:** Next.js 16 + React 19 + TypeScript
- **Database:** Supabase (PostgreSQL) — migrations are source of truth for content
- **Styling:** Tailwind CSS
- **Testing:** Vitest
- **Repo:** `~/Projects/V16MMV/mmv/`
- **Package manager:** npm

## Current Milestone
**Milestone A — "It Runs"** is complete. Engine supports chain mode, pool mode (with `requires_choice` gating), skill queue, skills-in-storylets, routine-week mode (activates Day 3 since Week 2 push), server-authoritative day advancement. Content runs through Day 14+ landmarks (L1–L5 PASS). Gate 2 (NewsNet async board) shipped 2026-05-28. The multiplayer synchronous layer (clubs, campaign board, phase machine, first encounter — MP-01→08) merged to main 2026-06-30 (`17db5ee`); next is the Step 8 visual port and Steps 9–12 (content fill, win/loss endgame, hardening, discoverability).

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
