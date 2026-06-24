import { describe, expect, it } from "vitest";

import {
  computePressure,
  hasSkill,
  selectResolveText,
} from "@/lib/mpEncounters";
import type { ReframeOption } from "@/types/mpEncounters";

// ─── Fixtures ─────────────────────────────────────────────────────────

function makeTrap(): ReframeOption {
  return {
    id: "own_the_fun",
    label: "Own the nerd pride",
    body: "Tell them it's going to be a blast.",
    skill_key: "small_talk",
    base_pro_pressure: 0,
    base_con_pressure: 2,
    is_trap: true,
    skill_amplifier: 0,
    resolve_base: "They smile, but it's the polite kind.",
    resolve_with_skill: "Your delivery lands — but the content is the problem.",
  };
}

function makeOption(
  base_pro = 2,
  amplifier = 1,
  skill_key = "critical_analysis"
): ReframeOption {
  return {
    id: "cultural_angle",
    label: "Frame it as living history",
    body: "The SCA doesn't just play dress-up.",
    skill_key,
    base_pro_pressure: base_pro,
    base_con_pressure: 0,
    is_trap: false,
    skill_amplifier: amplifier,
    resolve_base: "They consider it.",
    resolve_with_skill: "The specifics land.",
  };
}

// ─── computePressure ──────────────────────────────────────────────────

describe("computePressure", () => {
  it("trap yields negative con pressure when player has no skill", () => {
    expect(computePressure(makeTrap(), false)).toBe(-2);
  });

  it("trap yields negative con pressure even when player has the skill", () => {
    expect(computePressure(makeTrap(), true)).toBe(-2);
  });

  it("non-trap without skill returns base_pro_pressure", () => {
    expect(computePressure(makeOption(2, 1), false)).toBe(2);
  });

  it("non-trap with skill returns base_pro + skill_amplifier", () => {
    expect(computePressure(makeOption(2, 1), true)).toBe(3);
  });

  it("low-skill player still gets positive pro pressure from non-trap option", () => {
    // Core design invariant: skill amplifies, doesn't gate the basic win.
    expect(computePressure(makeOption(1, 2), false)).toBeGreaterThan(0);
  });

  it("skilled player beats low-skill on the same non-trap option", () => {
    const opt = makeOption(2, 1);
    expect(computePressure(opt, true)).toBeGreaterThan(computePressure(opt, false));
  });
});

// ─── hasSkill ─────────────────────────────────────────────────────────

describe("hasSkill", () => {
  it("returns false when trained list is empty", () => {
    expect(hasSkill([], "critical_analysis")).toBe(false);
  });

  it("returns false when skill is not in the trained list", () => {
    expect(hasSkill(["small_talk", "budgeting"], "critical_analysis")).toBe(
      false
    );
  });

  it("returns true when skill is present in the trained list", () => {
    expect(
      hasSkill(["critical_analysis", "small_talk"], "critical_analysis")
    ).toBe(true);
  });

  it("returns false for null skillId regardless of trained list", () => {
    expect(hasSkill(["critical_analysis"], null)).toBe(false);
  });
});

// ─── selectResolveText ────────────────────────────────────────────────

describe("selectResolveText", () => {
  it("returns resolve_with_skill when player has the skill", () => {
    const opt = makeOption();
    expect(selectResolveText(opt, true)).toBe("The specifics land.");
  });

  it("returns resolve_base when player lacks the skill", () => {
    const opt = makeOption();
    expect(selectResolveText(opt, false)).toBe("They consider it.");
  });
});
