"use client";

import { useState } from "react";
import type { TrackStorylet } from "@/types/tracks";
import type { StoryletChoice } from "@/types/storylets";
import { TRACK_LABELS, type TrackKey } from "@/types/tracks";
import { TesterOnly } from "@/components/ux/TesterOnly";
import { NarrativeFeedback } from "@/components/play/NarrativeFeedback";
import { DialogueNodeView } from "@/components/play/DialogueNodeView";
import { Button } from "@/components/ui/button";
import { resolveNpcTokens, type RelationshipState } from "@/lib/relationships";
import type { PlayerContext } from "@/lib/nodeConditions";

type MoneyBand = "tight" | "okay" | "comfortable";

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
  onChoice: (
    storylet: TrackStorylet,
    option: StoryletChoice,
    activeFlags: Set<string>
  ) => Promise<void>;
  disabled?: boolean;
  onDismiss?: () => void;
  dismissLabel?: string;
  resolvedOption?: StoryletChoice;
  moneyBand?: MoneyBand | null;
  relationships?: Record<string, RelationshipState> | null;
  resources?: ResourceSnapshot | null;
  /** Player identity + period-stance state, forwarded to DialogueNodeView. */
  playerContext?: PlayerContext;
  /** Forwarded to DialogueNodeView to propagate micro-choice effects. */
  onMicroEffects?: (effects: {
    set_npc_memory?: Record<string, Record<string, boolean>>;
    relational_effect?: Record<string, Record<string, number>>;
    identity_tags?: string[];
    period_stance?: "challenged" | "deflected" | "absorbed";
  }) => void;
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

function checkResourceAvailability(
  option: StoryletChoice,
  resources: ResourceSnapshot | null | undefined
): string | null {
  if (!resources) return null;

  const req = option.requires_resource;
  if (req?.key && typeof req.min === "number") {
    const current = (resources as Record<string, number | undefined>)[req.key] ?? 0;
    if (current < req.min) {
      const label = RESOURCE_LABELS[req.key] ?? req.key;
      return `Need ${req.min} ${label} (have ${current})`;
    }
  }

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

export function TrackStoryletCard({ storylet, dayIndex, onChoice, disabled, onDismiss, dismissLabel, resolvedOption, moneyBand, relationships, resources, playerContext, onMicroEffects }: TrackStoryletCardProps) {
  const [choosing, setChoosing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Source of truth for "a choice has been resolved" is the parent (resolvedOption).
  // We intentionally do NOT mirror chosenOption locally: if the parent fails to move
  // the beat into pendingDismissalBeats (mini-game, insufficient_resources, network
  // error, silent return), a local mirror would render the outcome box with no
  // Continue button — a stuck state the user can only escape via logout/login.
  const displayedOption = resolvedOption;

  const resolve = (text: string) => resolveNpcTokens(text, relationships ?? null);

  const trackLabel = TRACK_LABELS[storylet.track_key as TrackKey] ?? storylet.track_key;
  const daysLeft = storylet.expires_on_day - dayIndex;

  async function handleChoice(
    option: StoryletChoice,
    activeFlags: Set<string> = new Set()
  ) {
    if (choosing || resolvedOption) return;
    setChoosing(true);
    setError(null);
    try {
      await onChoice(storylet, option, activeFlags);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setChoosing(false);
    }
  }

  const resolvedDeltas = displayedOption ? computeDeltas(displayedOption) : [];

  return (
    <div className="rounded border-2 border-primary/20 bg-card px-5 py-5 prep-stripe-top shadow-warm-lg narrative-enter">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <span className="prep-label">{trackLabel}</span>
          <h3 className="mt-1 text-xl font-bold text-primary font-heading leading-snug">{storylet.title}</h3>
        </div>
        {daysLeft <= 1 && (
          <span className="shrink-0 rounded bg-accent border border-accent-foreground/20 px-2.5 py-1 text-xs font-semibold font-stat text-accent-foreground">
            Expires today
          </span>
        )}
      </div>

      {/* Body or conversational nodes */}
      {!resolvedOption && (
        storylet.nodes && storylet.nodes.length > 0 && !displayedOption ? (
          <DialogueNodeView
            preamble={resolve(storylet.body)}
            nodes={storylet.nodes}
            choices={storylet.options}
            onChoice={(choiceId, activeFlags) => {
              const option = storylet.options.find((o) => o.id === choiceId);
              if (option) handleChoice(option, activeFlags);
            }}
            onMicroEffects={onMicroEffects}
            relationships={relationships as Record<string, Record<string, unknown>> | null}
            playerContext={playerContext}
            disabled={choosing || disabled}
          />
        ) : (
          <p className="mb-5 font-body text-base leading-relaxed text-foreground/85 whitespace-pre-line max-w-[42rem] narrative-enter narrative-enter-delay-1">{resolve(storylet.body)}</p>
        )
      )}

      {/* Post-choice result */}
      {displayedOption && (
        <div className="rounded border border-border/40 bg-muted/60 px-4 py-4 space-y-3 outcome-enter">
          <p className="font-heading font-semibold text-primary text-[15px]">
            {resolve(displayedOption.label)}
          </p>
          {displayedOption.reaction_text && (
            <p className="font-body text-[15px] text-foreground/80 leading-relaxed whitespace-pre-line">{resolve(displayedOption.reaction_text)}</p>
          )}
          {resolvedDeltas.length > 0 && (
            <ul className="flex flex-wrap gap-2 pt-1">
              {resolvedDeltas.map(({ label, delta }) => {
                const isGood = label === "stress" ? delta < 0 : delta > 0;
                return (
                  <li
                    key={label}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-stat font-medium ${
                      isGood
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : "bg-red-50 text-red-600 border border-red-200"
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
            <div className="pt-2">
              <Button onClick={onDismiss} size="lg" className="font-heading">
                {dismissLabel ?? "Continue"}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Choices — only when no conversational nodes */}
      {!displayedOption && !(storylet.nodes && storylet.nodes.length > 0) && (
        <div className="flex flex-col gap-3">
          {storylet.options.map((option, i) => {
            const moneyLocked = !meetsMoneyRequirement(moneyBand, option.money_requirement);
            const resourceBlock = checkResourceAvailability(option, resources);
            const locked = moneyLocked || !!resourceBlock;
            const lockReason = moneyLocked
              ? "(not enough money)"
              : resourceBlock;
            const previewDeltas = computeDeltas(option);
            return (
              <div key={option.id}>
                {i > 0 && <div className="prep-divider" />}
                <button
                  onClick={() => !locked && handleChoice(option)}
                  disabled={choosing || disabled || locked}
                  aria-label={option.label}
                  className={`choice-btn choice-enter ${locked ? "choice-btn--locked" : ""}`}
                  style={{ animationDelay: `${i * 0.08}s` }}
                >
                  <span className="block">{resolve(option.label)}</span>
                  {(previewDeltas.length > 0 || locked) && (
                    <span className="mt-1.5 flex flex-wrap gap-2">
                      {previewDeltas.map(({ label, delta }) => {
                        const isGood = label === "stress" ? delta < 0 : delta > 0;
                        return (
                          <span
                            key={label}
                            className={`text-xs font-stat ${
                              locked ? "text-foreground/25" :
                              isGood ? "text-green-600" :
                              "text-red-500"
                            }`}
                          >
                            {delta > 0 ? "+" : ""}{delta} {label}
                          </span>
                        );
                      })}
                      {locked && lockReason && (
                        <span className="text-xs text-red-400/70 italic font-body">
                          {lockReason}
                        </span>
                      )}
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {error && (
        <p className="mt-3 text-sm text-red-600 font-body">{error}</p>
      )}
    </div>
  );
}
