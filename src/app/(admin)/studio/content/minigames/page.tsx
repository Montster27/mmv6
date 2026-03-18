"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/ui/components/AuthGate";
import { Button } from "@/components/ui/button";
import { useMinigamesAPI } from "@/hooks/contentStudio/useMinigamesAPI";
import { useArcsAPI } from "@/hooks/contentStudio/useArcsAPI";
import { MinigameNodeEditor } from "@/components/contentStudio/MinigameNodeEditor";
import type { MinigameNode, MinigameOutcomes } from "@/types/minigame";

const DEFAULT_OUTCOMES: MinigameOutcomes = {
  win: { deltas: {}, next_step_key: null, reaction_text: "" },
  lose: { deltas: {}, next_step_key: null, reaction_text: "" },
  skip: { deltas: {}, next_step_key: null, reaction_text: "" },
};

const EMPTY_CREATE = {
  key: "",
  title: "",
  game_type: "caps",
  arc_id: null as string | null,
};

export default function MinigamesPage() {
  const {
    minigameNodes,
    loading,
    error,
    loadMinigameNodes,
    saveMinigameNode,
    createMinigameNode,
    deleteMinigameNode,
  } = useMinigamesAPI();

  const { arcDefinitions, loadArcDefinitions } = useArcsAPI();

  const [selectedNode, setSelectedNode] = useState<MinigameNode | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [isCreating, setIsCreating] = useState(false);
  const [createDraft, setCreateDraft] = useState(EMPTY_CREATE);
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    loadMinigameNodes();
    loadArcDefinitions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const arcOptions = useMemo(
    () => arcDefinitions.map((a) => ({ id: a.id, key: a.key, title: a.title })),
    [arcDefinitions]
  );

  async function handleSave(updated: MinigameNode) {
    setSaving(true);
    setSaveError(null);
    const result = await saveMinigameNode(updated);
    setSaving(false);
    if (result.ok) {
      await loadMinigameNodes();
      setSelectedNode(updated);
    } else {
      setSaveError(result.error ?? "Save failed");
    }
  }

  async function handleDelete() {
    if (!selectedNode) return;
    if (!confirm(`Delete minigame "${selectedNode.title}"? This cannot be undone.`)) return;
    const result = await deleteMinigameNode(selectedNode.id);
    if (result.ok) {
      setSelectedNode(null);
      await loadMinigameNodes();
    } else {
      setSaveError(result.error ?? "Delete failed");
    }
  }

  async function handleCreate() {
    if (!createDraft.key.trim()) {
      setCreateError("Key is required");
      return;
    }
    if (!createDraft.title.trim()) {
      setCreateError("Title is required");
      return;
    }
    setCreateSaving(true);
    setCreateError(null);
    const result = await createMinigameNode({
      key: createDraft.key.trim(),
      title: createDraft.title.trim(),
      description: "",
      game_type: createDraft.game_type,
      arc_id: createDraft.arc_id,
      order_index: 0,
      due_offset_days: 0,
      trigger_condition: null,
      outcomes: DEFAULT_OUTCOMES,
      is_active: true,
    });
    setCreateSaving(false);
    if (result.ok && result.minigameNode) {
      setIsCreating(false);
      setCreateDraft(EMPTY_CREATE);
      await loadMinigameNodes();
      setSelectedNode(result.minigameNode);
    } else {
      setCreateError(result.error ?? "Create failed");
    }
  }

  function getArcName(arcId: string | null) {
    if (!arcId) return null;
    return arcDefinitions.find((a) => a.id === arcId)?.title ?? null;
  }

  return (
    <AuthGate>
      {() => (
        <div className="h-full overflow-auto p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Minigames</h2>
              <p className="text-sm text-slate-600">
                Author minigame nodes that are embedded between arc beats in the narrative flow.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => { loadMinigameNodes(); loadArcDefinitions(); }}>
                Refresh
              </Button>
              <Button
                onClick={() => {
                  setIsCreating(true);
                  setSelectedNode(null);
                  setCreateDraft(EMPTY_CREATE);
                  setCreateError(null);
                }}
              >
                + New Minigame
              </Button>
            </div>
          </div>

          {/* Create inline form */}
          {isCreating && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-amber-900">New Minigame Node</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm text-slate-700">
                  Key <span className="text-red-500">*</span>
                  <input
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm font-mono"
                    placeholder="caps_day1"
                    value={createDraft.key}
                    onChange={(e) => setCreateDraft({ ...createDraft, key: e.target.value })}
                  />
                </label>
                <label className="block text-sm text-slate-700">
                  Title <span className="text-red-500">*</span>
                  <input
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
                    placeholder="Caps"
                    value={createDraft.title}
                    onChange={(e) => setCreateDraft({ ...createDraft, title: e.target.value })}
                  />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm text-slate-700">
                  Game Type
                  <select
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm bg-white"
                    value={createDraft.game_type}
                    onChange={(e) => setCreateDraft({ ...createDraft, game_type: e.target.value })}
                  >
                    <option value="caps">caps</option>
                  </select>
                </label>
                <label className="block text-sm text-slate-700">
                  Arc
                  <select
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm bg-white"
                    value={createDraft.arc_id ?? ""}
                    onChange={(e) => setCreateDraft({ ...createDraft, arc_id: e.target.value || null })}
                  >
                    <option value="">— None —</option>
                    {arcOptions.map((arc) => (
                      <option key={arc.id} value={arc.id}>
                        {arc.title} ({arc.key})
                      </option>
                    ))}
                  </select>
                </label>
              </div>
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
                <Button onClick={handleCreate} disabled={createSaving}>
                  {createSaving ? "Creating…" : "Create minigame"}
                </Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
            {/* Sidebar list */}
            <div className="space-y-2">
              {loading ? (
                <p className="text-sm text-slate-600">Loading…</p>
              ) : minigameNodes.length === 0 ? (
                <p className="text-sm text-slate-600">No minigame nodes found.</p>
              ) : (
                minigameNodes.map((mg) => {
                  const arcName = getArcName(mg.arc_id);
                  return (
                    <button
                      key={mg.id}
                      className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${
                        selectedNode?.id === mg.id
                          ? "border-amber-500 bg-amber-50"
                          : "border-slate-200 hover:border-amber-300 hover:bg-amber-50"
                      }`}
                      onClick={() => {
                        setSelectedNode(mg);
                        setIsCreating(false);
                        setSaveError(null);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 uppercase shrink-0">
                          {mg.game_type}
                        </span>
                        <span className="font-medium truncate">{mg.title}</span>
                      </div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5 truncate">{mg.key}</div>
                      {arcName && (
                        <div className="text-xs text-slate-400 mt-0.5">{arcName}</div>
                      )}
                    </button>
                  );
                })
              )}
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>

            {/* Right panel */}
            <div>
              {!selectedNode && !isCreating ? (
                <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                  Select a minigame node to edit it, or create a new one.
                </div>
              ) : selectedNode ? (
                <MinigameNodeEditor
                  key={selectedNode.id}
                  node={selectedNode}
                  arcOptions={arcOptions}
                  saving={saving}
                  saveError={saveError}
                  onSave={handleSave}
                  onDelete={handleDelete}
                  onCancel={() => { setSelectedNode(null); setSaveError(null); }}
                />
              ) : null}
            </div>
          </div>
        </div>
      )}
    </AuthGate>
  );
}
