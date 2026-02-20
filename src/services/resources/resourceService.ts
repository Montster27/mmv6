import "server-only";

import { supabaseServer } from "@/lib/supabase/server";
import { mapLegacyResourceRecord, toLegacyResourceUpdates } from "@/core/resources/resourceMap";
import type { PlayerDayState } from "@/types/dayState";
import {
  applyResourceDeltaToSnapshot,
  computeMorale,
  type ResourceSnapshot,
} from "@/core/resources/resourceDelta";
import { recordResourceTrace } from "@/core/resources/resourceTrace";
import type { ResourceDelta } from "@/domain/arcs/types";

type ResourceApplyOptions = {
  source?: string;
  meta?: Record<string, unknown>;
  extraUpdates?: Record<string, unknown>;
  arcId?: string | null;
  arcInstanceId?: string | null;
  stepKey?: string | null;
  optionKey?: string | null;
};

export async function getResources(
  userId: string,
  dayIndex: number
): Promise<ResourceSnapshot> {
  const dayState = await ensureDayStateUpToDateServer(userId, dayIndex);
  return {
    energy: dayState.energy,
    stress: dayState.stress,
    knowledge: dayState.knowledge,
    cashOnHand: dayState.cashOnHand,
    socialLeverage: dayState.socialLeverage,
    physicalResilience: dayState.physicalResilience,
    morale: computeMorale(dayState.energy, dayState.stress),
  };
}

async function applySkillPoints(userId: string, delta: number) {
  const { data, error } = await supabaseServer
    .from("skill_bank")
    .select("user_id,available_points,cap")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to load skill bank", error);
    throw error;
  }

  if (!data) {
    const { error: insertError } = await supabaseServer.from("skill_bank").insert({
      user_id: userId,
      available_points: Math.max(0, delta),
      cap: 20,
    });
    if (insertError) {
      console.error("Failed to create skill bank", insertError);
      throw insertError;
    }
    return;
  }

  const nextAvailable = (data.available_points ?? 0) + delta;
  const { error: updateError } = await supabaseServer
    .from("skill_bank")
    .update({ available_points: nextAvailable })
    .eq("user_id", userId);
  if (updateError) {
    console.error("Failed to update skill bank", updateError);
    throw updateError;
  }
}

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

async function fetchDayStateServer(
  userId: string,
  dayIndex: number
): Promise<PlayerDayState | null> {
  const { data, error } = await supabaseServer
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
  const { energy: _energy, stress: _stress, ...resourceRest } = resources;
  return {
    user_id: data.user_id,
    day_index: data.day_index,
    energy: data.energy,
    stress: data.stress,
    ...resourceRest,
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

async function createDayStateFromPreviousServer(
  userId: string,
  dayIndex: number
): Promise<PlayerDayState> {
  let source: PlayerDayState | null = null;
  if (dayIndex > 0) {
    source = await fetchDayStateServer(userId, dayIndex - 1).catch(() => null);
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

  const { error: insertError } = await supabaseServer
    .from("player_day_state")
    .insert(insertPayload);

  if (insertError) {
    if (insertError.code !== "23505") {
      console.error("Failed to create day state", insertError);
      throw new Error("Failed to create day state.");
    }
  }

  const created = await fetchDayStateServer(userId, dayIndex);
  if (!created) {
    throw new Error("Failed to create day state.");
  }

  return created;
}

async function ensureDayStateUpToDateServer(
  userId: string,
  dayIndex: number
): Promise<PlayerDayState> {
  const existing = await fetchDayStateServer(userId, dayIndex);
  if (existing) return existing;

  try {
    return await createDayStateFromPreviousServer(userId, dayIndex);
  } catch (error) {
    if ((error as { code?: string })?.code === "23505") {
      const retry = await fetchDayStateServer(userId, dayIndex);
      if (retry) return retry;
    }
    throw error;
  }
}

export async function applyResourceDelta(
  userId: string,
  dayIndex: number,
  delta: ResourceDelta,
  options: ResourceApplyOptions = {}
): Promise<ResourceSnapshot> {
  const dayState = await ensureDayStateUpToDateServer(userId, dayIndex);
  const before: ResourceSnapshot = {
    energy: dayState.energy,
    stress: dayState.stress,
    knowledge: dayState.knowledge,
    cashOnHand: dayState.cashOnHand,
    socialLeverage: dayState.socialLeverage,
    physicalResilience: dayState.physicalResilience,
    morale: computeMorale(dayState.energy, dayState.stress),
  };

  const { next, applied } = applyResourceDeltaToSnapshot(before, {
    resources: delta.resources ?? {},
  });

  const updatePayload = {
    energy: next.energy,
    stress: next.stress,
    ...toLegacyResourceUpdates({
      knowledge: next.knowledge,
      cashOnHand: next.cashOnHand,
      socialLeverage: next.socialLeverage,
      physicalResilience: next.physicalResilience,
    }),
    ...(options.extraUpdates ?? {}),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabaseServer
    .from("player_day_state")
    .update(updatePayload)
    .eq("user_id", userId)
    .eq("day_index", dayIndex);

  if (error) {
    console.error("Failed to update day state", error);
    throw new Error("Failed to update day state.");
  }

  if (typeof delta.skill_points === "number" && delta.skill_points !== 0) {
    await applySkillPoints(userId, delta.skill_points);
  }

  const traceEvent = {
    timestamp: new Date().toISOString(),
    dayIndex,
    source: options.source ?? "resource_delta",
    delta: applied,
    before,
    after: next,
    meta: options.meta,
  };
  recordResourceTrace(traceEvent);

  const { error: logError } = await supabaseServer.from("choice_log").insert({
    user_id: userId,
    day: dayIndex,
    event_type: "RESOURCE_APPLIED",
    arc_id: options.arcId ?? null,
    arc_instance_id: options.arcInstanceId ?? null,
    step_key: options.stepKey ?? null,
    option_key: options.optionKey ?? null,
    delta: { resources: applied, skill_points: delta.skill_points ?? 0 },
    meta: {
      source: options.source ?? "resource_delta",
      ...options.meta,
    },
  });
  if (logError) {
    console.error("Failed to log resource application", logError);
  }

  return next;
}
