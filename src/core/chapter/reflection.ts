import type { ChapterOneState, LifePressureState, MoneyBand, RelationshipState } from "@/core/chapter/types";

const SKEW_THRESHOLD = 2;

function compareAxis(a: number, b: number, aLine: string, bLine: string): string | null {
  if (a - b >= SKEW_THRESHOLD) return aLine;
  if (b - a >= SKEW_THRESHOLD) return bLine;
  return null;
}

function moneyLine(bandHistory: MoneyBand[]): string | null {
  if (bandHistory.length < 2) return null;
  const tightened = bandHistory.includes("tight");
  if (tightened) return "Money was tight at some point this week.";
  return null;
}

function energyLine(energyLevel: ChapterOneState["energyLevel"]): string | null {
  if (energyLevel === "low") {
    return "You ended the week low on energy.";
  }
  return null;
}

function expiredLine(expiredCount: number): string | null {
  if (expiredCount === 0) return null;
  return expiredCount === 1
    ? "One opportunity passed this week."
    : `${expiredCount} opportunities passed this week.`;
}

function relationalLine(relationships: Record<string, RelationshipState>): string | null {
  const entries = Object.values(relationships).filter((e) => e.met);
  if (entries.length === 0) return null;
  const trustAvg = entries.reduce((sum, entry) => sum + (entry.trust ?? 0), 0) / entries.length;
  const reliabilityAvg = entries.reduce((sum, entry) => sum + (entry.reliability ?? 0), 0) / entries.length;
  if (reliabilityAvg < -0.5) {
    return "Some relationships ended the week with low reliability.";
  }
  if (trustAvg > 0.5) {
    return "Some of your relationships ended the week with trust.";
  }
  return null;
}

export function buildReflectionSummary(params: {
  chapterOneState: ChapterOneState;
  moneyBandHistory?: MoneyBand[];
}): string[] {
  // TODO(arc-one): tune reflection verbosity and ordering.
  const { chapterOneState } = params;
  const lines: Array<string | null> = [];
  const lp: LifePressureState = chapterOneState.lifePressureState;

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

  lines.push(energyLine(chapterOneState.energyLevel));
  lines.push(expiredLine(chapterOneState.expiredOpportunities.length));
  lines.push(moneyLine(params.moneyBandHistory ?? []));
  lines.push(relationalLine(chapterOneState.relationships ?? {}));

  return lines.filter((line): line is string => Boolean(line)).slice(0, 5);
}

export function buildReplayPrompt() {
  return "If you lived this week again, what would you experiment with?";
}
