# Phase One Overview

## Objective
Implement the core daily loop end-to-end so a player can play a day, see progress, and understand when to return.

## Success Criteria
- A signed-in player can complete the daily loop from start to finish.
- Progress is clear (day index, completion state, and next-day availability).
- No blockers to replaying on the next calendar day.

## Not in Scope (Phase One)
- Factions or long-horizon economy systems.
- Deep narrative arcs beyond minimal storylets.
- Multiplayer depth or complex social graph features.

## Phase One Metrics (K2 Admin)
- DAU uses distinct users with `session_start` events per UTC day.
- Completion rate uses users with `stage_complete` + `stage=complete` divided by sessions that day.
- Average session duration uses per-user/day `(latest session_end - earliest session_start)` when both exist.
- Stage duration averages use `stage_complete` payload `duration_ms`.
- Retention D1/D3/D7 uses session_start users on day X who also have session_start on day X+N (UTC days).
- Reflection/social skip rates are `% of sessions` with `reflection_skip` or `social_skip` events.

## Data Notes
- Social boosts are enforced once-per-day in app logic; the boost payload stores `day_index` (not a column), so DB uniqueness is deferred. Consider a dedicated column in a future migration if needed.
