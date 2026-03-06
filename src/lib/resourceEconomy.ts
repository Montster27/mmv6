import type { Storylet, StoryletChoice } from "@/types/storylets";
import type { ResourceKey } from "@/core/resources/resourceKeys";

export const PRIMARY_RESOURCE_KEYS: ResourceKey[] = [
  "energy",
  "stress",
  "knowledge",
  "cashOnHand",
  "socialLeverage",
  "physicalResilience",
];

export type ResourceDeltaMap = Partial<Record<ResourceKey, number>>;

/** Aggregate resource deltas for a single choice across all its outcomes. */
export function choiceResourceDeltas(choice: StoryletChoice): ResourceDeltaMap {
  const result: ResourceDeltaMap = {};

  // Deterministic outcome deltas (energy/stress)
  const det = choice.outcome?.deltas;
  if (det?.energy) result.energy = (result.energy ?? 0) + det.energy;
  if (det?.stress) result.stress = (result.stress ?? 0) + det.stress;
  if (det?.resources) {
    for (const [k, v] of Object.entries(det.resources)) {
      if (v !== undefined) {
        result[k as ResourceKey] = (result[k as ResourceKey] ?? 0) + v;
      }
    }
  }

  // Probabilistic outcomes — weight-average the deltas
  const outcomes = choice.outcomes ?? [];
  if (outcomes.length > 0) {
    const totalWeight = outcomes.reduce((s, o) => s + (o.weight ?? 1), 0);
    for (const o of outcomes) {
      const w = (o.weight ?? 1) / (totalWeight || 1);
      if (o.deltas?.energy) result.energy = (result.energy ?? 0) + o.deltas.energy * w;
      if (o.deltas?.stress) result.stress = (result.stress ?? 0) + o.deltas.stress * w;
      if (o.deltas?.resources) {
        for (const [k, v] of Object.entries(o.deltas.resources)) {
          if (v !== undefined) {
            result[k as ResourceKey] = (result[k as ResourceKey] ?? 0) + v * w;
          }
        }
      }
    }
  }

  // Costs resource (deducted when chosen)
  if (choice.costs_resource) {
    const { key, amount } = choice.costs_resource;
    result[key] = (result[key] ?? 0) - amount;
  }

  return result;
}

export type StoryletsEconomyRow = {
  storyletId: string;
  title: string;
  phase: string;
  weight: number;
  choiceCount: number;
  avgDeltas: ResourceDeltaMap;
  /** resource keys that gate entry */
  gates: { key: ResourceKey; min: number }[];
  /** resource keys that get deducted on choice */
  costs: { key: ResourceKey; amount: number }[];
};

export type EconomySummary = {
  rows: StoryletsEconomyRow[];
  /** Across all choices, total average delta per resource */
  globalAvgDeltas: ResourceDeltaMap;
  /** For each resource key: how many storylets gate on it */
  gateCounts: Partial<Record<ResourceKey, number>>;
};

function getPhaseTag(storylet: Storylet): string {
  return (
    (storylet.tags ?? []).find((t) =>
      [
        "intro_hook",
        "guided_core_loop",
        "reflection_arc",
        "community_purpose",
      ].includes(t)
    ) ?? ""
  );
}

export function computeStoryletsEconomy(storylets: Storylet[]): EconomySummary {
  const rows: StoryletsEconomyRow[] = [];
  const globalAccum: Record<string, { sum: number; count: number }> = {};
  const gateCounts: Partial<Record<ResourceKey, number>> = {};

  for (const s of storylets) {
    const choices = s.choices ?? [];
    const choiceCount = choices.length;

    // Per-storylet average deltas across all choices
    const accumDeltas: Record<string, number[]> = {};
    const gates: { key: ResourceKey; min: number }[] = [];
    const costs: { key: ResourceKey; amount: number }[] = [];

    for (const choice of choices) {
      const d = choiceResourceDeltas(choice);
      for (const [k, v] of Object.entries(d)) {
        if (!accumDeltas[k]) accumDeltas[k] = [];
        accumDeltas[k].push(v);
      }
      if (choice.requires_resource) {
        if (!gates.some((g) => g.key === choice.requires_resource!.key)) {
          gates.push({ key: choice.requires_resource.key, min: choice.requires_resource.min });
        }
      }
      if (choice.costs_resource) {
        if (!costs.some((c) => c.key === choice.costs_resource!.key)) {
          costs.push({ key: choice.costs_resource.key, amount: choice.costs_resource.amount });
        }
      }
    }

    const avgDeltas: ResourceDeltaMap = {};
    for (const [k, vals] of Object.entries(accumDeltas)) {
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      avgDeltas[k as ResourceKey] = avg;
      if (!globalAccum[k]) globalAccum[k] = { sum: 0, count: 0 };
      globalAccum[k].sum += avg;
      globalAccum[k].count += 1;
    }

    // Storylet-level gates (requires_resource on the storylet requirements)
    const reqGates = (() => {
      const req = s.requirements ?? {};
      const found: { key: ResourceKey; min: number }[] = [];
      const resourceGateMap: [string, ResourceKey][] = [
        ["requires_cash_min", "cashOnHand"],
        ["requires_knowledge_min", "knowledge"],
        ["requires_social_leverage_min", "socialLeverage"],
        ["requires_physical_resilience_min", "physicalResilience"],
      ];
      for (const [reqKey, resourceKey] of resourceGateMap) {
        if (req[reqKey] !== undefined && req[reqKey] !== null) {
          found.push({ key: resourceKey, min: req[reqKey] as number });
        }
      }
      return found;
    })();

    for (const g of reqGates) {
      gateCounts[g.key] = (gateCounts[g.key] ?? 0) + 1;
    }
    for (const g of gates) {
      gateCounts[g.key] = (gateCounts[g.key] ?? 0) + 1;
    }

    rows.push({
      storyletId: s.id,
      title: s.title,
      phase: getPhaseTag(s),
      weight: s.weight ?? 1,
      choiceCount,
      avgDeltas,
      gates: [...reqGates, ...gates],
      costs,
    });
  }

  const globalAvgDeltas: ResourceDeltaMap = {};
  for (const [k, { sum, count }] of Object.entries(globalAccum)) {
    globalAvgDeltas[k as ResourceKey] = count > 0 ? sum / count : 0;
  }

  return { rows, globalAvgDeltas, gateCounts };
}
