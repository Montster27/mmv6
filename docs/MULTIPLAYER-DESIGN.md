<!-- /Users/montysharma/projects/V16MMV/mmv/docs/MULTIPLAYER-DESIGN.md -->

# Multiplayer Design — Current Thinking

Status: MP-01 through MP-05 shipped on `clubs-heatmap` branch. This document is the
working snapshot. Open questions are deferred deliberately — we will build a thin slice
and revisit.

---

## Purpose

Multiplayer exists to disrupt social isolation for the target audience (older players,
low-stress social gaming). It is not a competitive overlay and not a narrative-extension
layer. The solo game remains the personal journey; multiplayer adds collective
world-shaping and asynchronous social presence.

The solo game must remain complete on its own. A player who never engages multiplayer
should have a full, satisfying MMV experience.

---

## Three-Layer Architecture

1. **Solo narrative** — tactical, day-to-day. Storylets, tracks, period friction,
   preclusion. Unchanged by multiplayer.
2. **Asynchronous social (UseNet / NewsNet)** — period-authentic bulletin board. No
   in-game time cost. Some content seeded; most areas player-managed. A hangout, not
   a resource.
3. **Synchronous collective action** — scheduled events where players coordinate
   through clubs to push society in a chosen direction.

The solo and multiplayer layers do not currently interlock. Multiplayer outcomes provide
knowledge bonuses and social-network expansion — not direct narrative changes.
Cross-layer integration is deferred until cross-season behavior is resolved.

---

## What Multiplayer Affects

"Influencing society" is intentionally multi-dimensional:

- Impacts on institutions
- Changes in how people talk about things (discourse capture)
- Reprioritizing societal focus
- Improving the life of disadvantaged groups
- Slowing the rise of the gerontocracy

Major historical events (Reagan re-elected, the Challenger explosion, etc.) stay locked
in the first few seasons. Player action shapes the texture, discourse, and local
consequences around those events — not their occurrence.

---

## Cohort and World Model

All players currently in the same stream. If scaling forces it later, players may return
to "their" stream or an adjacent stream (similar but not exact). No persistent world-state
across cohorts in initial design — each season is a clean playthrough with light
persistent advantages.

---

## Cross-Game Persistence

When a player completes a life and returns, they gain a small accumulating bonus — extra
starting money, +3 skill points per prior lifetime, etc. Nothing dramatic enough to warp
gameplay.

---

## Clubs

Clubs are the persistent organizing unit for synchronous collective action.

- **Player-created, player-governed.** No seeded political club list.
- **One club per player at a time.** Switching means leaving and applying elsewhere.
- **The founder is the lead.** During events, the founder is the coordinator. Leadership
  transfer is deferred.
- **Application flow:** applicant browses the directory, applies; the founder accepts or
  rejects. No skill gates or quorum requirements yet.
- **No cost to found a club yet.** Quorum / social-capital costs deferred.

### The SCA — onboarding club

The Society for Creative Anachronism is the seeded universal entry point. Every new player
auto-joins. The SCA is period-appropriate, politically neutral, social by nature, and
thematically rhymes with the game itself (a club of people pretending to live in another
era, inside a game about time displacement).

The SCA's coordinator is admin-designated during early trials. Eventually transferable.

### SCA Renfaire — tutorial event

To teach the multiplayer loop in a stakes-free context, the SCA runs a tutorial event:
putting on a small Renfaire. The Renfaire needs:

- Administrative approvals
- Donations from local merchants
- Buy-in from various dorms

The Renfaire walks the player through the heatmap, deployment, themed-minigame, and
resolution loop. After completion, players unlock the ability to found or join other clubs.

### Club directory

Accessible from a campus surface (the quad during new-clubs day, etc.). Lists all clubs
with descriptions; players can apply.

---

## Coordinated Events

### Structure

- **Scheduled times, not always-on.** Players gather for the event.
- **A coordinator (the club founder) sees the campaign board** with locations and their
  current state.
- **All players see the board.** Transparency by default. The coordinator is the voice
  handing out instructions, not the gatekeeper of information.
- **The coordinator deploys members to locations.** During a planning phase this is
  immediate; during an active round it places the player in transit (they contribute to
  neither location until the lag expires).
- **Unassigned players can show up at any location** and lend their ability to whoever is
  there. No player is shut out.
- **Per-side caps prevent zerg rushes.** Better players and better board-reading can
  overcome raw numbers.

### Event Time-Shape — Reading C (multi-round campaign)

An event runs as a sequence of **rounds**, each with three phases:

```
planning → active → resolving → planning (repeat)
```

| Phase     | Who acts             | Duration                          |
|-----------|----------------------|-----------------------------------|
| planning  | coordinator only     | Until coordinator starts the round (or AFK deadline fires) |
| active    | coordinator + members | Fixed clock (default 120 s); server-authoritative |
| resolving | system               | Instant (boundary math runs, returns to planning) |

**Clock ownership:** `active_started_at` is server-stamped; remaining time is always
computed, never stored. The client countdown is display-only. The server owns expiry.

**Lazy-expiry tick:** no background cron in the current slice. When any client's board
fetch or countdown reaches zero, it calls `POST .../round/resolve`. The server's
conditional `UPDATE WHERE phase='active'` ensures exactly-once resolution regardless of
racing clients. Documented limitation: a round only resolves when at least one client is
active. A scheduled cron can replace the lazy tick in a later slice.

### Campaign Board

The board at `/events/[id]` shows:

- **Phase banner** — current phase, round number, live countdown (active only).
- **Location grid** — six campus locations, each with a state badge
  (`contested | leaning_pro | leaning_con | locked_pro | locked_con`) and a presence list.
- **Coordinator side panel** — full sponsoring-club roster with current assignment or
  transit status per member.

Location state changes one step per round boundary — never jumps from `contested` directly
to `locked`. The full state graph:

```
contested ←→ leaning_pro → locked_pro
contested ←→ leaning_con → locked_con
```

(`locked_*` states are not reversed in the current slice.)

**Realtime:** `mp_event_locations` and `mp_event_rounds` are in the `supabase_realtime`
publication. The board subscribes via Supabase Realtime `postgres_changes`; any state
change by any client (or the system resolution) updates all participants' boards without
a manual refresh.

### Movement with Lag (transit)

When the coordinator moves a member during an **active** round:

1. The member is removed from their current `mp_event_assignments` row.
2. A row is inserted into `mp_event_transit` with a server-stamped
   `arrives_at = now() + TRANSIT_LAG_SECONDS` (default 20 s).
3. The member is "in transit" — they contribute to **neither** location until arrival.
4. On `resolveRound`, all transit rows whose `arrives_at ≤ now()` are finalized into
   `mp_event_assignments` and removed from transit. Players still in flight stay in transit.

Transit is shown on the board: incoming players appear as "→ arriving in Ns" on the
destination card, and the roster panel shows "→ North Dorm (14s)" for in-flight members.

### Pressure and State Transitions

Pressure is how much a side pushes a location in a given round. The current slice uses a
**placeholder flat contribution**: one pressure unit per present player
(`placeholderPresenceScore`). This function is isolated so it can be replaced when
encounter results drive the value in a later slice.

At each round boundary:

1. Count present players per location → pro pressure score.
2. AI adds a constant `AI_CON_DRIFT` to each non-locked location → con pressure score.
3. `applyStateDelta(currentState, netPro, netCon)` decides the new state — one step only.
4. Location states are batch-updated; `mp_event_rounds` advances to `planning`,
   round number increments.

Threshold (`PRESSURE_THRESHOLD`) and drift constants are marked **demo-tuned** in the code
and will be replaced with skill-calibrated values in a later slice.

### AI Opposition (minimal placeholder)

In each round, the AI applies:

- **Con drift** to every non-locked location (constant `AI_CON_DRIFT = 1`).
- **Committed escalation** to one location, shown in the phase banner as
  "{location} secured by opposition last round."

Escalation target priority (for a legible demo):
1. `leaning_con` — about to tip to locked; most visible push
2. `contested`
3. `leaning_pro`

Within each tier, lowest `display_order` wins (predictable across test runs).

In the First Renfaire starting state, **West Dorm** (`leaning_con`, display_order=5) is
the natural escalation target: it's the only `leaning_con` location and is closest to
locking in the AI's favor.

---

## Build Sequence (shipped slices)

| Slice | Branch commit  | What shipped                                              |
|-------|----------------|-----------------------------------------------------------|
| MP-01 | `8419e71`      | clubs, club_members, club_applications; SCA seed         |
| MP-02 | `2f7fe70`      | mp_events, mp_event_locations; First Renfaire seed; board |
| MP-03 | `f6579a0`      | mp_event_assignments; coordinator assign/unassign; self-select |
| MP-05 | this commit    | mp_event_rounds, mp_event_transit; phase machine; realtime; transit movement; AI drift |

MP-04 (encounter / minigame content) is intentionally skipped in this sequence — the
phase machine infrastructure (MP-05) ships first so the hard runtime mechanics are proved
before any content depends on them.

---

## UseNet / NewsNet

- Period-authentic bulletin board UX (monospace, threaded, signature blocks, slow refresh).
- **No in-game time cost.** Players can hang out without spending tactical time. Some will
  live there. That is a feature.
- Some seeded game content; the rest is player-managed newsgroups.
- Players appear as their current characters. A returning player in a new season can be a
  different character.
- Shipped as Gate 2 (`65680ff`, 2026-05-28).

---

## Bootstrapping a Fresh Server

The cold-start problem: on day one no political clubs exist.

- The SCA Renfaire tutorial runs first to teach mechanics.
- Beyond that, early political events may be scripted issues that individual players or
  ad-hoc groups can engage with, with club-based organizing emerging in response.
- This is unresolved and will be revisited after the thin slice is built.

---

## Open Questions

### Philosophy / scope
- Should the SCA stay deliberately apolitical, or can it engage political events too?
- What stops the SCA from staying everyone's permanent home? Is that fine?
- Does founding a club cost anything (social capital, time, quorum)? Deferred.
- Are factions truly opportunistic, or do clubs accrete reputation that makes some issues
  "theirs"?

### Mechanics
- Cap on club size — same as per-side event cap?
- When multiple clubs are on the same side of an issue, how do their efforts aggregate?
  One leads; others join?
- Math for an unassigned player's "ability contribution" — additive bonus, extra die in a
  pool, multiplier?
- Replace the lazy-expiry tick with a server-side cron trigger (later slice).
- Terminal state reversal: should `locked_*` states ever be re-contested? Deferred.
- Encounter results driving pressure scores (replacing the placeholder flat value).

### Content
- What themed minigames do we build beyond the Renfaire tutorial?
- What is the first non-SCA scripted event — what issue, what factions, what locations?
- UseNet seed list — which newsgroups exist on day one?

### Cross-layer
- Eventually, how do collective wins surface in the solo narrative (a Herald headline, a
  hallway mention)?
- Cross-season persistence — how do bonuses scale without warping play?
- If a player is in the middle of solo storylets when a scheduled event fires, what is the
  interrupt model?

### Moderation
- Player-to-player chat in a 1983 setting is a content-moderation problem. Deferred.
  Will rely on automated tooling plus light staffing.
