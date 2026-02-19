import "server-only";

import { supabaseServer } from "@/lib/supabase/server";
import { ensureDayStateUpToDate } from "@/lib/dayState";
import { toLegacyResourceUpdates } from "@/core/resources/resourceMap";
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
  const dayState = await ensureDayStateUpToDate(userId, dayIndex);
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

export async function applyResourceDelta(
  userId: string,
  dayIndex: number,
  delta: ResourceDelta,
  options: ResourceApplyOptions = {}
): Promise<ResourceSnapshot> {
  const dayState = await ensureDayStateUpToDate(userId, dayIndex);
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
