"use client";

import { useState } from "react";
import type { StoryletChoice } from "@/types/storylets";
import { ChoiceEditor } from "./ChoiceEditor";

interface ChoiceListProps {
  choices: StoryletChoice[];
  storyletOptions: { value: string; label?: string }[];
  stepKeyOptions?: { value: string; label?: string }[];
  onChange: (choices: StoryletChoice[]) => void;
}

function makeNewChoice(): StoryletChoice {
  return {
    id: `choice_${Date.now()}`,
    label: "New choice",
  };
}

export function ChoiceList({ choices, storyletOptions, stepKeyOptions = [], onChange }: ChoiceListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(
    choices.length === 1 ? choices[0].id : null
  );

  function updateChoice(index: number, updates: Partial<StoryletChoice>) {
    const next = choices.map((c, i) => (i === index ? { ...c, ...updates } : c));
    onChange(next);
  }

  function addChoice() {
    const c = makeNewChoice();
    onChange([...choices, c]);
    setExpandedId(c.id);
  }

  function duplicateChoice(index: number) {
    const source = choices[index];
    const copy: StoryletChoice = {
      ...structuredClone(source),
      id: `${source.id}_copy`,
    };
    const next = [...choices];
    next.splice(index + 1, 0, copy);
    onChange(next);
    setExpandedId(copy.id);
  }

  function removeChoice(index: number) {
    const next = choices.filter((_, i) => i !== index);
    onChange(next);
    setExpandedId(null);
  }

  function moveChoice(index: number, dir: -1 | 1) {
    const next = [...choices];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div className="space-y-2">
      {choices.map((choice, i) => {
        const isOpen = expandedId === choice.id;
        const targetId = (choice as unknown as Record<string, unknown>).targetStoryletId as string | undefined;
        return (
          <div key={choice.id} className="border border-slate-200 rounded-lg overflow-hidden">
            {/* Header row */}
            <div className="flex items-center gap-1 bg-slate-50 px-3 py-2">
              {/* Reorder buttons */}
              <div className="flex flex-col gap-0.5 mr-1">
                <button
                  type="button"
                  className="text-slate-400 hover:text-slate-700 leading-none text-xs disabled:opacity-30"
                  onClick={() => moveChoice(i, -1)}
                  disabled={i === 0}
                  aria-label="Move up"
                >
                  ▲
                </button>
                <button
                  type="button"
                  className="text-slate-400 hover:text-slate-700 leading-none text-xs disabled:opacity-30"
                  onClick={() => moveChoice(i, 1)}
                  disabled={i === choices.length - 1}
                  aria-label="Move down"
                >
                  ▼
                </button>
              </div>

              {/* Expand/collapse + summary badges */}
              <button
                type="button"
                className="flex-1 text-left text-sm font-medium text-slate-700 truncate"
                onClick={() => setExpandedId(isOpen ? null : choice.id)}
              >
                <span className="text-slate-400 mr-2">{i + 1}.</span>
                {choice.label || <span className="italic text-slate-400">unlabelled</span>}
                {choice.costs_resource && (
                  <span className="ml-2 text-xs text-orange-500 font-normal">
                    costs {choice.costs_resource.amount} {choice.costs_resource.key}
                  </span>
                )}
                {choice.requires_resource && (
                  <span className="ml-2 text-xs text-blue-500 font-normal">
                    req {choice.requires_resource.min}+ {choice.requires_resource.key}
                  </span>
                )}
                {(choice.next_step_key || targetId) && (
                  <span className="ml-2 text-xs text-emerald-600 font-normal truncate">
                    &rarr; {choice.next_step_key || targetId}
                  </span>
                )}
                {choice.outcome_type && (
                  <span className={`ml-2 text-xs font-normal ${
                    choice.outcome_type === "success" ? "text-green-600" :
                    choice.outcome_type === "fail" ? "text-red-500" : "text-slate-500"
                  }`}>
                    {choice.outcome_type}
                  </span>
                )}
                {choice.sets_stream_state?.stream && (
                  <span className="ml-2 text-xs text-purple-500 font-normal">
                    {choice.sets_stream_state.stream}
                  </span>
                )}
              </button>

              <span className="text-slate-400 text-xs mr-1">{isOpen ? "▾" : "▸"}</span>

              <button
                type="button"
                onClick={() => duplicateChoice(i)}
                className="text-xs text-slate-400 hover:text-indigo-600 px-1"
                title="Duplicate this choice"
              >
                Dup
              </button>
              <button
                type="button"
                onClick={() => removeChoice(i)}
                className="text-red-400 hover:text-red-600 text-xs px-1"
                aria-label="Remove choice"
              >
                ✕
              </button>
            </div>

            {/* Expanded editor */}
            {isOpen && (
              <div className="px-3 py-3 border-t border-slate-200 bg-white">
                <ChoiceEditor
                  choice={choice}
                  storyletOptions={storyletOptions}
                  stepKeyOptions={stepKeyOptions}
                  onChange={(updates) => updateChoice(i, updates)}
                />
              </div>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={addChoice}
        className="w-full rounded-md border border-dashed border-slate-300 py-2 text-sm text-slate-500 hover:border-slate-400 hover:text-slate-700 transition-colors"
      >
        + Add choice
      </button>
    </div>
  );
}
