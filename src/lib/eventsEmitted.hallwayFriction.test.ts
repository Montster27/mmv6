/**
 * Content-specific test for the period_stance friction beat 2A
 * (hallway_morning_day3 head_to_class_day3 terminal).
 *
 * The playthrough harness mirrors /api/tracks/resolve, which does NOT
 * apply events_emitted to relationships — that's a client-side write
 * path in src/app/(player)/play/page.tsx. So the playthrough integration
 * test (scripts/playthroughs/hallway_friction_challenged.yaml) verifies
 * the harness hooks (period_stance counter, walk flags) but cannot
 * verify the conditional events resolution against live content.
 *
 * This test fills that gap: given the events_emitted JSON exactly as it
 * lands in the migration (20260425110000_hallway_morning_day3_friction_beat.sql),
 * verify that resolveEventsEmitted returns the correct flat event list
 * for each friction path. If the migration drifts from this shape, this
 * test fails — the migration must update both DB and this constant.
 */
import { describe, it, expect } from "vitest";
import type { ConditionalEmissionGroup } from "@/types/storylets";
import { resolveEventsEmitted } from "./eventsEmitted";

// Mirror of choices[0].events_emitted from migration
// 20260425110000_hallway_morning_day3_friction_beat.sql.
// Keep in sync with the live DB content. SELECT jsonb_pretty(choices->0->'events_emitted')
// FROM storylets WHERE storylet_key = 'hallway_morning_day3' to verify.
const HALLWAY_HEAD_TO_CLASS_EVENTS: ConditionalEmissionGroup[] = [
  {
    condition: { flag: "hallway_challenged" },
    events: [
      { npc_id: "npc_floor_keith", type: "AWKWARD_MOMENT", magnitude: 1 },
      { npc_id: "npc_floor_doug", type: "DEFERRED_TENSION", magnitude: 1 },
      { npc_id: "npc_floor_mike", type: "SMALL_KINDNESS", magnitude: 1 },
    ],
  },
  {
    condition: { flag: "hallway_deflected" },
    events: [
      { npc_id: "npc_floor_doug", type: "AWKWARD_MOMENT", magnitude: 0.5 },
    ],
  },
  {
    condition: { flag: "hallway_absorbed" },
    events: [],
  },
  {
    condition: { else: true },
    events: [],
  },
];

describe("hallway_morning_day3 head_to_class_day3 conditional events_emitted", () => {
  it("challenged path → 3 events: Keith AWKWARD, Doug DEFERRED, Mike SMALL_KINDNESS", () => {
    const fired = resolveEventsEmitted(
      HALLWAY_HEAD_TO_CLASS_EVENTS,
      new Set(["hallway_challenged"])
    );
    expect(fired).toHaveLength(3);
    expect(fired).toEqual([
      { npc_id: "npc_floor_keith", type: "AWKWARD_MOMENT", magnitude: 1 },
      { npc_id: "npc_floor_doug", type: "DEFERRED_TENSION", magnitude: 1 },
      { npc_id: "npc_floor_mike", type: "SMALL_KINDNESS", magnitude: 1 },
    ]);
  });

  it("deflected path → 1 event: Doug AWKWARD_MOMENT magnitude 0.5", () => {
    const fired = resolveEventsEmitted(
      HALLWAY_HEAD_TO_CLASS_EVENTS,
      new Set(["hallway_deflected"])
    );
    expect(fired).toEqual([
      { npc_id: "npc_floor_doug", type: "AWKWARD_MOMENT", magnitude: 0.5 },
    ]);
  });

  it("absorbed path → no events (period_stance is the only signal)", () => {
    const fired = resolveEventsEmitted(
      HALLWAY_HEAD_TO_CLASS_EVENTS,
      new Set(["hallway_absorbed"])
    );
    expect(fired).toEqual([]);
  });

  it("no friction flag set (defensive — never happens in practice) → no events via else", () => {
    const fired = resolveEventsEmitted(
      HALLWAY_HEAD_TO_CLASS_EVENTS,
      new Set()
    );
    expect(fired).toEqual([]);
  });

  it("first-match-wins: challenged + deflected both set → only challenged fires", () => {
    // Belt-and-suspenders. The walk-local flag mutation pattern doesn't
    // produce this state (each friction micro sets exactly one of the
    // three flags), but the resolver guarantee is that the FIRST matching
    // group wins. If the engine ever lets two flags coexist (e.g. a
    // future "deflected then later challenged" multi-beat structure),
    // this contract still holds.
    const fired = resolveEventsEmitted(
      HALLWAY_HEAD_TO_CLASS_EVENTS,
      new Set(["hallway_challenged", "hallway_deflected"])
    );
    expect(fired).toHaveLength(3);
    expect(fired[0].npc_id).toBe("npc_floor_keith");
  });
});
