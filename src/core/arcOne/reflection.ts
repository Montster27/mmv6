import type { ArcOneState, LifePressureState, MoneyBand, SkillFlags, NpcMemory } from "@/core/arcOne/types";

const SKEW_THRESHOLD = 2;

function compareAxis(a: number, b: number, aLine: string, bLine: string): string | null {
  if (a - b >= SKEW_THRESHOLD) return aLine;
  if (b - a >= SKEW_THRESHOLD) return bLine;
  return null;
}

function moneyLine(bandHistory: MoneyBand[]): string | null {
  if (bandHistory.length < 2) return null;
  const tightened = bandHistory.includes("tight");
  if (tightened) return "You accepted financial strain for opportunity.";
  return null;
}

function energyLine(energyLevel: ArcOneState["energyLevel"]): string | null {
  if (energyLevel === "low") {
    return "You repeatedly ran yourself thin.";
  }
  return null;
}

function expiredLine(expiredCount: number, peopleDominant: boolean): string | null {
  if (expiredCount === 0) return null;
  if (peopleDominant) {
    return "Something academic slipped while you invested in connection.";
  }
  return "Some opportunities slipped while you focused elsewhere.";
}

function relationalLine(npcMemory: NpcMemory): string | null {
  const entries = Object.values(npcMemory);
  if (entries.length === 0) return null;
  const trustAvg = entries.reduce((sum, entry) => sum + entry.trust, 0) / entries.length;
  const reliabilityAvg = entries.reduce((sum, entry) => sum + entry.reliability, 0) / entries.length;
  if (reliabilityAvg < 0) {
    return "Others may have experienced you as inconsistent.";
  }
  if (trustAvg > 1) {
    return "You built trust through direct engagement.";
  }
  return null;
}

export function buildReflectionSummary(params: {
  arcOneState: ArcOneState;
  moneyBandHistory?: MoneyBand[];
}): string[] {
  // TODO(arc-one): tune reflection verbosity and ordering.
  const { arcOneState } = params;
  const lines: Array<string | null> = [];
  const lp: LifePressureState = arcOneState.lifePressureState;

  lines.push(
    compareAxis(
      lp.safety,
      lp.risk,
      "When uncertain, you protected yourself from visible risk.",
      "When uncertain, you stepped into visibility."
    )
  );
  lines.push(
    compareAxis(
      lp.people,
      lp.achievement,
      "You tended to invest in connection over output.",
      "You tended to prioritize output over connection."
    )
  );
  lines.push(
    compareAxis(
      lp.confront,
      lp.avoid,
      "You tended to address tension directly.",
      "You tended to keep tension at a distance."
    )
  );

  lines.push(energyLine(arcOneState.energyLevel));
  lines.push(expiredLine(arcOneState.expiredOpportunities.length, lp.people >= lp.achievement));
  lines.push(moneyLine(params.moneyBandHistory ?? []));
  lines.push(relationalLine(arcOneState.npcMemory));

  return lines.filter((line): line is string => Boolean(line)).slice(0, 5);
}

export function buildReplayPrompt() {
  return "If you lived this week again, what would you experiment with?";
}
