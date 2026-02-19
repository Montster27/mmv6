import type { ResourceKey } from "@/core/resources/resourceKeys";
import { normalizeResourceDelta } from "@/core/resources/resourceMap";

export type ResourceSnapshot = {
  energy: number;
  stress: number;
  knowledge: number;
  cashOnHand: number;
  socialLeverage: number;
  physicalResilience: number;
  morale: number;
};

export type ResourceDeltaInput = {
  resources?: Record<string, number>;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function computeMorale(energy: number, stress: number) {
  return clamp(Math.round(50 + energy - stress), 0, 100);
}

export function applyResourceDeltaToSnapshot(
  snapshot: ResourceSnapshot,
  delta: ResourceDeltaInput
): { next: ResourceSnapshot; applied: Record<ResourceKey, number> } {
  const normalized = normalizeResourceDelta(delta.resources ?? {});
  const applied: Record<ResourceKey, number> = {} as Record<ResourceKey, number>;
  const allowedKeys = new Set([
    "energy",
    "stress",
    "knowledge",
    "cashOnHand",
    "socialLeverage",
    "physicalResilience",
  ]);

  const nextEnergy =
    typeof normalized.energy === "number"
      ? clamp(snapshot.energy + normalized.energy, 0, 100)
      : snapshot.energy;
  const nextStress =
    typeof normalized.stress === "number"
      ? clamp(snapshot.stress + normalized.stress, 0, 100)
      : snapshot.stress;
  const nextKnowledge =
    typeof normalized.knowledge === "number"
      ? snapshot.knowledge + normalized.knowledge
      : snapshot.knowledge;
  const nextCashOnHand =
    typeof normalized.cashOnHand === "number"
      ? snapshot.cashOnHand + normalized.cashOnHand
      : snapshot.cashOnHand;
  const nextSocialLeverage =
    typeof normalized.socialLeverage === "number"
      ? snapshot.socialLeverage + normalized.socialLeverage
      : snapshot.socialLeverage;
  const nextPhysicalResilience =
    typeof normalized.physicalResilience === "number"
      ? clamp(snapshot.physicalResilience + normalized.physicalResilience, 0, 100)
      : snapshot.physicalResilience;

  const nextMorale = computeMorale(nextEnergy, nextStress);
  const next: ResourceSnapshot = {
    energy: nextEnergy,
    stress: nextStress,
    knowledge: nextKnowledge,
    cashOnHand: nextCashOnHand,
    socialLeverage: nextSocialLeverage,
    physicalResilience: nextPhysicalResilience,
    morale: nextMorale,
  };

  for (const [key, value] of Object.entries(normalized)) {
    if (!allowedKeys.has(key)) continue;
    applied[key as ResourceKey] = value;
  }
  return { next, applied };
}

export function previewResourceDelta(
  snapshot: ResourceSnapshot,
  delta: ResourceDeltaInput
) {
  return applyResourceDeltaToSnapshot(snapshot, delta);
}
