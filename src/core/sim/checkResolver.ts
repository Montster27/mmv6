import type { Check, CheckResult, CheckSkillLevels } from "@/types/checks";
import { hashToUnitFloat } from "@/core/engine/deterministicRoll";

type ResolveParams = {
  check: Check;
  skills: CheckSkillLevels;
  dayState: { energy: number; stress: number };
  posture?: string | null;
  seed: string;
};

export function resolveCheck(params: ResolveParams): {
  chance: number;
  success: boolean;
  contributions: {
    base: number;
    skills: Record<keyof CheckSkillLevels, number>;
    energy: number;
    stress: number;
    posture: number;
  };
} {
  const { check, skills, dayState, posture, seed } = params;
  const base = check.baseChance;
  const skillWeights = check.skillWeights ?? {};
  const energyWeight = check.energyWeight ?? 0;
  const stressWeight = check.stressWeight ?? 0;

  const skillContrib = {
    focus: 0,
    memory: 0,
    networking: 0,
    grit: 0,
  } as Record<keyof CheckSkillLevels, number>;
  (Object.keys(skillWeights) as Array<keyof CheckSkillLevels>).forEach((key) => {
    const weight = skillWeights[key];
    if (typeof weight !== "number") return;
    const bonus = (skills[key] ?? 0) * weight;
    skillContrib[key] = bonus;
  });
  const skillBonus = Object.values(skillContrib).reduce((sum, value) => sum + value, 0);

  const energySteps = Math.floor(dayState.energy / 10);
  const stressSteps = Math.floor(dayState.stress / 10);
  const energyBonus = energySteps * energyWeight;
  const stressBonus = stressSteps * stressWeight;
  const postureBonus =
    posture && check.postureBonus && typeof check.postureBonus[posture] === "number"
      ? (check.postureBonus[posture] as number)
      : 0;

  let chance = base + skillBonus + energyBonus + stressBonus + postureBonus;
  chance = Math.max(0.05, Math.min(0.95, chance));

  const success = hashToUnitFloat(seed) < chance;
  return {
    chance,
    success,
    contributions: {
      base,
      skills: skillContrib,
      energy: energyBonus,
      stress: stressBonus,
      posture: postureBonus,
    },
  };
}
