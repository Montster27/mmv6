/** Format remaining seconds as "Xh Ym" or "Xm Ys" for display. */
export function formatCountdown(completesAt: string | null, now: Date = new Date()): string {
  if (!completesAt) return "";
  const diffMs = new Date(completesAt).getTime() - now.getTime();
  if (diffMs <= 0) return "Ready!";

  const totalSec = Math.ceil(diffMs / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

/** Progress fraction 0–1 for the active skill. */
export function trainingProgress(
  startedAt: string | null,
  completesAt: string | null,
  now: Date = new Date()
): number {
  if (!startedAt || !completesAt) return 0;
  const start = new Date(startedAt).getTime();
  const end = new Date(completesAt).getTime();
  const cur = now.getTime();
  if (end <= start) return 1;
  return Math.min(1, Math.max(0, (cur - start) / (end - start)));
}
