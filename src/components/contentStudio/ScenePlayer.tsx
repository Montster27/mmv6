"use client";

import { useState } from "react";
import type { Storylet } from "@/types/storylets";
import { describeChoiceEffects, reactionText, sceneEligibility } from "@/core/studio/sceneText";

const SEGMENTS = ["morning", "afternoon", "evening"] as const;

/**
 * "Play this scene": read it as a player would, pick a choice, see the reaction, and see
 * plainly what that choice would do. Nothing is saved and no game state is touched.
 */
export function ScenePlayer({ scene, onClose }: { scene: Storylet; onClose: () => void }) {
  const [day, setDay] = useState(scene.due_offset_days ?? 0);
  const [segment, setSegment] = useState<string>(scene.segment ?? "morning");
  const [energy, setEnergy] = useState(70);
  const [picked, setPicked] = useState<string | null>(null);
  const eligibility = sceneEligibility(scene, day, segment);
  const choice = (scene.choices ?? []).find((c) => c.id === picked) ?? null;
  const gate = (c: Storylet["choices"][number]) => {
    const need = (c as { requires_resource?: { key: string; min: number } }).requires_resource;
    return need?.key === "energy" && energy < need.min ? `Needs ${need.min} energy` : null;
  };

  return (
    <div role="dialog" aria-label="Play this scene" className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-slate-900/40 p-6">
      <div className="w-full max-w-2xl space-y-4 rounded-lg bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-indigo-700">Playing a scene</p>
            <h2 className="text-xl font-semibold text-slate-900">{scene.title || "Untitled scene"}</h2>
          </div>
          <button className="rounded border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="grid gap-3 rounded border border-slate-200 bg-slate-50 p-3 text-xs sm:grid-cols-3">
          <label>
            Pretend it is day
            <input type="number" min={0} className="mt-1 w-full rounded border border-slate-300 px-2 py-1" value={day} onChange={(e) => setDay(Math.max(0, Number(e.target.value) || 0))} />
          </label>
          <label>
            Part of day
            <select className="mt-1 w-full rounded border border-slate-300 px-2 py-1" value={segment} onChange={(e) => setSegment(e.target.value)}>
              {SEGMENTS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label>
            Player’s energy: {energy}
            <input type="range" min={0} max={100} className="mt-1 w-full" value={energy} onChange={(e) => setEnergy(Number(e.target.value))} />
          </label>
        </div>
        <p role="status" className={`text-sm ${eligibility.offered ? "text-green-800" : "text-amber-800"}`}>{eligibility.reason}</p>

        <p className="whitespace-pre-wrap font-serif text-[15px] leading-relaxed text-slate-900">{scene.body || "(No text yet.)"}</p>

        {!choice ? (
          <div className="space-y-2">
            {(scene.choices ?? []).length === 0 ? <p className="text-sm text-slate-500">This scene has no choices yet.</p> : null}
            {(scene.choices ?? []).map((c) => {
              const blocked = gate(c);
              return (
                <button key={c.id} disabled={Boolean(blocked)} onClick={() => setPicked(c.id)}
                  className="block w-full rounded border border-slate-300 px-4 py-3 text-left hover:border-indigo-400 disabled:opacity-50">
                  {c.label || "(unlabelled choice)"}
                  {blocked ? <span className="ml-2 text-xs text-slate-500">{blocked}</span> : null}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="rounded bg-slate-50 px-3 py-2 text-sm text-slate-600">You chose: <strong>{choice.label}</strong></p>
            <p className="whitespace-pre-wrap font-serif text-[15px] leading-relaxed text-slate-900">
              {reactionText(choice) || "(No reaction text yet. The player would see nothing here.)"}
            </p>
            <div className="rounded border border-indigo-100 bg-indigo-50 p-3">
              <p className="text-xs font-semibold text-indigo-900">What this choice does</p>
              {describeChoiceEffects(choice).length === 0 ? (
                <p className="text-sm text-slate-600">Nothing else. It costs no time or energy and sets nothing.</p>
              ) : (
                <ul className="list-disc pl-5 text-sm text-slate-700">
                  {describeChoiceEffects(choice).map((line) => <li key={line}>{line}</li>)}
                </ul>
              )}
            </div>
            <button className="rounded border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50" onClick={() => setPicked(null)}>Back to the choices</button>
          </div>
        )}
      </div>
    </div>
  );
}
