"use client";

import { useEffect, useState } from "react";
import { AuthGate } from "@/ui/components/AuthGate";
import { Button } from "@/components/ui/button";
import {
  useArcsAPI,
  type ArcDefinitionRow,
  type ArcStepRow,
} from "@/hooks/contentStudio/useArcsAPI";

// ── Step Editor ──────────────────────────────────────────────────────────────

interface StepEditorProps {
  step: ArcStepRow;
  onSave: (updated: ArcStepRow) => Promise<void>;
  onDelete: (step: ArcStepRow) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}

function StepEditor({ step, onSave, onDelete, onClose, saving }: StepEditorProps) {
  const [draft, setDraft] = useState<ArcStepRow>({ ...step });
  const [optionsText, setOptionsText] = useState(
    JSON.stringify(step.options ?? [], null, 2)
  );
  const [optionsError, setOptionsError] = useState<string | null>(null);

  function patch(updates: Partial<ArcStepRow>) {
    setDraft((prev) => ({ ...prev, ...updates }));
  }

  function handleOptionsChange(raw: string) {
    setOptionsText(raw);
    try {
      const parsed = JSON.parse(raw);
      setDraft((prev) => ({ ...prev, options: parsed }));
      setOptionsError(null);
    } catch {
      setOptionsError("Invalid JSON");
    }
  }

  return (
    <div className="rounded-md border border-indigo-200 bg-indigo-50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-800">
          Editing step #{draft.order_index}: {draft.title || "untitled"}
        </h4>
        <button
          type="button"
          className="text-xs text-slate-400 hover:text-slate-700"
          onClick={onClose}
        >
          ✕ Close
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs text-slate-600">
          Step key
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs font-mono"
            value={draft.step_key}
            onChange={(e) => patch({ step_key: e.target.value })}
          />
        </label>
        <label className="block text-xs text-slate-600">
          Title
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            value={draft.title}
            onChange={(e) => patch({ title: e.target.value })}
          />
        </label>
        <label className="block text-xs text-slate-600">
          Order index
          <input
            type="number"
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            value={draft.order_index}
            onChange={(e) => patch({ order_index: Number(e.target.value) })}
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-xs text-slate-600">
            Due offset (days)
            <input
              type="number"
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              value={draft.due_offset_days ?? ""}
              onChange={(e) =>
                patch({ due_offset_days: e.target.value ? Number(e.target.value) : 0 })
              }
            />
          </label>
          <label className="block text-xs text-slate-600">
            Expires after (days)
            <input
              type="number"
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              value={draft.expires_after_days ?? ""}
              onChange={(e) =>
                patch({ expires_after_days: e.target.value ? Number(e.target.value) : 0 })
              }
            />
          </label>
        </div>
      </div>

      <label className="block text-xs text-slate-600">
        Body
        <textarea
          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          rows={4}
          value={draft.body}
          onChange={(e) => patch({ body: e.target.value })}
        />
      </label>

      <label className="block text-xs text-slate-600">
        Options (JSON array)
        {optionsError && (
          <span className="ml-2 text-red-500">{optionsError}</span>
        )}
        <textarea
          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 font-mono text-xs"
          rows={6}
          value={optionsText}
          onChange={(e) => handleOptionsChange(e.target.value)}
        />
      </label>

      <div className="flex gap-2">
        <Button
          onClick={() => onSave(draft)}
          disabled={saving || !!optionsError}
        >
          {saving ? "Saving…" : "Save step"}
        </Button>
        <Button
          variant="outline"
          onClick={() => onDelete(step)}
        >
          Delete step
        </Button>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ArcsPage() {
  const {
    arcDefinitions,
    arcDefinitionSteps,
    loading,
    error,
    loadArcDefinitions,
    saveArcDefinition,
    saveArcStep,
    deleteArcStep,
    deleteArcDefinition,
  } = useArcsAPI();

  const [selectedArc, setSelectedArc] = useState<ArcDefinitionRow | null>(null);
  const [arcDraft, setArcDraft] = useState<ArcDefinitionRow | null>(null);
  const [arcSaveState, setArcSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [arcSaveError, setArcSaveError] = useState<string | null>(null);

  const [selectedStep, setSelectedStep] = useState<ArcStepRow | null>(null);
  const [stepSaving, setStepSaving] = useState(false);

  useEffect(() => {
    loadArcDefinitions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectArc(arc: ArcDefinitionRow) {
    setSelectedArc(arc);
    setArcDraft({ ...arc });
    setArcSaveState("idle");
    setSelectedStep(null);
  }

  async function handleSaveArc() {
    if (!arcDraft) return;
    setArcSaveState("saving");
    setArcSaveError(null);
    const result = await saveArcDefinition(arcDraft);
    if (result.ok) {
      setArcSaveState("saved");
      setTimeout(() => setArcSaveState("idle"), 2000);
      await loadArcDefinitions();
    } else {
      setArcSaveState("idle");
      setArcSaveError(result.error ?? "Save failed");
    }
  }

  async function handleDeleteArc() {
    if (!selectedArc) return;
    if (!confirm(`Delete arc "${selectedArc.title}"? This cannot be undone.`)) return;
    const result = await deleteArcDefinition(selectedArc.id);
    if (result.ok) {
      setSelectedArc(null);
      setArcDraft(null);
      setArcSaveError(null);
      await loadArcDefinitions();
    } else {
      setArcSaveError(result.error ?? "Delete failed");
    }
  }

  async function handleSaveStep(updated: ArcStepRow) {
    setStepSaving(true);
    const result = await saveArcStep(updated);
    setStepSaving(false);
    if (result.ok) {
      await loadArcDefinitions();
      // Refresh selected step with updated data (order_index may have changed)
      setSelectedStep(updated);
    }
  }

  async function handleDeleteStep(step: ArcStepRow) {
    if (!confirm(`Delete step "${step.title}"?`)) return;
    await deleteArcStep(step.id);
    setSelectedStep(null);
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
                Arc definitions and their steps. Click a step to edit it.
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

            {/* Right panel */}
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
                          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm font-mono bg-slate-50"
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
                    {arcSaveError && (
                      <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                        {arcSaveError}
                      </p>
                    )}
                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={handleDeleteArc}
                        className="rounded-md border border-red-300 px-4 py-1.5 text-sm text-red-600 hover:bg-red-50"
                      >
                        Delete arc
                      </button>
                      <Button onClick={handleSaveArc} disabled={arcSaveState === "saving"}>
                        {arcSaveState === "saving"
                          ? "Saving…"
                          : arcSaveState === "saved"
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
                          <div key={step.id} className="space-y-2">
                            {/* Step row */}
                            <button
                              type="button"
                              className={`w-full flex items-start gap-3 rounded-md border px-3 py-2 text-left transition ${
                                selectedStep?.id === step.id
                                  ? "border-indigo-400 bg-indigo-50"
                                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                              }`}
                              onClick={() =>
                                setSelectedStep(
                                  selectedStep?.id === step.id ? null : step
                                )
                              }
                            >
                              <span className="text-xs text-slate-400 shrink-0 mt-0.5">
                                #{step.order_index}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium text-slate-700 truncate">
                                  {step.title || "untitled"}
                                </div>
                                <div className="text-xs text-slate-500 font-mono">
                                  {step.step_key}
                                </div>
                                {step.body && (
                                  <div className="text-xs text-slate-400 truncate mt-0.5">
                                    {step.body.slice(0, 80)}
                                    {step.body.length > 80 ? "…" : ""}
                                  </div>
                                )}
                              </div>
                              <span className="text-xs text-slate-400 shrink-0">
                                {selectedStep?.id === step.id ? "▾" : "▸"}
                              </span>
                            </button>

                            {/* Inline step editor */}
                            {selectedStep?.id === step.id && (
                              <StepEditor
                                step={selectedStep}
                                onSave={handleSaveStep}
                                onDelete={handleDeleteStep}
                                onClose={() => setSelectedStep(null)}
                                saving={stepSaving}
                              />
                            )}
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
