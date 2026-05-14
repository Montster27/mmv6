# Crystallizer Flags Registry

**Purpose:** Canonical list of crystallizer flags and their source storylets. Maintained alongside content as new crystallizers ship.

**Why this doc exists:** The reflection engine (T-1778100000005) reads crystallizer flags as labeled inputs — not as pattern-blended axis bumps. Each flag has explicit prose templates in the registry for both the present and absent case. Adding a new crystallizer to the game means adding a row here so the reflection engine knows to handle it.

**Per the downstream-position decision** (`docs/REFLECTION-DESIGN-SPIKE.md` §6): crystallizers are inputs to reflection, not surfaces reflection absorbs. The crystallizer scene fires once as lived experience; reflection reads its trace afterward without re-rendering the moment.

## When to add a row

Add a row when a content ticket closes that:
- Sets a flag via `sets_flag` terminal write to `choice_log` FLAG_SET, OR
- Writes to `daily_states.npc_memory.<npc>.<flag_name>` via `set_npc_memory`, AND
- The flag carries identity-formation weight that reflection should observe

Do NOT add a row for:
- Routine `npc_memory` writes that just track interaction history (e.g., "met_scott_first_day")
- Trivial choice-logging flags (e.g., "selected_morning_breakfast")
- Harvest-pool traces (those write to `player_arc_flags` and have a separate registry surface — see harvest_templates_draft.md)

## Registry

| Flag | Set by | Day | NPC | Gates | Reflection slot |
|---|---|---|---|---|---|
| `scott_noticed_something` | `scott_notices` (terminal) | Day 11 evening | Scott | `daily_states.npc_memory.npc_roommate_scott.noticed_something = true`; seeds 50-year arc per WEEK-2-CONTENT-BRIEF | `relational.primary_npc` (4 prose variants by trust state) |

## Deferred crystallizers (not yet shipped)

These have content tickets parked from the T-1776329282001 close (2026-05-04). They are NOT in the registry yet — add a row when the content ships.

| Planned flag | Planned NPC | Gating signal | Notes |
|---|---|---|---|
| `mike_private_conversation_seen` | Mike | `period_stance: challenged ≥ 2` + `npc_memory.npc_floor_mike.witnessed_pushback = true` | Standalone Week 3+ scene |
| `priya_invitation_accepted` | Priya | `period_stance: challenged ≥ 2` + Priya invitation path | Week 3+ challenge-path crystallizer |
| `jordan_crystallizer_seen` | Jordan | TBD — Jordan threading is across multiple beats, gating signal not finalized | Week 3+ |

## Authoring contract

When you ship a new crystallizer:

1. Add a row to the registry above with all six columns filled
2. Add the flag's present and absent prose templates to the relevant reflection slot in the engine (or coordinate with whoever owns reflection)
3. Confirm prose templates honor the registry constraint (per `docs/REFLECTION-DESIGN-SPIKE.md` §5): templates end on a concrete noun, named action, or specific physical detail — never on an abstract noun, generalized verb, or evaluative claim
4. Move the flag from "Deferred" to the main registry table

## Reading from the registry

The reflection engine reads this file at build time as documentation, not at runtime as data. The runtime read uses the slot definitions in the engine's template registry, which stay in sync with this doc by author discipline. If runtime registry and this file diverge, this file is authoritative for "which flags are crystallizers" and the engine is authoritative for "what prose fires for each flag."

## Source

- Reflection design spike: `docs/REFLECTION-DESIGN-SPIKE.md` (T-1778077549005, approved 2026-05-07)
- Build ticket: T-1778100000005 (Sprint 2)
- Crystallizer scope decision: spike §6 (downstream position)
