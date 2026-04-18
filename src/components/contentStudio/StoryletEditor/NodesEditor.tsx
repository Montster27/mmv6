"use client";

import { useState } from "react";
import type { DialogueNode, MicroChoice } from "@/types/storylets";
import { TagEditor } from "../TagEditor";

const NPC_ID_SUGGESTIONS = [
  "npc_roommate_scott",
  "npc_floor_doug",
  "npc_floor_keith",
  "npc_prof_marsh",
  "npc_studious_priya",
  "npc_ambiguous_jordan",
  "npc_contact_glenn",
  "npc_parent_voice",
];

const IDENTITY_TAG_SUGGESTIONS = [
  "risk", "safety", "people", "achievement", "confront", "avoid",
];

interface NodesEditorProps {
  nodes: DialogueNode[] | null | undefined;
  onChange: (nodes: DialogueNode[] | null) => void;
}

function generateId(): string {
  return `node_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function MicroChoiceEditor({
  mc,
  nodeIds,
  onChange,
  onRemove,
}: {
  mc: MicroChoice;
  nodeIds: string[];
  onChange: (updates: Partial<MicroChoice>) => void;
  onRemove: () => void;
}) {
  const [showEffects, setShowEffects] = useState(
    Boolean(mc.sets_flag || mc.set_npc_memory || mc.relational_effect || mc.identity_tags?.length)
  );

  return (
    <div className="rounded border border-blue-200 bg-blue-50/50 p-2 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-blue-700">Micro-choice</span>
        <button type="button" className="text-xs text-red-400 hover:text-red-600" onClick={onRemove}>
          Remove
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="text-xs text-slate-600">
          ID
          <input
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-xs font-mono"
            value={mc.id}
            onChange={(e) => onChange({ id: e.target.value })}
          />
        </label>
        <label className="text-xs text-slate-600">
          Label (3-8 words)
          <input
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-xs"
            value={mc.label}
            onChange={(e) => onChange({ label: e.target.value })}
          />
        </label>
        <label className="text-xs text-slate-600">
          Next
          <select
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-xs"
            value={mc.next}
            onChange={(e) => onChange({ next: e.target.value })}
          >
            <option value="">— select —</option>
            <option value="choices">→ Terminal choices</option>
            <option value="exit">→ Exit (end walk)</option>
            {nodeIds.map((nid) => (
              <option key={nid} value={nid}>
                → {nid}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button
        type="button"
        className="text-xs text-slate-400 hover:text-slate-600"
        onClick={() => setShowEffects(!showEffects)}
      >
        {showEffects ? "▾ Hide effects" : "▸ Effects (flag, NPC memory, identity tags)"}
      </button>

      {showEffects && (
        <div className="space-y-2 pl-2 border-l-2 border-blue-200">
          <label className="block text-xs text-slate-600">
            Sets flag (walk-local)
            <input
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-xs font-mono"
              value={mc.sets_flag ?? ""}
              placeholder="e.g. asked_about_music"
              onChange={(e) => onChange({ sets_flag: e.target.value || undefined })}
            />
          </label>

          <div>
            <p className="text-xs text-slate-600 mb-1">Identity tags</p>
            <TagEditor
              tags={mc.identity_tags ?? []}
              onChange={(tags) => onChange({ identity_tags: tags.length ? tags : undefined })}
              suggestions={IDENTITY_TAG_SUGGESTIONS}
              placeholder="Add tag…"
            />
          </div>

          <label className="block text-xs text-slate-600">
            NPC memory (JSON)
            <input
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-xs font-mono"
              value={mc.set_npc_memory ? JSON.stringify(mc.set_npc_memory) : ""}
              placeholder='{"npc_roommate_scott": {"knows_hometown": true}}'
              onChange={(e) => {
                if (!e.target.value) {
                  onChange({ set_npc_memory: undefined });
                  return;
                }
                try {
                  onChange({ set_npc_memory: JSON.parse(e.target.value) });
                } catch { /* let user keep typing */ }
              }}
            />
          </label>

          <label className="block text-xs text-slate-600">
            Relational effect (JSON)
            <input
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-xs font-mono"
              value={mc.relational_effect ? JSON.stringify(mc.relational_effect) : ""}
              placeholder='{"npc_roommate_scott": {"trust": 1}}'
              onChange={(e) => {
                if (!e.target.value) {
                  onChange({ relational_effect: undefined });
                  return;
                }
                try {
                  onChange({ relational_effect: JSON.parse(e.target.value) });
                } catch { /* let user keep typing */ }
              }}
            />
          </label>
        </div>
      )}
    </div>
  );
}

function NodeEditor({
  node,
  index,
  allNodeIds,
  isExpanded,
  onToggle,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  node: DialogueNode;
  index: number;
  allNodeIds: string[];
  isExpanded: boolean;
  onToggle: () => void;
  onChange: (updates: Partial<DialogueNode>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  function updateMicroChoice(mcIndex: number, updates: Partial<MicroChoice>) {
    const mcs = [...(node.micro_choices ?? [])];
    mcs[mcIndex] = { ...mcs[mcIndex], ...updates };
    onChange({ micro_choices: mcs });
  }

  function removeMicroChoice(mcIndex: number) {
    const mcs = (node.micro_choices ?? []).filter((_, i) => i !== mcIndex);
    onChange({ micro_choices: mcs.length ? mcs : undefined });
  }

  function addMicroChoice() {
    const mcs = [...(node.micro_choices ?? [])];
    mcs.push({ id: `mc_${Date.now().toString(36)}`, label: "", next: "" });
    onChange({ micro_choices: mcs });
  }

  const hasCondition = Boolean(node.condition?.flag || node.condition?.npc_memory);
  const mcCount = node.micro_choices?.length ?? 0;
  const speakerLabel = node.speaker || "narrator";

  return (
    <div className="rounded-md border border-slate-200 bg-white">
      {/* Collapsed header */}
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-slate-50"
        onClick={onToggle}
      >
        <span className="text-xs text-slate-400 w-5">{index + 1}</span>
        <span className="text-xs font-mono text-indigo-600 truncate max-w-[120px]">
          {node.id}
        </span>
        <span className="text-xs text-slate-400">({speakerLabel})</span>
        <span className="flex-1 text-xs text-slate-500 truncate">
          {node.text?.slice(0, 60)}{(node.text?.length ?? 0) > 60 ? "…" : ""}
        </span>
        {hasCondition && (
          <span className="text-xs bg-amber-100 text-amber-700 rounded px-1">gated</span>
        )}
        {mcCount > 0 && (
          <span className="text-xs bg-blue-100 text-blue-700 rounded px-1">
            {mcCount} mc
          </span>
        )}
        <span className="text-xs text-slate-400">
          {isExpanded ? "▾" : "▸"}
        </span>
      </div>

      {isExpanded && (
        <div className="border-t border-slate-100 px-3 pb-3 pt-2 space-y-3">
          {/* Controls */}
          <div className="flex gap-2">
            <button
              type="button"
              className="text-xs text-slate-400 hover:text-slate-600 disabled:opacity-30"
              disabled={isFirst}
              onClick={onMoveUp}
            >↑ Up</button>
            <button
              type="button"
              className="text-xs text-slate-400 hover:text-slate-600 disabled:opacity-30"
              disabled={isLast}
              onClick={onMoveDown}
            >↓ Down</button>
            <div className="flex-1" />
            <button
              type="button"
              className="text-xs text-red-400 hover:text-red-600"
              onClick={onRemove}
            >Remove node</button>
          </div>

          {/* Core fields */}
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-xs text-slate-600">
              Node ID
              <input
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-xs font-mono"
                value={node.id}
                onChange={(e) => onChange({ id: e.target.value })}
              />
            </label>
            <label className="text-xs text-slate-600">
              Speaker (NPC ID, blank = narrator)
              <input
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-xs font-mono"
                list={`node-speaker-${node.id}`}
                value={node.speaker ?? ""}
                placeholder="narrator"
                onChange={(e) => onChange({ speaker: e.target.value || undefined })}
              />
              <datalist id={`node-speaker-${node.id}`}>
                {NPC_ID_SUGGESTIONS.map((npc) => (
                  <option key={npc} value={npc} />
                ))}
              </datalist>
            </label>
          </div>

          <label className="block text-xs text-slate-600">
            Text (1-4 sentences)
            <textarea
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm leading-relaxed"
              rows={3}
              value={node.text}
              onChange={(e) => onChange({ text: e.target.value })}
            />
          </label>

          {/* Condition */}
          <details open={hasCondition} className="rounded border border-amber-200">
            <summary className="cursor-pointer px-3 py-1.5 text-xs font-medium text-amber-700 hover:text-amber-900 select-none">
              Condition{hasCondition ? " (active)" : ""}
            </summary>
            <div className="px-3 pb-2 space-y-2">
              <label className="block text-xs text-slate-600">
                Requires flag (walk-local)
                <input
                  className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-xs font-mono"
                  value={node.condition?.flag ?? ""}
                  placeholder="e.g. asked_about_music"
                  onChange={(e) =>
                    onChange({
                      condition: {
                        ...node.condition,
                        flag: e.target.value || undefined,
                      },
                    })
                  }
                />
              </label>
              <label className="block text-xs text-slate-600">
                Requires NPC memory (format: npc_id.memory_key)
                <input
                  className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-xs font-mono"
                  value={node.condition?.npc_memory ?? ""}
                  placeholder="npc_roommate_scott.knows_hometown"
                  onChange={(e) =>
                    onChange({
                      condition: {
                        ...node.condition,
                        npc_memory: e.target.value || undefined,
                      },
                    })
                  }
                />
              </label>
            </div>
          </details>

          {/* Next (auto-advance) */}
          <label className="block text-xs text-slate-600">
            Next (auto-advance when no micro-choices)
            <select
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-xs"
              value={node.next ?? ""}
              onChange={(e) => onChange({ next: e.target.value || undefined })}
            >
              <option value="">→ Show terminal choices (default)</option>
              <option value="choices">→ Terminal choices (explicit)</option>
              <option value="exit">→ Exit (end walk)</option>
              {allNodeIds
                .filter((nid) => nid !== node.id)
                .map((nid) => (
                  <option key={nid} value={nid}>
                    → {nid}
                  </option>
                ))}
            </select>
          </label>

          {/* Micro-choices */}
          <div>
            <p className="text-xs font-medium text-slate-600 mb-2">
              Micro-choices{" "}
              <span className="font-normal text-slate-400">
                (if present, replaces the auto-advance "Continue" button)
              </span>
            </p>
            <div className="space-y-2">
              {(node.micro_choices ?? []).map((mc, mcIdx) => (
                <MicroChoiceEditor
                  key={mc.id || mcIdx}
                  mc={mc}
                  nodeIds={allNodeIds.filter((nid) => nid !== node.id)}
                  onChange={(updates) => updateMicroChoice(mcIdx, updates)}
                  onRemove={() => removeMicroChoice(mcIdx)}
                />
              ))}
              <button
                type="button"
                className="text-xs text-blue-500 hover:text-blue-700"
                onClick={addMicroChoice}
              >
                + Add micro-choice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NodeFlowPreview({ nodes }: { nodes: DialogueNode[] }) {
  if (nodes.length === 0) return null;

  return (
    <details className="rounded border border-slate-200">
      <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 select-none">
        Flow preview
      </summary>
      <div className="px-3 pb-3 space-y-1 font-mono text-xs text-slate-600">
        {nodes.map((n, i) => {
          const targets: string[] = [];
          if (n.micro_choices?.length) {
            for (const mc of n.micro_choices) {
              if (mc.next && !targets.includes(mc.next)) targets.push(mc.next);
            }
          } else if (n.next) {
            targets.push(n.next);
          } else {
            targets.push("choices");
          }
          const condLabel = n.condition?.flag
            ? ` [if ${n.condition.flag}]`
            : n.condition?.npc_memory
              ? ` [if ${n.condition.npc_memory}]`
              : "";
          return (
            <div key={n.id || i} className="flex items-start gap-1">
              <span className="text-indigo-600 shrink-0">{n.id}</span>
              <span className="text-slate-400">{condLabel} →</span>
              <span className="text-emerald-600">
                {targets.join(" | ")}
              </span>
            </div>
          );
        })}
      </div>
    </details>
  );
}

export function NodesEditor({ nodes, onChange }: NodesEditorProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const hasNodes = Array.isArray(nodes) && nodes.length > 0;
  const nodeList = nodes ?? [];
  const allNodeIds = nodeList.map((n) => n.id);

  function updateNode(index: number, updates: Partial<DialogueNode>) {
    const next = nodeList.map((n, i) => (i === index ? { ...n, ...updates } : n));
    onChange(next);
  }

  function removeNode(index: number) {
    const next = nodeList.filter((_, i) => i !== index);
    onChange(next.length ? next : null);
  }

  function moveNode(from: number, to: number) {
    const next = [...nodeList];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
    setExpandedIndex(to);
  }

  function addNode() {
    const id = generateId();
    const next: DialogueNode[] = [
      ...nodeList,
      { id, text: "", next: undefined },
    ];
    onChange(next);
    setExpandedIndex(next.length - 1);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            className="rounded"
            checked={hasNodes}
            onChange={(e) => {
              if (e.target.checked) {
                const id = generateId();
                onChange([{ id, text: "", next: undefined }]);
                setExpandedIndex(0);
              } else {
                onChange(null);
              }
            }}
          />
          <span className="font-medium">This storylet uses conversational nodes</span>
        </label>
        <p className="mt-1 text-xs text-slate-500 pl-5">
          When enabled, the player sees an interactive dialogue tree instead of flat prose + choices.
          The body text becomes a preamble shown before the first node.
        </p>
      </div>

      {hasNodes && (
        <>
          <NodeFlowPreview nodes={nodeList} />

          <div className="space-y-2">
            {nodeList.map((node, i) => (
              <NodeEditor
                key={node.id || i}
                node={node}
                index={i}
                allNodeIds={allNodeIds}
                isExpanded={expandedIndex === i}
                onToggle={() => setExpandedIndex(expandedIndex === i ? null : i)}
                onChange={(updates) => updateNode(i, updates)}
                onRemove={() => removeNode(i)}
                onMoveUp={() => moveNode(i, i - 1)}
                onMoveDown={() => moveNode(i, i + 1)}
                isFirst={i === 0}
                isLast={i === nodeList.length - 1}
              />
            ))}
          </div>

          <button
            type="button"
            className="rounded-md border border-dashed border-slate-300 px-4 py-2 text-xs text-slate-500 hover:border-slate-400 hover:text-slate-700 w-full"
            onClick={addNode}
          >
            + Add node
          </button>
        </>
      )}
    </div>
  );
}
