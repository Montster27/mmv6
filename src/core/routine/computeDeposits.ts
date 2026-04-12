/**
 * Pure deposit computation — Phase 4.
 *
 * Given a committed schedule and the activity catalog, distributes
 * deposits across the 7 days of a routine week.
 *
 * Activities with half_day_cost=2 produce deposits on 2 days.
 * Activities with half_day_cost=1 produce deposits on 1 day.
 * The algorithm spreads activities across the week round-robin to
 * avoid clumping.
 */

import type {
  RoutineActivity,
  PlayerScheduleSelection,
  DepositRecord,
  NpcDeposit,
} from "@/types/routine";
import { DAYS_PER_WEEK } from "./constants";

/**
 * Compute the daily deposit schedule for a committed week.
 *
 * Returns one DepositRecord per day that has activity (0-indexed, Mon=0).
 * Days with no activity are omitted.
 */
export function computeWeeklyDeposits(
  selections: PlayerScheduleSelection[],
  activities: RoutineActivity[],
): DepositRecord[] {
  const activityMap = new Map(activities.map((a) => [a.activity_key, a]));

  // Build a list of (activity, day_slots_needed) pairs
  type Slot = { activity: RoutineActivity; dayOffset: number };
  const slots: Slot[] = [];

  // Round-robin cursor — each half-day of cost gets assigned to a day
  let cursor = 0;
  for (const sel of selections) {
    const activity = activityMap.get(sel.activity_key);
    if (!activity) continue;

    for (let i = 0; i < activity.half_day_cost; i++) {
      slots.push({ activity, dayOffset: cursor % DAYS_PER_WEEK });
      cursor++;
    }
  }

  // Aggregate: group slots by day_offset
  const dayMap = new Map<number, { npc_events: NpcDeposit[]; skill_credits: string[]; activity_keys: string[] }>();

  for (const slot of slots) {
    let day = dayMap.get(slot.dayOffset);
    if (!day) {
      day = { npc_events: [], skill_credits: [], activity_keys: [] };
      dayMap.set(slot.dayOffset, day);
    }

    // Add NPC deposits (one set per activity-day)
    for (const dep of slot.activity.npc_deposits) {
      day.npc_events.push(dep);
    }

    // Add skill practice credits
    for (const skillId of slot.activity.skill_practice_ids) {
      if (!day.skill_credits.includes(skillId)) {
        day.skill_credits.push(skillId);
      }
    }

    if (!day.activity_keys.includes(slot.activity.activity_key)) {
      day.activity_keys.push(slot.activity.activity_key);
    }
  }

  // Convert to sorted DepositRecord array
  const records: DepositRecord[] = [];
  for (let d = 0; d < DAYS_PER_WEEK; d++) {
    const day = dayMap.get(d);
    if (!day) continue;

    // Use the first activity_key as the record's key (for audit trail)
    records.push({
      day_offset: d,
      activity_key: day.activity_keys.join("+"),
      npc_events: day.npc_events,
      skill_credits: day.skill_credits,
    });
  }

  return records;
}
