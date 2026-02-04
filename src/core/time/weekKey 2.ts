const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toUtcDate(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function weekKey(date = new Date()): string {
  const utc = toUtcDate(date);
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((utc.getTime() - yearStart.getTime()) / MS_PER_DAY + 1) / 7);
  const year = utc.getUTCFullYear();
  return `${year}-W${String(weekNo).padStart(2, "0")}`;
}
