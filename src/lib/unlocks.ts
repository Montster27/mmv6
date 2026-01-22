import type { ContentArc, ContentInitiative } from "@/types/content";
import type { FactionKey } from "@/types/factions";

const TIER_THRESHOLDS = {
  tier1: 5,
  tier2: 12,
  tier3: 20,
} as const;

type UnlockTier = keyof typeof TIER_THRESHOLDS;

type UnlockRule = {
  arcs: string[];
  initiatives: string[];
};

type UnlockRules = Record<UnlockTier, UnlockRule>;

export const UNLOCK_RULES: Record<FactionKey, UnlockRules> = {
  neo_assyrian: {
    tier1: { arcs: ["anomaly_002"], initiatives: ["quiet_leverage"] },
    tier2: { arcs: ["anomaly_006"], initiatives: ["market_whisper"] },
    tier3: { arcs: ["anomaly_010"], initiatives: [] },
  },
  dynastic_consortium: {
    tier1: { arcs: ["anomaly_003"], initiatives: ["ledger_patronage"] },
    tier2: { arcs: ["anomaly_007"], initiatives: ["silent_exchange"] },
    tier3: { arcs: ["anomaly_011"], initiatives: [] },
  },
  templar_remnant: {
    tier1: { arcs: ["anomaly_004"], initiatives: ["ritual_watch"] },
    tier2: { arcs: ["anomaly_008"], initiatives: ["vigil_chain"] },
    tier3: { arcs: ["anomaly_012"], initiatives: [] },
  },
  bormann_network: {
    tier1: { arcs: ["anomaly_005"], initiatives: ["blackout_sweep"] },
    tier2: { arcs: ["anomaly_009"], initiatives: ["seal_the_gap"] },
    tier3: { arcs: ["anomaly_013"], initiatives: [] },
  },
};

export function computeUnlockedContent(
  alignment: Record<string, number>,
  contentArcs: ContentArc[],
  contentInitiatives: ContentInitiative[]
): { unlockedArcKeys: string[]; unlockedInitiativeKeys: string[] } {
  const availableArcs = new Set(contentArcs.map((arc) => arc.key));
  const availableInitiatives = new Set(
    contentInitiatives.map((initiative) => initiative.key)
  );

  const arcKeys = new Set<string>();
  const initiativeKeys = new Set<string>();

  (Object.keys(UNLOCK_RULES) as Array<keyof typeof UNLOCK_RULES>).forEach(
    (factionKey) => {
      const score = alignment[factionKey] ?? 0;
      const rules = UNLOCK_RULES[factionKey];

      (Object.keys(TIER_THRESHOLDS) as UnlockTier[]).forEach((tier) => {
        if (score < TIER_THRESHOLDS[tier]) return;
        rules[tier].arcs.forEach((key) => {
          if (availableArcs.has(key)) arcKeys.add(key);
        });
        rules[tier].initiatives.forEach((key) => {
          if (availableInitiatives.has(key)) initiativeKeys.add(key);
        });
      });
    }
  );

  return {
    unlockedArcKeys: Array.from(arcKeys),
    unlockedInitiativeKeys: Array.from(initiativeKeys),
  };
}

export function shouldUnlockArc(arcKey: string, unlockedArcKeys: string[]): boolean {
  return unlockedArcKeys.includes(arcKey);
}
