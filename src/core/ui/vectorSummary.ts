import { VECTOR_KEYS } from "@/core/vectors/vectorKeys";

type VectorMap = Record<string, number>;

function maxEntry(obj: VectorMap): [string, number] | null {
  const entries = Object.entries(obj).filter(([, v]) => typeof v === "number");
  if (!entries.length) return null;
  return entries.reduce<[string, number]>(
    (best, curr) => (curr[1] > best[1] ? (curr as [string, number]) : best),
    entries[0] as [string, number]
  );
}

export function summarizeVectors(
  vectors?: VectorMap | null,
  deltas?: { vectors?: VectorMap }
): string {
  const safeVectors =
    vectors && typeof vectors === "object"
      ? Object.fromEntries(
          Object.entries(vectors).filter(([key]) => VECTOR_KEYS.includes(key as any))
        )
      : {};
  const deltaVectors =
    deltas?.vectors && typeof deltas.vectors === "object"
      ? Object.fromEntries(
          Object.entries(deltas.vectors).filter(([key]) => VECTOR_KEYS.includes(key as any))
        )
      : undefined;

  if (deltaVectors) {
    const topDelta = maxEntry(deltaVectors);
    if (topDelta && topDelta[1] > 0) {
      return `You’re becoming more ${topDelta[0]}.`;
    }
  }

  const top = maxEntry(safeVectors);
  if (top) {
    return `You lean toward ${top[0]}.`;
  }

  return "Your direction is still forming.";
}
