/** Skill Web type definitions — the 11-domain, 114-skill system. */

export type SkillDomain =
  | "intellectual"
  | "social"
  | "financial"
  | "domestic"
  | "emotional"
  | "physical"
  | "trades"
  | "creative"
  | "technology"
  | "professional"
  | "caregiving";

export type SkillLevel = 0 | 1 | 2 | 3;

export type LifeEra = "college" | "launch" | "commit" | "maintain" | "reframe";

export type SkillPrereq = {
  skill: string; // "domain.skill_key" e.g. "intellectual.focused_study"
  minLevel: number;
};

/** Static definition of a base skill (lives in registry, not DB). */
export type BaseSkillDef = {
  id: string; // "domain.skill_key"
  domain: SkillDomain;
  name: string;
  description: string;
  era: LifeEra;
  prerequisites: SkillPrereq[];
  /** Choices required to reach levels 1, 2, 3. */
  growthThresholds: [number, number, number];
};

/** Player's state for a single skill (DB row). */
export type PlayerSkill = {
  skill_id: string;
  level: SkillLevel;
  progress: number; // choices made toward next level
};

/** Static definition of a composite skill. */
export type CompositeSkillDef = {
  id: string;
  name: string;
  description: string;
  requirements: {
    domain: SkillDomain;
    skills: string[]; // skill IDs
    minEach: number;
  }[];
  maxLevel: 3;
};

/** Player's state for a composite skill (DB row). */
export type PlayerComposite = {
  composite_id: string;
  level: number;
};

/** Full skill web state returned by the API. */
export type SkillWebState = {
  skills: PlayerSkill[];
  composites: PlayerComposite[];
};

/** Skill growth entry on a storylet choice. */
export type SkillGrowthEntry = {
  skill: string; // "domain.skill_key"
  increment: number;
};

/** Skill requirement entry on a storylet choice. */
export type SkillWebRequirement = {
  skill: string;
  min_level: number;
};
