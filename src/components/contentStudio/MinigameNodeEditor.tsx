"use client";

import { useState } from "react";
import type { MinigameNode, MinigameOutcomeBranch } from "@/types/minigame";

interface MinigameNodeEditorProps {
  node: MinigameNode;
  isNew?: boolean;
  arcOptions?: { id: string; key: string; title: string }[];
  stepKeyOptions?: { value: string; label: string }[];
  saving?: boolean;
  saveError?: string | null;
  onSave: (updated: MinigameNode) => Promise<void>;
  onDelete?: () => Promise<void>;
  onCancel?: () => void;
}

type TabId = "setup" | "outcomes";
type OutcomeBranch = "win" | "lose" | "skip";

const BRANCH_COLORS: Record<OutcomeBranch, string> = {
  win: "bg-green-50 border-green-300 text-green-900",
  lose: "bg-red-50 border-red-300 text-red-900",
  skip: "bg-slate-50 border-slate-300 text-slate-900",
};

const BRANCH_BADGE: Record<OutcomeBranch, string> = {
  win: "bg-green-100 text-green-700",
  lose: "bg-red-100 text-red-700",
  skip: "bg-slate-200 text-slate-600",
};

export function MinigameNodeEditor({
  node,
  isNew = false,
  arcOptions = [],
  stepKeyOptions = [],
  saving = false,
  saveError = null,
  onSave,
  onDelete,
  onCancel,
}: MinigameNodeEditorProps) {
  const [draft, setDraft] = useState<MinigameNode>(() => ({
    ...node,
    outcomes: {
      win: { ...node.outcomes.win, deltas: { ...node.outcomes.win.deltas } },
      lose: { ...node.outcomes.lose, deltas: { ...node.outcomes.lose.deltas } },
      skip: { ...node.outcomes.skip, deltas: { ...node.outcomes.skip.deltas } },
    },
  }));
  const [activeTab, setActiveTab] = useState<TabId>("setup");
  const [expandedBranch, setExpandedBranch] = useState<OutcomeBranch | null>("win");

  function updateOutcomeBranch(branch: OutcomeBranch, updated: Partial<MinigameOutcomeBranch>) {
    setDraft((d) => ({
      ...d,
      outcomes: {
        ...d.outcomes,
        [branch]: { ...d.outcomes[branch], ...updated },
      },
    }));
  }

  function updateBranchDelta(branch: OutcomeBranch, field: "energy" | "stress", value: string) {
    const num = value === "" ? undefined : Number(value);
    setDraft((d) => ({
      ...d,
      outcomes: {
        ...d.outcomes,
        [branch]: {
          ...d.outcomes[branch],
          deltas: {
            ...d.outcomes[branch].deltas,
            [field]: num,
          },
        },
      },
    }));
  }

  const BRANCHES: OutcomeBranch[] = ["win", "lose", "skip"];

  return (
    <div className="border-2 border-border bg-card rounded-lg overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-slate-50">
        {(["setup", "outcomes"] as TabId[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors capitalize ${
              activeTab === tab
                ? "border-b-2 border-indigo-600 text-indigo-700 bg-white"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-4">
        {activeTab === "setup" && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm text-slate-700">
                Key
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm font-mono bg-slate-50"
                  value={draft.key}
                  readOnly={!isNew}
                  onChange={(e) => isNew && setDraft({ ...draft, key: e.target.value })}
                />
              </label>
              <label className="block text-sm text-slate-700">
                Title <span className="text-red-500">*</span>
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                />
              </label>
            </div>

            <label className="block text-sm text-slate-700">
              Description
              <textarea
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
                rows={3}
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block text-sm text-slate-700">
                Game Type
                <select
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm bg-white"
                  value={draft.game_type}
                  onChange={(e) => setDraft({ ...draft, game_type: e.target.value })}
                >
                  <option value="caps">caps</option>
                </select>
              </label>
              <label className="block text-sm text-slate-700">
                Order Index
                <input
                  type="number"
                  step={0.5}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
                  value={draft.order_index}
                  onChange={(e) => setDraft({ ...draft, order_index: Number(e.target.value) })}
                />
              </label>
              <label className="block text-sm text-slate-700">
                Due Offset Days
                <input
                  type="number"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
                  value={draft.due_offset_days}
                  onChange={(e) => setDraft({ ...draft, due_offset_days: Number(e.target.value) })}
                />
              </label>
            </div>

            <label className="block text-sm text-slate-700">
              Arc
              <select
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm bg-white"
                value={draft.arc_id ?? ""}
                onChange={(e) => setDraft({ ...draft, arc_id: e.target.value || null })}
              >
                <option value="">— None —</option>
                {arcOptions.map((arc) => (
                  <option key={arc.id} value={arc.id}>
                    {arc.title} ({arc.key})
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                className="rounded"
                checked={draft.is_active}
                onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })}
              />
              Active
            </label>
          </>
        )}

        {activeTab === "outcomes" && (
          <div className="space-y-3">
            {BRANCHES.map((branch) => {
              const isExpanded = expandedBranch === branch;
              const b = draft.outcomes[branch];
              return (
                <div key={branch} className={`rounded-md border ${BRANCH_COLORS[branch]}`}>
                  <button
                    type="button"
                    onClick={() => setExpandedBranch(isExpanded ? null : branch)}
                    className="w-full flex items-center justify-between px-3 py-2 text-left"
                  >
                    <span className="flex items-center gap-2">
                      <span className={`rounded px-2 py-0.5 text-xs font-semibold uppercase ${BRANCH_BADGE[branch]}`}>
                        {branch}
                      </span>
                      <span className="text-xs opacity-70 truncate">
                        {b.reaction_text ? b.reaction_text.slice(0, 60) + (b.reaction_text.length > 60 ? "…" : "") : "No reaction text"}
                      </span>
                    </span>
                    <span className="text-xs opacity-50 shrink-0">{isExpanded ? "▾ collapse" : "▸ edit"}</span>
                  </button>

                  {isExpanded && (
                    <div className="px-3 pb-3 space-y-3 border-t border-current border-opacity-20">
                      <label className="block text-sm mt-2">
                        Reaction Text
                        <textarea
                          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800"
                          rows={3}
                          value={b.reaction_text}
                          onChange={(e) => updateOutcomeBranch(branch, { reaction_text: e.target.value })}
                        />
                      </label>

                      <label className="block text-sm">
                        Next Step Key
                        {stepKeyOptions.length > 0 ? (
                          <select
                            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800"
                            value={b.next_step_key ?? ""}
                            onChange={(e) => updateOutcomeBranch(branch, { next_step_key: e.target.value || null })}
                          >
                            <option value="">— None —</option>
                            {stepKeyOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-mono text-slate-800"
                            value={b.next_step_key ?? ""}
                            placeholder="step_key or leave blank"
                            onChange={(e) => updateOutcomeBranch(branch, { next_step_key: e.target.value || null })}
                          />
                        )}
                      </label>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block text-sm">
                          Delta: Energy
                          <input
                            type="number"
                            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800"
                            value={b.deltas.energy ?? ""}
                            placeholder="0"
                            onChange={(e) => updateBranchDelta(branch, "energy", e.target.value)}
                          />
                        </label>
                        <label className="block text-sm">
                          Delta: Stress
                          <input
                            type="number"
                            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800"
                            value={b.deltas.stress ?? ""}
                            placeholder="0"
                            onChange={(e) => updateBranchDelta(branch, "stress", e.target.value)}
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Outcome preview strip */}
        <div className="mt-2 flex gap-2 flex-wrap">
          {BRANCHES.map((branch) => {
            const b = draft.outcomes[branch];
            const hasDeltas = Object.keys(b.deltas).length > 0;
            return (
              <div key={branch} className={`flex-1 min-w-[120px] rounded border px-2 py-1.5 ${BRANCH_COLORS[branch]}`}>
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${BRANCH_BADGE[branch]}`}>
                  {branch}
                </span>
                {hasDeltas && (
                  <div className="mt-1 text-[10px] space-x-1">
                    {b.deltas.stress !== undefined && (
                      <span className={b.deltas.stress > 0 ? "text-red-600" : "text-green-600"}>
                        stress {b.deltas.stress > 0 ? "+" : ""}{b.deltas.stress}
                      </span>
                    )}
                    {b.deltas.energy !== undefined && (
                      <span className={b.deltas.energy > 0 ? "text-green-600" : "text-red-600"}>
                        energy {b.deltas.energy > 0 ? "+" : ""}{b.deltas.energy}
                      </span>
                    )}
                  </div>
                )}
                {b.next_step_key && (
                  <div className="mt-0.5 text-[10px] opacity-70 truncate">→ {b.next_step_key}</div>
                )}
              </div>
            );
          })}
        </div>

        {saveError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {saveError}
          </p>
        )}

        <div className="flex items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                disabled={saving}
                className="rounded-md border border-red-300 px-4 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Delete
              </button>
            )}
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="rounded-md border border-slate-300 px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => onSave(draft)}
            disabled={saving}
            className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
