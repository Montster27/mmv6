# Resource System

This document records the canonical resource keys and the lifecycle for resource changes.

## Canonical resource keys
- energy
- stress
- knowledge
- cashOnHand
- socialLeverage
- physicalResilience
- morale (derived: `50 + energy - stress`, clamped 0..100)
- skillPoints
- focus
- memory
- networking
- grit

Display labels are defined in `src/core/resources/resourceMap.ts` and should be used by UI.

## Lifecycle (call graph)
1) Init:
   - `ensureDayStateUpToDate()` creates/loads `player_day_state` defaults.
   - `getResources()` reads `player_day_state` and derives morale.
2) Daily accrual (allocation):
   - `saveTimeAllocation()` computes allocation deltas and calls `applyResourceDelta()`.
3) Gameplay costs/rewards:
   - Arc steps resolve in `src/services/arcs/arcActions.ts` and call `applyResourceDelta()`.
4) Persistence:
   - `applyResourceDelta()` updates `player_day_state` and writes a `RESOURCE_APPLIED`
     entry to `choice_log`.
5) Render:
   - `ProgressPanel` reads `dayState` for energy/stress/resources and derives morale.

## Single source of truth
- All resource deltas should go through `applyResourceDelta()` (client or server).
- `applyResourceDeltaToSnapshot()` provides the pure, shared math and clamping rules.

## Instrumentation
If `DEV_RESOURCE_TRACE=1` or `NEXT_PUBLIC_DEV_RESOURCE_TRACE=1`:
- Each delta is recorded in the in-memory trace buffer.
- Each delta is written to `choice_log` as `RESOURCE_APPLIED`.
- Dev menu shows the last resource trace entries.
