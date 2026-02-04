import { supabase } from "@/lib/supabase/browser";
import type { PlayerDayState } from "@/types/dayState";
import { resolveEndOfDay } from "@/core/sim/endOfDay";
import type { Allocation } from "@/core/sim/allocationEffects";
import { applyTensionPenalties } from "@/core/sim/tensionPenalties";
import { fetchPosture, fetchUnresolvedTensions } from "@/lib/dailyInteractions";
import {
  mapLegacyResourceRecord,
  toLegacyResourceUpdates,
} from "@/core/resources/resourceMap";

const DEFAULT_STATE = {
  energy: 70,
  stress: 20,
  cashOnHand: 0,
  knowledge: 0,
  socialLeverage: 0,
  physicalResilience: 50,
  total_study: 0,
  total_work: 0,
  total_social: 0,
  total_health: 0,
  total_fun: 0,
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
      "user_id,day_index,energy,stress,money,study_progress,social_capital,health,total_study,total_work,total_social,total_health,total_fun,allocation_hash,pre_allocation_energy,pre_allocation_stress,pre_allocation_money,pre_allocation_study_progress,pre_allocation_social_capital,pre_allocation_health,resolved_at,end_energy,end_stress,next_energy,next_stress,created_at,updated_at"
    )
    .eq("user_id", userId)
    .eq("day_index", dayIndex)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch day state", error);
    throw new Error("Failed to load day state.");
  }

  if (!data) return null;
  const resources = mapLegacyResourceRecord(data as Record<string, unknown>);
  return {
    user_id: data.user_id,
    day_index: data.day_index,
    energy: data.energy,
    stress: data.stress,
    ...resources,
    total_study: data.total_study ?? 0,
    total_work: data.total_work ?? 0,
    total_social: data.total_social ?? 0,
    total_health: data.total_health ?? 0,
    total_fun: data.total_fun ?? 0,
    allocation_hash: data.allocation_hash ?? null,
    pre_allocation_energy: data.pre_allocation_energy ?? null,
    pre_allocation_stress: data.pre_allocation_stress ?? null,
    pre_allocation_cashOnHand: data.pre_allocation_money ?? null,
    pre_allocation_knowledge: data.pre_allocation_study_progress ?? null,
    pre_allocation_socialLeverage: data.pre_allocation_social_capital ?? null,
    pre_allocation_physicalResilience: data.pre_allocation_health ?? null,
    resolved_at: data.resolved_at ?? null,
    end_energy: data.end_energy ?? null,
    end_stress: data.end_stress ?? null,
    next_energy: data.next_energy ?? null,
    next_stress: data.next_stress ?? null,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
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
    cashOnHand: source?.cashOnHand ?? DEFAULT_STATE.cashOnHand,
    knowledge: source?.knowledge ?? DEFAULT_STATE.knowledge,
    socialLeverage: source?.socialLeverage ?? DEFAULT_STATE.socialLeverage,
    physicalResilience:
      source?.physicalResilience ?? DEFAULT_STATE.physicalResilience,
    total_study: source?.total_study ?? DEFAULT_STATE.total_study,
    total_work: source?.total_work ?? DEFAULT_STATE.total_work,
    total_social: source?.total_social ?? DEFAULT_STATE.total_social,
    total_health: source?.total_health ?? DEFAULT_STATE.total_health,
    total_fun: source?.total_fun ?? DEFAULT_STATE.total_fun,
  };

  const insertPayload = {
    user_id: userId,
    day_index: dayIndex,
    ...toLegacyResourceUpdates(nextState),
    energy: nextState.energy,
    stress: nextState.stress,
    total_study: nextState.total_study,
    total_work: nextState.total_work,
    total_social: nextState.total_social,
    total_health: nextState.total_health,
    total_fun: nextState.total_fun,
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

  if (dayIndex >= 2) {
    const postureRow = await fetchPosture(userId, dayIndex);
    const { data: bank, error: bankError } = await supabase
      .from("skill_bank")
      .select("user_id,available_points,cap,last_awarded_day_index")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (bankError) {
      console.error("Failed to load skill bank", bankError);
      throw bankError;
    }

    const currentBank =
      bank ??
      (await supabase
        .from("skill_bank")
        .insert({
          user_id: userId,
          available_points: 0,
          cap: 10,
          last_awarded_day_index: null,
        })
        .select("user_id,available_points,cap,last_awarded_day_index")
        .maybeSingle()
        .then((result) => result.data));

    if (currentBank) {
      const alreadyAwarded =
        typeof currentBank.last_awarded_day_index === "number" &&
        currentBank.last_awarded_day_index >= dayIndex;
      if (!alreadyAwarded) {
        let baseAward = 0;
        if (dayState.stress < 70 && dayState.energy > 30) {
          baseAward = 1;
        }
        if (postureRow?.posture === "push" && dayState.stress < 85) {
          baseAward += 1;
        }
        const award = Math.min(baseAward, 2);
        const nextAvailable = currentBank.available_points + award;

        const { error: awardError } = await supabase
          .from("skill_bank")
          .update({
            available_points: nextAvailable,
            cap: currentBank.cap > 0 ? currentBank.cap : 10,
            last_awarded_day_index: dayIndex,
          })
          .eq("user_id", userId)
          .or(
            `last_awarded_day_index.is.null,last_awarded_day_index.lt.${dayIndex}`
          );

        if (awardError) {
          console.error("Failed to award skill points", awardError);
          throw awardError;
        }
      }
    }
  }

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
