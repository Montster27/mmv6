"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AuthGate } from "@/ui/components/AuthGate";
import { Button } from "@/components/ui/button";
import {
  useArcsAPI,
  type ArcDefinitionRow,
} from "@/hooks/contentStudio/useArcsAPI";
import { useStoryletsAPI } from "@/hooks/contentStudio/useStoryletsAPI";
import { StoryletEditor } from "@/components/contentStudio/StoryletEditor";
import type { Storylet } from "@/types/storylets";
import type { Session } from "@supabase/supabase-js";

const EMPTY_CREATE: Omit<ArcDefinitionRow, "id" | "created_at"> = {
  key: "",
  title: "",
  description: "",
  tags: [],
  is_enabled: true,
};

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ArcsPage() {
  const {
    arcDefinitions,
    arcDefinitionSteps,
    loading,
    error,
    loadArcDefinitions,
    saveArcDefinition,
    createArcDefinition,
    deleteArcDefinition,
  } = useArcsAPI();

  const {
    storylets,
    loadStorylets,
    saveStorylet,
  } = useStoryletsAPI();

  const [selectedArc, setSelectedArc] = useState<ArcDefinitionRow | null>(null);
  const [arcDraft, setArcDraft] = useState<ArcDefinitionRow | null>(null);
  const [arcSaveState, setArcSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [arcSaveError, setArcSaveError] = useState<string | null>(null);

  const [isCreating, setIsCreating] = useState(false);
  const [createDraft, setCreateDraft] = useState<Omit<ArcDefinitionRow, "id" | "created_at">>(EMPTY_CREATE);
  const [createSaveState, setCreateSaveState] = useState<"idle" | "saving">("idle");
  const [createError, setCreateError] = useState<string | null>(null);

  // Inline step editing
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);
  const [stepSaving, setStepSaving] = useState(false);
  const [stepSaveError, setStepSaveError] = useState<string | null>(null);

  useEffect(() => {
    loadArcDefinitions();
    loadStorylets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectArc(arc: ArcDefinitionRow) {
    setSelectedArc(arc);
    setArcDraft({ ...arc });
    setArcSaveState("idle");
    setExpandedStepId(null);
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

  async function handleCreateArc() {
    if (!createDraft.key.trim()) {
      setCreateError("Key is required");
      return;
    }
    if (!createDraft.title.trim()) {
      setCreateError("Title is required");
      return;
    }
    setCreateSaveState("saving");
    setCreateError(null);
    const result = await createArcDefinition(createDraft);
    setCreateSaveState("idle");
    if (result.ok && result.arc) {
      setIsCreating(false);
      setCreateDraft(EMPTY_CREATE);
      await loadArcDefinitions();
      selectArc(result.arc);
    } else {
      setCreateError(result.error ?? "Create failed");
    }
  }

  async function handleSaveStep(updated: Storylet, session: Session) {
    setStepSaving(true);
    setStepSaveError(null);
    const result = await saveStorylet(updated, session.user.email ?? null);
    if (!result.ok) {
      setStepSaveError(result.error ?? "Save failed");
    } else {
      await loadStorylets();
      await loadArcDefinitions();
    }
    setStepSaving(false);
  }

  const stepsForArc = arcDefinitionSteps
    .filter((s) => s.arc_id === selectedArc?.id)
    .sort((a, b) => a.order_index - b.order_index);

  // Derive arc options and step key options for the inline editor
  const arcOptions = arcDefinitions.map((a) => ({
    id: a.id,
    key: a.key,
    title: a.title,
  }));

  const stepKeyOptions = useMemo(() => {
    if (!selectedArc) return [];
    return storylets
      .filter((s) => s.storylet_key && s.track_id === selectedArc.id)
      .map((s) => ({ value: s.storylet_key!, label: `${s.storylet_key} (${s.title})` }));
  }, [storylets, selectedArc]);

  const storyletOptions = useMemo(
    () => storylets.map((s) => ({ value: s.id, label: s.title })),
    [storylets]
  );

  const allTags = useMemo(() => {
    const set = new Set<string>();
    storylets.forEach((s) => (s.tags ?? []).forEach((t) => set.add(t)));
    return [...set].sort();
  }, [storylets]);

  return (
    <AuthGate>
      {(session) => (
        <div className="h-full overflow-auto p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Tracks</h2>
              <p className="text-sm text-slate-600">
                Track definitions and storylets. Expand a storylet to edit it inline, or use the{" "}
                <Link href="/studio/content/storylets" className="text-indigo-600 underline">
                  Storylets editor
                </Link>{" "}
                for the full view.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => { loadArcDefinitions(); loadStorylets(); }}>
                Refresh
              </Button>
              <Button
                onClick={() => {
                  setIsCreating(true);
                  setSelectedArc(null);
                  setArcDraft(null);
                  setCreateDraft(EMPTY_CREATE);
                  setCreateError(null);
                }}
              >
                + New Track
              </Button>
            </div>
          </div>

          {/* Create arc inline form */}
          {isCreating && (
            <div className="rounded-md border border-indigo-200 bg-indigo-50 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-indigo-900">New Track</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm text-slate-700">
                  Key <span className="text-red-500">*</span>
                  <input
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm font-mono"
                    placeholder="roommate"
                    value={createDraft.key}
                    onChange={(e) => setCreateDraft({ ...createDraft, key: e.target.value })}
                  />
                </label>
                <label className="block text-sm text-slate-700">
                  Title <span className="text-red-500">*</span>
                  <input
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
                    placeholder="Roommate"
                    value={createDraft.title}
                    onChange={(e) => setCreateDraft({ ...createDraft, title: e.target.value })}
                  />
                </label>
              </div>
              <label className="block text-sm text-slate-700">
                Description
                <textarea
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
                  rows={2}
                  value={createDraft.description}
                  onChange={(e) => setCreateDraft({ ...createDraft, description: e.target.value })}
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded"
                  checked={createDraft.is_enabled}
                  onChange={(e) => setCreateDraft({ ...createDraft, is_enabled: e.target.checked })}
                />
                Enabled
              </label>
              {createError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                  {createError}
                </p>
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setIsCreating(false); setCreateError(null); }}
                  className="rounded-md border border-slate-300 px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <Button onClick={handleCreateArc} disabled={createSaveState === "saving"}>
                  {createSaveState === "saving" ? "Creating\u2026" : "Create arc"}
                </Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
            {/* Arc list */}
            <div className="space-y-2">
              {loading ? (
                <p className="text-sm text-slate-600">Loading\u2026</p>
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
                  Select an arc to edit its definition.
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
                        Delete track
                      </button>
                      <Button onClick={handleSaveArc} disabled={arcSaveState === "saving"}>
                        {arcSaveState === "saving"
                          ? "Saving\u2026"
                          : arcSaveState === "saved"
                            ? "Saved \u2713"
                            : "Save track"}
                      </Button>
                    </div>
                  </div>

                  {/* Steps list with inline editing */}
                  <div className="rounded-md border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-slate-700">
                        Steps ({stepsForArc.length})
                      </h3>
                      <Link
                        href={`/studio/content/storylets?arc_id=${selectedArc?.id}`}
                        className="text-xs text-indigo-600 hover:underline"
                      >
                        Full storylets view \u2192
                      </Link>
                    </div>
                    {stepsForArc.length === 0 ? (
                      <p className="text-sm text-slate-500">
                        No steps yet.{" "}
                        <Link
                          href="/studio/content/storylets"
                          className="text-indigo-600 underline"
                        >
                          Create a storylet and assign it to this arc.
                        </Link>
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {stepsForArc.map((step) => {
                          const isExpanded = expandedStepId === step.id;
                          const fullStorylet = storylets.find((s) => s.id === step.id);
                          return (
                            <div key={step.id}>
                              <button
                                type="button"
                                onClick={() => setExpandedStepId(isExpanded ? null : step.id)}
                                className={`w-full flex items-start gap-3 rounded-md border px-3 py-2 text-left text-sm transition ${
                                  isExpanded
                                    ? "border-indigo-300 bg-indigo-50"
                                    : "border-slate-200 hover:border-indigo-300 hover:bg-indigo-50"
                                }`}
                              >
                                <span className="text-xs text-slate-400 shrink-0 mt-0.5">
                                  #{step.order_index}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium text-slate-700 truncate">
                                    {step.title || "untitled"}
                                  </div>
                                  <div className="text-xs text-slate-500 font-mono">
                                    {step.step_key}
                                  </div>
                                </div>
                                <span className="text-xs text-slate-400 shrink-0">
                                  {isExpanded ? "\u25be Collapse" : "\u25b8 Edit inline"}
                                </span>
                              </button>
                              {isExpanded && fullStorylet && (
                                <div className="border border-t-0 border-indigo-200 rounded-b-md bg-white" style={{ minHeight: 400 }}>
                                  <StoryletEditor
                                    key={fullStorylet.id}
                                    storylet={fullStorylet}
                                    allTags={allTags}
                                    storyletOptions={storyletOptions}
                                    stepKeyOptions={stepKeyOptions}
                                    arcOptions={arcOptions}
                                    saving={stepSaving}
                                    saveError={stepSaveError}
                                    onSave={(updated) => handleSaveStep(updated, session)}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
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
