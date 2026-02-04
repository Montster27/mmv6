export type Allocation = {
  study: number;
  work: number;
  social: number;
  health: number;
  fun: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function hashAllocation(allocation: Allocation): string {
  const stable = `study:${allocation.study}|work:${allocation.work}|social:${allocation.social}|health:${allocation.health}|fun:${allocation.fun}`;
  return String(hashString(stable));
}

export function applyAllocationToDayState(params: {
  energy: number;
  stress: number;
  allocation: Allocation;
}): { energy: number; stress: number } {
  const { energy, stress, allocation } = params;

  const stressDelta = Math.round(
    0.25 * (allocation.study + allocation.work) -
      0.35 * (allocation.health + allocation.fun) -
      0.1 * allocation.social
  );
  const energyDelta = Math.round(
    -0.3 * (allocation.study + allocation.work + allocation.social) +
      0.45 * allocation.health +
      0.25 * allocation.fun
  );

  const nextEnergy = clamp(energy + energyDelta, 0, 100);
  const nextStress = clamp(stress + stressDelta, 0, 100);

  return { energy: nextEnergy, stress: nextStress };
}
