import { supabase } from "@/lib/supabase/browser";
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
  const { data, error } = await supabase
    .from("player_day_state")
    .select("energy,stress,money,study_progress,social_capital,health")
    .eq("user_id", userId)
    .eq("day_index", dayIndex)
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    throw new Error("Failed to load day state.");
  }

  return {
    energy: data.energy ?? 0,
    stress: data.stress ?? 0,
    knowledge: data.study_progress ?? 0,
    cashOnHand: data.money ?? 0,
    socialLeverage: data.social_capital ?? 0,
    physicalResilience: data.health ?? 0,
    morale: computeMorale(data.energy ?? 0, data.stress ?? 0),
  };
}

export async function applyResourceDelta(
  userId: string,
  dayIndex: number,
  delta: ResourceDelta,
  options: ResourceApplyOptions = {}
): Promise<ResourceSnapshot> {
  const before = await getResources(userId, dayIndex);
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

  const { error } = await supabase
    .from("player_day_state")
    .update(updatePayload)
    .eq("user_id", userId)
    .eq("day_index", dayIndex);

  if (error) {
    console.error("Failed to update day state", error);
    throw error;
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

  const { error: logError } = await supabase.from("choice_log").insert({
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

export { previewResourceDelta } from "@/core/resources/resourceDelta";
