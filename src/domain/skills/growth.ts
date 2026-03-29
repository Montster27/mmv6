/**
 * Skill Web Growth Engine
 *
 * Skills grow by repetition (choices), not by spending points.
 * Growth thresholds: 0→1 = 3 choices, 1→2 = 7 choices, 2→3 = 15 choices.
 */

import { supabaseServer } from "@/lib/supabase/server";
import { SKILL_BY_ID, COMPOSITE_SKILLS } from "./registry";
import type {
  PlayerSkill,
  PlayerComposite,
  SkillGrowthEntry,
  SkillLevel,
  SkillWebRequirement,
  SkillWebState,
} from "@/types/skillWeb";

/** Fetch the full skill web for a player. */
export async function fetchSkillWeb(userId: string): Promise<SkillWebState> {
  const [skillsRes, compositesRes] = await Promise.all([
    supabaseServer
      .from("player_skill_web")
      .select("skill_id, level, progress")
      .eq("user_id", userId),
    supabaseServer
      .from("player_composites")
      .select("composite_id, level")
      .eq("user_id", userId),
  ]);

  return {
    skills: (skillsRes.data ?? []) as PlayerSkill[],
    composites: (compositesRes.data ?? []) as PlayerComposite[],
  };
}

/** Get the threshold (cumulative choices) needed to reach a given level. */
export function getGrowthThreshold(targetLevel: number): number {
  // Levels 1, 2, 3 map to indices 0, 1, 2
  const thresholds = [3, 7, 15];
  if (targetLevel < 1 || targetLevel > 3) return Infinity;
  return thresholds[targetLevel - 1];
}

/**
 * Apply skill growth from a storylet choice.
 * Increments progress and levels up when threshold is reached.
 * Returns the updated skills that changed.
 */
export async function applySkillGrowth(
  userId: string,
  growthEntries: SkillGrowthEntry[]
): Promise<{ levelsGained: { skill: string; newLevel: number }[] }> {
  if (growthEntries.length === 0) return { levelsGained: [] };

  const levelsGained: { skill: string; newLevel: number }[] = [];

  for (const entry of growthEntries) {
    const def = SKILL_BY_ID[entry.skill];
    if (!def) continue;

    // Fetch or create current state
    const { data: existing } = await supabaseServer
      .from("player_skill_web")
      .select("level, progress")
      .eq("user_id", userId)
      .eq("skill_id", entry.skill)
      .maybeSingle();

    let level = (existing?.level ?? 0) as number;
    let progress = (existing?.progress ?? 0) as number;

    // Already maxed
    if (level >= 3) continue;

    // Increment progress
    progress += entry.increment;

    // Check for level-up
    const threshold = def.growthThresholds[level]; // threshold for next level
    if (progress >= threshold) {
      level = Math.min(3, level + 1) as number;
      progress = 0; // reset progress after level-up
      levelsGained.push({ skill: entry.skill, newLevel: level });
    }

    // Upsert
    await supabaseServer.from("player_skill_web").upsert(
      {
        user_id: userId,
        skill_id: entry.skill,
        level,
        progress,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,skill_id" }
    );
  }

  // Recalculate composites if any levels changed
  if (levelsGained.length > 0) {
    await recalcComposites(userId);
  }

  return { levelsGained };
}

/**
 * Recalculate composite skill levels based on current base skills.
 * Composite level = min(avg of each domain's contributing skills).
 */
export async function recalcComposites(userId: string): Promise<void> {
  const { data: allSkills } = await supabaseServer
    .from("player_skill_web")
    .select("skill_id, level")
    .eq("user_id", userId);

  const skillMap = new Map<string, number>();
  for (const s of allSkills ?? []) {
    skillMap.set(s.skill_id, s.level);
  }

  for (const composite of COMPOSITE_SKILLS) {
    let compositeLevel = Infinity;

    for (const req of composite.requirements) {
      // Check all required skills meet minEach
      const meetsMin = req.skills.every(
        (sid) => (skillMap.get(sid) ?? 0) >= req.minEach
      );
      if (!meetsMin) {
        compositeLevel = 0;
        break;
      }

      // Average of contributing skills for this domain
      const avg =
        req.skills.reduce((sum, sid) => sum + (skillMap.get(sid) ?? 0), 0) /
        req.skills.length;
      compositeLevel = Math.min(compositeLevel, Math.floor(avg));
    }

    if (compositeLevel === Infinity) compositeLevel = 0;
    compositeLevel = Math.min(compositeLevel, composite.maxLevel);

    await supabaseServer.from("player_composites").upsert(
      {
        user_id: userId,
        composite_id: composite.id,
        level: compositeLevel,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,composite_id" }
    );
  }
}

/**
 * Check if a player meets skill web requirements for a choice.
 */
export function checkSkillRequirements(
  playerSkills: PlayerSkill[],
  requirements: SkillWebRequirement[]
): boolean {
  if (!requirements || requirements.length === 0) return true;

  const skillMap = new Map<string, number>();
  for (const s of playerSkills) {
    skillMap.set(s.skill_id, s.level);
  }

  return requirements.every(
    (req) => (skillMap.get(req.skill) ?? 0) >= req.min_level
  );
}
