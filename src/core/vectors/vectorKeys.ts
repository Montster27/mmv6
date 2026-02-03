export const VECTOR_KEYS = [
  "reflection",
  "focus",
  "ambition",
  "social",
  "stability",
  "curiosity",
  "agency",
] as const;

export type VectorKey = (typeof VECTOR_KEYS)[number];
