"use client";

import { useMemo, useRef, useState } from "react";
import type { ArcDefinitionRow, ArcStepRow } from "@/hooks/contentStudio/useArcsAPI";
import type { MinigameNode } from "@/types/minigame";

export type ArcFlowViewProps = {
  arcDefinitions: ArcDefinitionRow[];
  arcSteps: ArcStepRow[];
  minigameNodes?: MinigameNode[];
};

// ── Types ────────────────────────────────────────────────────────────────────

type ArcOption = {
  id?: string;
  option_key?: string;
  label?: string;
  next_step_key?: string;
  energy_cost?: number;
  sets_stream_state?: { stream: string; state: string };
  money_effect?: string;
};

type FlowNode =
  | { kind: "beat"; data: ArcStepRow; order_index: number }
  | { kind: "minigame"; data: MinigameNode; order_index: number };

// ── Constants ─────────────────────────────────────────────────────────────────

const ARC_COLORS: Record<string, { header: string; node: string }> = {
  arc_roommate:    { header: "bg-blue-600",   node: "bg-blue-50 border-blue-200 text-blue-900" },
  arc_academic:    { header: "bg-amber-500",  node: "bg-amber-50 border-amber-200 text-amber-900" },
  arc_money:       { header: "bg-emerald-600",node: "bg-emerald-50 border-emerald-200 text-emerald-900" },
  arc_belonging:   { header: "bg-purple-600", node: "bg-purple-50 border-purple-200 text-purple-900" },
  arc_opportunity: { header: "bg-orange-500", node: "bg-orange-50 border-orange-200 text-orange-900" },
  arc_home:        { header: "bg-rose-500",   node: "bg-rose-50 border-rose-200 text-rose-900" },
};

const DEFAULT_COLORS = {
  header: "bg-slate-500",
  node: "bg-slate-50 border-slate-200 text-slate-900",
};

const NODE_WIDTH = 200;
const NODE_HEIGHT = 90;
const STEP_GAP = 48;   // horizontal space between steps (for the arrow)
const COL_WIDTH = NODE_WIDTH + STEP_GAP;
const ARC_ROW_GAP = 40; // vertical space between arc rows
const LABEL_WIDTH = 80; // space reserved for arc row labels on the left

// ── Component ─────────────────────────────────────────────────────────────────

export function ArcFlowView({ arcDefinitions, arcSteps, minigameNodes = [] }: ArcFlowViewProps) {
  const [offset, setOffset] = useState({ x: 20, y: 20 });
  const [scale, setScale] = useState(0.9);
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Merge arcSteps and minigameNodes into FlowNode arrays keyed by arc_id, sorted by order_index
  const nodesByArc = useMemo(() => {
    const map: Record<string, FlowNode[]> = {};

    arcSteps.forEach((step) => {
      if (!map[step.arc_id]) map[step.arc_id] = [];
      map[step.arc_id].push({ kind: "beat", data: step, order_index: step.order_index });
    });

    minigameNodes.forEach((mg) => {
      if (!mg.arc_id) return;
      if (!map[mg.arc_id]) map[mg.arc_id] = [];
      map[mg.arc_id].push({ kind: "minigame", data: mg, order_index: mg.order_index });
    });

    Object.values(map).forEach((arr) =>
      arr.sort((a, b) => a.order_index - b.order_index)
    );

    return map;
  }, [arcSteps, minigameNodes]);

  // Layout: each arc is a row; nodes are columns within that row
  const layout = useMemo(() => {
    const rows: Array<{
      arc: ArcDefinitionRow;
      nodes: FlowNode[];
      y: number;
    }> = [];

    const arcOrder = ["arc_roommate", "arc_academic", "arc_money", "arc_belonging", "arc_opportunity", "arc_home"];
    const sortedArcs = [...arcDefinitions].sort((a, b) => {
      const ai = arcOrder.indexOf(a.key);
      const bi = arcOrder.indexOf(b.key);
      if (ai === -1 && bi === -1) return a.key.localeCompare(b.key);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });

    let currentY = 48;
    sortedArcs.forEach((arc) => {
      const nodes = nodesByArc[arc.id] ?? [];
      rows.push({ arc, nodes, y: currentY });
      currentY += NODE_HEIGHT + ARC_ROW_GAP;
    });

    return rows;
  }, [arcDefinitions, nodesByArc]);

  // Build step_key → column index within each arc for branching edge lookup
  const stepKeyToIndex = useMemo(() => {
    const map = new Map<string, { arcId: string; idx: number }>();
    layout.forEach(({ arc, nodes }) => {
      nodes.forEach((node, idx) => {
        if (node.kind === "beat") {
          map.set(`${arc.id}:${node.data.step_key}`, { arcId: arc.id, idx });
        }
      });
    });
    return map;
  }, [layout]);

  // Compute non-sequential (branching) edges from choices' next_step_key and default_next_step_key
  const branchEdges = useMemo(() => {
    const edges: Array<{
      arcId: string;
      fromIdx: number;
      toIdx: number;
      y: number;
      kind: "choice" | "default";
    }> = [];
    const seen = new Set<string>();

    layout.forEach(({ arc, nodes, y }) => {
      nodes.forEach((node, idx) => {
        if (node.kind !== "beat") return;
        const step = node.data;

        const options = step.options as ArcOption[];
        options.forEach((opt) => {
          if (!opt.next_step_key) return;
          const target = stepKeyToIndex.get(`${arc.id}:${opt.next_step_key}`);
          if (!target || target.idx === idx + 1) return;
          const key = `${arc.id}:${idx}:${target.idx}:choice`;
          if (seen.has(key)) return;
          seen.add(key);
          edges.push({ arcId: arc.id, fromIdx: idx, toIdx: target.idx, y, kind: "choice" });
        });

        if (step.default_next_step_key) {
          const target = stepKeyToIndex.get(`${arc.id}:${step.default_next_step_key}`);
          if (target && target.idx !== idx + 1) {
            const key = `${arc.id}:${idx}:${target.idx}:default`;
            if (!seen.has(key)) {
              seen.add(key);
              edges.push({ arcId: arc.id, fromIdx: idx, toIdx: target.idx, y, kind: "default" });
            }
          }
        }
      });
    });

    return edges;
  }, [layout, stepKeyToIndex]);

  const canvasWidth = useMemo(() => {
    const maxNodes = Math.max(...layout.map((r) => r.nodes.length), 0);
    return Math.max(800, LABEL_WIDTH + maxNodes * COL_WIDTH + 80);
  }, [layout]);

  const canvasHeight = useMemo(() => {
    const lastRow = layout[layout.length - 1];
    if (!lastRow) return 400;
    return lastRow.y + NODE_HEIGHT + ARC_ROW_GAP + 40;
  }, [layout]);

  // Interaction
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setScale((s) => Math.min(1.5, Math.max(0.4, s - e.deltaY * 0.001)));
  };
  const handleMouseDown = (e: React.MouseEvent) => {
    dragRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current) return;
    setOffset({ x: e.clientX - dragRef.current.x, y: e.clientY - dragRef.current.y });
  };
  const handleMouseUp = () => { dragRef.current = null; };

  // Resolve selected node details
  const selectedBeat = useMemo(() => {
    if (!selectedNodeId?.startsWith("beat:")) return null;
    const stepKey = selectedNodeId.slice("beat:".length);
    return arcSteps.find((s) => s.step_key === stepKey) ?? null;
  }, [selectedNodeId, arcSteps]);

  const selectedMinigame = useMemo(() => {
    if (!selectedNodeId?.startsWith("mg:")) return null;
    const mgKey = selectedNodeId.slice("mg:".length);
    return minigameNodes.find((m) => m.key === mgKey) ?? null;
  }, [selectedNodeId, minigameNodes]);

  const selectedArc = useMemo(() => {
    if (selectedBeat) return arcDefinitions.find((a) => a.id === selectedBeat.arc_id) ?? null;
    if (selectedMinigame) return arcDefinitions.find((a) => a.id === selectedMinigame.arc_id) ?? null;
    return null;
  }, [selectedBeat, selectedMinigame, arcDefinitions]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
        <span>Drag to pan · Scroll to zoom · Each row = one arc stream · Nodes = story beats in order</span>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 text-xs">
        {layout.map(({ arc }) => {
          const c = ARC_COLORS[arc.key] ?? DEFAULT_COLORS;
          return (
            <span key={arc.key} className={`rounded-full px-2 py-0.5 text-white ${c.header}`}>
              {arc.title}
            </span>
          );
        })}
        <span className="rounded-full px-2 py-0.5 bg-amber-400 text-amber-900 font-medium">
          Minigame
        </span>
        <span className="ml-3 flex items-center gap-1 text-slate-500">
          <span className="inline-block h-0.5 w-6 bg-slate-300" /> sequential
        </span>
        <span className="flex items-center gap-1 text-indigo-500">
          <span className="inline-block h-0.5 w-6 border-t-2 border-dotted border-indigo-400" /> branch (choice)
        </span>
        <span className="flex items-center gap-1 text-teal-500">
          <span className="inline-block h-0.5 w-6 border-t-2 border-dashed border-teal-400" /> default fallback
        </span>
        <span className="flex items-center gap-1 text-green-500">
          <span className="inline-block h-0.5 w-6 bg-green-500" /> win
        </span>
        <span className="flex items-center gap-1 text-red-500">
          <span className="inline-block h-0.5 w-6 bg-red-500" /> lose
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[3fr_1fr]">
        {/* Canvas */}
        <div
          className="relative h-[520px] overflow-hidden rounded-md border border-slate-200 bg-white"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div
            className="absolute left-0 top-0"
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
              transformOrigin: "top left",
              width: canvasWidth,
              height: canvasHeight,
            }}
          >
            {/* SVG layer: arrows */}
            <svg className="absolute left-0 top-0" width={canvasWidth} height={canvasHeight}>
              <defs>
                <marker id="af-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill="#94a3b8" />
                </marker>
                <marker id="af-arrow-active" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill="#374151" />
                </marker>
                <marker id="af-arrow-branch" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill="#6366f1" />
                </marker>
                <marker id="af-arrow-default" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill="#14b8a6" />
                </marker>
                <marker id="af-arrow-win" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill="#22c55e" />
                </marker>
                <marker id="af-arrow-lose" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill="#ef4444" />
                </marker>
              </defs>

              {/* Sequential arrows between adjacent nodes */}
              {layout.map(({ arc, nodes, y }) => {
                return nodes.slice(0, -1).map((node, idx) => {
                  const nextNode = nodes[idx + 1];
                  const x1 = LABEL_WIDTH + idx * COL_WIDTH + NODE_WIDTH;
                  const x2 = LABEL_WIDTH + (idx + 1) * COL_WIDTH;
                  const midY = y + NODE_HEIGHT / 2;

                  const thisId = node.kind === "beat" ? `beat:${node.data.step_key}` : `mg:${node.data.key}`;
                  const nextId = nextNode.kind === "beat" ? `beat:${nextNode.data.step_key}` : `mg:${nextNode.data.key}`;
                  const isActive = selectedNodeId === thisId || selectedNodeId === nextId;

                  // If current node is a minigame, draw three lines: win (green, y-8), lose (red, y+8), skip (gray, center)
                  if (node.kind === "minigame") {
                    return (
                      <g key={`${arc.id}-seq-${idx}`}>
                        {/* win line */}
                        <line
                          x1={x1} y1={midY - 8}
                          x2={x2} y2={midY - 8}
                          stroke="#22c55e" strokeWidth={1.5}
                          markerEnd="url(#af-arrow-win)"
                        />
                        {/* lose line */}
                        <line
                          x1={x1} y1={midY + 8}
                          x2={x2} y2={midY + 8}
                          stroke="#ef4444" strokeWidth={1.5}
                          markerEnd="url(#af-arrow-lose)"
                        />
                        {/* skip line */}
                        <line
                          x1={x1} y1={midY}
                          x2={x2} y2={midY}
                          stroke="#94a3b8" strokeWidth={1}
                          strokeDasharray="3 3"
                          markerEnd="url(#af-arrow)"
                        />
                      </g>
                    );
                  }

                  return (
                    <line
                      key={`${arc.id}-seq-${idx}`}
                      x1={x1}
                      y1={midY}
                      x2={x2}
                      y2={midY}
                      stroke={isActive ? "#374151" : "#cbd5e1"}
                      strokeWidth={isActive ? 2.5 : 1.5}
                      markerEnd={isActive ? "url(#af-arrow-active)" : "url(#af-arrow)"}
                    />
                  );
                });
              })}

              {/* Non-sequential (branching) arrows */}
              {branchEdges.map((edge, i) => {
                const x1 = LABEL_WIDTH + edge.fromIdx * COL_WIDTH + NODE_WIDTH;
                const x2 = LABEL_WIDTH + edge.toIdx * COL_WIDTH;
                const isForward = edge.toIdx > edge.fromIdx;
                const distance = Math.abs(edge.toIdx - edge.fromIdx);
                const dip = 25 + distance * 12;

                const cy = isForward ? edge.y + NODE_HEIGHT + dip : edge.y - dip;
                const y1 = isForward ? edge.y + NODE_HEIGHT * 0.75 : edge.y + NODE_HEIGHT * 0.25;
                const y2 = isForward ? edge.y + NODE_HEIGHT * 0.75 : edge.y + NODE_HEIGHT * 0.25;

                const isChoice = edge.kind === "choice";
                const stroke = isChoice ? "#6366f1" : "#14b8a6";
                const marker = isChoice ? "url(#af-arrow-branch)" : "url(#af-arrow-default)";
                const dashArray = isChoice ? "3 3" : "6 3";

                return (
                  <path
                    key={`branch-${edge.arcId}-${edge.fromIdx}-${edge.toIdx}-${edge.kind}-${i}`}
                    d={`M ${x1} ${y1} C ${x1} ${cy}, ${x2} ${cy}, ${x2} ${y2}`}
                    stroke={stroke}
                    strokeWidth={1.5}
                    strokeDasharray={dashArray}
                    fill="none"
                    markerEnd={marker}
                    opacity={0.8}
                  />
                );
              })}
            </svg>

            {/* Arc row labels */}
            {layout.map(({ arc, y }) => {
              const c = ARC_COLORS[arc.key] ?? DEFAULT_COLORS;
              return (
                <div
                  key={`label-${arc.id}`}
                  className={`absolute rounded-md px-2 py-1 text-[10px] font-semibold text-white ${c.header}`}
                  style={{
                    left: 0,
                    top: y + NODE_HEIGHT / 2 - 12,
                    width: LABEL_WIDTH - 8,
                    textAlign: "center",
                  }}
                >
                  {arc.title}
                </div>
              );
            })}

            {/* Flow nodes */}
            {layout.map(({ arc, nodes, y }) => {
              const c = ARC_COLORS[arc.key] ?? DEFAULT_COLORS;
              return nodes.map((node, idx) => {
                const x = LABEL_WIDTH + idx * COL_WIDTH;

                if (node.kind === "minigame") {
                  const mg = node.data;
                  const nodeId = `mg:${mg.key}`;
                  const isSelected = selectedNodeId === nodeId;
                  return (
                    <button
                      key={`mg-${mg.key}`}
                      className={`absolute rounded-md border-2 px-2 py-1.5 text-left shadow-sm bg-amber-50 border-amber-400 text-amber-900 ${
                        isSelected ? "ring-2 ring-amber-600" : ""
                      }`}
                      style={{ width: NODE_WIDTH, height: NODE_HEIGHT, left: x, top: y }}
                      onClick={() => setSelectedNodeId(isSelected ? null : nodeId)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-amber-600">
                          MINIGAME
                        </span>
                        <span className="rounded bg-amber-200 px-1 text-[9px] font-semibold text-amber-800">
                          {mg.game_type}
                        </span>
                      </div>
                      <div className="mt-0.5 text-sm font-semibold truncate">{mg.title}</div>
                      <div className="mt-0.5 text-[10px] opacity-70 truncate">{mg.key}</div>
                      <div className="mt-1 flex gap-1">
                        <span className="rounded bg-green-100 px-1 text-[9px] font-bold text-green-700">W</span>
                        <span className="rounded bg-red-100 px-1 text-[9px] font-bold text-red-700">L</span>
                        <span className="rounded bg-slate-200 px-1 text-[9px] font-bold text-slate-600">S</span>
                      </div>
                    </button>
                  );
                }

                // Beat node
                const step = node.data;
                const nodeId = `beat:${step.step_key}`;
                const isSelected = selectedNodeId === nodeId;
                return (
                  <button
                    key={step.step_key}
                    className={`absolute rounded-md border px-2 py-1.5 text-left shadow-sm ${c.node} ${
                      isSelected ? "ring-2 ring-slate-700" : ""
                    }`}
                    style={{ width: NODE_WIDTH, height: NODE_HEIGHT, left: x, top: y }}
                    onClick={() => setSelectedNodeId(isSelected ? null : nodeId)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-wide opacity-60">
                        Beat {step.order_index}
                      </span>
                      <span className="text-[10px] opacity-50">
                        Day {step.due_offset_days}+
                      </span>
                    </div>
                    <div className="mt-0.5 text-sm font-semibold truncate">{step.title}</div>
                    <div className="mt-0.5 text-[10px] opacity-70 truncate">{step.step_key}</div>
                    <div className="mt-1 text-[10px] opacity-60">
                      {(step.options as unknown[]).length} option{(step.options as unknown[]).length !== 1 ? "s" : ""}
                    </div>
                  </button>
                );
              });
            })}
          </div>
        </div>

        {/* Detail panel */}
        <div className="space-y-3 overflow-y-auto rounded-md border border-slate-200 bg-white px-4 py-4" style={{ maxHeight: 520 }}>
          <h3 className="text-sm font-semibold text-slate-800">Selected node</h3>

          {!selectedBeat && !selectedMinigame ? (
            <p className="text-sm text-slate-600">Click a node to inspect it.</p>
          ) : selectedMinigame ? (
            <div className="space-y-3">
              {selectedArc && (
                <p className="text-xs font-medium text-slate-500">{selectedArc.title}</p>
              )}
              <div className="flex items-center gap-2">
                <span className="rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 uppercase">
                  {selectedMinigame.game_type}
                </span>
                <span className={`rounded px-1.5 py-0.5 text-[10px] ${selectedMinigame.is_active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                  {selectedMinigame.is_active ? "active" : "inactive"}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{selectedMinigame.title}</p>
                <p className="text-[10px] text-slate-400 font-mono">{selectedMinigame.key}</p>
              </div>
              {selectedMinigame.description && (
                <p className="text-xs text-slate-600 leading-relaxed">{selectedMinigame.description}</p>
              )}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-700">Outcomes</p>
                {(["win", "lose", "skip"] as const).map((branch) => {
                  const b = selectedMinigame.outcomes[branch];
                  const branchColor = branch === "win" ? "bg-green-50 border-green-200" : branch === "lose" ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-200";
                  const badgeColor = branch === "win" ? "bg-green-100 text-green-700" : branch === "lose" ? "bg-red-100 text-red-700" : "bg-slate-200 text-slate-600";
                  return (
                    <div key={branch} className={`rounded border px-2 py-1.5 text-xs ${branchColor}`}>
                      <span className={`rounded px-1 py-0.5 text-[10px] font-bold uppercase ${badgeColor}`}>{branch}</span>
                      {b.reaction_text && (
                        <p className="mt-1 text-slate-700 leading-relaxed italic">{b.reaction_text}</p>
                      )}
                      {Object.keys(b.deltas).length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {b.deltas.stress !== undefined && (
                            <span className={`rounded px-1 text-[10px] ${b.deltas.stress > 0 ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}>
                              stress {b.deltas.stress > 0 ? "+" : ""}{b.deltas.stress}
                            </span>
                          )}
                          {b.deltas.energy !== undefined && (
                            <span className={`rounded px-1 text-[10px] ${b.deltas.energy > 0 ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
                              energy {b.deltas.energy > 0 ? "+" : ""}{b.deltas.energy}
                            </span>
                          )}
                        </div>
                      )}
                      {b.next_step_key && (
                        <p className="mt-0.5 text-[10px] text-indigo-600">→ {b.next_step_key}</p>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="text-xs text-slate-400">
                Order: {selectedMinigame.order_index} · Due offset: Day {selectedMinigame.due_offset_days}
              </div>
            </div>
          ) : selectedBeat ? (
            <div className="space-y-3">
              {selectedArc && (
                <p className="text-xs font-medium text-slate-500">{selectedArc.title}</p>
              )}
              <div>
                <p className="text-sm font-semibold text-slate-900">{selectedBeat.title}</p>
                <p className="text-[10px] text-slate-400">{selectedBeat.step_key}</p>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{selectedBeat.body}</p>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-700">
                  Options ({(selectedBeat.options as unknown[]).length})
                </p>
                {(selectedBeat.options as ArcOption[]).map((opt) => (
                  <div key={opt.option_key ?? opt.id} className="rounded bg-slate-50 px-2 py-1.5 text-xs">
                    <p className="font-medium text-slate-800">{opt.label}</p>
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {opt.energy_cost !== undefined && opt.energy_cost !== 0 && (
                        <span className="text-slate-400">energy: {opt.energy_cost}</span>
                      )}
                      {opt.next_step_key && (
                        <span className="rounded bg-indigo-50 px-1 text-indigo-600">
                          → {opt.next_step_key}
                        </span>
                      )}
                      {opt.sets_stream_state && (
                        <span className="rounded bg-indigo-50 px-1 text-indigo-600">
                          → {opt.sets_stream_state.state}
                        </span>
                      )}
                      {opt.money_effect && (
                        <span className={`rounded px-1 ${opt.money_effect === "worsen" ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
                          money {opt.money_effect}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {selectedBeat.default_next_step_key && (
                <div className="text-xs text-teal-600">
                  Default next: {selectedBeat.default_next_step_key}
                </div>
              )}
              <div className="text-xs text-slate-400">
                Due offset: Day {selectedBeat.due_offset_days} · Expires after: {selectedBeat.expires_after_days}d
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
