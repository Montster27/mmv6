import { useEffect, useMemo, useReducer, useState } from "react";

import { Button } from "@/components/ui/button";
import type { Storylet, StoryletChoice } from "@/types/storylets";
import {
  DEFAULT_STREAM_STATES,
  STREAM_LABELS,
  type StreamId,
  type StreamStates,
} from "@/types/chapterStreams";
import { trackEvent } from "@/lib/events";

// ── types ─────────────────────────────────────────────────────────────────────

type PreviewSimulatorProps = {
  storylets: Storylet[];
  defaultStorylet: Storylet | null;
};

type SimState = {
  energy: number;
  stress: number;
  vectors: Record<string, number>;
  phase: string;
  // narrative layer
  npcMemory: Record<string, Record<string, boolean>>;
  streamStates: StreamStates;
  precluded: string[];
  identityTags: string[];
  choiceLog: { storyletTitle: string; choiceLabel: string }[];
};

// ── helpers ───────────────────────────────────────────────────────────────────

const PHASE_SEQUENCE = [
  "intro_hook",
  "guided_core_loop",
  "reflection_arc",
  "community_purpose",
];

function getPhaseTag(storylet: Storylet) {
  const tag = (storylet.tags ?? []).find((t) => t.startsWith("phase:"));
  return tag ? tag.replace("phase:", "") : "";
}

function getChoiceTarget(choice: StoryletChoice): string | null {
  return choice.targetStoryletId ?? null;
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}

function initialState(firstId: string | null): SimState {
  return {
    energy: 70,
    stress: 20,
    vectors: {},
    phase: "intro_hook",
    npcMemory: {},
    streamStates: { ...DEFAULT_STREAM_STATES },
    precluded: [],
    identityTags: [],
    choiceLog: [],
  };
}

// ── component ─────────────────────────────────────────────────────────────────

export function PreviewSimulator({ storylets, defaultStorylet }: PreviewSimulatorProps) {
  const [currentId, setCurrentId] = useState<string | null>(
    defaultStorylet?.id ?? storylets[0]?.id ?? null
  );
  const [simState, setSimState] = useState<SimState>(() =>
    initialState(defaultStorylet?.id ?? storylets[0]?.id ?? null)
  );
  const [activePanel, setActivePanel] = useState<
    "state" | "npc" | "streams" | "log"
  >("state");

  useEffect(() => {
    trackEvent({ event_type: "preview_started" });
  }, []);

  // Keep currentId in sync when storylets change
  useEffect(() => {
    if (
      currentId === null &&
      (defaultStorylet?.id ?? storylets[0]?.id)
    ) {
      setCurrentId(defaultStorylet?.id ?? storylets[0]?.id ?? null);
    }
  }, [storylets, defaultStorylet, currentId]);

  const current = useMemo(
    () => storylets.find((s) => s.id === currentId) ?? null,
    [storylets, currentId]
  );

  const applyChoice = (choice: StoryletChoice) => {
    const deltas = choice.outcome?.deltas ?? {};

    setSimState((prev) => {
      const next: SimState = {
        ...prev,
        energy: clamp(prev.energy + (deltas.energy ?? 0)),
        stress: clamp(prev.stress + (deltas.stress ?? 0)),
        vectors: { ...prev.vectors },
        npcMemory: deepMergeMemory(prev.npcMemory, choice.set_npc_memory ?? {}),
        streamStates: { ...prev.streamStates },
        precluded: [...prev.precluded],
        identityTags: [...prev.identityTags],
        choiceLog: [
          { storyletTitle: current?.title ?? "?", choiceLabel: choice.label },
          ...prev.choiceLog,
        ],
      };

      // vectors
      if (deltas.vectors) {
        for (const [k, v] of Object.entries(deltas.vectors)) {
          next.vectors[k] = (next.vectors[k] ?? 0) + v;
        }
      }

      // track state transition
      if (choice.sets_track_state) {
        // In preview mode we don't know which track this belongs to,
        // but we can record the state for display purposes.
        (next.streamStates as Record<string, string>)["_last"] = choice.sets_track_state.state;
      }

      // preclusions
      for (const p of choice.precludes ?? []) {
        if (!next.precluded.includes(p)) next.precluded.push(p);
      }

      // identity tags
      for (const t of choice.identity_tags ?? []) {
        if (!next.identityTags.includes(t)) next.identityTags.push(t);
      }

      // phase
      const target = getChoiceTarget(choice);
      const nextStorylet = target
        ? storylets.find((s) => s.id === target) ?? null
        : null;
      next.phase = nextStorylet
        ? getPhaseTag(nextStorylet) || prev.phase
        : prev.phase;

      return next;
    });

    const target = getChoiceTarget(choice);
    if (target) setCurrentId(target);

    trackEvent({
      event_type: "preview_choice_taken",
      payload: { storylet_id: current?.id, choice_id: choice.id },
    });
  };

  const reset = () => {
    setSimState(initialState(defaultStorylet?.id ?? storylets[0]?.id ?? null));
    setCurrentId(defaultStorylet?.id ?? storylets[0]?.id ?? null);
    trackEvent({ event_type: "preview_reset" });
  };

  const advancePhase = () => {
    const idx = PHASE_SEQUENCE.indexOf(simState.phase);
    const next = PHASE_SEQUENCE[Math.min(PHASE_SEQUENCE.length - 1, idx + 1)];
    setSimState((prev) => ({ ...prev, phase: next }));
  };

  // Choices gated by preclusion
  const visibleChoices = useMemo(() => {
    if (!current) return [];
    return current.choices.map((c) => ({
      choice: c,
      precluded: simState.precluded.includes(c.id),
    }));
  }, [current, simState.precluded]);

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
        Preview runs in a sandbox. It does not touch player data.
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        {/* ── Storylet panel ─────────────────────────────────────── */}
        <div className="space-y-3 rounded-md border border-slate-200 bg-white px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs text-slate-500">Phase</p>
              <p className="text-sm font-semibold text-slate-800">
                {simState.phase.replace(/_/g, " ")}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={advancePhase} className="text-xs">
                Advance phase
              </Button>
              <Button variant="outline" onClick={reset} className="text-xs">
                Reset
              </Button>
            </div>
          </div>

          {!current ? (
            <p className="text-sm text-slate-600">No storylet selected.</p>
          ) : (
            <div className="space-y-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {current.title}
                </h3>
                {current.storylet_key && (
                  <p className="text-xs font-mono text-slate-400">
                    step: {current.storylet_key}
                  </p>
                )}
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">{current.body}</p>

              {/* Choices */}
              <div className="space-y-2 pt-1">
                {visibleChoices.map(({ choice, precluded: isP }) => (
                  <button
                    key={choice.id}
                    disabled={isP}
                    onClick={() => !isP && applyChoice(choice)}
                    className={`w-full text-left rounded-md border px-3 py-2 text-sm transition-colors ${
                      isP
                        ? "opacity-40 cursor-not-allowed border-red-200 bg-red-50 text-red-700 line-through"
                        : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50"
                    }`}
                    title={isP ? "Precluded by previous choice" : undefined}
                  >
                    <span>{choice.label}</span>
                    {isP && (
                      <span className="ml-2 text-xs text-red-500">✕ precluded</span>
                    )}
                    {/* Cost hints */}
                    <span className="ml-2 text-[10px] text-slate-400 font-mono">
                      {choice.time_cost ? `⏱${choice.time_cost}` : ""}
                      {choice.energy_cost ? ` ⚡${choice.energy_cost}` : ""}
                      {(choice.identity_tags ?? []).length > 0
                        ? ` #${choice.identity_tags!.join(" #")}`
                        : ""}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── State panel ────────────────────────────────────────── */}
        <div className="space-y-3 rounded-md border border-slate-200 bg-white px-4 py-4 text-sm">
          {/* Panel tabs */}
          <div className="flex gap-1 border-b border-slate-100 pb-2">
            {(["state", "npc", "streams", "log"] as const).map((panel) => (
              <button
                key={panel}
                onClick={() => setActivePanel(panel)}
                className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                  activePanel === panel
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {panel === "state"
                  ? "Resources"
                  : panel === "npc"
                  ? "NPC Memory"
                  : panel === "streams"
                  ? "Track States"
                  : "Log"}
              </button>
            ))}
          </div>

          {/* Resources panel */}
          {activePanel === "state" && (
            <div className="space-y-3">
              <ResourceBar label="Energy" value={simState.energy} color="bg-green-400" />
              <ResourceBar label="Stress" value={simState.stress} color="bg-red-400" />
              {Object.keys(simState.vectors).length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Vectors</p>
                  {Object.entries(simState.vectors).map(([k, v]) => (
                    <p key={k} className="text-xs text-slate-700 font-mono">
                      {k}: <span className={v >= 0 ? "text-green-600" : "text-red-600"}>{v > 0 ? "+" : ""}{v}</span>
                    </p>
                  ))}
                </div>
              )}
              {simState.identityTags.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Identity tags</p>
                  <div className="flex flex-wrap gap-1">
                    {simState.identityTags.map((t) => (
                      <span
                        key={t}
                        className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {simState.precluded.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Precluded</p>
                  <div className="flex flex-wrap gap-1">
                    {simState.precluded.map((p) => (
                      <span
                        key={p}
                        className="rounded bg-red-50 border border-red-200 px-1.5 py-0.5 text-[10px] text-red-600 font-mono"
                      >
                        ✕ {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* NPC Memory panel */}
          {activePanel === "npc" && (
            <div className="space-y-2">
              {Object.keys(simState.npcMemory).length === 0 ? (
                <p className="text-xs text-slate-400 py-2">
                  No NPC memory set yet.
                </p>
              ) : (
                Object.entries(simState.npcMemory).map(([npcId, flags]) => (
                  <div key={npcId} className="rounded border border-slate-100 bg-slate-50 px-3 py-2">
                    <p className="text-xs font-semibold text-slate-700 mb-1 capitalize">
                      {npcId}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(flags).map(([flag, val]) => (
                        <span
                          key={flag}
                          className={`rounded px-1.5 py-0.5 text-[10px] font-mono border ${
                            val
                              ? "bg-green-50 text-green-700 border-green-200"
                              : "bg-slate-100 text-slate-400 border-slate-200 line-through"
                          }`}
                        >
                          {flag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Track States panel */}
          {activePanel === "streams" && (
            <div className="space-y-1.5">
              {(Object.keys(STREAM_LABELS) as StreamId[]).map((sid) => {
                const state = (simState.streamStates as Record<string, string>)[sid];
                const isDefault = state === (DEFAULT_STREAM_STATES as Record<string, string>)[sid];
                return (
                  <div key={sid} className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-slate-500 w-28 shrink-0">
                      {STREAM_LABELS[sid]}
                    </span>
                    <span
                      className={`font-mono px-1.5 py-0.5 rounded text-[10px] ${
                        isDefault
                          ? "bg-slate-50 text-slate-400 border border-slate-100"
                          : "bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold"
                      }`}
                    >
                      {state}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Log panel */}
          {activePanel === "log" && (
            <div className="space-y-1">
              {simState.choiceLog.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">No choices yet.</p>
              ) : (
                simState.choiceLog.map((entry, i) => (
                  <div key={i} className="text-xs border-b border-slate-50 pb-1">
                    <p className="text-slate-400">{entry.storyletTitle}</p>
                    <p className="text-slate-700 font-medium">→ {entry.choiceLabel}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── sub-components ────────────────────────────────────────────────────────────

function ResourceBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-0.5">
        <span className="text-slate-500">{label}</span>
        <span className="font-medium text-slate-700">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

// ── utils ─────────────────────────────────────────────────────────────────────

function deepMergeMemory(
  existing: Record<string, Record<string, boolean>>,
  incoming: Record<string, Record<string, boolean>>
): Record<string, Record<string, boolean>> {
  const result = { ...existing };
  for (const [npcId, flags] of Object.entries(incoming)) {
    result[npcId] = { ...(result[npcId] ?? {}), ...flags };
  }
  return result;
}
