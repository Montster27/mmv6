import { describe, expect, it } from "vitest";
import { canLevelSkill, skillCostForLevel } from "@/core/sim/skillProgression";

describe("skillProgression", () => {
  it("computes a rising cost curve", () => {
    expect(skillCostForLevel(1)).toBe(2);
    expect(skillCostForLevel(2)).toBe(3);
    expect(skillCostForLevel(3)).toBe(6);
  });

  it("checks available points for next level", () => {
    expect(canLevelSkill({ currentLevel: 0, availablePoints: 1 })).toBe(false);
    expect(canLevelSkill({ currentLevel: 0, availablePoints: 2 })).toBe(true);
  });
});
