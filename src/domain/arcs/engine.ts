import type { ArcOffer, ArcStep, ResourceDelta } from "@/domain/arcs/types";

export function computeOfferTone(timesShown: number): number {
  if (timesShown <= 0) return 0;
  if (timesShown === 1) return 1;
  if (timesShown === 2) return 2;
  return 3;
}

export function shouldOfferExpire(currentDay: number, offer: ArcOffer): boolean {
  return currentDay > offer.expires_on_day;
}

export function applyDispositionCost(
  tag: string,
  baseCost: ResourceDelta,
  hesitation: number
): ResourceDelta {
  if (!hesitation || hesitation <= 0) return baseCost;
  const bump = Math.min(3, Math.floor(hesitation / 2));
  const resources = { ...(baseCost.resources ?? {}) };
  resources.stress = (resources.stress ?? 0) + bump;
  return { ...baseCost, resources };
}

export function canProgressToday(
  slotsUsed: number,
  slotsTotal: number,
  stepCostSlots: number = 1
): boolean {
  return slotsUsed + stepCostSlots <= slotsTotal;
}

export function computeNextDueDay(currentDay: number, step: ArcStep): number {
  return currentDay + (step.due_offset_days ?? 0);
}

export function computeArcExpireDay(dueDay: number, step: ArcStep): number {
  return dueDay + (step.expires_after_days ?? 0);
}
