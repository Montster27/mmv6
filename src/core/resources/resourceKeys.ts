export const RESOURCE_KEYS = [
  "energy",
  "stress",
  "knowledge",
  "cashOnHand",
  "socialLeverage",
  "physicalResilience",
  "morale",
  "skillPoints",
  "focus",
  "memory",
  "networking",
  "grit",
] as const;

export type ResourceKey = (typeof RESOURCE_KEYS)[number];
