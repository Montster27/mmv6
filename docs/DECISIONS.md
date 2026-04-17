# Decisions Log

## Auto-advance timer removed; segment transitions require explicit clicks
- **Date:** 2026-04-17
- **Context:** The play page had a `useEffect` + `setTimeout(400ms)` that auto-advanced through empty segments. During the lunch_floor conv-node playtest, this caused segment cascades — morning → afternoon → evening → night in ~1 second — because the timer fired with state captured at render time (React stale closure), not at fire time. Three successive patches (storylet_key filter, isFetching guard, ref guard) were needed before the root cause was clear.
- **Decision:** Removed the auto-advance timer entirely. Segment transitions now require explicit player clicks via the existing `SegmentTransitionCard` (empty segments) or the dismiss button's "Continue to afternoon →" (last pending card). Added a Playwright integration test to catch regressions.
- **Alternatives considered:** (1) Longer timer delay (1500ms) — rejected because the race window scales with network latency, not timer duration. (2) Server-side orchestrator endpoint — correct long-term but over-scoped for this fix. (3) State machine refactor — also correct but higher blast radius.
- **Impact:** Tiny UX regression (player clicks one extra button for empty segments). Eliminates an entire class of timing bugs. `advanceInFlightRef` remains as defense-in-depth for the dismiss+advance path.

---

## Engine extended from chain-based to pool-based selection
- **Date:** 2026-04-01
- **Context:** The chain engine required every storylet to be explicitly wired via `next_key`. Tracks died permanently when chains ended. This made multi-path orientation design impossible without extensive manual wiring.
- **Decision:** Extended the engine with pool-based selection. Storylets now surface based on day, segment, and requirements (`requires_choice` gating). `next_key` still works as a priority override for sequential scenes. Tracks stay alive as long as unresolved future content exists.
- **Alternatives considered:** Continuing with chain-only (Option A) — rejected because it would require 3× content for the same coverage and couldn't support the braided-path architecture.
- **Impact:** All future content can be placed by day/segment without chaining. The three different morning-after scenes, the activities fair, and the path-split architecture from the passage map are now buildable.

---

## Conversational nodes added to storylet system
- **Date:** 2026-04-13
- **Context:** Week 2 content (Tuesday Commitment, The Post, Scott's thing) needs dialogue density that flat body + 3 choices can't carry. Writing without nodes means shipping flat and rewriting, or embedding dialogue-as-narration that flattens scenes.
- **Decision:** Added optional `nodes` jsonb column to storylets. When present, renders as an interactive dialogue tree (micro-choices) before terminal choices. Micro-choices are cheap (no costs, no preclusion) and shape tone + NPC memory. Terminal choices remain expensive and life-shaping. Walk-local flags gate terminal choice visibility via `requires_flag` / `excludes_flag`.
- **Impact:** All existing flat storylets unchanged. Retrofitted `lunch_floor` as smoke test. Week 2 content can now be written with dialogue density from day one.

---

## Phase One scope lock
- **Decision:** We will not add new systems unless they serve the daily loop.
- **Date:** 2026-01-06
