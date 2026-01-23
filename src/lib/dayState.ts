import { supabase } from "@/lib/supabase/browser";
import type { PlayerDayState } from "@/types/dayState";
import { resolveEndOfDay } from "@/core/sim/endOfDay";
import type { Allocation } from "@/core/sim/allocationEffects";
import { applyTensionPenalties } from "@/core/sim/tensionPenalties";
import { fetchUnresolvedTensions } from "@/lib/dailyInteractions";

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
      "user_id,day_index,energy,stress,money,study_progress,social_capital,health,allocation_hash,pre_allocation_energy,pre_allocation_stress,resolved_at,end_energy,end_stress,next_energy,next_stress,created_at,updated_at"
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

  const baseEnergy =
    source?.next_energy ?? source?.energy ?? DEFAULT_STATE.energy;
  const baseStress =
    source?.next_stress ?? source?.stress ?? DEFAULT_STATE.stress;

  const nextState = {
    energy: clamp(baseEnergy, 0, 100),
    stress: clamp(baseStress, 0, 100),
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

function normalizeAllocation(raw: unknown): Allocation | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  return {
    study: typeof record.study === "number" ? record.study : 0,
    work: typeof record.work === "number" ? record.work : 0,
    social: typeof record.social === "number" ? record.social : 0,
    health: typeof record.health === "number" ? record.health : 0,
    fun: typeof record.fun === "number" ? record.fun : 0,
  };
}

export async function finalizeDay(userId: string, dayIndex: number): Promise<void> {
  const dayState = await ensureDayStateUpToDate(userId, dayIndex);
  if (dayState.resolved_at) return;

  const { data: allocationRow, error: allocationError } = await supabase
    .from("time_allocations")
    .select("allocation")
    .eq("user_id", userId)
    .eq("day_index", dayIndex)
    .limit(1)
    .maybeSingle();

  if (allocationError) {
    console.error("Failed to fetch allocation for finalize", allocationError);
    throw allocationError;
  }

  const allocation = normalizeAllocation(allocationRow?.allocation ?? null);
  const resolved = resolveEndOfDay({
    energy: dayState.energy,
    stress: dayState.stress,
    allocation,
  });
  const unresolvedTensions = await fetchUnresolvedTensions(userId, dayIndex);
  const penalized = applyTensionPenalties({
    nextEnergy: resolved.nextEnergy,
    nextStress: resolved.nextStress,
    tensions: unresolvedTensions,
  });

  const { error: updateError } = await supabase
    .from("player_day_state")
    .update({
      resolved_at: new Date().toISOString(),
      end_energy: resolved.endEnergy,
      end_stress: resolved.endStress,
      next_energy: penalized.nextEnergy,
      next_stress: penalized.nextStress,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("day_index", dayIndex)
    .is("resolved_at", null);

  if (updateError) {
    console.error("Failed to finalize day state", updateError);
    throw updateError;
  }
}
