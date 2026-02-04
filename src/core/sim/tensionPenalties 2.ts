export type UnresolvedTension = {
  key: string;
  severity?: number | null;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function applyTensionPenalties(params: {
  nextEnergy: number;
  nextStress: number;
  tensions: UnresolvedTension[];
}): { nextEnergy: number; nextStress: number } {
  let nextEnergy = params.nextEnergy;
  let nextStress = params.nextStress;

  params.tensions.forEach((tension) => {
    const severity = typeof tension.severity === "number" ? tension.severity : 1;
    if (tension.key === "unfinished_assignment") {
      nextStress += 5 * severity;
    } else if (tension.key === "fatigue") {
      nextEnergy -= 5 * severity;
    }
  });

  return {
    nextEnergy: clamp(nextEnergy, 0, 100),
    nextStress: clamp(nextStress, 0, 100),
  };
}
