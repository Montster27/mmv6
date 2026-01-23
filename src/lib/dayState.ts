import { supabase } from "@/lib/supabase/browser";
import type { PlayerDayState } from "@/types/dayState";

const DEFAULT_STATE = {
  energy: 70,
  stress: 20,
  money: 0,
  study_progress: 0,
  social_capital: 0,
  health: 50,
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export async function fetchDayState(
  userId: string,
  dayIndex: number
): Promise<PlayerDayState | null> {
  const { data, error } = await supabase
    .from("player_day_state")
    .select(
      "user_id,day_index,energy,stress,money,study_progress,social_capital,health,allocation_hash,pre_allocation_energy,pre_allocation_stress,created_at,updated_at"
    )
    .eq("user_id", userId)
    .eq("day_index", dayIndex)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch day state", error);
    throw new Error("Failed to load day state.");
  }

  return data ?? null;
}

export async function createDayStateFromPrevious(
  userId: string,
  dayIndex: number
): Promise<PlayerDayState> {
  let source = null as PlayerDayState | null;
  if (dayIndex > 0) {
    source = await fetchDayState(userId, dayIndex - 1).catch(() => null);
  }

  const nextState = {
    energy: clamp(source?.energy ?? DEFAULT_STATE.energy, 0, 100),
    stress: clamp(source?.stress ?? DEFAULT_STATE.stress, 0, 100),
    money: source?.money ?? DEFAULT_STATE.money,
    study_progress: source?.study_progress ?? DEFAULT_STATE.study_progress,
    social_capital: source?.social_capital ?? DEFAULT_STATE.social_capital,
    health: source?.health ?? DEFAULT_STATE.health,
  };

  const insertPayload = {
    user_id: userId,
    day_index: dayIndex,
    ...nextState,
    updated_at: new Date().toISOString(),
  };

  const { error: insertError } = await supabase
    .from("player_day_state")
    .insert(insertPayload);

  if (insertError) {
    if (insertError.code !== "23505") {
      console.error("Failed to create day state", insertError);
      throw new Error("Failed to create day state.");
    }
  }

  const created = await fetchDayState(userId, dayIndex);
  if (!created) {
    throw new Error("Failed to create day state.");
  }

  return created;
}

export async function ensureDayStateUpToDate(
  userId: string,
  dayIndex: number
): Promise<PlayerDayState> {
  const existing = await fetchDayState(userId, dayIndex);
  if (existing) return existing;

  try {
    return await createDayStateFromPrevious(userId, dayIndex);
  } catch (error) {
    if ((error as { code?: string })?.code === "23505") {
      const retry = await fetchDayState(userId, dayIndex);
      if (retry) return retry;
    }
    throw error;
  }
}
