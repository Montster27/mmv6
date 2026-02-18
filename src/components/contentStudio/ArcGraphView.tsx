import { useMemo, useRef, useState } from "react";

import type { ContentArcStep } from "@/types/content";

type ArcGraphViewProps = {
  steps: ContentArcStep[];
  selectedStepIndex: number | null;
  onSelectStep: (index: number) => void;
};

const NODE_WIDTH = 260;
const NODE_HEIGHT = 90;
const COLUMN_GAP = 120;
const ROW_GAP = 40;

export function ArcGraphView({
  steps,
  selectedStepIndex,
  onSelectStep,
}: ArcGraphViewProps) {
  const [offset, setOffset] = useState({ x: 20, y: 20 });
  const [scale, setScale] = useState(1);
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  const stepMap = useMemo(() => {
    const map = new Map<number, ContentArcStep>();
    steps.forEach((step) => map.set(step.step_index, step));
    return map;
  }, [steps]);

  const nodePositions = useMemo(() => {
    const positions: Record<number, { x: number; y: number }> = {};
    const ordered = [...steps].sort((a, b) => a.step_index - b.step_index);
    ordered.forEach((step, idx) => {
      positions[step.step_index] = {
        x: 0,
        y: idx * (NODE_HEIGHT + ROW_GAP),
      };
    });
    return positions;
  }, [steps]);

  const edges = useMemo(() => {
    const list: Array<{ from: number; to: number }> = [];
    const indices = new Set(steps.map((step) => step.step_index));
    steps.forEach((step) => {
      step.choices?.forEach((choice) => {
        const next =
          typeof choice.next_step_index === "number"
            ? choice.next_step_index
            : step.step_index + 1;
        if (indices.has(next)) {
          list.push({ from: step.step_index, to: next });
        }
      });
    });
    return list;
  }, [steps]);

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

  const canvasSize = useMemo(() => {
    let maxX = 0;
    let maxY = 0;
    Object.values(nodePositions).forEach((pos) => {
      maxX = Math.max(maxX, pos.x + NODE_WIDTH);
      maxY = Math.max(maxY, pos.y + NODE_HEIGHT);
    });
    return {
      width: Math.max(640, maxX + COLUMN_GAP),
      height: Math.max(360, maxY + ROW_GAP),
    };
  }, [nodePositions]);

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
        Drag to pan. Scroll to zoom.
      </div>
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
            width: canvasSize.width,
            height: canvasSize.height,
          }}
        >
          <svg
            className="absolute left-0 top-0"
            width={canvasSize.width}
            height={canvasSize.height}
          >
            <defs>
              <marker
                id="arc-arrow"
                markerWidth="8"
                markerHeight="8"
                refX="6"
                refY="3"
                orient="auto"
              >
                <path d="M0,0 L6,3 L0,6 Z" fill="#94a3b8" />
              </marker>
            </defs>
            {edges.map((edge, idx) => {
              const fromPos = nodePositions[edge.from];
              const toPos = nodePositions[edge.to];
              if (!fromPos || !toPos) return null;
              const x1 = fromPos.x + NODE_WIDTH / 2;
              const y1 = fromPos.y + NODE_HEIGHT;
              const x2 = toPos.x + NODE_WIDTH / 2;
              const y2 = toPos.y;
              const midY = y1 + (y2 - y1) * 0.5;
              return (
                <path
                  key={`${edge.from}-${edge.to}-${idx}`}
                  d={`M ${x1} ${y1} C ${x1} ${midY} ${x2} ${midY} ${x2} ${y2}`}
                  stroke="#94a3b8"
                  strokeWidth={2}
                  fill="none"
                  markerEnd="url(#arc-arrow)"
                />
              );
            })}
          </svg>
          {steps.map((step) => {
            const pos = nodePositions[step.step_index];
            if (!pos) return null;
            const isSelected = selectedStepIndex === step.step_index;
            return (
              <button
                key={step.step_index}
                className={`absolute rounded-md border px-3 py-2 text-left text-xs shadow-sm transition ${
                  isSelected
                    ? "border-slate-900 bg-slate-100 text-slate-900"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                }`}
                style={{
                  left: pos.x,
                  top: pos.y,
                  width: NODE_WIDTH,
                  height: NODE_HEIGHT,
                }}
                onClick={() => onSelectStep(step.step_index)}
                type="button"
              >
                <div className="text-xs font-semibold">
                  {step.step_index}. {step.title}
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  {step.choices?.length ?? 0} choices
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
