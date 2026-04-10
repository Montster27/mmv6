"use client";

import { useState } from "react";
import type { TrackStorylet } from "@/types/tracks";
import type { StoryletChoice } from "@/types/storylets";
import { TRACK_LABELS, type TrackKey } from "@/types/tracks";
import { TesterOnly } from "@/components/ux/TesterOnly";
import { NarrativeFeedback } from "@/components/play/NarrativeFeedback";
import { DialogueNodeView } from "@/components/play/DialogueNodeView";
import { resolveNpcTokens, type RelationshipState } from "@/lib/relationships";

type MoneyBand = "tight" | "okay" | "comfortable";

/** Money band hierarchy — higher index = more money. */
const MONEY_BAND_RANK: Record<string, number> = {
  tight: 0,
  okay: 1,
  comfortable: 2,
};

type ResourceSnapshot = {
  energy?: number;
  stress?: number;
  cashOnHand?: number;
  knowledge?: number;
  socialLeverage?: number;
  physicalResilience?: number;
};

type TrackStoryletCardProps = {
  storylet: TrackStorylet;
  dayIndex: number;
  onChoice: (storylet: TrackStorylet, option: StoryletChoice) => Promise<void>;
  disabled?: boolean;
  onDismiss?: () => void;
  /** Override text for the dismiss button (e.g., "Continue to afternoon →") */
  dismissLabel?: string;
  resolvedOption?: StoryletChoice;
  moneyBand?: MoneyBand | null;
  relationships?: Record<string, RelationshipState> | null;
  /** Player's current resource levels — used to gate choices with requires_resource / costs_resource */
  resources?: ResourceSnapshot | null;
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

/**
 * Checks requires_resource gate AND whether costs_resource can be afforded.
 * Returns null if the choice is available, or a message explaining what's missing.
 */
function checkResourceAvailability(
  option: StoryletChoice,
  resources: ResourceSnapshot | null | undefined
): string | null {
  if (!resources) return null;

  // Check requires_resource gate
  const req = option.requires_resource;
  if (req?.key && typeof req.min === "number") {
    const current = (resources as Record<string, number | undefined>)[req.key] ?? 0;
    if (current < req.min) {
      const label = RESOURCE_LABELS[req.key] ?? req.key;
      return `Need ${req.min} ${label} (have ${current})`;
    }
  }

  // Check costs_resource affordability
  const cost = option.costs_resource;
  if (cost?.key && typeof cost.amount === "number") {
    const current = (resources as Record<string, number | undefined>)[cost.key] ?? 0;
    if (current < cost.amount) {
      const label = RESOURCE_LABELS[cost.key] ?? cost.key;
      return `Need ${cost.amount} ${label} (have ${current})`;
    }
  }

  return null;
}

function meetsMoneyRequirement(
  playerBand: MoneyBand | null | undefined,
  required: string | undefined
): boolean {
  if (!required) return true;
  const playerRank = MONEY_BAND_RANK[playerBand ?? "okay"] ?? 1;
  const requiredRank = MONEY_BAND_RANK[required] ?? 0;
  return playerRank >= requiredRank;
}

export function TrackStoryletCard({ storylet, dayIndex, onChoice, disabled, onDismiss, dismissLabel, resolvedOption, moneyBand, relationships, resources }: TrackStoryletCardProps) {
  const [choosing, setChoosing] = useState(false);
  const [chosenOption, setChosenOption] = useState<StoryletChoice | null>(null);
  const [error, setError] = useState<string | null>(null);

  const displayedOption = resolvedOption ?? chosenOption;

  const resolve = (text: string) => resolveNpcTokens(text, relationships ?? null);

  const trackLabel = TRACK_LABELS[storylet.track_key as TrackKey] ?? storylet.track_key;
  const daysLeft = storylet.expires_on_day - dayIndex;

  async function handleChoice(option: StoryletChoice) {
    if (choosing || displayedOption) return;
    setChoosing(true);
    setError(null);
    setChosenOption(option);
    try {
      await onChoice(storylet, option);
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
          <span className="prep-label text-primary/60">{trackLabel}</span>
          <h3 className="mt-0.5 text-lg font-bold text-primary font-heading">{storylet.title}</h3>
        </div>
        {daysLeft <= 1 && (
          <span className="shrink-0 rounded bg-accent border border-accent-foreground/20 px-2 py-0.5 text-xs font-medium text-accent-foreground">
            Expires today
          </span>
        )}
      </div>

      {/* Body or conversational nodes — hidden on dismiss cards (resolvedOption from parent) */}
      {!resolvedOption && (
        storylet.nodes && storylet.nodes.length > 0 && !displayedOption ? (
          <DialogueNodeView
            preamble={resolve(storylet.body)}
            nodes={storylet.nodes}
            choices={storylet.options}
            onChoice={(choiceId) => {
              const option = storylet.options.find((o) => o.id === choiceId);
              if (option) handleChoice(option);
            }}
            disabled={choosing || disabled}
          />
        ) : (
          <p className="mb-4 text-sm leading-relaxed text-foreground/80 whitespace-pre-line">{resolve(storylet.body)}</p>
        )
      )}

      {/* Post-choice result */}
      {displayedOption && (
        <div className="rounded border border-border/60 bg-muted px-3 py-3 text-sm space-y-2">
          <p className="font-medium text-primary">✓ {resolve(displayedOption.label)}</p>
          {displayedOption.reaction_text && (
            <p className="text-foreground/80 leading-relaxed whitespace-pre-line">{resolve(displayedOption.reaction_text)}</p>
          )}
          {resolvedDeltas.length > 0 && (
            <ul className="flex flex-wrap gap-2 text-xs font-stat">
              {resolvedDeltas.map(({ label, delta }) => {
                const isGood = label === "stress" ? delta < 0 : delta > 0;
                return (
                  <li
                    key={label}
                    className={`rounded px-1.5 py-0.5 ${
                      isGood
                        ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    }`}
                  >
                    {delta > 0 ? "+" : ""}{delta} {label}
                  </li>
                );
              })}
            </ul>
          )}
          <TesterOnly>
            <NarrativeFeedback
              storyletId={storylet.progress_id}
              dayIndex={dayIndex}
            />
          </TesterOnly>
          {onDismiss && (
            <div className="pt-1">
              <button
                onClick={onDismiss}
                className="rounded border border-primary/30 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/5 active:bg-primary/10 transition"
              >
                {dismissLabel ?? "Continue"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Options — only shown when there are no conversational nodes */}
      {!displayedOption && !(storylet.nodes && storylet.nodes.length > 0) && (
        <div className="flex flex-col gap-2">
          {storylet.options.map((option) => {
            const moneyLocked = !meetsMoneyRequirement(moneyBand, option.money_requirement);
            const resourceBlock = checkResourceAvailability(option, resources);
            const locked = moneyLocked || !!resourceBlock;
            const lockReason = moneyLocked
              ? "(not enough money)"
              : resourceBlock;
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
                    {previewDeltas.map(({ label, delta }) => {
                      const isGood = label === "stress" ? delta < 0 : delta > 0;
                      return (
                        <span
                          key={label}
                          className={`text-xs font-stat ${
                            locked ? "text-foreground/30" :
                            isGood ? "text-green-600 dark:text-green-400" :
                            "text-red-500 dark:text-red-400"
                          }`}
                        >
                          {delta > 0 ? "+" : ""}{delta} {label}
                        </span>
                      );
                    })}
                    {locked && lockReason && (
                      <span className="text-xs text-red-400 italic">{lockReason}</span>
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
