/**
 * Phase 4 — Routine-Week Mode type definitions.
 *
 * The routine system lets players allocate a weekly time budget across
 * standing activities. Deposits (skill practice, NPC relationship) accrue
 * day-by-day, and interruptions pull the player back into authored storylets
 * when thresholds are crossed or calendar beats fire.
 */

import type { RelationshipEventType } from "@/lib/relationships";

// ---------------------------------------------------------------------------
// Activity definitions (rows in routine_activities table)
// ---------------------------------------------------------------------------

export type ActivityCategory =
  | "academic"
  | "creative"
  | "social"
  | "physical"
  | "practical"
  | "work";

export type NpcDeposit = {
  npc_id: string;
  type: RelationshipEventType;
  magnitude?: number;
};

export type RoutineActivity = {
  id: string;
  activity_key: string;
  display_name: string;
  category: ActivityCategory;
  half_day_cost: number;
  requirements: Record<string, unknown> | null;
  npc_deposits: NpcDeposit[];
  skill_practice_ids: string[];
  flavor_text: string;
  interruption_hooks: string[];
  is_active: boolean;
};

// ---------------------------------------------------------------------------
// Weekly schedule + state
// ---------------------------------------------------------------------------

export type RoutineWeekStatus =
  | "scheduling"
  | "committed"
  | "interrupted"
  | "completed";

export type RoutineWeekState = {
  user_id: string;
  diegetic_week_start: number;
  status: RoutineWeekStatus;
  committed_at: string | null;
  current_week_day: number;
  interruption_storylet_key: string | null;
  interruption_reason: InterruptionType | null;
  interruption_day: number | null;
  deposits_applied_through_day: number;
};

export type PlayerScheduleSelection = {
  activity_key: string;
};

// ---------------------------------------------------------------------------
// Deposits & interruptions
// ---------------------------------------------------------------------------

export type InterruptionType =
  | "gate_threshold"
  | "calendar_beat"
  | "npc_patience";

export type InterruptionTrigger = {
  type: InterruptionType;
  storylet_key: string;
  fires_on_day: number; // 0-6 within the week
  description: string; // one-sentence transition card text
};

export type DepositRecord = {
  day_offset: number; // 0-6 within the week
  activity_key: string;
  npc_events: NpcDeposit[];
  skill_credits: string[];
};

export type WeekTickResult = {
  depositsApplied: DepositRecord[];
  interruptionFired: InterruptionTrigger | null;
  daysCompleted: number;
  newDayIndex: number;
};

// ---------------------------------------------------------------------------
// Calendar beat (loaded from existing storylets table)
// ---------------------------------------------------------------------------

export type CalendarBeat = {
  storylet_key: string;
  due_offset_days: number;
  segment: string | null;
  track_key: string;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const ROUTINE_BUDGET_HALF_DAYS = 5;
