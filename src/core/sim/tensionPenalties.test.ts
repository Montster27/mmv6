import { describe, expect, it } from "vitest";
import { applyTensionPenalties } from "@/core/sim/tensionPenalties";

describe("applyTensionPenalties", () => {
  it("applies fatigue penalty to energy", () => {
    const result = applyTensionPenalties({
      nextEnergy: 80,
      nextStress: 20,
      tensions: [{ key: "fatigue", severity: 2 }],
    });

    expect(result.nextEnergy).toBe(70);
    expect(result.nextStress).toBe(20);
  });

  it("applies unfinished assignment penalty to stress", () => {
    const result = applyTensionPenalties({
      nextEnergy: 50,
      nextStress: 30,
      tensions: [{ key: "unfinished_assignment", severity: 1 }],
    });

    expect(result.nextEnergy).toBe(50);
    expect(result.nextStress).toBe(35);
  });

  it("clamps results", () => {
    const result = applyTensionPenalties({
      nextEnergy: 2,
      nextStress: 98,
      tensions: [
        { key: "fatigue", severity: 2 },
        { key: "unfinished_assignment", severity: 2 },
      ],
    });

    expect(result.nextEnergy).toBe(0);
    expect(result.nextStress).toBe(100);
  });
});
