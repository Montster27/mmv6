import "server-only";

import { supabaseServer } from "@/lib/supabase/server";
import { normalizeResourceDelta, toLegacyResourceUpdates } from "@/core/resources/resourceMap";
import type { ResourceDelta } from "@/domain/arcs/types";

type DayState = {
  energy: number;
  stress: number;
  cashOnHand: number;
  knowledge: number;
  socialLeverage: number;
  physicalResilience: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

async function fetchDayState(userId: string, dayIndex: number): Promise<DayState> {
  const { data, error } = await supabaseServer
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
    cashOnHand: data.money ?? 0,
    knowledge: data.study_progress ?? 0,
    socialLeverage: data.social_capital ?? 0,
    physicalResilience: data.health ?? 0,
  };
}

export async function applyResourceDeltaToDayState(
  userId: string,
  dayIndex: number,
  delta: ResourceDelta
): Promise<void> {
  const dayState = await fetchDayState(userId, dayIndex);
  const rawResources = delta.resources ?? {};
  const energyDelta =
    typeof rawResources.energy === "number" ? rawResources.energy : 0;
  const stressDelta =
    typeof rawResources.stress === "number" ? rawResources.stress : 0;
  const resourceDelta = normalizeResourceDelta(rawResources);

  const nextEnergy =
    energyDelta !== 0
      ? clamp(dayState.energy + energyDelta, 0, 100)
      : dayState.energy;
  const nextStress =
    stressDelta !== 0
      ? clamp(dayState.stress + stressDelta, 0, 100)
      : dayState.stress;

  const nextResources = {
    knowledge:
      typeof resourceDelta.knowledge === "number"
        ? dayState.knowledge + resourceDelta.knowledge
        : dayState.knowledge,
    cashOnHand:
      typeof resourceDelta.cashOnHand === "number"
        ? dayState.cashOnHand + resourceDelta.cashOnHand
        : dayState.cashOnHand,
    socialLeverage:
      typeof resourceDelta.socialLeverage === "number"
        ? dayState.socialLeverage + resourceDelta.socialLeverage
        : dayState.socialLeverage,
    physicalResilience:
      typeof resourceDelta.physicalResilience === "number"
        ? clamp(dayState.physicalResilience + resourceDelta.physicalResilience, 0, 100)
        : dayState.physicalResilience,
  };

  const { error } = await supabaseServer
    .from("player_day_state")
    .update({
      energy: nextEnergy,
      stress: nextStress,
      ...toLegacyResourceUpdates(nextResources),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("day_index", dayIndex);

  if (error) {
    console.error("Failed to update day state", error);
    throw new Error("Failed to update day state.");
  }
}
