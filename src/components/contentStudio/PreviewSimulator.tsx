import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import type { Storylet, StoryletChoice } from "@/types/storylets";
import { trackEvent } from "@/lib/events";

type PreviewSimulatorProps = {
  storylets: Storylet[];
  defaultStorylet: Storylet | null;
};

type SimState = {
  energy: number;
  stress: number;
  vectors: Record<string, number>;
  phase: string;
};

const PHASE_SEQUENCE = [
  "intro_hook",
  "guided_core_loop",
  "reflection_arc",
  "community_purpose",
  "remnant_reveal",
  "cliffhanger",
];

function getPhaseTag(storylet: Storylet) {
  const tag = (storylet.tags ?? []).find((t) => t.startsWith("phase:"));
  return tag ? tag.replace("phase:", "") : "";
}

function getChoiceTarget(choice: StoryletChoice): string | null {
  return (choice as StoryletChoice & { targetStoryletId?: string })
    .targetStoryletId ?? null;
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}

export function PreviewSimulator({ storylets, defaultStorylet }: PreviewSimulatorProps) {
  const [currentId, setCurrentId] = useState<string | null>(
    defaultStorylet?.id ?? storylets[0]?.id ?? null
  );
  const [simState, setSimState] = useState<SimState>({
    energy: 70,
    stress: 20,
    vectors: {},
    phase: "intro_hook",
  });
  const [simulateConsequences, setSimulateConsequences] = useState(false);
  const [selectedRemnant, setSelectedRemnant] = useState<string>("");

  useEffect(() => {
    trackEvent({ event_type: "preview_started" });
  }, []);

  const current = useMemo(
    () => storylets.find((storylet) => storylet.id === currentId) ?? null,
    [storylets, currentId]
  );

  const applyChoice = (choice: StoryletChoice) => {
    const deltas = choice.outcome?.deltas ?? {};
    const nextEnergy = clamp(simState.energy + (deltas.energy ?? 0));
    const nextStress = clamp(simState.stress + (deltas.stress ?? 0));
    const nextVectors = { ...simState.vectors };
    if (deltas.vectors) {
      Object.entries(deltas.vectors).forEach(([key, value]) => {
        nextVectors[key] = (nextVectors[key] ?? 0) + value;
      });
    }
    const target = getChoiceTarget(choice);
    const nextStorylet = target
      ? storylets.find((storylet) => storylet.id === target) ?? null
      : null;
    const phase = nextStorylet
      ? getPhaseTag(nextStorylet) || simState.phase
      : simState.phase;
    setSimState({
      energy: nextEnergy,
      stress: nextStress,
      vectors: nextVectors,
      phase,
    });
    if (target) {
      setCurrentId(target);
    }
    trackEvent({
      event_type: "preview_choice_taken",
      payload: { storylet_id: current?.id, choice_id: choice.id },
    });
  };

  const reset = () => {
    setSimState({
      energy: 70,
      stress: 20,
      vectors: {},
      phase: "intro_hook",
    });
    setCurrentId(defaultStorylet?.id ?? storylets[0]?.id ?? null);
    trackEvent({ event_type: "preview_reset" });
  };

  const advancePhase = () => {
    const idx = PHASE_SEQUENCE.indexOf(simState.phase);
    const next = PHASE_SEQUENCE[Math.min(PHASE_SEQUENCE.length - 1, idx + 1)];
    setSimState((prev) => ({ ...prev, phase: next }));
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
        Preview runs in a sandbox. It does not touch player data.
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-3 rounded-md border border-slate-200 bg-white px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs text-slate-500">Phase</p>
              <p className="text-sm font-semibold text-slate-800">
                {simState.phase.replace(/_/g, " ")}
              </p>
            </div>
            <Button variant="outline" onClick={advancePhase}>
              Advance phase
            </Button>
          </div>
          {!current ? (
            <p className="text-sm text-slate-600">No storylet selected.</p>
          ) : (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-slate-900">
                {current.title}
              </h3>
              <p className="text-sm text-slate-700">{current.body}</p>
              <div className="space-y-2">
                {current.choices.map((choice) => (
                  <Button
                    key={choice.id}
                    variant="outline"
                    onClick={() => applyChoice(choice)}
                    className="w-full justify-start"
                  >
                    {choice.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3 rounded-md border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700">
          <h4 className="font-semibold text-slate-800">Simulation state</h4>
          <p>Energy: {simState.energy}</p>
          <p>Stress: {simState.stress}</p>
          <p>Vectors: {Object.keys(simState.vectors).length ? JSON.stringify(simState.vectors) : "—"}</p>
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={simulateConsequences}
              onChange={(e) => setSimulateConsequences(e.target.checked)}
            />
            Simulate delayed consequences
          </label>
          <label className="text-xs text-slate-600">
            Simulate with remnant
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
              value={selectedRemnant}
              onChange={(e) => setSelectedRemnant(e.target.value)}
              placeholder="remnant key"
            />
          </label>
          <Button variant="outline" onClick={reset}>
            Reset preview
          </Button>
        </div>
      </div>
    </div>
  );
}
