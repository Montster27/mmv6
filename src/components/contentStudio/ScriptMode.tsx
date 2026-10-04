"use client";

import { useState } from "react";
import type { Storylet, StoryletChoice } from "@/types/storylets";
import { describeChoiceEffects } from "@/core/studio/sceneText";
import { Term } from "./Term";
import { ScenePlayer } from "./ScenePlayer";

interface ScriptModeProps {
  draft: Storylet;
  onChange: (updates: Partial<Storylet>) => void;
}

const KINDS = [
  { id: "risk", hint: "Taking a chance" },
  { id: "people", hint: "Reaching toward someone" },
  { id: "achieve", hint: "Working toward a goal" },
  { id: "safety", hint: "Staying safe or steady" },
] as const;

function nextChoiceId(choices: StoryletChoice[]): string {
  let n = choices.length + 1;
  while (choices.some((c) => c.id === `choice_${n}`)) n++;
  return `choice_${n}`;
}

/** Write the scene and its choices in one place. */
export function ScriptMode({ draft, onChange }: ScriptModeProps) {
  const [playing, setPlaying] = useState(false);
  const choices = (draft.choices ?? []) as (StoryletChoice & Record<string, unknown>)[];
  const day = draft.due_offset_days;
  const seg = draft.segment;

  const setChoices = (next: StoryletChoice[]) => onChange({ choices: next });
  const patchChoice = (index: number, change: Record<string, unknown>) =>
    setChoices(choices.map((c, i) => (i === index ? ({ ...c, ...change } as StoryletChoice) : c)));
  const addChoice = () =>
    setChoices([...choices, { id: nextChoiceId(choices), label: "", reaction_text: "", identity_tags: [], precludes: [], time_cost: 0, energy_cost: 0 } as StoryletChoice]);

  return (
    <div className="script">
      <div className="scenehead">
        {day != null ? <span>D{day}</span> : null}
        {seg ? <span>{seg.toUpperCase()}</span> : null}
        <button
          type="button"
          className="btn primary"
          style={{ marginLeft: "auto" }}
          onClick={() => setPlaying(true)}
          title="Read this scene as a player would. Nothing is saved."
        >
          ▶ Play this scene
        </button>
      </div>

      <input
        className="script-title-input"
        value={draft.title}
        onChange={(e) => onChange({ title: e.target.value })}
        placeholder="Scene title"
        aria-label="Scene title"
      />

      <textarea
        className="script-body-input"
        value={draft.body ?? ""}
        onChange={(e) => onChange({ body: e.target.value })}
        placeholder="Write the scene text the player will read…"
        aria-label="Scene text"
        rows={12}
      />

      <div className="terminal" aria-label="Choices">
        <h3>Choices</h3>
        {choices.length === 0 ? (
          <p className="text-sm text-slate-500">A scene needs something for the player to do. Add two or three choices.</p>
        ) : null}
        {choices.map((choice, i) => {
          const kinds = Array.isArray(choice.identity_tags) ? (choice.identity_tags as string[]) : [];
          const effects = describeChoiceEffects(choice);
          return (
            <fieldset key={choice.id ?? i} className="mb-4 space-y-2 rounded border border-slate-200 bg-white p-3">
              <legend className="px-1 text-xs font-semibold text-slate-500">Choice {i + 1}</legend>
              <input
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                placeholder="What the player does, in a few words (“Pick up the phone”)"
                aria-label={`Choice ${i + 1} label`}
                value={choice.label ?? ""}
                onChange={(e) => patchChoice(i, { label: e.target.value })}
              />
              <textarea
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                rows={3}
                placeholder="What the player reads after choosing this"
                aria-label={`Choice ${i + 1} reaction`}
                value={(choice.reaction_text as string | null | undefined) ?? ""}
                onChange={(e) => patchChoice(i, { reaction_text: e.target.value })}
              />
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600">
                <label className="flex items-center gap-1">
                  Energy it costs
                  <input
                    type="number" min={0} max={50}
                    className="w-16 rounded border border-slate-300 px-2 py-1"
                    value={choice.energy_cost ?? 0}
                    onChange={(e) => patchChoice(i, { energy_cost: Math.max(0, Number(e.target.value) || 0) })}
                  />
                </label>
                <span className="flex flex-wrap items-center gap-1" role="group" aria-label={`Choice ${i + 1} kind`}>
                  <Term id="identity" />:
                  {KINDS.map((kind) => {
                    const on = kinds.includes(kind.id);
                    return (
                      <button
                        key={kind.id} type="button" aria-pressed={on} title={kind.hint}
                        className={`rounded-full border px-2 py-0.5 ${on ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 bg-white hover:bg-slate-50"}`}
                        onClick={() => patchChoice(i, { identity_tags: on ? kinds.filter((k) => k !== kind.id) : [...kinds, kind.id] })}
                      >
                        {kind.id}
                      </button>
                    );
                  })}
                </span>
                <button type="button" className="ml-auto text-red-700 underline" onClick={() => setChoices(choices.filter((_, j) => j !== i))}>
                  Remove choice
                </button>
              </div>
              {effects.length > 0 ? <p className="text-xs text-slate-500">Does: {effects.join(" · ")}</p> : null}
            </fieldset>
          );
        })}
        <button type="button" className="btn" onClick={addChoice}>+ Add a choice</button>
        <p className="mt-2 text-xs text-slate-500">
          Flags, follow-up scenes, skill checks and other effects are in the Structured tab.
        </p>
      </div>

      {playing ? <ScenePlayer scene={draft} onClose={() => setPlaying(false)} /> : null}
    </div>
  );
}
