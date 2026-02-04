import { describe, expect, it } from "vitest";
import { resolveEndOfDay } from "@/core/sim/endOfDay";

describe("resolveEndOfDay", () => {
  it("computes end and next day baselines", () => {
    const result = resolveEndOfDay({
      energy: 70,
      stress: 20,
      allocation: { study: 40, work: 20, social: 10, health: 20, fun: 10 },
    });

    expect(result).toEqual({
      endEnergy: 70,
      endStress: 20,
      nextEnergy: 86,
      nextStress: 13,
    });
  });

  it("clamps extremes", () => {
    const result = resolveEndOfDay({
      energy: 150,
      stress: -10,
      allocation: null,
    });

    expect(result.endEnergy).toBe(100);
    expect(result.endStress).toBe(0);
    expect(result.nextEnergy).toBeGreaterThanOrEqual(0);
    expect(result.nextEnergy).toBeLessThanOrEqual(100);
    expect(result.nextStress).toBeGreaterThanOrEqual(0);
    expect(result.nextStress).toBeLessThanOrEqual(100);
  });
});
