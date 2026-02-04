import type { ResourceKey } from "@/core/resources/resourceKeys";

export type ResourceStock = Record<ResourceKey, number>;

const LEGACY_TO_RESOURCE: Record<string, ResourceKey> = {
  study_progress: "knowledge",
  money: "cashOnHand",
  social_capital: "socialLeverage",
  health: "physicalResilience",
};

const RESOURCE_LABELS: Record<ResourceKey, string> = {
  knowledge: "Knowledge",
  cashOnHand: "Cash on Hand",
  socialLeverage: "Social Leverage",
  physicalResilience: "Physical Resilience",
  morale: "Morale",
};

export function resourceLabel(key: ResourceKey): string {
  return RESOURCE_LABELS[key];
}

export function normalizeResourceValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function mapLegacyResourceKey(key: string): ResourceKey | null {
  if (key in LEGACY_TO_RESOURCE) {
    return LEGACY_TO_RESOURCE[key];
  }
  return null;
}

export function mapLegacyResourceRecord(
  record: Record<string, unknown> | null | undefined
): ResourceStock {
  return {
    knowledge: normalizeResourceValue(
      record?.study_progress ?? record?.knowledge
    ),
    cashOnHand: normalizeResourceValue(record?.money ?? record?.cashOnHand),
    socialLeverage: normalizeResourceValue(
      record?.social_capital ?? record?.socialLeverage
    ),
    physicalResilience: normalizeResourceValue(
      record?.health ?? record?.physicalResilience
    ),
    morale: 0,
  };
}

export function toLegacyResourceUpdates(resources: Partial<ResourceStock>) {
  return {
    study_progress:
      typeof resources.knowledge === "number" ? resources.knowledge : undefined,
    money:
      typeof resources.cashOnHand === "number" ? resources.cashOnHand : undefined,
    social_capital:
      typeof resources.socialLeverage === "number"
        ? resources.socialLeverage
        : undefined,
    health:
      typeof resources.physicalResilience === "number"
        ? resources.physicalResilience
        : undefined,
  };
}

export function normalizeResourceDelta(
  input: Record<string, number> | null | undefined
): Partial<ResourceStock> {
  if (!input) return {};
  const output: Partial<ResourceStock> = {};
  for (const [key, value] of Object.entries(input)) {
    if (typeof value !== "number") continue;
    const mapped = mapLegacyResourceKey(key) ?? (key as ResourceKey);
    output[mapped] = (output[mapped] ?? 0) + value;
  }
  return output;
}
