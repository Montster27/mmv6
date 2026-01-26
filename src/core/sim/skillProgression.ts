export function skillCostForLevel(level: number): number {
  return Math.round((level * level) / 2) + 1;
}

export function canLevelSkill(params: {
  currentLevel: number;
  availablePoints: number;
}): boolean {
  const nextLevel = params.currentLevel + 1;
  const cost = skillCostForLevel(nextLevel);
  return params.availablePoints >= cost;
}
