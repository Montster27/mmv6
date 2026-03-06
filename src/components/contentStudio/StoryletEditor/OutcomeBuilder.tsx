"use client";

import { Button } from "@/components/ui/button";
import type { StoryletOutcomeOption } from "@/types/storylets";

interface OutcomeBuilderProps {
  outcomes: StoryletOutcomeOption[];
  onChange: (outcomes: StoryletOutcomeOption[]) => void;
}

export function OutcomeBuilder({ outcomes, onChange }: OutcomeBuilderProps) {
  const addOutcome = () => {
    const newOutcome = {
      id: `outcome_${Date.now()}`,
      weight: 1,
      text: "",
    } as unknown as StoryletOutcomeOption;
    onChange([...outcomes, newOutcome]);
  };

  const updateOutcome = (
    index: number,
    update: Partial<StoryletOutcomeOption>
  ) => {
    onChange(outcomes.map((o, i) => (i === index ? { ...o, ...update } : o)));
  };

  const removeOutcome = (index: number) => {
    onChange(outcomes.filter((_, i) => i !== index));
  };

  const totalWeight = outcomes.reduce((sum, o) => sum + (o.weight || 0), 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-600">
          Probabilistic outcomes
          {totalWeight > 0 && (
            <span className="ml-2 font-normal text-slate-400">
              (Σ weight: {totalWeight})
            </span>
          )}
        </p>
        <Button type="button" size="sm" variant="outline" onClick={addOutcome}>
          + Outcome
        </Button>
      </div>
      {outcomes.map((outcome, idx) => (
        <div
          key={outcome.id}
          className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 space-y-2"
        >
          <div className="flex items-center gap-2">
            <label className="flex-1 text-xs text-slate-600">
              ID
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-xs font-mono"
                value={outcome.id}
                onChange={(e) => updateOutcome(idx, { id: e.target.value })}
              />
            </label>
            <label className="w-20 text-xs text-slate-600">
              Weight
              <input
                type="number"
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
                value={outcome.weight}
                onChange={(e) =>
                  updateOutcome(idx, { weight: Number(e.target.value) })
                }
              />
            </label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-4 shrink-0 text-red-600"
              onClick={() => removeOutcome(idx)}
            >
              ×
            </Button>
          </div>
          <label className="block text-xs text-slate-600">
            Text
            <textarea
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
              rows={2}
              value={(outcome as unknown as Record<string, unknown>).text as string ?? ""}
              onChange={(e) =>
                updateOutcome(idx, {
                  text: e.target.value,
                } as unknown as Partial<StoryletOutcomeOption>)
              }
            />
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            {(["energy", "stress"] as const).map((k) => (
              <label key={k} className="text-xs text-slate-600">
                {k} delta
                <input
                  type="number"
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
                  value={(outcome.deltas?.[k] as number | undefined) ?? ""}
                  onChange={(e) =>
                    updateOutcome(idx, {
                      deltas: {
                        ...(outcome.deltas ?? {}),
                        [k]: e.target.value ? Number(e.target.value) : undefined,
                      },
                    } as unknown as Partial<StoryletOutcomeOption>)
                  }
                />
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
