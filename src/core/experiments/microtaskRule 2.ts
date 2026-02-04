export function isMicrotaskEligible(dayIndex: number, variant: string) {
  if (dayIndex < 1) return false;
  if (variant === "B") {
    return dayIndex % 3 === 0;
  }
  return dayIndex % 2 === 0;
}
