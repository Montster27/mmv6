import type { Allocation } from "@/core/sim/allocationEffects";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function resolveEndOfDay(params: {
  energy: number;
  stress: number;
  allocation?: Allocation | null;
}): {
  endEnergy: number;
  endStress: number;
  nextEnergy: number;
  nextStress: number;
} {
  const endEnergy = clamp(Math.round(params.energy), 0, 100);
  const endStress = clamp(Math.round(params.stress), 0, 100);

  const health = params.allocation?.health ?? 0;
  const fun = params.allocation?.fun ?? 0;

  const sleepRecovery = Math.round(15 + 0.2 * health + 0.1 * fun - 0.2 * endStress);
  const nextEnergy = clamp(endEnergy + sleepRecovery, 0, 100);

  const stressDecay = Math.round(endStress * 0.15 + 0.15 * health + 0.1 * fun);
  const nextStress = clamp(endStress - stressDecay, 0, 100);

  return {
    endEnergy,
    endStress,
    nextEnergy,
    nextStress,
  };
}
