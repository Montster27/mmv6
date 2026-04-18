"use client";

import { memo, useEffect, useState } from "react";

import type { DailyState } from "@/types/daily";
import type { DailyRun } from "@/types/dailyRun";
import type { SevenVectors } from "@/types/vectors";
import { summarizeVectors } from "@/core/ui/vectorSummary";
import { resourceLabel } from "@/core/resources/resourceMap";
import { deriveEnergyLevel } from "@/core/chapter/state";
import { TesterOnly } from "@/components/ux/TesterOnly";

type DeltaInfo = {
  energy?: number;
  stress?: number;
  vectors?: Record<string, number>;
};

type Props = {
  dailyState?: Pick<
    DailyState,
    "energy" | "stress" | "vectors" | "money_band"
  > | null;
  dayState?: DailyRun["dayState"] | null;
  skillBank?: { available_points: number; cap: number } | null;
  skills?: DailyRun["skills"] | null;
  lastAppliedDeltas?: DeltaInfo | null;
  resourcesEnabled?: boolean;
  skillsEnabled?: boolean;
  scarcityMode?: boolean;
  energyLevel?: "high" | "moderate" | "low";
  onResourcesHoverStart?: () => void;
  onResourcesHoverEnd?: () => void;
  onVectorsHoverStart?: () => void;
  onVectorsHoverEnd?: () => void;
  onSkillWebOpen?: () => void;
};

const HIGHLIGHT_MS = 400;

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

const BAR_FILL_CLASS: Record<string, string> = {
  energy: "resource-bar__fill resource-bar__fill--energy",
  stress: "resource-bar__fill resource-bar__fill--stress",
  knowledge: "resource-bar__fill resource-bar__fill--knowledge",
  cashOnHand: "resource-bar__fill resource-bar__fill--cash",
  socialLeverage: "resource-bar__fill resource-bar__fill--social",
  physicalResilience: "resource-bar__fill resource-bar__fill--resilience",
};

function bar(value: number | undefined, key: string, highlight?: boolean) {
  if (typeof value !== "number") return null;
  const width = clamp(value);
  const fillClass = BAR_FILL_CLASS[key] ?? "resource-bar__fill resource-bar__fill--default";
  const highlightClass = highlight
    ? key === "stress"
      ? "stat-highlight--loss"
      : "stat-highlight--gain"
    : "";
  return (
    <div className={`resource-bar ${highlightClass}`}>
      <div
        className={fillClass}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

function deltaBadge(delta?: number, isGain?: boolean) {
  if (typeof delta !== "number" || delta === 0) return null;
  const sign = delta > 0 ? "+" : "";
  return (
    <span
      className={`ml-2 text-xs font-stat font-medium ${
        isGain ? "text-green-600" : "text-red-500"
      }`}
    >
      {sign}
      {delta}
    </span>
  );
}

function ProgressPanelComponent({
  dailyState,
  dayState,
  skillBank,
  skills,
  lastAppliedDeltas,
  resourcesEnabled = true,
  skillsEnabled = true,
  scarcityMode = false,
  energyLevel,
  onResourcesHoverStart,
  onResourcesHoverEnd,
  onVectorsHoverStart,
  onVectorsHoverEnd,
  onSkillWebOpen,
}: Props) {
  const [highlight, setHighlight] = useState<DeltaInfo | null>(null);
  const energy = dayState?.energy ?? dailyState?.energy;
  const stress = dayState?.stress ?? dailyState?.stress;
  const morale =
    typeof energy === "number" && typeof stress === "number"
      ? clamp(Math.round(50 + energy - stress))
      : undefined;
  const vectors = toVectors(dailyState?.vectors ?? {});
  const skillLevels = skills ?? {
    focus: 0,
    memory: 0,
    networking: 0,
    grit: 0,
  };

  const vectorKeys =
    Object.keys(vectors).length > 0
      ? Object.keys(vectors)
          .sort((a, b) => a.localeCompare(b))
          .slice(0, 7)
      : [];

  const summary = summarizeVectors(vectors, lastAppliedDeltas ?? undefined);
  const highlightEnergy = typeof highlight?.energy === "number" && highlight.energy !== 0;
  const highlightStress = typeof highlight?.stress === "number" && highlight.stress !== 0;

  useEffect(() => {
    if (!lastAppliedDeltas) return;
    setHighlight(lastAppliedDeltas);
    const timer = window.setTimeout(() => setHighlight(null), HIGHLIGHT_MS);
    return () => window.clearTimeout(timer);
  }, [lastAppliedDeltas]);

  return (
    <aside className="rounded border-2 border-border/60 bg-card px-4 py-4 shadow-warm space-y-4">
      <h2 className="prep-label">
        {scarcityMode ? "Energy & Stress" : "Resources"}
      </h2>
      <div
        className="space-y-3"
        onMouseEnter={onResourcesHoverStart}
        onMouseLeave={onResourcesHoverEnd}
      >
        <div>
          <div className="flex items-center justify-between text-sm text-foreground/80 mb-1">
            <span className="font-body">{resourceLabel("energy")}</span>
            <span className="font-stat text-xs">
              {typeof energy === "number" ? energy : "\u2014"}
              {deltaBadge(lastAppliedDeltas?.energy, (lastAppliedDeltas?.energy ?? 0) > 0)}
            </span>
          </div>
          {bar(energy, "energy", highlightEnergy)}
        </div>
        <div>
          <div className="flex items-center justify-between text-sm text-foreground/80 mb-1">
            <span className="font-body">{resourceLabel("stress")}</span>
            <span className="font-stat text-xs">
              {typeof stress === "number" ? stress : "\u2014"}
              {deltaBadge(lastAppliedDeltas?.stress, (lastAppliedDeltas?.stress ?? 0) < 0)}
            </span>
          </div>
          {bar(stress, "stress", highlightStress)}
        </div>
      </div>

      {scarcityMode ? (
        <div className="rounded border border-border/40 bg-muted/50 px-3 py-2.5 text-sm">
          <div className="flex items-center justify-between text-foreground/70">
            <span className="font-body">Energy level</span>
            <span className="font-stat text-xs capitalize">{energyLevel ?? deriveEnergyLevel(energy ?? 100)}</span>
          </div>
          <TesterOnly>
            <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>Money band</span>
              <span className="capitalize font-stat">
                {dailyState?.money_band ?? "okay"}
              </span>
            </div>
          </TesterOnly>
        </div>
      ) : null}

      {!scarcityMode ? (
        <div className="space-y-1.5 text-sm">
          {resourcesEnabled ? (
            <>
              <div className="flex items-center justify-between text-foreground/70">
                <span className="font-body">{resourceLabel("knowledge")}</span>
                <span className="font-stat text-xs">{dayState?.knowledge ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-foreground/70">
                <span className="font-body">{resourceLabel("cashOnHand")}</span>
                <span className="font-stat text-xs">{dayState?.cashOnHand ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-foreground/70">
                <span className="font-body">{resourceLabel("socialLeverage")}</span>
                <span className="font-stat text-xs">{dayState?.socialLeverage ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-foreground/70">
                <span className="font-body">{resourceLabel("physicalResilience")}</span>
                <span className="font-stat text-xs">{dayState?.physicalResilience ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-foreground/70">
                <span className="font-body">{resourceLabel("morale")}</span>
                <span className="font-stat text-xs">{typeof morale === "number" ? morale : "\u2014"}</span>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground italic font-body">
              Your reserves shift quietly beneath the day.
            </p>
          )}
          {skillsEnabled ? (
            <>
            <div className="flex items-center justify-between text-foreground/60 pt-1">
              <span className="font-body">{resourceLabel("skillPoints")}</span>
              <span className="font-stat text-xs">
                {typeof skillBank?.available_points === "number"
                  ? `${skillBank.available_points} / ${skillBank.cap}`
                  : "\u2014"}
              </span>
            </div>
            <div className="mt-2 space-y-1 text-foreground/60">
              <div className="flex items-center justify-between">
                <span className="font-body">{resourceLabel("focus")}</span>
                <span className="font-stat text-xs">{skillLevels.focus}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-body">{resourceLabel("memory")}</span>
                <span className="font-stat text-xs">{skillLevels.memory}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-body">{resourceLabel("networking")}</span>
                <span className="font-stat text-xs">{skillLevels.networking}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-body">{resourceLabel("grit")}</span>
                <span className="font-stat text-xs">{skillLevels.grit}</span>
              </div>
            </div>
          </>
          ) : null}
        </div>
      ) : null}

      {!scarcityMode ? (
        <div
          className="space-y-2"
          onMouseEnter={onVectorsHoverStart}
          onMouseLeave={onVectorsHoverEnd}
        >
          <p className="prep-label">Vectors</p>
          {vectorKeys.length === 0 ? (
            <p className="text-sm text-muted-foreground italic font-body">No vectors yet.</p>
          ) : (
            <div className="space-y-2.5">
              {vectorKeys.map((key) => {
                const value = vectors[key] ?? 0;
                const delta = lastAppliedDeltas?.vectors?.[key];
                const highlightVector =
                  typeof highlight?.vectors?.[key] === "number" &&
                  highlight.vectors[key] !== 0;
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between text-sm text-foreground/70 mb-1">
                      <span className="capitalize font-body">{key}</span>
                      <span className="font-stat text-xs">
                        {value}
                        {deltaBadge(delta, (delta ?? 0) > 0)}
                      </span>
                    </div>
                    {bar(value, key, highlightVector)}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      {!scarcityMode ? (
        <div className="text-sm text-muted-foreground font-body italic">
          <p>{summary}</p>
        </div>
      ) : null}

      {onSkillWebOpen && (
        <button
          onClick={onSkillWebOpen}
          className="w-full rounded border-2 border-primary/20 bg-card px-3 py-2 text-sm font-medium font-heading text-primary hover:bg-primary/5 hover:border-primary/30 transition-all"
        >
          Skill Web
        </button>
      )}
    </aside>
  );
}

export const ProgressPanel = memo(ProgressPanelComponent);
