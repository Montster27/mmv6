"use client";

import { useState } from "react";
import type { ArcBeat } from "@/types/dailyRun";
import type { StoryletChoice } from "@/types/storylets";
import { STREAM_LABELS } from "@/types/arcOneStreams";
import { TesterOnly } from "@/components/ux/TesterOnly";
import { NarrativeFeedback } from "@/components/play/NarrativeFeedback";
import { resolveNpcTokens, type RelationshipState } from "@/lib/relationships";

type MoneyBand = "tight" | "okay" | "comfortable";

/** Money band hierarchy — higher index = more money. */
const MONEY_BAND_RANK: Record<string, number> = {
  tight: 0,
  okay: 1,
  comfortable: 2,
};

type ArcBeatCardProps = {
  beat: ArcBeat;
  dayIndex: number;
  onChoice: (beat: ArcBeat, option: StoryletChoice) => Promise<void>;
  disabled?: boolean;
  onDismiss?: () => void;
  /** When provided, the card renders in "resolved" mode showing this option's reaction text + Continue. */
  resolvedOption?: StoryletChoice;
  /** Current player money band — used to gate choices with money_requirement. */
  moneyBand?: MoneyBand | null;
  /** Player's current NPC relationship state — used to resolve [[npc_id]] tokens in body text. */
  relationships?: Record<string, RelationshipState> | null;
};

const RESOURCE_LABELS: Record<string, string> = {
  energy: "energy",
  cashOnHand: "cash",
  knowledge: "knowledge",
  socialLeverage: "social leverage",
  physicalResilience: "resilience",
  stress: "stress",
};

function computeDeltas(option: StoryletChoice): Array<{ label: string; delta: number }> {
  const totals: Record<string, number> = {};

  // Legacy format
  if (option.energy_cost) {
    totals.energy = (totals.energy ?? 0) - option.energy_cost;
  }
  if (option.costs?.resources) {
    for (const [k, v] of Object.entries(option.costs.resources)) {
      totals[k] = (totals[k] ?? 0) - v;
    }
  }
  if (option.rewards?.resources) {
    for (const [k, v] of Object.entries(option.rewards.resources)) {
      totals[k] = (totals[k] ?? 0) + v;
    }
  }

  // Content format: outcome.deltas
  const deltas = option.outcome?.deltas;
  if (deltas) {
    if (typeof deltas.energy === "number" && deltas.energy !== 0) {
      totals.energy = (totals.energy ?? 0) + deltas.energy;
    }
    if (typeof deltas.stress === "number" && deltas.stress !== 0) {
      totals.stress = (totals.stress ?? 0) + deltas.stress;
    }
    if (deltas.resources) {
      for (const [k, v] of Object.entries(deltas.resources)) {
        if (typeof v === "number" && v !== 0) {
          totals[k] = (totals[k] ?? 0) + v;
        }
      }
    }
  }

  return Object.entries(totals)
    .filter(([, v]) => v !== 0)
    .map(([k, v]) => ({ label: RESOURCE_LABELS[k] ?? k, delta: v }));
}

/** Returns true if the player's money band meets or exceeds the requirement. */
function meetsMoneyRequirement(
  playerBand: MoneyBand | null | undefined,
  required: string | undefined
): boolean {
  if (!required) return true;
  const playerRank = MONEY_BAND_RANK[playerBand ?? "okay"] ?? 1;
  const requiredRank = MONEY_BAND_RANK[required] ?? 0;
  return playerRank >= requiredRank;
}

export function ArcBeatCard({ beat, dayIndex, onChoice, disabled, onDismiss, resolvedOption, moneyBand, relationships }: ArcBeatCardProps) {
  const [choosing, setChoosing] = useState(false);
  const [chosenOption, setChosenOption] = useState<StoryletChoice | null>(null);
  const [error, setError] = useState<string | null>(null);

  const displayedOption = resolvedOption ?? chosenOption;

  // Resolve [[npc_id]] tokens using current relationship state so NPCs are
  // named correctly if the player knows them, or described as strangers if not.
  const resolve = (text: string) => resolveNpcTokens(text, relationships ?? null);

  const streamLabel = STREAM_LABELS[beat.stream_id as keyof typeof STREAM_LABELS] ?? beat.stream_id;
  const daysLeft = beat.expires_on_day - dayIndex;

  async function handleChoice(option: StoryletChoice) {
    if (choosing || displayedOption) return;
    setChoosing(true);
    setError(null);
    setChosenOption(option);
    try {
      await onChoice(beat, option);
    } catch (err) {
      setChosenOption(null);
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setChoosing(false);
    }
  }

  const resolvedDeltas = displayedOption ? computeDeltas(displayedOption) : [];

  return (
    <div className="rounded border-2 border-primary/20 bg-card px-4 py-4 prep-stripe-top shadow-sm">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <span className="prep-label text-primary/60">{streamLabel}</span>
          <h3 className="mt-0.5 text-lg font-bold text-primary font-heading">{beat.title}</h3>
        </div>
        {daysLeft <= 1 && (
          <span className="shrink-0 rounded bg-accent border border-accent-foreground/20 px-2 py-0.5 text-xs font-medium text-accent-foreground">
            Expires today
          </span>
        )}
      </div>

      {/* Body */}
      <p className="mb-4 text-sm leading-relaxed text-foreground/80 whitespace-pre-line">{resolve(beat.body)}</p>

      {/* Post-choice result */}
      {displayedOption && (
        <div className="rounded border border-border/60 bg-muted px-3 py-3 text-sm space-y-2">
          <p className="font-medium text-primary">✓ {resolve(displayedOption.label)}</p>
          {displayedOption.reaction_text && (
            <p className="text-foreground/80 leading-relaxed whitespace-pre-line">{resolve(displayedOption.reaction_text)}</p>
          )}
          {resolvedDeltas.length > 0 && (
            <ul className="flex flex-wrap gap-2 text-xs font-stat">
              {resolvedDeltas.map(({ label, delta }) => (
                <li
                  key={label}
                  className={`rounded px-1.5 py-0.5 ${
                    delta > 0 ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                    "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  }`}
                >
                  {delta > 0 ? "+" : ""}{delta} {label}
                </li>
              ))}
            </ul>
          )}
          <TesterOnly>
            <NarrativeFeedback
              storyletId={beat.instance_id}
              dayIndex={dayIndex}
            />
          </TesterOnly>
          {onDismiss && (
            <div className="pt-1">
              <button
                onClick={onDismiss}
                className="rounded border border-primary/30 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/5 active:bg-primary/10 transition"
              >
                Continue
              </button>
            </div>
          )}
        </div>
      )}

      {/* Options */}
      {!displayedOption && (
        <div className="flex flex-col gap-2">
          {beat.options.map((option) => {
            const locked = !meetsMoneyRequirement(moneyBand, option.money_requirement);
            const previewDeltas = computeDeltas(option);
            return (
              <button
                key={option.id}
                onClick={() => !locked && handleChoice(option)}
                disabled={choosing || disabled || locked}
                className={`rounded border-2 px-4 py-2.5 text-left text-sm transition
                  ${locked
                    ? "border-border/40 bg-muted text-foreground/40 cursor-not-allowed"
                    : "border-primary/30 bg-card text-foreground hover:border-primary hover:bg-primary/5 active:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
                  }`}
              >
                <span className="block">{resolve(option.label)}</span>
                {(previewDeltas.length > 0 || locked) && (
                  <span className="mt-1 flex flex-wrap gap-1.5">
                    {previewDeltas.map(({ label, delta }) => (
                      <span
                        key={label}
                        className={`text-xs font-stat ${
                          locked ? "text-foreground/30" :
                          delta > 0 ? "text-green-600 dark:text-green-400" :
                          "text-red-500 dark:text-red-400"
                        }`}
                      >
                        {delta > 0 ? "+" : ""}{delta} {label}
                      </span>
                    ))}
                    {locked && (
                      <span className="text-xs text-foreground/30">(not enough money)</span>
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
