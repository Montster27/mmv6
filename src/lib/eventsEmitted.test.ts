import { describe, expect, it } from "vitest";

import { resolveEventsEmitted } from "@/lib/eventsEmitted";
import type {
  ConditionalEmissionGroup,
  EventEmission,
} from "@/types/storylets";

describe("resolveEventsEmitted", () => {
  it("returns [] for undefined/empty input", () => {
    expect(resolveEventsEmitted(undefined)).toEqual([]);
    expect(resolveEventsEmitted(null)).toEqual([]);
    expect(resolveEventsEmitted([])).toEqual([]);
  });

  it("passes flat form through unchanged (backward compat)", () => {
    const flat: EventEmission[] = [
      { npc_id: "scott", type: "COFFEE_OFFERED" },
      { npc_id: "keith", type: "NOTICED" },
    ];
    expect(resolveEventsEmitted(flat, new Set(["anything"]))).toEqual(flat);
    expect(resolveEventsEmitted(flat)).toEqual(flat);
  });

  it("fires only the first matching non-else group", () => {
    const groups: ConditionalEmissionGroup[] = [
      {
        condition: { flag: "hallway_challenged" },
        events: [{ npc_id: "keith", type: "RESPECT" }],
      },
      {
        condition: { flag: "hallway_deflected" },
        events: [{ npc_id: "keith", type: "NEUTRAL" }],
      },
      {
        condition: { else: true },
        events: [{ npc_id: "keith", type: "DISAPPOINTED" }],
      },
    ];
    const result = resolveEventsEmitted(
      groups,
      new Set(["hallway_deflected"])
    );
    expect(result).toEqual([{ npc_id: "keith", type: "NEUTRAL" }]);
  });

  it("first match wins even when subsequent groups would also match", () => {
    const groups: ConditionalEmissionGroup[] = [
      {
        condition: { flag: "a" },
        events: [{ npc_id: "x", type: "FIRST" }],
      },
      {
        condition: { flag: "b" },
        events: [{ npc_id: "x", type: "SECOND" }],
      },
    ];
    const result = resolveEventsEmitted(groups, new Set(["a", "b"]));
    expect(result).toEqual([{ npc_id: "x", type: "FIRST" }]);
  });

  it("all_flags requires every flag present", () => {
    const groups: ConditionalEmissionGroup[] = [
      {
        condition: { all_flags: ["a", "b"] },
        events: [{ npc_id: "x", type: "BOTH" }],
      },
      {
        condition: { else: true },
        events: [{ npc_id: "x", type: "NONE" }],
      },
    ];
    expect(resolveEventsEmitted(groups, new Set(["a"]))).toEqual([
      { npc_id: "x", type: "NONE" },
    ]);
    expect(resolveEventsEmitted(groups, new Set(["a", "b"]))).toEqual([
      { npc_id: "x", type: "BOTH" },
    ]);
  });

  it("falls back to else groups when nothing matched", () => {
    const groups: ConditionalEmissionGroup[] = [
      {
        condition: { flag: "never_set" },
        events: [{ npc_id: "x", type: "MATCHED" }],
      },
      {
        condition: { else: true },
        events: [{ npc_id: "x", type: "FALLBACK" }],
      },
    ];
    expect(resolveEventsEmitted(groups, new Set())).toEqual([
      { npc_id: "x", type: "FALLBACK" },
    ]);
  });

  it("returns [] if nothing matched and there is no else group", () => {
    const groups: ConditionalEmissionGroup[] = [
      {
        condition: { flag: "never" },
        events: [{ npc_id: "x", type: "X" }],
      },
    ];
    expect(resolveEventsEmitted(groups, new Set())).toEqual([]);
  });
});
