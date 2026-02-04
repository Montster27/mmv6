export const RESOURCE_KEYS = [
  "knowledge",
  "cashOnHand",
  "socialLeverage",
  "physicalResilience",
  "morale",
] as const;

export type ResourceKey = (typeof RESOURCE_KEYS)[number];
