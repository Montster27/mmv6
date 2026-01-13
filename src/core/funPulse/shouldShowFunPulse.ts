export function shouldShowFunPulse(dayIndex: number, _seasonIndex: number) {
  if (dayIndex <= 0) return false;
  return dayIndex % 3 === 0;
}
