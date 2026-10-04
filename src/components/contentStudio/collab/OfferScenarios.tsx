"use client";

import { useEffect, useState } from "react";
import { recordId } from "@/core/studio/manifest";
import type { StudioScenario } from "@/types/studio";
import { ChipPicker } from "../ChipPicker";
import { StaleFormNotice } from "./StaleFormNotice";
import { buttonClass, Field, inputClass, panelClass, primaryClass, type StudioCtx } from "./shared";

const SEGMENTS = ["morning", "afternoon", "evening", "night"];

function blankScenario(): StudioScenario {
  return {
    id: crypto.randomUUID(),
    title: "",
    day: 0,
    segment: "morning",
    resolved: {},
    choices: {},
    flags: [],
    precluded: [],
    skills: [],
    expected: [],
    forbidden: [],
  };
}

function validAdvancedState(state: unknown): state is { choices?: Record<string, string[]>; skills?: string[]; precluded?: string[] } {
  if (!state || typeof state !== "object" || Array.isArray(state)) return false;
  const value = state as Record<string, unknown>;
  if (value.choices && (typeof value.choices !== "object" || Array.isArray(value.choices))) return false;
  if (value.skills && !Array.isArray(value.skills)) return false;
  if (value.precluded && !Array.isArray(value.precluded)) return false;
  return true;
}

export function OfferScenarios({ ctx }: { ctx: StudioCtx }) {
  const { manifest, workspace, data, markDirty } = ctx;
  const [scenario, setScenario] = useState<StudioScenario | null>(null);
  const [scenarioError, setScenarioError] = useState("");
  const [editRevision, setEditRevision] = useState(0);

  useEffect(() => {
    markDirty("scenario", scenario !== null);
    return () => markDirty("scenario", false);
  }, [scenario, markDirty]);

  const trackScenes = manifest.storylets.filter((row) => row.track_id);
  const open = (next: StudioScenario) => {
    setScenarioError("");
    setScenario(next);
    setEditRevision(workspace?.revision ?? 0);
  };

  function onAdvancedState(text: string) {
    if (!scenario) return;
    try {
      const state = JSON.parse(text);
      if (!validAdvancedState(state)) throw new Error("Invalid state");
      setScenarioError("");
      setScenario({ ...scenario, choices: state.choices ?? {}, skills: state.skills ?? [], precluded: state.precluded ?? [] });
    } catch {
      setScenarioError("Invalid scenario state JSON. Correct it before saving.");
    }
  }

  function onResolvedChange(ids: string[]) {
    if (!scenario) return;
    const resolved: Record<string, string[]> = {};
    for (const id of ids) {
      const row = manifest.storylets.find((item) => recordId(item) === id);
      if (!row) continue;
      (resolved[String(row.track_id)] ??= []).push(String(row.storylet_key));
    }
    setScenario({ ...scenario, resolved });
  }

  return (
    <>
      {workspace && scenario && editRevision !== workspace.revision ? (
        <StaleFormNotice
          startedAt={editRevision}
          latest={manifest.scenarios.find((row) => recordId(row) === recordId(scenario))}
          onAcknowledge={() => setEditRevision(workspace.revision)}
        />
      ) : null}
      <section className={panelClass}>
        <h2 className="font-semibold">Saved offer scenarios</h2>
        <p className="text-xs text-slate-500">
          Tests the actual offer selector across tracks for this exact manifest. Covers a declared day,
          history, choices, flags, and skills; it does not simulate prose meaning, resource outcomes, or
          full conversation walks.
        </p>
        {data.tests
          .filter((test) => !test.trace)
          .map((test) => (
            <div className="rounded border p-3 text-sm" key={test.id}>
              <strong className={test.passed ? "text-green-800" : "text-red-800"}>
                {test.passed ? "Pass" : "Fail"}: {test.title}
              </strong>
              <p>Offered: {test.offered.join(", ") || "none"}</p>
              {test.failures.map((failure) => (
                <p key={failure}>{failure}</p>
              ))}
              <button
                className={`${buttonClass} mt-2`}
                onClick={() => open(manifest.scenarios.find((row) => row.id === test.id) as StudioScenario)}
              >
                Inspect scenario
              </button>
            </div>
          ))}
        <button className={buttonClass} disabled={!ctx.canEdit} onClick={() => open(blankScenario())}>
          + Offer scenario
        </button>
        {scenario ? (
          <div className="space-y-3 border-t pt-3">
            <Field label="Test name" value={scenario.title} onChange={(title) => setScenario({ ...scenario, title })} />
            <div className="flex gap-3">
              <label className="text-xs">
                Track day
                <input
                  aria-label="Test day"
                  type="number"
                  min={0}
                  className={inputClass}
                  value={scenario.day}
                  onChange={(event) => setScenario({ ...scenario, day: Number(event.target.value) })}
                />
              </label>
              <label className="text-xs">
                Segment
                <select
                  className={inputClass}
                  value={scenario.segment}
                  onChange={(event) => setScenario({ ...scenario, segment: event.target.value })}
                >
                  {SEGMENTS.map((segment) => (
                    <option key={segment}>{segment}</option>
                  ))}
                </select>
              </label>
            </div>
            <ChipPicker
              label="Scenes that already happened"
              emptyText="None. The player is at the very start."
              placeholder="Search scenes…"
              options={trackScenes.map((row) => ({ value: recordId(row), label: String(row.title || "Untitled scene"), hint: String(row.storylet_key ?? "") }))}
              value={manifest.storylets
                .filter((row) => (scenario.resolved[String(row.track_id)] ?? []).includes(String(row.storylet_key)))
                .map(recordId)}
              onChange={onResolvedChange}
            />
            <ChipPicker
              label="Must be offered"
              emptyText="No scene is required to appear."
              placeholder="Search scenes…"
              options={trackScenes.map((row) => ({ value: String(row.storylet_key), label: String(row.title || "Untitled scene") }))}
              value={scenario.expected}
              onChange={(expected) => setScenario({ ...scenario, expected })}
            />
            <ChipPicker
              label="Must not be offered"
              emptyText="No scene is required to be absent."
              placeholder="Search scenes…"
              options={trackScenes.map((row) => ({ value: String(row.storylet_key), label: String(row.title || "Untitled scene") }))}
              value={scenario.forbidden}
              onChange={(forbidden) => setScenario({ ...scenario, forbidden })}
            />
            <Field
              label="Flags (comma-separated)"
              value={scenario.flags.join(", ")}
              onChange={(value) =>
                setScenario({ ...scenario, flags: value.split(",").map((flag) => flag.trim()).filter(Boolean) })
              }
            />
            <details>
              <summary className="text-xs">Advanced scenario state</summary>
              <textarea
                className={`${inputClass} mt-2 font-mono`}
                rows={8}
                defaultValue={JSON.stringify(
                  { choices: scenario.choices, skills: scenario.skills, precluded: scenario.precluded },
                  null,
                  2
                )}
                key={scenario.id}
                aria-label="Advanced scenario state"
                onChange={(event) => onAdvancedState(event.target.value)}
              />
            </details>
            {scenarioError ? (
              <p role="alert" className="text-sm text-red-800">
                {scenarioError}
              </p>
            ) : null}
            <div className="flex gap-2">
              <button
                className={primaryClass}
                disabled={ctx.busy || !ctx.canEdit || Boolean(scenarioError) || !scenario.title.trim()}
                onClick={async () => {
                  if (await ctx.act("save", { kind: "scenarios", object_id: scenario.id, payload: scenario, revision: editRevision })) {
                    setScenario(null);
                  }
                }}
              >
                Save and run scenario
              </button>
              <button className={buttonClass} onClick={() => setScenario(null)}>
                Close
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </>
  );
}
