export type CheckSkillKey = "focus" | "memory" | "networking" | "grit";

export type Check = {
  id: string;
  baseChance: number;
  skillWeights?: Partial<Record<CheckSkillKey, number>>;
  energyWeight?: number;
  stressWeight?: number;
  postureBonus?: Partial<Record<string, number>>;
};

export type CheckSkillLevels = Record<CheckSkillKey, number>;
