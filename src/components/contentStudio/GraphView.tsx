import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/events";
import type { Storylet, StoryletChoice } from "@/types/storylets";

type GraphViewProps = {
  storylets: Storylet[];
  selectedStorylet: Storylet | null;
  onSelectStorylet: (storylet: Storylet) => void;
  onRetargetChoice: (choiceId: string, targetId: string) => void;
};

const PHASE_ORDER = [
  "intro_hook",
  "guided_core_loop",
  "reflection_arc",
  "community_purpose",
  "remnant_reveal",
  "cliffhanger",
];

const PHASE_COLORS: Record<string, string> = {
  intro_hook: "bg-blue-100 border-blue-300 text-blue-800",
  guided_core_loop: "bg-emerald-100 border-emerald-300 text-emerald-800",
  reflection_arc: "bg-amber-100 border-amber-300 text-amber-800",
  community_purpose: "bg-purple-100 border-purple-300 text-purple-800",
  remnant_reveal: "bg-slate-100 border-slate-300 text-slate-700",
  cliffhanger: "bg-rose-100 border-rose-300 text-rose-800",
  unphased: "bg-slate-50 border-slate-200 text-slate-600",
};

const NODE_WIDTH = 220;
const NODE_HEIGHT = 100;
const COLUMN_GAP = 80;
const ROW_GAP = 40;

function getPhaseTag(storylet: Storylet) {
  const tag = (storylet.tags ?? []).find((t) => t.startsWith("phase:"));
  return tag ? tag.replace("phase:", "") : "";
}

function getChoiceTarget(choice: StoryletChoice): string {
  return (choice as StoryletChoice & { targetStoryletId?: string })
    .targetStoryletId ?? "";
}

export function GraphView({
  storylets,
  selectedStorylet,
  onSelectStorylet,
  onRetargetChoice,
}: GraphViewProps) {
  const [offset, setOffset] = useState({ x: 20, y: 20 });
  const [scale, setScale] = useState(1);
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    trackEvent({ event_type: "graph_opened" });
  }, []);

  const nodePositions = useMemo(() => {
    const grouped: Record<string, Storylet[]> = {};
    storylets.forEach((storylet) => {
      const phase = getPhaseTag(storylet) || "unphased";
      if (!grouped[phase]) grouped[phase] = [];
      grouped[phase].push(storylet);
    });
    const phases = [
      ...PHASE_ORDER.filter((phase) => grouped[phase]),
      ...Object.keys(grouped).filter(
        (phase) => !PHASE_ORDER.includes(phase) && phase !== "unphased"
      ),
      ...(grouped.unphased ? ["unphased"] : []),
    ];
    const positions: Record<string, { x: number; y: number }> = {};
    phases.forEach((phase, colIndex) => {
      const list = grouped[phase] ?? [];
      list.forEach((storylet, rowIndex) => {
        positions[storylet.id] = {
          x: colIndex * (NODE_WIDTH + COLUMN_GAP),
          y: rowIndex * (NODE_HEIGHT + ROW_GAP),
        };
      });
    });
    return positions;
  }, [storylets]);

  const edges = useMemo(() => {
    const list: Array<{
      from: string;
      to: string;
      invalid: boolean;
    }> = [];
    const ids = new Set(storylets.map((s) => s.id));
    storylets.forEach((storylet) => {
      storylet.choices.forEach((choice) => {
        const target = getChoiceTarget(choice);
        if (!target) return;
        list.push({
          from: storylet.id,
          to: target,
          invalid: !ids.has(target),
        });
      });
    });
    return list;
  }, [storylets]);

  const incomingCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    edges.forEach((edge) => {
      if (!edge.invalid) {
        counts[edge.to] = (counts[edge.to] ?? 0) + 1;
      }
    });
    return counts;
  }, [edges]);

  const outgoingCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    storylets.forEach((storylet) => {
      const hasOutgoing = storylet.choices.some((choice) => getChoiceTarget(choice));
      counts[storylet.id] = hasOutgoing ? 1 : 0;
    });
    return counts;
  }, [storylets]);

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const next = Math.min(1.6, Math.max(0.6, scale - event.deltaY * 0.001));
    setScale(next);
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    dragRef.current = { x: event.clientX - offset.x, y: event.clientY - offset.y };
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    setOffset({
      x: event.clientX - dragRef.current.x,
      y: event.clientY - dragRef.current.y,
    });
  };

  const handleMouseUp = () => {
    dragRef.current = null;
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
        Drag to pan. Scroll to zoom.
      </div>
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
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
              width: "100%",
              height: "100%",
            }}
          >
            <svg className="absolute left-0 top-0 h-full w-full">
              {edges.map((edge, idx) => {
                const fromPos = nodePositions[edge.from];
                const toPos = nodePositions[edge.to];
                if (!fromPos || !toPos) return null;
                const x1 = fromPos.x + NODE_WIDTH;
                const y1 = fromPos.y + NODE_HEIGHT / 2;
                const x2 = toPos.x;
                const y2 = toPos.y + NODE_HEIGHT / 2;
                return (
                  <line
                    key={`${edge.from}-${edge.to}-${idx}`}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={edge.invalid ? "#dc2626" : "#94a3b8"}
                    strokeWidth={2}
                    strokeDasharray={edge.invalid ? "4 4" : "0"}
                  />
                );
              })}
            </svg>
            {storylets.map((storylet) => {
              const pos = nodePositions[storylet.id];
              if (!pos) return null;
              const phase = getPhaseTag(storylet) || "unphased";
              const color = PHASE_COLORS[phase] ?? PHASE_COLORS.unphased;
              const orphan = !incomingCounts[storylet.id];
              const deadEnd = outgoingCounts[storylet.id] === 0;
              const selected = selectedStorylet?.id === storylet.id;
              return (
                <button
                  key={storylet.id}
                  className={`absolute rounded-md border px-3 py-2 text-left shadow-sm ${color} ${
                    selected ? "ring-2 ring-slate-700" : ""
                  }`}
                  style={{ width: NODE_WIDTH, height: NODE_HEIGHT, left: pos.x, top: pos.y }}
                  onClick={() => {
                    onSelectStorylet(storylet);
                    trackEvent({
                      event_type: "graph_node_selected",
                      payload: { id: storylet.id },
                    });
                  }}
                >
                  <div className="text-xs uppercase tracking-wide">{phase}</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {storylet.title || storylet.slug}
                  </div>
                  <div className="text-xs text-slate-600">{storylet.slug}</div>
                  <div className="mt-1 flex gap-2 text-[11px] text-slate-600">
                    {orphan ? <span>Orphan</span> : null}
                    {deadEnd ? <span>Dead-end</span> : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3 rounded-md border border-slate-200 bg-white px-4 py-4">
          <h3 className="text-sm font-semibold text-slate-800">
            Selected node
          </h3>
          {!selectedStorylet ? (
            <p className="text-sm text-slate-600">Select a node to edit.</p>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {selectedStorylet.title || selectedStorylet.slug}
                </p>
                <p className="text-xs text-slate-500">{selectedStorylet.id}</p>
              </div>
              <div className="space-y-2">
                {selectedStorylet.choices.map((choice) => {
                  const target = getChoiceTarget(choice);
                  const invalidTarget =
                    target && !storylets.some((s) => s.id === target);
                  return (
                    <div key={choice.id} className="space-y-1">
                      <p className="text-xs text-slate-600">{choice.label}</p>
                      <select
                        className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                        value={target}
                        onChange={(event) => {
                          onRetargetChoice(choice.id, event.target.value);
                          trackEvent({
                            event_type: "graph_edge_updated",
                            payload: {
                              storylet_id: selectedStorylet.id,
                              choice_id: choice.id,
                              target_id: event.target.value,
                            },
                          });
                        }}
                      >
                        <option value="">No target</option>
                        {storylets.map((storylet) => (
                          <option key={storylet.id} value={storylet.id}>
                            {storylet.title || storylet.slug}
                          </option>
                        ))}
                      </select>
                      {invalidTarget ? (
                        <p className="text-xs text-red-600">
                          Invalid target
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              <Button variant="outline" onClick={() => onSelectStorylet(selectedStorylet)}>
                Jump to editor
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
