"use client";

import type { StoryletChoice } from "@/types/storylets";
import type { ResourceKey } from "@/core/resources/resourceKeys";
import { ResourcePicker } from "../ResourcePicker";
import { OutcomeBuilder } from "./OutcomeBuilder";

interface ChoiceEditorProps {
  choice: StoryletChoice;
  storyletOptions: { value: string; label?: string }[];
  onChange: (updates: Partial<StoryletChoice>) => void;
}

export function ChoiceEditor({
  choice,
  storyletOptions,
  onChange,
}: ChoiceEditorProps) {
  const dataListId = `storylet-opts-${choice.id}`;

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs text-slate-600">
          Choice ID
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-xs font-mono"
            value={choice.id}
            onChange={(e) => onChange({ id: e.target.value })}
          />
        </label>
        <label className="text-xs text-slate-600">
          Label
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
            value={choice.label}
            onChange={(e) => onChange({ label: e.target.value })}
          />
        </label>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs text-slate-600">
          Time cost
          <input
            type="number"
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
            value={choice.time_cost ?? ""}
            onChange={(e) =>
              onChange({
                time_cost: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          />
        </label>
        <label className="text-xs text-slate-600">
          Energy cost
          <input
            type="number"
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
            value={choice.energy_cost ?? ""}
            onChange={(e) =>
              onChange({
                energy_cost: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          />
        </label>
      </div>

      <div>
        <p className="text-xs font-medium text-slate-600 mb-1">
          Requires resource (gate — player must have this to see choice)
        </p>
        <ResourcePicker
          resourceKey={choice.requires_resource?.key}
          amount={choice.requires_resource?.min}
          onChangeKey={(key) =>
            onChange({
              requires_resource: key
                ? { key: key as ResourceKey, min: choice.requires_resource?.min ?? 1 }
                : undefined,
            })
          }
          onChangeAmount={(amount) =>
            onChange({
              requires_resource: choice.requires_resource?.key
                ? { key: choice.requires_resource.key, min: amount }
                : undefined,
            })
          }
          label="Resource key"
          amountLabel="Min"
        />
      </div>

      <div>
        <p className="text-xs font-medium text-slate-600 mb-1">
          Costs resource (deducted when choice is selected)
        </p>
        <ResourcePicker
          resourceKey={choice.costs_resource?.key}
          amount={choice.costs_resource?.amount}
          onChangeKey={(key) =>
            onChange({
              costs_resource: key
                ? { key: key as ResourceKey, amount: choice.costs_resource?.amount ?? 1 }
                : undefined,
            })
          }
          onChangeAmount={(amount) =>
            onChange({
              costs_resource: choice.costs_resource?.key
                ? { key: choice.costs_resource.key, amount }
                : undefined,
            })
          }
          label="Resource key"
          amountLabel="Cost"
        />
      </div>

      <label className="block text-xs text-slate-600">
        Reaction text (shown after choice)
        <textarea
          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
          rows={2}
          value={choice.reaction_text ?? ""}
          onChange={(e) =>
            onChange({ reaction_text: e.target.value || null })
          }
        />
      </label>

      <label className="block text-xs text-slate-600">
        Target storylet ID
        <input
          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm font-mono"
          list={dataListId}
          value={(choice as unknown as Record<string, unknown>).targetStoryletId as string ?? ""}
          onChange={(e) =>
            onChange({
              targetStoryletId: e.target.value || undefined,
            } as unknown as Partial<StoryletChoice>)
          }
          placeholder="storylet id or slug"
        />
        <datalist id={dataListId}>
          {storyletOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label ?? opt.value}
            </option>
          ))}
        </datalist>
      </label>

      <div>
        <p className="text-xs font-medium text-slate-600 mb-2">
          Deterministic outcome
        </p>
        <label className="block text-xs text-slate-600">
          Text
          <textarea
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
            rows={2}
            value={
              (choice.outcome as unknown as Record<string, unknown>)?.text as string ?? ""
            }
            onChange={(e) =>
              onChange({
                outcome: { ...(choice.outcome ?? {}), text: e.target.value },
              })
            }
          />
        </label>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {(["energy", "stress"] as const).map((k) => (
            <label key={k} className="text-xs text-slate-600">
              {k} delta
              <input
                type="number"
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
                value={(choice.outcome?.deltas?.[k] as number | undefined) ?? ""}
                onChange={(e) =>
                  onChange({
                    outcome: {
                      ...(choice.outcome ?? {}),
                      deltas: {
                        ...(choice.outcome?.deltas ?? {}),
                        [k]: e.target.value ? Number(e.target.value) : undefined,
                      },
                    },
                  })
                }
              />
            </label>
          ))}
        </div>
      </div>

      <OutcomeBuilder
        outcomes={choice.outcomes ?? []}
        onChange={(outcomes) =>
          onChange({ outcomes: outcomes.length ? outcomes : undefined })
        }
      />
    </div>
  );
}
