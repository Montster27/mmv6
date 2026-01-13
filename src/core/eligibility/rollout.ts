export function pctInRollout(userId: string, storyletKey: string, pct: number) {
  if (pct <= 0) return false;
  if (pct >= 100) return true;
  const seed = `${userId}:${storyletKey}`;
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const bucket = Math.abs(hash) % 100;
  return bucket < pct;
}
