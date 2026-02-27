export type LifePressureState = {
  risk: number;
  safety: number;
  people: number;
  achievement: number;
  confront: number;
  avoid: number;
};

export type EnergyLevel = "high" | "moderate" | "low";

export type MoneyBand = "tight" | "okay" | "comfortable";

export type SkillFlags = {
  studyDiscipline: number;
  socialEase: number;
  assertiveness: number;
  practicalHustle: number;
};

export type NpcMemoryEntry = {
  trust: number;
  reliability: number;
  emotionalLoad: number;
  met?: boolean;
  knows_name?: boolean;
  [key: string]: number | boolean | undefined;
};

export type NpcMemory = Record<string, NpcMemoryEntry>;

export type ReplayIntention = {
  risk_bias?: boolean;
  people_bias?: boolean;
  confront_bias?: boolean;
  achievement_bias?: boolean;
};

export type ExpiredOpportunity = {
  type: "academic" | "social" | "financial";
  day_index: number;
};

export type ArcOneState = {
  lifePressureState: LifePressureState;
  energyLevel: EnergyLevel;
  moneyBand: MoneyBand;
  skillFlags: SkillFlags;
  npcMemory: NpcMemory;
  expiredOpportunities: ExpiredOpportunity[];
  replayIntention: ReplayIntention;
  reflectionDone: boolean;
};
