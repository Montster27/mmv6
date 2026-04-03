"use client";

import { useMemo, useRef, useState } from "react";
import type { ArcDefinitionRow, ArcStepRow } from "@/hooks/contentStudio/useArcsAPI";

export type ArcFlowViewProps = {
  arcDefinitions: ArcDefinitionRow[];
  arcSteps: ArcStepRow[];
};

// ── Types ────────────────────────────────────────────────────────────────────

type ArcOption = {
  id?: string;
  option_key?: string;
  label?: string;
  /** Engine-canonical chain pointer (preferred). */
  next_key?: string;
  /** Legacy alias — read as fallback for old content. */
  next_step_key?: string;
  energy_cost?: number;
  sets_stream_state?: { stream: string; state: string };
  money_effect?: string;
};

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

export function ArcFlowView({ arcDefinitions, arcSteps }: ArcFlowViewProps) {
  const [offset, setOffset] = useState({ x: 20, y: 20 });
  const [scale, setScale] = useState(0.9);
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const [selectedStepKey, setSelectedStepKey] = useState<string | null>(null);

  // Group steps by arc_id, sorted by order_index
  const stepsByArc = useMemo(() => {
    const map: Record<string, ArcStepRow[]> = {};
    arcSteps.forEach((step) => {
      if (!map[step.arc_id]) map[step.arc_id] = [];
      map[step.arc_id].push(step);
    });
    Object.values(map).forEach((arr) => arr.sort((a, b) => a.order_index - b.order_index));
    return map;
  }, [arcSteps]);

  // Layout: each arc is a row; steps are columns within that row
  const layout = useMemo(() => {
    const rows: Array<{
      arc: ArcDefinitionRow;
      steps: ArcStepRow[];
      y: number;
    }> = [];

    // Sort arc definitions by their key (roommate, academic, money, belonging, opportunity, home)
    const arcOrder = ["arc_roommate", "arc_academic", "arc_money", "arc_belonging", "arc_opportunity", "arc_home"];
    const sortedArcs = [...arcDefinitions].sort((a, b) => {
      const ai = arcOrder.indexOf(a.key);
      const bi = arcOrder.indexOf(b.key);
      if (ai === -1 && bi === -1) return a.key.localeCompare(b.key);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });

    let currentY = 48; // start below a header area
    sortedArcs.forEach((arc) => {
      const steps = stepsByArc[arc.id] ?? [];
      rows.push({ arc, steps, y: currentY });
      currentY += NODE_HEIGHT + ARC_ROW_GAP;
    });

    return rows;
  }, [arcDefinitions, stepsByArc]);

  // Build step_key → column index within each arc for branching edge lookup
  const stepKeyToIndex = useMemo(() => {
    const map = new Map<string, { arcId: string; idx: number }>();
    layout.forEach(({ arc, steps }) => {
      steps.forEach((step, idx) => {
        map.set(`${arc.id}:${step.step_key}`, { arcId: arc.id, idx });
      });
    });
    return map;
  }, [layout]);

  // Compute non-sequential (branching) edges from choices' next_key and default_next_step_key
  const branchEdges = useMemo(() => {
    const edges: Array<{
      arcId: string;
      fromIdx: number;
      toIdx: number;
      y: number;
      kind: "choice" | "default";
    }> = [];
    const seen = new Set<string>();

    layout.forEach(({ arc, steps, y }) => {
      steps.forEach((step, idx) => {
        // Check each option for next_key (preferred) or next_step_key (legacy fallback)
        const options = step.options as ArcOption[];
        options.forEach((opt) => {
          const nk = opt.next_key ?? opt.next_step_key;
          if (!nk) return;
          const target = stepKeyToIndex.get(`${arc.id}:${nk}`);
          if (!target || target.idx === idx + 1) return; // sequential = already drawn
          const key = `${arc.id}:${idx}:${target.idx}:choice`;
          if (seen.has(key)) return;
          seen.add(key);
          edges.push({ arcId: arc.id, fromIdx: idx, toIdx: target.idx, y, kind: "choice" });
        });

        // Check default_next_step_key (arc-steps API maps default_next_key → this field)
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
    const maxSteps = Math.max(...layout.map((r) => r.steps.length), 0);
    return Math.max(800, LABEL_WIDTH + maxSteps * COL_WIDTH + 80);
  }, [layout]);

  const canvasHeight = useMemo(() => {
    const lastRow = layout[layout.length - 1];
    if (!lastRow) return 400;
    return lastRow.y + NODE_HEIGHT + ARC_ROW_GAP + 40; // extra space for branch curves below
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

  const selectedStep = arcSteps.find((s) => s.step_key === selectedStepKey) ?? null;
  const selectedArc = selectedStep
    ? arcDefinitions.find((a) => a.id === selectedStep.arc_id)
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
        <span>Drag to pan · Scroll to zoom · Each row = one track · Nodes = storylets in order</span>
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
        <span className="ml-3 flex items-center gap-1 text-slate-500">
          <span className="inline-block h-0.5 w-6 bg-slate-300" /> sequential
        </span>
        <span className="flex items-center gap-1 text-indigo-500">
          <span className="inline-block h-0.5 w-6 border-t-2 border-dotted border-indigo-400" /> branch (choice)
        </span>
        <span className="flex items-center gap-1 text-teal-500">
          <span className="inline-block h-0.5 w-6 border-t-2 border-dashed border-teal-400" /> default fallback
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
              </defs>

              {/* Sequential arrows between adjacent storylets */}
              {layout.map(({ arc, steps, y }) => {
                return steps.slice(0, -1).map((step, idx) => {
                  const x1 = LABEL_WIDTH + idx * COL_WIDTH + NODE_WIDTH;
                  const x2 = LABEL_WIDTH + (idx + 1) * COL_WIDTH;
                  const midY = y + NODE_HEIGHT / 2;
                  const isActive = step.step_key === selectedStepKey || steps[idx + 1]?.step_key === selectedStepKey;
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

                // Forward skips curve below, backward jumps curve above
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

            {/* Arc row labels — positioned inside canvas at left edge */}
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

            {/* Step nodes */}
            {layout.map(({ arc, steps, y }) => {
              const c = ARC_COLORS[arc.key] ?? DEFAULT_COLORS;
              return steps.map((step, idx) => {
                const x = LABEL_WIDTH + idx * COL_WIDTH;
                const isSelected = step.step_key === selectedStepKey;
                return (
                  <button
                    key={step.step_key}
                    className={`absolute rounded-md border px-2 py-1.5 text-left shadow-sm ${c.node} ${
                      isSelected ? "ring-2 ring-slate-700" : ""
                    }`}
                    style={{ width: NODE_WIDTH, height: NODE_HEIGHT, left: x, top: y }}
                    onClick={() => setSelectedStepKey(isSelected ? null : step.step_key)}
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
          <h3 className="text-sm font-semibold text-slate-800">Selected storylet</h3>
          {!selectedStep ? (
            <p className="text-sm text-slate-600">Click a node to inspect it.</p>
          ) : (
            <div className="space-y-3">
              {selectedArc && (
                <p className="text-xs font-medium text-slate-500">{selectedArc.title}</p>
              )}
              <div>
                <p className="text-sm font-semibold text-slate-900">{selectedStep.title}</p>
                <p className="text-[10px] text-slate-400">{selectedStep.step_key}</p>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{selectedStep.body}</p>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-700">
                  Options ({(selectedStep.options as unknown[]).length})
                </p>
                {(selectedStep.options as ArcOption[]).map((opt) => (
                  <div key={opt.option_key ?? opt.id} className="rounded bg-slate-50 px-2 py-1.5 text-xs">
                    <p className="font-medium text-slate-800">{opt.label}</p>
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {opt.energy_cost !== undefined && opt.energy_cost !== 0 && (
                        <span className="text-slate-400">energy: {opt.energy_cost}</span>
                      )}
                      {(opt.next_key ?? opt.next_step_key) && (
                        <span className="rounded bg-indigo-50 px-1 text-indigo-600">
                          → {opt.next_key ?? opt.next_step_key}
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
              {selectedStep.default_next_step_key && (
                <div className="text-xs text-teal-600">
                  Default next: {selectedStep.default_next_step_key}
                </div>
              )}
              <div className="text-xs text-slate-400">
                Due offset: Day {selectedStep.due_offset_days} · Expires after: {selectedStep.expires_after_days}d
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
