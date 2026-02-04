export function hashToIndex(seed: string, n: number): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const idx = Math.abs(hash) % n;
  return idx;
}

export function chooseVariant(
  userId: string,
  experimentId: string,
  variants: string[]
) {
  if (variants.length === 0) return "A";
  const seed = `${userId}:${experimentId}`;
  return variants[hashToIndex(seed, variants.length)];
}
