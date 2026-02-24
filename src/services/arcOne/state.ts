import "server-only";

import { supabaseServer } from "@/lib/supabase/server";
import { getArcOneState, deriveEnergyLevel, normalizeMoneyBand } from "@/core/arcOne/state";
import type { ArcOneState, ExpiredOpportunity, MoneyBand } from "@/core/arcOne/types";
import { applyMoneyEffect, canSpendMoney } from "@/core/arcOne/money";
import { parseSkillRequirement } from "@/core/arcOne/skill";

export async function fetchArcOneState(userId: string): Promise<ArcOneState | null> {
  const { data, error } = await supabaseServer
    .from("daily_states")
    .select(
      "energy,life_pressure_state,energy_level,money_band,skill_flags,npc_memory,expired_opportunities,replay_intention,arc_one_reflection_done"
    )
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch arc one state", error);
    return null;
  }

  return getArcOneState(data ?? null);
}

export async function updateArcOneState(userId: string, next: Partial<ArcOneState>) {
  const payload: Record<string, unknown> = {};
  if (next.lifePressureState) payload.life_pressure_state = next.lifePressureState;
  if (next.energyLevel) payload.energy_level = next.energyLevel;
  if (next.moneyBand) payload.money_band = normalizeMoneyBand(next.moneyBand);
  if (next.skillFlags) payload.skill_flags = next.skillFlags;
  if (next.npcMemory) payload.npc_memory = next.npcMemory;
  if (next.expiredOpportunities) payload.expired_opportunities = next.expiredOpportunities;
  if (next.replayIntention) payload.replay_intention = next.replayIntention;
  if (typeof next.reflectionDone === "boolean") {
    payload.arc_one_reflection_done = next.reflectionDone;
  }

  if (Object.keys(payload).length === 0) return;

  const { error } = await supabaseServer
    .from("daily_states")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (error) {
    console.error("Failed to update arc one state", error);
  }
}

export function bumpEnergyLevelFromEnergy(energy: number) {
  return deriveEnergyLevel(energy);
}

export { canSpendMoney, applyMoneyEffect };

export { parseSkillRequirement };

export function appendExpired(
  current: ExpiredOpportunity[],
  items: ExpiredOpportunity[]
): ExpiredOpportunity[] {
  return [...current, ...items];
}
