import type { StoryletOutcomeOption } from "@/types/storylets";
import type { SevenVectors } from "@/types/vectors";
import type { DailyState } from "@/types/daily";

export function hashToUnitFloat(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967296;
}

function toVectors(raw: DailyState["vectors"] | undefined): SevenVectors {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const entries = Object.entries(raw).filter(
      ([, v]) => typeof v === "number"
    ) as [string, number][];
    return Object.fromEntries(entries);
  }
  return {};
}

export function chooseWeightedOutcome(
  seed: string,
  outcomes: StoryletOutcomeOption[],
  vectors: DailyState["vectors"] | undefined
): StoryletOutcomeOption {
  const vectorMap = toVectors(vectors);
  const adjusted = outcomes.map((outcome) => {
    const modifier = outcome.modifiers;
    let weight = outcome.weight;
    if (modifier?.vector && typeof modifier.per10 === "number") {
      const value = typeof vectorMap[modifier.vector] === "number"
        ? (vectorMap[modifier.vector] as number)
        : 0;
      weight += Math.floor(value / 10) * modifier.per10;
    }
    return {
      outcome,
      weight: Math.max(1, Math.floor(weight)),
    };
  });

  const total = adjusted.reduce((sum, item) => sum + item.weight, 0);
  const threshold = hashToUnitFloat(seed) * total;
  let cursor = 0;
  for (const item of adjusted) {
    cursor += item.weight;
    if (threshold < cursor) {
      return item.outcome;
    }
  }
  return adjusted[adjusted.length - 1]?.outcome ?? outcomes[0];
}
