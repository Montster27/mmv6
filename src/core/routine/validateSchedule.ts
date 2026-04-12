/**
 * Pure schedule validation — Phase 4.
 *
 * Checks that a set of selected activities fits within the weekly
 * half-day budget and that all requirements are met.
 */

import type { RoutineActivity, PlayerScheduleSelection } from "@/types/routine";

export type ValidationResult =
  | { valid: true; totalCost: number }
  | { valid: false; error: string };

/**
 * Validate a proposed weekly schedule.
 *
 * @param selections - Activities the player wants to commit to
 * @param activities - Full catalog of available activities
 * @param budget     - Maximum half-days available (default 5)
 * @param playerFlags - Player's current flags (from daily_states.skill_flags etc.)
 */
export function validateSchedule(
  selections: PlayerScheduleSelection[],
  activities: RoutineActivity[],
  budget: number,
  playerFlags: Record<string, boolean>,
): ValidationResult {
  if (selections.length === 0) {
    return { valid: false, error: "Select at least one activity for the week." };
  }

  // Check for duplicates
  const keys = new Set<string>();
  for (const sel of selections) {
    if (keys.has(sel.activity_key)) {
      return { valid: false, error: `Duplicate activity: ${sel.activity_key}` };
    }
    keys.add(sel.activity_key);
  }

  const activityMap = new Map(activities.map((a) => [a.activity_key, a]));

  let totalCost = 0;
  for (const sel of selections) {
    const activity = activityMap.get(sel.activity_key);
    if (!activity) {
      return { valid: false, error: `Unknown activity: ${sel.activity_key}` };
    }
    if (!activity.is_active) {
      return { valid: false, error: `${activity.display_name} is not available.` };
    }

    // Check requirements
    if (activity.requirements) {
      const req = activity.requirements as Record<string, unknown>;
      if (typeof req.requires_flag === "string") {
        if (!playerFlags[req.requires_flag]) {
          return {
            valid: false,
            error: `${activity.display_name} is locked — you haven't unlocked it yet.`,
          };
        }
      }
    }

    totalCost += activity.half_day_cost;
  }

  if (totalCost > budget) {
    return {
      valid: false,
      error: `Too many activities — ${totalCost} half-days selected, but only ${budget} available. Drop something to fit your week.`,
    };
  }

  return { valid: true, totalCost };
}
