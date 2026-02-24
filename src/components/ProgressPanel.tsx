"use client";

import { memo, useEffect, useState } from "react";

import type { DailyState } from "@/types/daily";
import type { DailyRun } from "@/types/dailyRun";
import type { SevenVectors } from "@/types/vectors";
import { summarizeVectors } from "@/core/ui/vectorSummary";
import { resourceLabel } from "@/core/resources/resourceMap";
import { deriveEnergyLevel } from "@/core/arcOne/state";
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
  boostsReceivedCount?: number;
  resourcesEnabled?: boolean;
  skillsEnabled?: boolean;
  scarcityMode?: boolean;
  energyLevel?: "high" | "moderate" | "low";
  onResourcesHoverStart?: () => void;
  onResourcesHoverEnd?: () => void;
  onVectorsHoverStart?: () => void;
  onVectorsHoverEnd?: () => void;
};

const HIGHLIGHT_MS = 250;

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

function bar(value?: number, highlight?: boolean) {
  if (typeof value !== "number") return null;
  const width = clamp(value);
  const highlightClass = highlight ? "stat-highlight ring-2 ring-cyan-300/60" : "";
  return (
    <div
      className={`h-2 w-full rounded bg-slate-200 transition ${highlightClass}`}
    >
      <div
        className="h-2 rounded bg-slate-600 transition"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

function deltaBadge(delta?: number, highlight?: boolean) {
  if (typeof delta !== "number" || delta === 0) return null;
  const sign = delta > 0 ? "+" : "";
  const highlightClass = highlight ? "text-cyan-700 stat-highlight" : "text-slate-600";
  return (
    <span
      className={`ml-2 text-xs ${highlightClass}`}
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
  boostsReceivedCount,
  resourcesEnabled = true,
  skillsEnabled = true,
  scarcityMode = false,
  energyLevel,
  onResourcesHoverStart,
  onResourcesHoverEnd,
  onVectorsHoverStart,
  onVectorsHoverEnd,
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
    <aside className="rounded-md border border-slate-200 bg-white px-4 py-4 space-y-4">
      <h2 className="text-sm font-semibold text-slate-800">
        {scarcityMode ? "Energy & Stress" : "Resources"}
      </h2>
      <div
        className="space-y-2"
        onMouseEnter={onResourcesHoverStart}
        onMouseLeave={onResourcesHoverEnd}
      >
        <div
          className={`flex items-center justify-between text-sm ${
            highlightEnergy
              ? "text-slate-900 font-medium underline decoration-cyan-400/70 stat-highlight"
              : "text-slate-700"
          }`}
        >
          <span>{resourceLabel("energy")}</span>
          <span>
            {typeof energy === "number" ? energy : "—"}
            {deltaBadge(lastAppliedDeltas?.energy, highlightEnergy)}
          </span>
        </div>
        {bar(energy, highlightEnergy)}
        <div
          className={`flex items-center justify-between text-sm ${
            highlightStress
              ? "text-slate-900 font-medium underline decoration-cyan-400/70 stat-highlight"
              : "text-slate-700"
          }`}
        >
          <span>{resourceLabel("stress")}</span>
          <span>
            {typeof stress === "number" ? stress : "—"}
            {deltaBadge(lastAppliedDeltas?.stress, highlightStress)}
          </span>
        </div>
        {bar(stress, highlightStress)}
      </div>

      {scarcityMode ? (
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <div className="flex items-center justify-between">
            <span>Energy level</span>
            <span className="capitalize">{energyLevel ?? deriveEnergyLevel(energy ?? 100)}</span>
          </div>
          <TesterOnly>
            <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
              <span>Money band</span>
              <span className="capitalize">
                {dailyState?.money_band ?? "okay"}
              </span>
            </div>
          </TesterOnly>
        </div>
      ) : null}

      {!scarcityMode ? (
        <div className="space-y-1 text-sm text-slate-700">
          {resourcesEnabled ? (
            <>
              <div className="flex items-center justify-between">
                <span>{resourceLabel("knowledge")}</span>
                <span>{dayState?.knowledge ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>{resourceLabel("cashOnHand")}</span>
                <span>{dayState?.cashOnHand ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>{resourceLabel("socialLeverage")}</span>
                <span>{dayState?.socialLeverage ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>{resourceLabel("physicalResilience")}</span>
                <span>{dayState?.physicalResilience ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>{resourceLabel("morale")}</span>
                <span>{typeof morale === "number" ? morale : "—"}</span>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-600">
              Your reserves shift quietly beneath the day.
            </p>
          )}
          {skillsEnabled ? (
            <>
            <div className="flex items-center justify-between text-slate-600">
              <span>{resourceLabel("skillPoints")}</span>
              <span>
                {typeof skillBank?.available_points === "number"
                  ? `${skillBank.available_points} / ${skillBank.cap}`
                  : "—"}
              </span>
            </div>
            <div className="mt-2 space-y-1 text-slate-600">
              <div className="flex items-center justify-between">
                <span>{resourceLabel("focus")}</span>
                <span>{skillLevels.focus}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>{resourceLabel("memory")}</span>
                <span>{skillLevels.memory}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>{resourceLabel("networking")}</span>
                <span>{skillLevels.networking}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>{resourceLabel("grit")}</span>
                <span>{skillLevels.grit}</span>
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
          <p className="text-sm font-semibold text-slate-800">Vectors</p>
          {vectorKeys.length === 0 ? (
            <p className="text-sm text-slate-700">No vectors yet.</p>
          ) : (
            <div className="space-y-2">
              {vectorKeys.map((key) => {
                const value = vectors[key] ?? 0;
                const delta = lastAppliedDeltas?.vectors?.[key];
                const highlightVector =
                  typeof highlight?.vectors?.[key] === "number" &&
                  highlight.vectors[key] !== 0;
                return (
                  <div key={key} className="space-y-1">
                    <div
                      className={`flex items-center justify-between text-sm ${
                        highlightVector
                          ? "text-slate-900 font-medium underline decoration-cyan-400/70 stat-highlight"
                          : "text-slate-700"
                      }`}
                    >
                      <span className="capitalize">{key}</span>
                      <span>
                        {value}
                        {deltaBadge(delta, highlightVector)}
                      </span>
                    </div>
                    {bar(value, highlightVector)}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      {!scarcityMode ? (
        <div className="text-sm text-slate-700 space-y-1">
          <p>{summary}</p>
          <p className="text-xs text-slate-600">
            Boosts received today: {boostsReceivedCount ?? 0}
          </p>
        </div>
      ) : null}
    </aside>
  );
}

export const ProgressPanel = memo(ProgressPanelComponent);
