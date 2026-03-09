"use client";

import { useState } from "react";
import type { ArcBeat } from "@/types/dailyRun";
import type { StoryletChoice } from "@/types/storylets";
import { STREAM_LABELS } from "@/types/arcOneStreams";

type ArcBeatCardProps = {
  beat: ArcBeat;
  dayIndex: number;
  onChoice: (beat: ArcBeat, option: StoryletChoice) => Promise<void>;
  disabled?: boolean;
  onDismiss?: () => void;
  /** When provided, the card renders in "resolved" mode showing this option's reaction text + Continue. */
  resolvedOption?: StoryletChoice;
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

  return Object.entries(totals)
    .filter(([, v]) => v !== 0)
    .map(([k, v]) => ({ label: RESOURCE_LABELS[k] ?? k, delta: v }));
}

export function ArcBeatCard({ beat, dayIndex, onChoice, disabled, onDismiss, resolvedOption }: ArcBeatCardProps) {
  const [choosing, setChoosing] = useState(false);
  const [chosenOption, setChosenOption] = useState<StoryletChoice | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Use resolvedOption (from parent) if provided, otherwise fall back to internal state
  const displayedOption = resolvedOption ?? chosenOption;

  const streamLabel = STREAM_LABELS[beat.stream_id as keyof typeof STREAM_LABELS] ?? beat.stream_id;
  const daysLeft = beat.expires_on_day - dayIndex;

  async function handleChoice(option: StoryletChoice) {
    if (choosing || displayedOption) return;
    setChoosing(true);
    setError(null);
    setChosenOption(option); // optimistic — show reaction text immediately
    try {
      await onChoice(beat, option);
    } catch (err) {
      setChosenOption(null); // revert on error
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setChoosing(false);
    }
  }

  const deltas = displayedOption ? computeDeltas(displayedOption) : [];

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
      <p className="mb-4 text-sm leading-relaxed text-foreground/80 whitespace-pre-line">{beat.body}</p>

      {/* Post-choice result */}
      {displayedOption && (
        <div className="rounded border border-border/60 bg-muted px-3 py-3 text-sm space-y-2">
          <p className="font-medium text-primary">✓ {displayedOption.label}</p>
          {displayedOption.reaction_text && (
            <p className="text-foreground/80 leading-relaxed whitespace-pre-line">{displayedOption.reaction_text}</p>
          )}
          {deltas.length > 0 && (
            <ul className="space-y-0.5 text-foreground/60 font-stat text-xs">
              {deltas.map(({ label, delta }) => (
                <li key={label}>
                  {label} {delta >= 0 ? "+" : ""}{delta}
                </li>
              ))}
            </ul>
          )}
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
          {beat.options.map((option) => (
            <button
              key={option.id}
              onClick={() => handleChoice(option)}
              disabled={choosing || disabled}
              className="rounded border-2 border-primary/30 bg-card px-4 py-2.5 text-left text-sm text-foreground transition hover:border-primary hover:bg-primary/5 active:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {option.label}
              {option.energy_cost ? (
                <span className="ml-2 text-xs text-foreground/40">−{option.energy_cost} energy</span>
              ) : null}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
