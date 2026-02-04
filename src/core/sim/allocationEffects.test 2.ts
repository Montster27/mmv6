import { describe, expect, it } from "vitest";
import { applyAllocationToDayState } from "@/core/sim/allocationEffects";

describe("applyAllocationToDayState", () => {
  it("applies deterministic deltas with clamping", () => {
    const result = applyAllocationToDayState({
      energy: 70,
      stress: 20,
      allocation: { study: 40, work: 20, social: 10, health: 20, fun: 10 },
    });

    expect(result.energy).toBe(61);
    expect(result.stress).toBe(24);
  });
});
