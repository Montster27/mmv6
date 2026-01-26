import { describe, expect, it } from "vitest";
import { resolveCheck } from "@/core/sim/checkResolver";
import type { Check } from "@/types/checks";

describe("resolveCheck", () => {
  const baseCheck: Check = {
    id: "test",
    baseChance: 0.4,
    skillWeights: { focus: 0.02 },
    energyWeight: 0.01,
    stressWeight: -0.02,
    postureBonus: { push: 0.02 },
  };

  it("clamps chance within bounds", () => {
    const resolved = resolveCheck({
      check: { ...baseCheck, baseChance: 0.99 },
      skills: { focus: 10, memory: 0, networking: 0, grit: 0 },
      dayState: { energy: 100, stress: 0 },
      posture: "push",
      seed: "seed",
    });
    expect(resolved.chance).toBeLessThanOrEqual(0.95);
    expect(resolved.chance).toBeGreaterThanOrEqual(0.05);
  });

  it("is deterministic for the same seed", () => {
    const first = resolveCheck({
      check: baseCheck,
      skills: { focus: 2, memory: 1, networking: 0, grit: 0 },
      dayState: { energy: 70, stress: 20 },
      posture: "push",
      seed: "u:1:s1",
    });
    const second = resolveCheck({
      check: baseCheck,
      skills: { focus: 2, memory: 1, networking: 0, grit: 0 },
      dayState: { energy: 70, stress: 20 },
      posture: "push",
      seed: "u:1:s1",
    });
    expect(first.success).toBe(second.success);
    expect(first.chance).toBe(second.chance);
  });
});
