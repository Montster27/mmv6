/**
 * Weekly tick orchestrator — Phase 4.
 *
 * Two main entry points:
 *   commitWeek  — validates + persists a schedule, begins the tick
 *   runWeek     — advances deposits day-by-day, checks interruptions
 *   resumeAfterInterruption — continues from interruption day + 1
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  RoutineActivity,
  PlayerScheduleSelection,
  RoutineWeekState,
  WeekTickResult,
  CalendarBeat,
  DepositRecord,
} from "@/types/routine";
import type { RelationshipState } from "@/lib/relationships";
import { validateSchedule } from "./validateSchedule";
import { computeWeeklyDeposits } from "./computeDeposits";
import { checkInterruptions } from "./checkInterruptions";
import { applyDayDeposits } from "./applyDeposits";
import { DAYS_PER_WEEK, NPC_PATIENCE_THRESHOLD_WEEKS } from "./constants";

// ---------------------------------------------------------------------------
// commitWeek
// ---------------------------------------------------------------------------

export async function commitWeek(
  supabase: SupabaseClient,
  userId: string,
  weekStart: number,
  selections: PlayerScheduleSelection[],
  activities: RoutineActivity[],
  playerFlags: Record<string, boolean>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  // Validate
  const validation = validateSchedule(selections, activities, 5, playerFlags);
  if (!validation.valid) {
    return { ok: false, error: validation.error };
  }

  // Delete any existing schedule for this week (re-commit support if added later)
  await supabase
    .from("player_routine_schedules")
    .delete()
    .eq("user_id", userId)
    .eq("diegetic_week_start", weekStart);

  // Insert schedule rows
  const rows = selections.map((sel) => ({
    user_id: userId,
    diegetic_week_start: weekStart,
    activity_key: sel.activity_key,
  }));

  const { error: insertError } = await supabase
    .from("player_routine_schedules")
    .insert(rows);

  if (insertError) {
    console.error("[routine] Failed to insert schedule:", insertError);
    return { ok: false, error: "Failed to save schedule." };
  }

  // Upsert routine_week_state
  const { error: stateError } = await supabase
    .from("routine_week_state")
    .upsert(
      {
        user_id: userId,
        diegetic_week_start: weekStart,
        status: "committed",
        committed_at: new Date().toISOString(),
        current_week_day: 0,
        deposits_applied_through_day: -1,
        interruption_storylet_key: null,
        interruption_reason: null,
        interruption_day: null,
      },
      { onConflict: "user_id,diegetic_week_start" },
    );

  if (stateError) {
    console.error("[routine] Failed to upsert week state:", stateError);
    return { ok: false, error: "Failed to initialize week." };
  }

  return { ok: true };
}

// ---------------------------------------------------------------------------
// runWeek
// ---------------------------------------------------------------------------

/**
 * Advance a committed routine week day-by-day.
 *
 * Applies deposits from (deposits_applied_through_day + 1) through end of
 * week, checking interruptions after each day. Stops at the first
 * interruption or at end of week.
 *
 * Updates day_index in daily_states at the end (bulk advance).
 */
export async function runWeek(
  supabase: SupabaseClient,
  userId: string,
  weekStart: number,
): Promise<WeekTickResult> {
  // Load week state
  const { data: weekState, error: wsErr } = await supabase
    .from("routine_week_state")
    .select("*")
    .eq("user_id", userId)
    .eq("diegetic_week_start", weekStart)
    .single();

  if (wsErr || !weekState) {
    return { depositsApplied: [], interruptionFired: null, daysCompleted: 0, newDayIndex: weekStart };
  }

  const ws = weekState as RoutineWeekState;
  if (ws.status !== "committed") {
    return { depositsApplied: [], interruptionFired: null, daysCompleted: 0, newDayIndex: weekStart };
  }

  // Load committed schedule
  const { data: scheduleRows } = await supabase
    .from("player_routine_schedules")
    .select("activity_key")
    .eq("user_id", userId)
    .eq("diegetic_week_start", weekStart);

  const selections: PlayerScheduleSelection[] = (scheduleRows ?? []).map((r) => ({
    activity_key: (r as { activity_key: string }).activity_key,
  }));

  // Load activity catalog
  const { data: activityRows } = await supabase
    .from("routine_activities")
    .select("*")
    .eq("is_active", true);

  const activities = (activityRows ?? []) as RoutineActivity[];

  // Compute deposit schedule
  const depositSchedule = computeWeeklyDeposits(selections, activities);
  const depositByDay = new Map<number, DepositRecord>();
  for (const d of depositSchedule) {
    depositByDay.set(d.day_offset, d);
  }

  // Load current relationships
  const { data: dailyState } = await supabase
    .from("daily_states")
    .select("relationships")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  let relationships: Record<string, RelationshipState> =
    (dailyState?.relationships as Record<string, RelationshipState>) ?? {};

  // Load calendar beats (active storylets with due_offset_days in this week's range)
  const calendarBeats = await loadCalendarBeats(supabase, weekStart);

  // Load NPC deposit history (simplified: last deposit day from routine weeks)
  const npcDepositHistory = new Map<string, number>();

  // Load trained skills for gate checks
  const { data: trainedRows } = await supabase
    .from("player_skills")
    .select("skill_id")
    .eq("user_id", userId)
    .eq("status", "trained");

  const trainedSkillIds = new Set((trainedRows ?? []).map((r) => (r as { skill_id: string }).skill_id));

  // Track fired gates across this tick to avoid re-firing
  const firedGateKeys = new Set<string>();

  // ── Day-by-day tick ──
  const depositsApplied: DepositRecord[] = [];
  const startDay = ws.deposits_applied_through_day + 1;
  let daysCompleted = 0;

  for (let day = startDay; day < DAYS_PER_WEEK; day++) {
    const diegeticDay = weekStart + day;
    const deposit = depositByDay.get(day) ?? null;

    // Apply deposits
    if (deposit) {
      const result = await applyDayDeposits(
        supabase,
        userId,
        deposit,
        diegeticDay,
        relationships,
      );
      relationships = result.updatedRelationships;
      depositsApplied.push(deposit);

      // Update NPC deposit history for patience checks
      for (const evt of deposit.npc_events) {
        npcDepositHistory.set(evt.npc_id, diegeticDay);
      }
    }

    // Check interruptions
    const interruption = checkInterruptions({
      weekDay: day,
      diegeticDayIndex: diegeticDay,
      depositsToday: deposit,
      relationships,
      trainedSkillIds,
      calendarBeats,
      npcDepositHistory,
      patienceThresholdDays: NPC_PATIENCE_THRESHOLD_WEEKS * DAYS_PER_WEEK,
      firedGateKeys,
    });

    // Update deposits_applied_through_day
    await supabase
      .from("routine_week_state")
      .update({
        deposits_applied_through_day: day,
        current_week_day: day,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("diegetic_week_start", weekStart);

    daysCompleted++;

    if (interruption) {
      // Set interrupted state
      await supabase
        .from("routine_week_state")
        .update({
          status: "interrupted",
          interruption_storylet_key: interruption.storylet_key,
          interruption_reason: interruption.type,
          interruption_day: day,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("diegetic_week_start", weekStart);

      // Advance day_index to interruption day
      await supabase
        .from("daily_states")
        .update({ day_index: diegeticDay })
        .eq("user_id", userId);

      return {
        depositsApplied,
        interruptionFired: interruption,
        daysCompleted,
        newDayIndex: diegeticDay,
      };
    }
  }

  // ── Week completed without interruption ──
  const newDayIndex = weekStart + DAYS_PER_WEEK;

  await supabase
    .from("routine_week_state")
    .update({
      status: "completed",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("diegetic_week_start", weekStart);

  // Advance day_index
  await supabase
    .from("daily_states")
    .update({ day_index: newDayIndex })
    .eq("user_id", userId);

  return {
    depositsApplied,
    interruptionFired: null,
    daysCompleted,
    newDayIndex,
  };
}

// ---------------------------------------------------------------------------
// resumeAfterInterruption
// ---------------------------------------------------------------------------

/**
 * After an interruption storylet is resolved, resume the routine week
 * from the day after the interruption.
 */
export async function resumeAfterInterruption(
  supabase: SupabaseClient,
  userId: string,
  weekStart: number,
): Promise<WeekTickResult> {
  // Reset status to committed so runWeek can continue
  await supabase
    .from("routine_week_state")
    .update({
      status: "committed",
      interruption_storylet_key: null,
      interruption_reason: null,
      interruption_day: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("diegetic_week_start", weekStart);

  return runWeek(supabase, userId, weekStart);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function loadCalendarBeats(
  supabase: SupabaseClient,
  weekStart: number,
): Promise<CalendarBeat[]> {
  const weekEnd = weekStart + DAYS_PER_WEEK - 1;

  const { data } = await supabase
    .from("storylets")
    .select("storylet_key, due_offset_days, segment, track_id")
    .eq("is_active", true)
    .gte("due_offset_days", weekStart)
    .lte("due_offset_days", weekEnd);

  if (!data) return [];

  return data.map((row) => ({
    storylet_key: (row as { storylet_key: string }).storylet_key,
    due_offset_days: (row as { due_offset_days: number }).due_offset_days,
    segment: (row as { segment: string | null }).segment,
    track_key: (row as { track_id: string }).track_id, // UUID, not key — acceptable for Phase 4
  }));
}
