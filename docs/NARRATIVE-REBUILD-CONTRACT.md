# Narrative rebuild: working contract

Status: implementation guide for `Narrative_rebuild`, October 2, 2026. The companion [review](NARRATIVE-INTEGRATION-REVIEW-2026-10-02.md) explains the design reasoning. This document records decisions made in code and questions that remain open; it does not make older proposals canonical by implication.

## Experience and ownership

The player inhabits a particular life and chooses where to spend attention. People and public situations can change when the player is absent. A stream describes a continuing condition and is useful for planning and tracking; it does not prescribe the next scene. A situation or arc groups related storylets around an unresolved question. A storylet is an authored encounter, possibly part of a short local sequence. A commitment is a promise or accepted obligation. A memory is evidence of what happened, what was known, and who could know it. Reflection interprets that evidence without inventing a cause.

Several arcs may affect one stream, and one arc may affect several streams. No stream owns an NPC or a resource. The player may pursue a lead, accept an offered encounter, pass on it, or spend time on a routine or recovery action. Passing on an offer does not mean breaking a promise; it may allow a fixed event to happen without the player.

## Opportunity states

Use these distinct meanings throughout selection, logs, and future content:

| State | Meaning | Consequence rule |
|---|---|---|
| Ineligible | Hard story facts or feasibility do not permit it | Never offer or resolve |
| Available | Valid in the world now | Can be discovered or remain unseen |
| Offered | Presented to the player | No commitment is implied |
| Passed | Player declined this presentation | May return within its window; no broken-promise inference |
| Chosen | Player entered or acted on the storylet | Apply the authored outcome once |
| Committed | Player accepted a future claim | Track fulfillment, renegotiation, or breach separately |
| Expired/transformed | Original window ended or the world changed | Show an authored aftermath when warranted |

The current database does not persist all of these states. The first UI slice treats passing as a segment-local presentation choice. Durable decline, discovery, commitment, and transformation require an agreed storage contract before schema work.

## Selection and outcome contract

Selection has five stages: hard eligibility, discoverability, attention priority, offer-set diversity, then player choice. Hard gates must never be relaxed to fill a menu. A deadline can raise priority; it cannot override an unmet fact. An explicit local chain may continue when eligible, but a future-dated chain target should not suppress unrelated eligible content on the same stream. Multiple concurrent situations on one stream must be representable. The initial UI change does not yet remove the engine's one-per-track and two-global limits.

On resolution, the server checks the current player, time, storylet eligibility, option, and costs. It then applies costs, resource changes, relationship and skill effects, facts, and logs once. A repeated request must not charge twice. The present route's early duplicate check is a sequential-request safeguard; atomic resolution across concurrent requests needs a database transaction or equivalent server-side primitive and explicit schema authorization.

Preclusion is for a fictional closure, such as an irreversible disclosure or a missed fixed event. Ordinary attention costs, delay, repair, and transformed participation are separate outcomes. A scene that was crowded out by a display cap is not a deliberate refusal.

## Character and world state

Keep distinct: biography and identity; trained capabilities; current energy, stress, money, and other material condition; declared concerns; observed choices; memories and interpretations. Skills should open different approaches or outcomes, while an untrained character still has a meaningful way to act. Current pressure counters are weak evidence of motive. NPCs need authored concerns, availability, ties, and bounded offscreen transitions; information reaches them through witnessing, being told, or plausible inference. Server-authoritative state remains compatible with Vercel request lifetimes.

## Current implementation map

| Concern | Current authority | Rebuild work |
|---|---|---|
| Track offers | `src/core/tracks/selectTrackStorylets.ts`; `src/core/engine/dailyLoop.ts` | Unify hard gates and explanations; remove one-per-track assumption; curate varied sets |
| Standalone offers | `src/core/storylets/selectStorylets.ts` | Stop padding by relaxing hard gates; merge vocabulary with track selection |
| Play presentation | `src/app/(player)/play/page.tsx` | Let player choose and pass offers, then expose pursuit and discovery |
| Track outcome | `src/app/api/tracks/resolve/route.ts` | Recheck eligibility; make effects atomic and idempotent |
| Resources and stress/energy | `src/core/resources/`, `src/core/sim/endOfDay.ts`, `RESOURCE_SYSTEM.md` | Map each writer/reader; reconcile numeric and qualitative state |
| Skills | `src/domain/skills/registry.ts`, `src/core/skills/`, storylet requirements | Choose one in-game practice model and ensure narrative payoffs |
| NPCs and relationships | `src/domain/npcs/registry.ts`, `src/lib/relationships.ts` | Add evidence and bounded offscreen change rather than generic decay |
| Reflection | `src/core/chapter/reflection.ts` | Ground claims in observed events; allow uncertain interpretation |
| Routines and time | `src/core/routine/`, time advancement API | Honor commitments across compressed time |

## Proof before expansion

Build and play one overlapping week with several situations, six to eight central people, a real deadline, an optional pursuit, a quiet positive activity, an NPC-to-NPC change, a repair path, and an evidence-based reflection. Forty to sixty reusable storylets is a planning envelope, not a quota. Compare at least three intentions with the same world seed: seek connection, seek stability, and seek mastery. Count valid meaningful options, distinct relationships and obligations, expired versus merely unshown content, and outcomes a tester can explain. Only then estimate the writing and QA cost of decades of play.

## Open decisions

1. Is a complete life satisfying without pursuing the mystery or institutional influence?
2. Who is the protagonist, given conflicting fixed-protagonist and customizable-character documents?
3. Does personal time advance only through play, and what may happen while offline?
4. Which commitments may lapse during a time jump, and what counts as renegotiation?
5. Which skill and resource model is authoritative when legacy and newer systems disagree?
6. Which facts are private to a life, and which enter shared multiplayer canon?
7. What is the first playable span: a week, semester, or complete life?

These choices should be tested against the week and later-return prototypes before moving the vault or promising a full long-horizon content corpus.
