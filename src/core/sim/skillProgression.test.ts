import { describe, expect, it } from "vitest";
import { canLevelSkill, skillCostForLevel } from "@/core/sim/skillProgression";

describe("skillProgression", () => {
  it("computes a rising cost curve", () => {
    expect(skillCostForLevel(1)).toBe(1);
    expect(skillCostForLevel(2)).toBe(2);
    expect(skillCostForLevel(3)).toBe(5);
  });

  it("checks available points for next level", () => {
    expect(canLevelSkill({ currentLevel: 0, availablePoints: 0 })).toBe(false);
    expect(canLevelSkill({ currentLevel: 0, availablePoints: 1 })).toBe(true);
  });
});
