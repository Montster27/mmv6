export type Allocation = {
  study: number;
  work: number;
  social: number;
  health: number;
  fun: number;
};

export type SkillLevels = {
  focus: number;
  memory: number;
  networking: number;
  grit: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function clampMultiplier(value: number) {
  return clamp(value, 0.85, 1.2);
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
  posture?: string | null;
  skills?: Partial<SkillLevels> | null;
}): { energy: number; stress: number } {
  const { energy, stress, allocation } = params;
  const skills: SkillLevels = {
    focus: params.skills?.focus ?? 0,
    memory: params.skills?.memory ?? 0,
    networking: params.skills?.networking ?? 0,
    grit: params.skills?.grit ?? 0,
  };

  const focusMultiplier = clampMultiplier(1 - Math.min(0.03 * skills.focus, 0.15));
  const memoryMultiplier = clampMultiplier(1 - Math.min(0.01 * skills.memory, 0.05));
  const networkingMultiplier = clampMultiplier(
    1 + Math.min(0.03 * skills.networking, 0.15)
  );
  const gritStressMultiplier = clampMultiplier(1 - Math.min(0.02 * skills.grit, 0.1));
  const gritEnergyMultiplier = clampMultiplier(1 - Math.min(0.03 * skills.grit, 0.15));

  const stressFromStudyBase = 0.25 * allocation.study;
  const stressFromStudy =
    allocation.study > 0 ? stressFromStudyBase * focusMultiplier : stressFromStudyBase;
  const stressFromWork = 0.25 * allocation.work;
  const reliefHealthFun = 0.35 * (allocation.health + allocation.fun);
  const socialReliefBase = 0.1 * allocation.social;
  const socialRelief =
    allocation.social > 0 ? socialReliefBase * networkingMultiplier : socialReliefBase;

  let stressDelta =
    stressFromStudy + stressFromWork - reliefHealthFun - socialRelief;
  if (allocation.study > 0) {
    stressDelta *= memoryMultiplier;
  }
  stressDelta *= gritStressMultiplier;

  let energyDelta =
    -0.3 * (allocation.study + allocation.work + allocation.social) +
    0.45 * allocation.health +
    0.25 * allocation.fun;
  if (energyDelta < 0) {
    energyDelta *= gritEnergyMultiplier;
  }

  switch (params.posture) {
    case "push":
      stressDelta *= 1.2;
      energyDelta *= 0.9;
      break;
    case "steady":
      stressDelta *= 0.8;
      energyDelta *= 1.1;
      break;
    case "connect":
      if (allocation.social > 0) {
        stressDelta *= 0.85;
      }
      break;
    case "recover":
      stressDelta *= 0.7;
      energyDelta *= 1.2;
      break;
    default:
      break;
  }

  stressDelta = Math.round(stressDelta);
  energyDelta = Math.round(energyDelta);

  const nextEnergy = clamp(energy + energyDelta, 0, 100);
  const nextStress = clamp(stress + stressDelta, 0, 100);

  return { energy: nextEnergy, stress: nextStress };
}
