/** Phase 4 — Routine-week constants. */

export const ROUTINE_BUDGET_HALF_DAYS = 5;
export const DAYS_PER_WEEK = 7;

/** If an NPC with met=true receives no deposits for this many weeks, patience timer fires. */
export const NPC_PATIENCE_THRESHOLD_WEEKS = 2;

/**
 * Compute the diegetic day_index of the Monday that starts the week
 * containing the given dayIndex. Week 1 = days 0-6, Week 2 = days 7-13, etc.
 */
export function computeWeekStart(dayIndex: number): number {
  return Math.floor(dayIndex / DAYS_PER_WEEK) * DAYS_PER_WEEK;
}

/**
 * Diegetic date string for a given day_index.
 * Day 0 = Sept 5, 1983 (Monday of orientation week).
 */
export function diegeticDateLabel(dayIndex: number): string {
  const base = new Date(1983, 8, 5); // Sept 5, 1983
  const d = new Date(base.getTime() + dayIndex * 86_400_000);
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/**
 * Week number (1-based) for a given day_index.
 */
export function weekNumber(dayIndex: number): number {
  return Math.floor(dayIndex / DAYS_PER_WEEK) + 1;
}
