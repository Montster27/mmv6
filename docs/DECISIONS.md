# Decisions Log

## Engine extended from chain-based to pool-based selection
- **Date:** 2026-04-01
- **Context:** The chain engine required every storylet to be explicitly wired via `next_key`. Tracks died permanently when chains ended. This made multi-path orientation design impossible without extensive manual wiring.
- **Decision:** Extended the engine with pool-based selection. Storylets now surface based on day, segment, and requirements (`requires_choice` gating). `next_key` still works as a priority override for sequential scenes. Tracks stay alive as long as unresolved future content exists.
- **Alternatives considered:** Continuing with chain-only (Option A) — rejected because it would require 3× content for the same coverage and couldn't support the braided-path architecture.
- **Impact:** All future content can be placed by day/segment without chaining. The three different morning-after scenes, the activities fair, and the path-split architecture from the passage map are now buildable.

---

## Phase One scope lock
- **Decision:** We will not add new systems unless they serve the daily loop.
- **Date:** 2026-01-06
