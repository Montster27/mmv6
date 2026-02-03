import type { VectorKey } from "@/core/vectors/vectorKeys";

const FLAG_VECTOR_MAP: Array<{
  flag: string;
  deltas: Partial<Record<VectorKey, number>>;
}> = [
  { flag: "research", deltas: { curiosity: 2 } },
  { flag: "curious", deltas: { curiosity: 2 } },
  { flag: "cautious", deltas: { stability: 2 } },
  { flag: "social", deltas: { social: 2 } },
  { flag: "networking", deltas: { social: 2 } },
  { flag: "avoid", deltas: { reflection: 1, agency: -1 } },
  { flag: "decisive", deltas: { agency: 2 } },
  { flag: "commit", deltas: { agency: 2 } },
];

export function flagToVectorDeltas(
  flags?: Record<string, boolean>
): Record<string, number> {
  if (!flags) return {};
  const deltas: Record<string, number> = {};

  FLAG_VECTOR_MAP.forEach(({ flag, deltas: flagDeltas }) => {
    if (!flags[flag]) return;
    Object.entries(flagDeltas).forEach(([key, delta]) => {
      if (typeof delta !== "number") return;
      deltas[key] = (deltas[key] ?? 0) + delta;
    });
  });

  return deltas;
}
