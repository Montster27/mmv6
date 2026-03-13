"use client";

import type { StoryletChoice } from "@/types/storylets";
import type { ResourceKey } from "@/core/resources/resourceKeys";
import { ResourcePicker } from "../ResourcePicker";
import { OutcomeBuilder } from "./OutcomeBuilder";

interface ChoiceEditorProps {
  choice: StoryletChoice;
  storyletOptions: { value: string; label?: string }[];
  stepKeyOptions?: { value: string; label?: string }[];
  onChange: (updates: Partial<StoryletChoice>) => void;
}

function countSet(...values: unknown[]): number {
  return values.filter((v) => v !== undefined && v !== null && v !== "" && v !== 0).length;
}

export function ChoiceEditor({
  choice,
  storyletOptions,
  stepKeyOptions = [],
  onChange,
}: ChoiceEditorProps) {
  const dataListId = `storylet-opts-${choice.id}`;
  const stepKeyListId = `step-key-opts-${choice.id}`;

  const costsCount = countSet(
    choice.time_cost,
    choice.energy_cost,
    choice.requires_resource?.key,
    choice.costs_resource?.key
  );

  const navCount = countSet(
    (choice as unknown as Record<string, unknown>).targetStoryletId,
    choice.next_step_key,
    choice.sets_stream_state?.stream,
    choice.money_effect,
    choice.outcome_type
  );

  const outcomeCount = countSet(
    choice.reaction_text,
    (choice.outcome as unknown as Record<string, unknown>)?.text,
    choice.outcomes?.length ? true : undefined
  );

  return (
    <div className="space-y-3">
      {/* Identity — always visible */}
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

      {/* Costs & Gates */}
      <details open={costsCount > 0} className="rounded-md border border-slate-200">
        <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 select-none">
          Costs &amp; Gates{costsCount > 0 && (
            <span className="ml-2 font-normal text-slate-400">({costsCount} set)</span>
          )}
        </summary>
        <div className="px-3 pb-3 space-y-3">
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
        </div>
      </details>

      {/* Navigation & State */}
      <details open={navCount > 0} className="rounded-md border border-slate-200">
        <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 select-none">
          Navigation &amp; State{navCount > 0 && (
            <span className="ml-2 font-normal text-slate-400">({navCount} set)</span>
          )}
        </summary>
        <div className="px-3 pb-3 space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block text-xs text-slate-600">
              Target storylet ID{" "}
              <span className="text-slate-400">(cross-arc jump)</span>
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
            <label className="block text-xs text-slate-600">
              Next step key{" "}
              <span className="text-slate-400">(within same arc)</span>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm font-mono"
                list={stepKeyListId}
                value={choice.next_step_key ?? ""}
                placeholder="e.g. roommate_follow_up"
                onChange={(e) =>
                  onChange({ next_step_key: e.target.value || null })
                }
              />
              {stepKeyOptions.length > 0 && (
                <datalist id={stepKeyListId}>
                  {stepKeyOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label ?? opt.value}
                    </option>
                  ))}
                </datalist>
              )}
            </label>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block text-xs text-slate-600">
              Sets stream state — stream
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm font-mono"
                value={choice.sets_stream_state?.stream ?? ""}
                placeholder="e.g. roommate"
                onChange={(e) => {
                  const stream = e.target.value;
                  onChange({
                    sets_stream_state: stream
                      ? { stream, state: choice.sets_stream_state?.state ?? "" }
                      : undefined,
                  });
                }}
              />
            </label>
            <label className="block text-xs text-slate-600">
              Sets stream state — state
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm font-mono"
                value={choice.sets_stream_state?.state ?? ""}
                placeholder="e.g. genuine_connection"
                onChange={(e) => {
                  const state = e.target.value;
                  onChange({
                    sets_stream_state: state
                      ? { stream: choice.sets_stream_state?.stream ?? "", state }
                      : undefined,
                  });
                }}
              />
            </label>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block text-xs text-slate-600">
              Money effect
              <select
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                value={choice.money_effect ?? ""}
                onChange={(e) =>
                  onChange({
                    money_effect: (e.target.value as "improve" | "worsen") || undefined,
                  })
                }
              >
                <option value="">None</option>
                <option value="improve">Improve</option>
                <option value="worsen">Worsen</option>
              </select>
            </label>
            <label className="block text-xs text-slate-600">
              Outcome type
              <select
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                value={choice.outcome_type ?? ""}
                onChange={(e) =>
                  onChange({
                    outcome_type: (e.target.value as "success" | "fail" | "neutral") || undefined,
                  })
                }
              >
                <option value="">None</option>
                <option value="success">Success</option>
                <option value="neutral">Neutral</option>
                <option value="fail">Fail</option>
              </select>
            </label>
          </div>
        </div>
      </details>

      {/* Outcomes */}
      <details open={outcomeCount > 0} className="rounded-md border border-slate-200">
        <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 select-none">
          Outcomes{outcomeCount > 0 && (
            <span className="ml-2 font-normal text-slate-400">({outcomeCount} set)</span>
          )}
        </summary>
        <div className="px-3 pb-3 space-y-3">
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
      </details>
    </div>
  );
}
