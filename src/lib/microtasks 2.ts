import { supabase } from "@/lib/supabase/browser";
import { fetchDailyState } from "@/lib/play";
import type { DailyState } from "@/types/daily";

export const MICRO_TASK_ID = "pattern_match_v1";

export type MicroTaskRun = {
  id: string;
  user_id: string;
  day_index: number;
  task_id: string;
  status: "completed" | "skipped";
  score: number | null;
  duration_ms: number | null;
  created_at: string;
};

export async function fetchMicroTaskRun(
  userId: string,
  dayIndex: number
): Promise<MicroTaskRun | null> {
  const { data, error } = await supabase
    .from("micro_task_runs")
    .select("id,user_id,day_index,task_id,status,score,duration_ms,created_at")
    .eq("user_id", userId)
    .eq("day_index", dayIndex)
    .eq("task_id", MICRO_TASK_ID)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch micro-task run", error);
    return null;
  }

  return data ?? null;
}

async function insertMicroTaskRun(payload: {
  user_id: string;
  day_index: number;
  task_id: string;
  status: "completed" | "skipped";
  score?: number | null;
  duration_ms?: number | null;
}): Promise<boolean> {
  const { error } = await supabase.from("micro_task_runs").insert(payload);
  if (error) {
    const { data: existing } = await supabase
      .from("micro_task_runs")
      .select("id")
      .eq("user_id", payload.user_id)
      .eq("day_index", payload.day_index)
      .eq("task_id", payload.task_id)
      .limit(1)
      .maybeSingle();
    if (existing) {
      return false;
    }
    console.error("Failed to insert micro-task run", error);
    throw error;
  }
  return true;
}

export async function completeMicroTask(
  userId: string,
  dayIndex: number,
  score: number,
  durationMs: number
): Promise<{
  alreadyRecorded: boolean;
  nextDailyState: DailyState | null;
  appliedDeltas: { stress?: number } | null;
}> {
  const inserted = await insertMicroTaskRun({
    user_id: userId,
    day_index: dayIndex,
    task_id: MICRO_TASK_ID,
    status: "completed",
    score,
    duration_ms: durationMs,
  });

  if (!inserted) {
    return { alreadyRecorded: true, nextDailyState: null, appliedDeltas: null };
  }

  const daily = await fetchDailyState(userId);
  if (!daily) {
    return { alreadyRecorded: false, nextDailyState: null, appliedDeltas: null };
  }

  const nextStress = Math.max(0, (daily.stress ?? 0) - 1);
  const nextState: DailyState = {
    ...daily,
    stress: nextStress,
  };

  const { error } = await supabase
    .from("daily_states")
    .update({
      stress: nextStress,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
  if (error) {
    console.error("Failed to update daily state for micro-task", error);
    throw error;
  }

  return {
    alreadyRecorded: false,
    nextDailyState: nextState,
    appliedDeltas: { stress: -1 },
  };
}

export async function skipMicroTask(
  userId: string,
  dayIndex: number
): Promise<{ alreadyRecorded: boolean }> {
  const inserted = await insertMicroTaskRun({
    user_id: userId,
    day_index: dayIndex,
    task_id: MICRO_TASK_ID,
    status: "skipped",
  });

  return { alreadyRecorded: !inserted };
}
