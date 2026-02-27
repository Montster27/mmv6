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

export type RelationshipState = {
  met: boolean;
  knows_name: boolean;
  knows_face: boolean;
  role_tag?: string;
  relationship: number;
  updated_at?: string;
};

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
  relationships: Record<string, RelationshipState>;
  expiredOpportunities: ExpiredOpportunity[];
  replayIntention: ReplayIntention;
  reflectionDone: boolean;
};
