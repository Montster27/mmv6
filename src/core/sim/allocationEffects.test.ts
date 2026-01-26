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

  it("responds to posture differences", () => {
    const base = applyAllocationToDayState({
      energy: 70,
      stress: 20,
      allocation: { study: 40, work: 20, social: 10, health: 20, fun: 10 },
      posture: "steady",
    });
    const pushed = applyAllocationToDayState({
      energy: 70,
      stress: 20,
      allocation: { study: 40, work: 20, social: 10, health: 20, fun: 10 },
      posture: "push",
    });

    expect(base.energy).not.toBe(pushed.energy);
    expect(base.stress).not.toBe(pushed.stress);
  });

  it("reduces stress and energy loss with grit", () => {
    const base = applyAllocationToDayState({
      energy: 70,
      stress: 20,
      allocation: { study: 50, work: 30, social: 10, health: 5, fun: 5 },
    });
    const grittier = applyAllocationToDayState({
      energy: 70,
      stress: 20,
      allocation: { study: 50, work: 30, social: 10, health: 5, fun: 5 },
      skills: { grit: 4 },
    });

    expect(grittier.stress).toBeLessThanOrEqual(base.stress);
    expect(grittier.energy).toBeGreaterThanOrEqual(base.energy);
  });

  it("increases social relief with networking", () => {
    const base = applyAllocationToDayState({
      energy: 70,
      stress: 20,
      allocation: { study: 10, work: 10, social: 40, health: 20, fun: 20 },
    });
    const networked = applyAllocationToDayState({
      energy: 70,
      stress: 20,
      allocation: { study: 10, work: 10, social: 40, health: 20, fun: 20 },
      skills: { networking: 3 },
    });

    expect(networked.stress).toBeLessThanOrEqual(base.stress);
  });
});
