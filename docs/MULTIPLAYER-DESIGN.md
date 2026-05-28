<!-- /Users/montysharma/projects/V16MMV/mmv/docs/MULTIPLAYER-DESIGN.md -->

# Multiplayer Design — Current Thinking

Status: initial design, pre-prototype. This document is the working snapshot. Open questions are deferred deliberately — we will build a thin slice and revisit.

## Purpose

Multiplayer exists to disrupt social isolation for the target audience (older players, low-stress social gaming). It is not a competitive overlay and not a narrative-extension layer. The solo game remains the personal journey; multiplayer adds collective world-shaping and asynchronous social presence.

The solo game must remain complete on its own. A player who never engages multiplayer should have a full, satisfying MMV experience.

## Three-Layer Architecture

1. **Solo narrative** — tactical, day-to-day. Storylets, tracks, period friction, preclusion. Unchanged by multiplayer.
2. **Asynchronous social (UseNet)** — period-authentic bulletin board. No in-game time cost. Some content seeded; most areas player-managed. A hangout, not a resource.
3. **Synchronous collective action** — scheduled events where players coordinate through clubs to push society in a chosen direction.

The solo and multiplayer layers do not currently interlock. Multiplayer outcomes provide knowledge bonuses and social-network expansion — not direct narrative changes. Cross-layer integration is deferred until cross-season behavior is resolved.

## What Multiplayer Affects

"Influencing society" is intentionally multi-dimensional:

- Impacts on institutions
- Changes in how people talk about things (discourse capture)
- Reprioritizing societal focus
- Improving the life of disadvantaged groups
- Slowing the rise of the gerontocracy

Major historical events (Reagan re-elected, the Challenger explosion, etc.) stay locked in the first few seasons. Player action shapes the texture, discourse, and local consequences around those events — not their occurrence.

## Cohort and World Model

All players currently in the same stream. If scaling forces it later, players may return to "their" stream or an adjacent stream (similar but not exact). No persistent world-state across cohorts in initial design — each season is a clean playthrough with light persistent advantages.

## Cross-Game Persistence

When a player completes a life and returns, they gain a small accumulating bonus — extra starting money, +3 skill points per prior lifetime, etc. Nothing dramatic enough to warp gameplay.

## Clubs

Clubs are the persistent organizing unit for synchronous collective action.

- **Player-created, player-governed.** No seeded political club list.
- **One club per player at a time.** Switching means leaving and applying elsewhere.
- **The founder is the lead.** During events, the founder is the coordinator. Leadership transfer is deferred.
- **Application flow:** applicant browses the directory, applies; the founder accepts or rejects. No skill gates or quorum requirements yet.
- **No cost to found a club yet.** Quorum / social-capital costs deferred.

### The SCA — onboarding club

The Society for Creative Anachronism is the seeded universal entry point. Every new player auto-joins. The SCA is period-appropriate, politically neutral, social by nature, and thematically rhymes with the game itself (a club of people pretending to live in another era, inside a game about time displacement).

The SCA's coordinator is admin-designated during early trials. Eventually transferable.

### SCA Renfaire — tutorial event

To teach the multiplayer loop in a stakes-free context, the SCA runs a tutorial event: putting on a small Renfaire. The Renfaire needs:

- Administrative approvals
- Donations from local merchants
- Buy-in from various dorms

The Renfaire walks the player through the heatmap, deployment, themed-minigame, and resolution loop. After completion, players unlock the ability to found or join other clubs.

### Club directory

Accessible from a campus surface (the quad during new-clubs day, etc.). Lists all clubs with descriptions; players can apply.

## Coordinated Events

### Structure

- **Scheduled times, not always-on.** Players gather for the event.
- **A coordinator (the club founder) sees the campus heatmap** with locations and their current state.
- **All players see the heatmap.** Transparency by default. The coordinator is the voice handing out instructions, not the gatekeeper of information.
- **The coordinator deploys members to locations.** At each location, the deployed player plays a themed minigame, modified by their skills.
- **Unassigned players can show up at any location** and lend their ability to whoever is there. No player is shut out.
- **Per-side caps prevent zerg rushes.** Better players and better heatmap-reading can overcome raw numbers.

### Locations are themed

The campus heatmap surfaces real campus locations — dorms, dining hall, quad, admin building, merchant row, academic buildings. Each location's minigame is thematically appropriate: flyering at the dorm, debate in the dining hall, petition at the quad, meeting-disruption at the admin building, persuasion at merchant row.

### Factions are opportunistic

Players form positions per-issue. Clubs may take stances per-issue but membership does not pre-commit a player to a permanent side.

## UseNet

- Period-authentic bulletin board UX (monospace, threaded, signature blocks, slow refresh).
- **No in-game time cost.** Players can hang out without spending tactical time. Some will live there. That is a feature.
- Some seeded game content; the rest is player-managed newsgroups.
- Players appear as their current characters. A returning player in a new season can be a different character.

## Bootstrapping a Fresh Server

The cold-start problem: on day one no political clubs exist.

- The SCA Renfaire tutorial runs first to teach mechanics.
- Beyond that, early political events may be scripted issues that individual players or ad-hoc groups can engage with, with club-based organizing emerging in response.
- This is unresolved and will be revisited after the thin slice is built.

## Open Questions

### Philosophy / scope
- Should the SCA stay deliberately apolitical, or can it engage political events too?
- What stops the SCA from staying everyone's permanent home? Is that fine?
- Does founding a club cost anything (social capital, time, quorum)? Deferred.
- Are factions truly opportunistic, or do clubs accrete reputation that makes some issues "theirs"?

### Mechanics
- Cap on club size — same as per-side event cap?
- When multiple clubs are on the same side of an issue, how do their efforts aggregate? One leads; others join?
- Math for an unassigned player's "ability contribution" — additive bonus, extra die in a pool, multiplier?
- Event time-shape: tight 60-minute window vs. 24-hour campaign vs. multi-day phased mobilization?
- How are club presidencies eventually transferred or contested?

### Content
- What themed minigames do we build beyond the Renfaire tutorial?
- What is the first non-SCA scripted event — what issue, what factions, what locations?
- UseNet seed list — which newsgroups exist on day one?

### Cross-layer
- Eventually, how do collective wins surface in the solo narrative (a Herald headline, a hallway mention)?
- Cross-season persistence — how do bonuses scale without warping play?
- If a player is in the middle of solo storylets when a scheduled event fires, what is the interrupt model?

### Moderation
- Player-to-player chat in a 1983 setting is a content-moderation problem. Deferred. Will rely on automated tooling plus light staffing.
