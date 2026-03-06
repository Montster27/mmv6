"use client";

import { useEffect, useState } from "react";
import { AuthGate } from "@/ui/components/AuthGate";
import { Button } from "@/components/ui/button";
import { useArcsAPI, type ArcDefinitionRow, type ArcStepRow } from "@/hooks/contentStudio/useArcsAPI";

export default function ArcsPage() {
  const {
    arcDefinitions,
    arcDefinitionSteps,
    loading,
    error,
    loadArcDefinitions,
    saveArcDefinition,
    deleteArcStep,
  } = useArcsAPI();

  const [selectedArc, setSelectedArc] = useState<ArcDefinitionRow | null>(null);
  const [arcDraft, setArcDraft] = useState<ArcDefinitionRow | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    loadArcDefinitions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectArc(arc: ArcDefinitionRow) {
    setSelectedArc(arc);
    setArcDraft({ ...arc });
    setSaveState("idle");
  }

  async function handleSave() {
    if (!arcDraft) return;
    setSaveState("saving");
    const result = await saveArcDefinition(arcDraft);
    if (result.ok) {
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
      await loadArcDefinitions();
    } else {
      setSaveState("idle");
    }
  }

  async function handleDeleteStep(step: ArcStepRow) {
    if (!confirm(`Delete step "${step.title}"?`)) return;
    await deleteArcStep(step.id);
    await loadArcDefinitions();
  }

  const stepsForArc = arcDefinitionSteps
    .filter((s) => s.arc_id === selectedArc?.id)
    .sort((a, b) => a.order_index - b.order_index);

  return (
    <AuthGate>
      {() => (
        <div className="h-full overflow-auto p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Narrative Arcs</h2>
              <p className="text-sm text-slate-600">
                Arc definitions and their steps.
              </p>
            </div>
            <Button variant="outline" onClick={loadArcDefinitions}>
              Refresh
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
            {/* Arc list */}
            <div className="space-y-2">
              {loading ? (
                <p className="text-sm text-slate-600">Loading…</p>
              ) : arcDefinitions.length === 0 ? (
                <p className="text-sm text-slate-600">No arc definitions found.</p>
              ) : (
                arcDefinitions.map((arc) => (
                  <button
                    key={arc.id}
                    className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${
                      selectedArc?.id === arc.id
                        ? "border-slate-900 bg-slate-100"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                    onClick={() => selectArc(arc)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{arc.title}</span>
                      <span
                        className={`text-xs rounded-full px-2 py-0.5 ${
                          arc.is_enabled
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {arc.is_enabled ? "enabled" : "disabled"}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 truncate">{arc.key}</div>
                    <div className="text-xs text-slate-400">
                      {arcDefinitionSteps.filter((s) => s.arc_id === arc.id).length} steps
                    </div>
                  </button>
                ))
              )}
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>

            {/* Arc editor */}
            <div>
              {!arcDraft ? (
                <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                  Select an arc to edit.
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Arc fields */}
                  <div className="rounded-md border border-slate-200 bg-white p-4 space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block text-sm text-slate-700">
                        Key
                        <input
                          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm font-mono"
                          value={arcDraft.key}
                          readOnly
                        />
                      </label>
                      <label className="block text-sm text-slate-700">
                        Title
                        <input
                          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
                          value={arcDraft.title}
                          onChange={(e) =>
                            setArcDraft({ ...arcDraft, title: e.target.value })
                          }
                        />
                      </label>
                    </div>
                    <label className="block text-sm text-slate-700">
                      Description
                      <textarea
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
                        rows={2}
                        value={arcDraft.description}
                        onChange={(e) =>
                          setArcDraft({ ...arcDraft, description: e.target.value })
                        }
                      />
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        className="rounded"
                        checked={arcDraft.is_enabled}
                        onChange={(e) =>
                          setArcDraft({ ...arcDraft, is_enabled: e.target.checked })
                        }
                      />
                      Enabled
                    </label>
                    <div className="flex gap-2">
                      <Button onClick={handleSave} disabled={saveState === "saving"}>
                        {saveState === "saving"
                          ? "Saving…"
                          : saveState === "saved"
                            ? "Saved ✓"
                            : "Save arc"}
                      </Button>
                    </div>
                  </div>

                  {/* Steps list */}
                  <div className="rounded-md border border-slate-200 bg-white p-4">
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">
                      Steps ({stepsForArc.length})
                    </h3>
                    {stepsForArc.length === 0 ? (
                      <p className="text-sm text-slate-500">No steps yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {stepsForArc.map((step) => (
                          <div
                            key={step.id}
                            className="flex items-start justify-between gap-2 rounded-md border border-slate-200 px-3 py-2"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-400 shrink-0">
                                  #{step.order_index}
                                </span>
                                <span className="text-sm font-medium text-slate-700 truncate">
                                  {step.title}
                                </span>
                              </div>
                              <div className="text-xs text-slate-500 font-mono">
                                {step.step_key}
                              </div>
                            </div>
                            <button
                              type="button"
                              className="text-xs text-red-400 hover:text-red-600 shrink-0"
                              onClick={() => handleDeleteStep(step)}
                            >
                              Delete
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AuthGate>
  );
}
