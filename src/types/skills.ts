/** Skill training queue types — Phase 1 */

export type SkillStatus = "trained" | "active" | "queued" | "locked";

export type SkillDomain =
  | "Academic"
  | "Social"
  | "Physical"
  | "Creative"
  | "Technical"
  | "Practical";

export interface SkillDefinition {
  skill_id: string;
  display_name: string;
  tier: 1 | 2 | 3;
  domain: SkillDomain;
  base_train_seconds: number;
  prerequisite_skill_ids: string[];
}

export interface PlayerSkill {
  user_id: string;
  skill_id: string;
  status: SkillStatus;
  started_at: string | null;
  completes_at: string | null;
  trained_at: string | null;
}

export interface TickResult {
  newState: PlayerSkill[];
  justCompleted: string[];
}
