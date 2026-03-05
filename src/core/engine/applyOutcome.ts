import type { DailyState } from "@/types/daily";
import type { StoryletChoice } from "@/types/storylets";
import type { SevenVectors } from "@/types/vectors";
import type { ResourceKey } from "@/core/resources/resourceKeys";

type Outcome = StoryletChoice["outcome"];

export type AppliedDeltas = {
  energy?: number;
  stress?: number;
  vectors?: Record<string, number>;
  /** Resource grants (positive) or costs (negative) to be applied to PlayerDayState. */
  resources?: Partial<Record<ResourceKey, number>>;
};

type OutcomeResult = {
  nextDailyState: DailyState;
  appliedDeltas: AppliedDeltas;
  message: string;
};

const clamp = (value: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, value));

function toVectors(raw: DailyState["vectors"]): SevenVectors {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const entries = Object.entries(raw).filter(
      ([, v]) => typeof v === "number"
    ) as [string, number][];
    return Object.fromEntries(entries);
  }
  return {};
}

export function applyOutcomeToDailyState(
  dailyState: DailyState,
  outcome?: Outcome
): OutcomeResult {
  if (!outcome) {
    return {
      nextDailyState: dailyState,
      appliedDeltas: {},
      message: "",
    };
  }

  const deltas = outcome.deltas ?? {};
  const energyDelta = typeof deltas.energy === "number" ? deltas.energy : 0;
  const stressDelta = typeof deltas.stress === "number" ? deltas.stress : 0;
  const vectorDeltas =
    deltas.vectors && typeof deltas.vectors === "object"
      ? deltas.vectors
      : {};
  const resourceDeltas: Partial<Record<ResourceKey, number>> =
    deltas.resources && typeof deltas.resources === "object"
      ? (deltas.resources as Partial<Record<ResourceKey, number>>)
      : {};

  const currentVectors = toVectors(dailyState.vectors);
  const nextVectors: SevenVectors = { ...currentVectors };
  const appliedVectorDeltas: Record<string, number> = {};

  Object.entries(vectorDeltas).forEach(([key, delta]) => {
    if (typeof delta !== "number") return;
    const current = typeof nextVectors[key] === "number" ? nextVectors[key] : 0;
    const updated = clamp(current + delta);
    nextVectors[key] = updated;
    appliedVectorDeltas[key] = delta;
  });

  const nextEnergy = clamp((dailyState.energy ?? 0) + energyDelta);
  const nextStress = clamp((dailyState.stress ?? 0) + stressDelta);

  return {
    nextDailyState: {
      ...dailyState,
      energy: nextEnergy,
      stress: nextStress,
      vectors: nextVectors,
    },
    appliedDeltas: {
      ...(energyDelta ? { energy: energyDelta } : {}),
      ...(stressDelta ? { stress: stressDelta } : {}),
      ...(Object.keys(appliedVectorDeltas).length
        ? { vectors: appliedVectorDeltas }
        : {}),
      ...(Object.keys(resourceDeltas).length
        ? { resources: resourceDeltas }
        : {}),
    },
    message: outcome.text ?? "",
  };
}
