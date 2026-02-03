import type { Allocation } from "@/core/sim/allocationEffects";

export function allocationToVectorDeltas(
  allocation: Allocation
): Record<string, number> {
  const deltas: Record<string, number> = {};

  if (allocation.study >= 40) deltas.focus = (deltas.focus ?? 0) + 1;
  if (allocation.work >= 40) deltas.ambition = (deltas.ambition ?? 0) + 1;
  if (allocation.social >= 30) deltas.social = (deltas.social ?? 0) + 1;
  if (allocation.health + allocation.fun >= 40) {
    deltas.stability = (deltas.stability ?? 0) + 1;
  }

  return deltas;
}
