import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/events";
import type { Storylet, StoryletChoice } from "@/types/storylets";

export type ArcDefinitionSummary = {
  id: string;
  key: string;
  title: string;
};

export type GraphViewProps = {
  storylets: Storylet[];
  arcDefinitions?: ArcDefinitionSummary[];
  selectedStorylet: Storylet | null;
  onSelectStorylet: (storylet: Storylet) => void;
  onRetargetChoice: (choiceId: string, targetId: string) => void;
  entryNodeIds?: string[];
  onCreateNode?: () => void;
  onSetStartNode?: (storyletId: string) => void;
  onConnectChoice?: (sourceId: string, choiceId: string, targetId: string) => void;
  /** Called when "Jump to editor" is clicked. Defaults to onSelectStorylet. */
  onJumpToEditor?: (storylet: Storylet) => void;
};

// ── Grouping constants ────────────────────────────────────────────────────────

/** Arc One narrative stream tags (checked before phase: tags) */
const STREAM_ORDER = [
  "roommate",
  "academic",
  "money",
  "belonging",
  "opportunity",
  "home",
];

const PHASE_ORDER = [
  "intro_hook",
  "guided_core_loop",
  "reflection_arc",
  "community_purpose",
];

const GROUP_COLORS: Record<string, string> = {
  // Arc One streams
  roommate:          "bg-blue-100 border-blue-300 text-blue-800",
  academic:          "bg-amber-100 border-amber-300 text-amber-800",
  money:             "bg-emerald-100 border-emerald-300 text-emerald-800",
  belonging:         "bg-violet-100 border-violet-300 text-violet-800",
  opportunity:       "bg-rose-100 border-rose-300 text-rose-800",
  home:              "bg-cyan-100 border-cyan-300 text-cyan-800",
  // Phase columns
  intro_hook:        "bg-purple-100 border-purple-300 text-purple-800",
  guided_core_loop:  "bg-sky-100 border-sky-300 text-sky-800",
  reflection_arc:    "bg-lime-100 border-lime-300 text-lime-800",
  community_purpose: "bg-orange-100 border-orange-300 text-orange-800",
  // Catch-all
  unphased:          "bg-slate-100 border-slate-300 text-slate-600",
};

const ARC_PALETTE = [
  "bg-indigo-100 border-indigo-300 text-indigo-800",
  "bg-pink-100 border-pink-300 text-pink-800",
  "bg-teal-100 border-teal-300 text-teal-800",
  "bg-yellow-100 border-yellow-300 text-yellow-800",
  "bg-fuchsia-100 border-fuchsia-300 text-fuchsia-800",
  "bg-lime-100 border-lime-300 text-lime-800",
];

const NODE_WIDTH = 220;
const NODE_HEIGHT = 108;
const COLUMN_GAP = 80;
const ROW_GAP = 32;

function getGroupTag(storylet: Storylet, arcIdToKey: Map<string, string>): string {
  if (storylet.track_id) {
    const k = arcIdToKey.get(storylet.track_id);
    if (k) return STREAM_ORDER.includes(k) ? k : `arc:${k}`;
  }
  const tags = storylet.tags ?? [];
  for (const s of STREAM_ORDER) if (tags.includes(s)) return s;
  for (const p of PHASE_ORDER) if (tags.includes(p)) return p;
  return "unphased";
}

function getChoiceTarget(choice: StoryletChoice): string {
  return (choice as StoryletChoice & { targetStoryletId?: string })
    .targetStoryletId ?? "";
}

/** Returns min_day_index from requirements for sorting within a stream column */
function getMinDay(storylet: Storylet): number {
  const req = storylet.requirements ?? {};
  return typeof req.min_day_index === "number" ? req.min_day_index : 999;
}

// ── Choice Picker Modal ─────────────────────────────────────────────────────

function ChoicePickerModal({
  sourceStorylet,
  targetStorylet,
  allStorylets,
  onConnect,
  onCancel,
}: {
  sourceStorylet: Storylet;
  targetStorylet: Storylet;
  allStorylets: Storylet[];
  onConnect: (choiceId: string) => void;
  onCancel: () => void;
}) {
  const [selectedChoiceId, setSelectedChoiceId] = useState("");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={onCancel}
    >
      <div
        className="w-96 rounded-lg border border-slate-200 bg-white p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold text-slate-900">Connect Nodes</h3>
        <p className="mt-1 text-xs text-slate-500">
          <span className="font-medium text-slate-700">{sourceStorylet.title || sourceStorylet.slug}</span>
          {" → "}
          <span className="font-medium text-slate-700">{targetStorylet.title || targetStorylet.slug}</span>
        </p>
        <p className="mt-3 text-xs font-medium text-slate-700">Which choice should link to this target?</p>
        <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">
          {sourceStorylet.choices.map((choice) => {
            const existingTarget = getChoiceTarget(choice);
            const existingName = existingTarget
              ? allStorylets.find((s) => s.id === existingTarget)?.title ?? existingTarget.slice(0, 12)
              : null;
            return (
              <label
                key={choice.id}
                className={`flex items-start gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-slate-50 ${
                  selectedChoiceId === choice.id ? "bg-green-50 ring-1 ring-green-300" : ""
                }`}
              >
                <input
                  type="radio"
                  name="connect-choice"
                  value={choice.id}
                  checked={selectedChoiceId === choice.id}
                  onChange={() => setSelectedChoiceId(choice.id)}
                  className="mt-0.5"
                />
                <div>
                  <span className="text-slate-800">{choice.label}</span>
                  {existingName && (
                    <span className="ml-1.5 text-[10px] text-slate-400">
                      (currently → {existingName})
                    </span>
                  )}
                </div>
              </label>
            );
          })}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!selectedChoiceId}
            onClick={() => onConnect(selectedChoiceId)}
          >
            Connect
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GraphView({
  storylets,
  arcDefinitions = [],
  selectedStorylet,
  onSelectStorylet,
  onRetargetChoice,
  entryNodeIds = [],
  onCreateNode,
  onSetStartNode,
  onConnectChoice,
  onJumpToEditor,
}: GraphViewProps) {
  const [offset, setOffset] = useState({ x: 20, y: 20 });
  const [scale, setScale] = useState(1);
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  // ── Dropdown-based connect (right panel, existing) ──
  const [connectSourceId, setConnectSourceId] = useState("");
  const [connectChoiceId, setConnectChoiceId] = useState("");
  const [connectTargetId, setConnectTargetId] = useState("");

  // ── Click-to-connect mode ──
  const [connectingMode, setConnectingMode] = useState(false);
  const [connectingSourceId, setConnectingSourceId] = useState<string | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [showChoiceModal, setShowChoiceModal] = useState(false);
  const [pendingTargetId, setPendingTargetId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  /** arc id → arc key (for getGroupTag) */
  const arcIdToKey = useMemo(() => {
    const m = new Map<string, string>();
    arcDefinitions.forEach((a) => m.set(a.id, a.key));
    return m;
  }, [arcDefinitions]);

  /** arc key → color class (cycles through ARC_PALETTE) */
  const arcKeyToColor = useMemo(() => {
    const m = new Map<string, string>();
    arcDefinitions.forEach((a, i) => {
      m.set(a.key, ARC_PALETTE[i % ARC_PALETTE.length]);
    });
    return m;
  }, [arcDefinitions]);

  useEffect(() => {
    trackEvent({ event_type: "graph_opened" });
  }, []);

  // Escape key exits connect mode
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && connectingMode) {
        setConnectingMode(false);
        setConnectingSourceId(null);
        setCursorPos(null);
        setShowChoiceModal(false);
        setPendingTargetId(null);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [connectingMode]);

  // Build a slug → id map for preclusion edge lookups
  const slugToId = useMemo(() => {
    const map: Record<string, string> = {};
    storylets.forEach((s) => { map[s.slug] = s.id; });
    return map;
  }, [storylets]);

  // Build (arc_id:step_key) → storylet id map for arc FSM edge lookups
  const stepKeyToId = useMemo(() => {
    const map = new Map<string, string>();
    storylets.forEach((s) => {
      if (s.track_id && s.storylet_key) {
        map.set(`${s.track_id}:${s.storylet_key}`, s.id);
      }
    });
    return map;
  }, [storylets]);

  const nodePositions = useMemo(() => {
    const grouped: Record<string, Storylet[]> = {};
    storylets.forEach((storylet) => {
      const group = getGroupTag(storylet, arcIdToKey);
      if (!grouped[group]) grouped[group] = [];
      grouped[group].push(storylet);
    });

    // Sort each group by min_day_index / order_index for a natural timeline order
    Object.values(grouped).forEach((list) =>
      list.sort((a, b) => {
        // Arc steps sort by order_index first
        const oA = typeof a.order_index === "number" ? a.order_index : 9999;
        const oB = typeof b.order_index === "number" ? b.order_index : 9999;
        if (oA !== oB) return oA - oB;
        return getMinDay(a) - getMinDay(b);
      })
    );

    const colOrder = [
      ...STREAM_ORDER,
      ...Object.keys(grouped)
        .filter((g) => g.startsWith("arc:"))
        .sort(),
      ...PHASE_ORDER.filter((p) => grouped[p]),
      ...(grouped["unphased"] ? ["unphased"] : []),
    ];

    const positions: Record<string, { x: number; y: number }> = {};
    let colIndex = 0;
    colOrder.forEach((group) => {
      const list = grouped[group] ?? [];
      if (list.length === 0) return;
      list.forEach((storylet, rowIndex) => {
        positions[storylet.id] = {
          x: colIndex * (NODE_WIDTH + COLUMN_GAP),
          y: rowIndex * (NODE_HEIGHT + ROW_GAP),
        };
      });
      colIndex++;
    });

    return positions;
  }, [storylets, arcIdToKey]);

  type Edge = {
    from: string;
    to: string;
    kind: "target" | "precludes" | "arc_step" | "arc_default";
    invalid: boolean;
  };

  const edges = useMemo<Edge[]>(() => {
    const result: Edge[] = [];
    storylets.forEach((storylet) => {
      storylet.choices.forEach((choice) => {
        const target = getChoiceTarget(choice);
        if (target) {
          const exists = storylets.some((s) => s.id === target);
          result.push({ from: storylet.id, to: target, kind: "target", invalid: !exists });
        }
        // Arc step: next_key → resolve via track_id:key
        const nextKey = (choice as StoryletChoice & { next_key?: string }).next_key;
        if (nextKey && storylet.track_id) {
          const resolvedId = stepKeyToId.get(`${storylet.track_id}:${nextKey}`);
          if (resolvedId) {
            result.push({ from: storylet.id, to: resolvedId, kind: "arc_step", invalid: false });
          }
        }
        // Preclusions
        const precludes = (choice as StoryletChoice & { precludes?: string[] }).precludes ?? [];
        precludes.forEach((slug) => {
          const precludedId = slugToId[slug];
          if (precludedId) {
            result.push({ from: storylet.id, to: precludedId, kind: "precludes", invalid: false });
          }
        });
      });
      // Arc default
      const defaultNext = storylet.default_next_key;
      if (defaultNext && storylet.track_id) {
        const resolvedId = stepKeyToId.get(`${storylet.track_id}:${defaultNext}`);
        if (resolvedId) {
          result.push({ from: storylet.id, to: resolvedId, kind: "arc_default", invalid: false });
        }
      }
    });
    return result;
  }, [storylets, slugToId, stepKeyToId]);

  const incomingCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    edges.forEach((edge) => {
      if (!edge.invalid && edge.kind === "target") {
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

  const entrySet = useMemo(() => new Set(entryNodeIds), [entryNodeIds]);

  const connectChoices = useMemo(() => {
    const source = storylets.find((storylet) => storylet.id === connectSourceId);
    return source?.choices ?? [];
  }, [storylets, connectSourceId]);

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const next = Math.min(1.6, Math.max(0.4, scale - event.deltaY * 0.001));
    setScale(next);
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (connectingMode) return; // Don't start pan drag in connect mode
    dragRef.current = { x: event.clientX - offset.x, y: event.clientY - offset.y };
  };

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (dragRef.current) {
      setOffset({
        x: event.clientX - dragRef.current.x,
        y: event.clientY - dragRef.current.y,
      });
      return;
    }
    // In connect mode with a source selected, track cursor for preview line
    if (connectingMode && connectingSourceId && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const canvasX = (event.clientX - rect.left - offset.x) / scale;
      const canvasY = (event.clientY - rect.top - offset.y) / scale;
      setCursorPos({ x: canvasX, y: canvasY });
    }
  }, [connectingMode, connectingSourceId, offset.x, offset.y, scale]);

  const handleMouseUp = () => {
    dragRef.current = null;
  };

  const handleNodeClick = (storylet: Storylet) => {
    if (!connectingMode) {
      // Normal selection
      onSelectStorylet(storylet);
      trackEvent({ event_type: "graph_node_selected", payload: { id: storylet.id } });
      return;
    }

    // Connect mode
    if (!connectingSourceId) {
      // First click: set source
      if (storylet.choices.length === 0) return; // Can't connect from a node with no choices
      setConnectingSourceId(storylet.id);
      onSelectStorylet(storylet);
    } else if (storylet.id === connectingSourceId) {
      // Clicked same node: deselect source
      setConnectingSourceId(null);
      setCursorPos(null);
    } else {
      // Second click: set target and show modal
      setPendingTargetId(storylet.id);
      setShowChoiceModal(true);
    }
  };

  const handleModalConnect = (choiceId: string) => {
    if (connectingSourceId && pendingTargetId) {
      onConnectChoice?.(connectingSourceId, choiceId, pendingTargetId);
      // Also call onRetargetChoice for immediate local update
      onRetargetChoice(choiceId, pendingTargetId);
    }
    // Reset connecting state but stay in connect mode for chaining
    setShowChoiceModal(false);
    setPendingTargetId(null);
    setConnectingSourceId(null);
    setCursorPos(null);
  };

  const handleModalCancel = () => {
    setShowChoiceModal(false);
    setPendingTargetId(null);
  };

  const exitConnectMode = () => {
    setConnectingMode(false);
    setConnectingSourceId(null);
    setCursorPos(null);
    setShowChoiceModal(false);
    setPendingTargetId(null);
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

  const sourceStorylet = connectingSourceId
    ? storylets.find((s) => s.id === connectingSourceId) ?? null
    : null;
  const targetStorylet = pendingTargetId
    ? storylets.find((s) => s.id === pendingTargetId) ?? null
    : null;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
        <span>
          {connectingMode
            ? connectingSourceId
              ? `Click a target node (source: ${sourceStorylet?.title ?? "..."})`
              : "Click a source node to start connecting..."
            : "Drag to pan · Scroll to zoom · Columns = narrative stream"}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={onCreateNode}>
            Add node
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!selectedStorylet}
            onClick={() =>
              selectedStorylet && onSetStartNode?.(selectedStorylet.id)
            }
          >
            Set start node
          </Button>
          <Button
            variant={connectingMode ? "default" : "outline"}
            size="sm"
            onClick={() => (connectingMode ? exitConnectMode() : setConnectingMode(true))}
          >
            {connectingMode ? "Cancel connect" : "Connect mode"}
          </Button>
        </div>
      </div>

      {/* Colour legend */}
      <div className="flex flex-wrap gap-2 text-xs">
        {arcDefinitions.map((arc, i) => (
          <span
            key={arc.id}
            className={`rounded-full border px-2 py-0.5 ${ARC_PALETTE[i % ARC_PALETTE.length]}`}
          >
            {arc.title}
          </span>
        ))}
        {STREAM_ORDER.map((s) => (
          <span
            key={s}
            className={`rounded-full border px-2 py-0.5 capitalize ${GROUP_COLORS[s]}`}
          >
            {s}
          </span>
        ))}
        <span className="ml-3 flex items-center gap-1 text-slate-500">
          <span className="inline-block h-0.5 w-6 bg-slate-400" /> target link
        </span>
        <span className="flex items-center gap-1 text-indigo-500">
          <span className="inline-block h-0.5 w-6 border-t-2 border-dotted border-indigo-400" /> arc step
        </span>
        <span className="flex items-center gap-1 text-teal-500">
          <span className="inline-block h-0.5 w-6 border-t-2 border-dashed border-teal-400" /> arc default
        </span>
        <span className="flex items-center gap-1 text-red-500">
          <span className="inline-block h-0.5 w-6 border-t-2 border-dashed border-red-400" /> precludes
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div
          ref={containerRef}
          className={`relative h-[540px] overflow-hidden rounded-md border border-slate-200 bg-white ${
            connectingMode ? "cursor-crosshair" : ""
          }`}
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
                <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill="#94a3b8" />
                </marker>
                <marker id="arrow-active" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill="#0f172a" />
                </marker>
                <marker id="arrow-invalid" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill="#dc2626" />
                </marker>
                <marker id="arrow-precludes" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill="#dc2626" />
                </marker>
                <marker id="arrow-arc-step" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill="#6366f1" />
                </marker>
                <marker id="arrow-arc-default" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill="#14b8a6" />
                </marker>
                <marker id="arrow-connect" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill="#22c55e" />
                </marker>
              </defs>
              {edges.map((edge, idx) => {
                const fromPos = nodePositions[edge.from];
                const toPos = nodePositions[edge.to];
                if (!fromPos || !toPos) return null;

                const isPrecludes = edge.kind === "precludes";
                const x1 = fromPos.x + NODE_WIDTH;
                const y1 = fromPos.y + NODE_HEIGHT / 2;
                const x2 = toPos.x;
                const y2 = toPos.y + NODE_HEIGHT / 2;
                const midX = x1 + (x2 - x1) * 0.5;
                const isActive =
                  selectedStorylet?.id === edge.from ||
                  selectedStorylet?.id === edge.to;

                let stroke: string;
                let marker: string;
                let dashArray: string;
                let strokeWidth: number;

                if (edge.kind === "arc_step") {
                  stroke = isActive ? "#4f46e5" : "#6366f1";
                  marker = "url(#arrow-arc-step)";
                  dashArray = "3 3";
                  strokeWidth = isActive ? 2.5 : 1.5;
                } else if (edge.kind === "arc_default") {
                  stroke = isActive ? "#0d9488" : "#14b8a6";
                  marker = "url(#arrow-arc-default)";
                  dashArray = "6 3";
                  strokeWidth = isActive ? 2.5 : 1.5;
                } else if (isPrecludes) {
                  stroke = "#dc2626";
                  marker = "url(#arrow-precludes)";
                  dashArray = "4 3";
                  strokeWidth = 1.5;
                } else if (edge.invalid) {
                  stroke = "#dc2626";
                  marker = "url(#arrow-invalid)";
                  dashArray = "4 4";
                  strokeWidth = 2;
                } else if (isActive) {
                  stroke = "#0f172a";
                  marker = "url(#arrow-active)";
                  dashArray = "0";
                  strokeWidth = 3;
                } else {
                  stroke = "#94a3b8";
                  marker = "url(#arrow)";
                  dashArray = "0";
                  strokeWidth = 2;
                }

                return (
                  <path
                    key={`${edge.from}-${edge.to}-${edge.kind}-${idx}`}
                    d={`M ${x1} ${y1} C ${midX} ${y1} ${midX} ${y2} ${x2} ${y2}`}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    strokeDasharray={dashArray}
                    fill="none"
                    markerEnd={marker}
                    opacity={isPrecludes && !isActive ? 0.55 : 1}
                  />
                );
              })}
              {/* Preview line in connect mode */}
              {connectingMode && connectingSourceId && cursorPos && nodePositions[connectingSourceId] && (
                <line
                  x1={nodePositions[connectingSourceId].x + NODE_WIDTH / 2}
                  y1={nodePositions[connectingSourceId].y + NODE_HEIGHT / 2}
                  x2={cursorPos.x}
                  y2={cursorPos.y}
                  stroke="#22c55e"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  opacity={0.7}
                  markerEnd="url(#arrow-connect)"
                  pointerEvents="none"
                />
              )}
            </svg>

            {storylets.map((storylet) => {
              const pos = nodePositions[storylet.id];
              if (!pos) return null;
              const group = getGroupTag(storylet, arcIdToKey);
              const isArcGroup = group.startsWith("arc:");
              const color = isArcGroup
                ? (arcKeyToColor.get(group.slice(4)) ?? GROUP_COLORS.unphased)
                : (GROUP_COLORS[group] ?? GROUP_COLORS.unphased);
              const orphan = !incomingCounts[storylet.id];
              const deadEnd = outgoingCounts[storylet.id] === 0;
              const isEntry = entrySet.has(storylet.id);
              const isConnectSource = connectingSourceId === storylet.id;
              const missingLinks = storylet.choices.some(
                (choice) => {
                  const t = getChoiceTarget(choice);
                  return t && !storylets.some((s) => s.id === t);
                }
              );
              const selected = selectedStorylet?.id === storylet.id;
              const req = storylet.requirements ?? {};
              const minDay = typeof req.min_day_index === "number" ? req.min_day_index : null;
              const maxDay = typeof req.max_day_index === "number" ? req.max_day_index : null;
              const dayLabel = minDay !== null
                ? maxDay !== null
                  ? `Day ${minDay}–${maxDay}`
                  : `Day ${minDay}+`
                : null;

              return (
                <button
                  key={storylet.id}
                  className={`absolute rounded-md border px-3 py-2 text-left shadow-sm ${color} ${
                    selected ? "ring-2 ring-slate-700" : ""
                  } ${
                    isConnectSource ? "ring-2 ring-green-500 ring-offset-2" : ""
                  } ${
                    connectingMode && connectingSourceId && !isConnectSource ? "hover:ring-2 hover:ring-green-300" : ""
                  }`}
                  style={{ width: NODE_WIDTH, height: NODE_HEIGHT, left: pos.x, top: pos.y }}
                  onClick={(e) => {
                    if (connectingMode) e.stopPropagation();
                    handleNodeClick(storylet);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-xs uppercase tracking-wide capitalize">
                      {isArcGroup
                        ? (arcDefinitions.find((a) => `arc:${a.key}` === group)?.title ?? group.slice(4))
                        : group}
                    </div>
                    {dayLabel && <div className="text-[10px] opacity-60">{dayLabel}</div>}
                  </div>
                  <div className="mt-0.5 text-sm font-semibold text-slate-900 truncate">
                    {storylet.title || storylet.slug}
                  </div>
                  <div className="text-xs text-slate-600 truncate">{storylet.slug}</div>
                  <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-slate-500">
                    {isEntry && <span className="rounded bg-green-200/70 px-1 text-green-800 font-medium">Start</span>}
                    {orphan && <span className="rounded bg-white/60 px-1">Orphan</span>}
                    {deadEnd && <span className="rounded bg-white/60 px-1">Dead-end</span>}
                    {missingLinks && <span className="rounded bg-red-100 px-1 text-red-700">Bad link</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right panel */}
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
                {selectedStorylet.requirements && Object.keys(selectedStorylet.requirements).length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {typeof (selectedStorylet.requirements as Record<string, unknown>).min_day_index === "number" && (
                      <span className="rounded bg-slate-100 px-1 text-[10px] text-slate-600">
                        day ≥ {(selectedStorylet.requirements as Record<string, unknown>).min_day_index as number}
                      </span>
                    )}
                    {typeof (selectedStorylet.requirements as Record<string, unknown>).max_day_index === "number" && (
                      <span className="rounded bg-slate-100 px-1 text-[10px] text-slate-600">
                        day ≤ {(selectedStorylet.requirements as Record<string, unknown>).max_day_index as number}
                      </span>
                    )}
                    {Array.isArray((selectedStorylet.requirements as Record<string, unknown>).requires_npc_met) && (
                      <span className="rounded bg-blue-50 px-1 text-[10px] text-blue-700">
                        needs: {((selectedStorylet.requirements as Record<string, unknown>).requires_npc_met as string[]).join(", ")}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                {selectedStorylet.choices.map((choice) => {
                  const target = getChoiceTarget(choice);
                  const precludes = (choice as StoryletChoice & { precludes?: string[] }).precludes ?? [];
                  const invalidTarget =
                    target && !storylets.some((s) => s.id === target);
                  return (
                    <div key={choice.id} className="space-y-1">
                      <p className="text-xs font-medium text-slate-700">{choice.label}</p>
                      {precludes.length > 0 && (
                        <p className="text-[10px] text-red-500">
                          precludes: {precludes.join(", ")}
                        </p>
                      )}
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
              <Button
                variant="outline"
                onClick={() =>
                  (onJumpToEditor ?? onSelectStorylet)(selectedStorylet)
                }
              >
                Jump to editor
              </Button>
            </div>
          )}
          <div className="border-t border-slate-200 pt-3">
            <h4 className="text-xs font-semibold text-slate-700">Connect nodes</h4>
            <div className="mt-2 space-y-2">
              <select
                className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                value={connectSourceId}
                onChange={(event) => {
                  setConnectSourceId(event.target.value);
                  setConnectChoiceId("");
                }}
              >
                <option value="">Source node</option>
                {storylets.map((storylet) => (
                  <option key={storylet.id} value={storylet.id}>
                    {storylet.title || storylet.slug}
                  </option>
                ))}
              </select>
              <select
                className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                value={connectChoiceId}
                onChange={(event) => setConnectChoiceId(event.target.value)}
                disabled={!connectSourceId}
              >
                <option value="">Choice</option>
                {connectChoices.map((choice) => (
                  <option key={choice.id} value={choice.id}>
                    {choice.label}
                  </option>
                ))}
              </select>
              <select
                className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                value={connectTargetId}
                onChange={(event) => setConnectTargetId(event.target.value)}
                disabled={!connectSourceId}
              >
                <option value="">Target node</option>
                {storylets.map((storylet) => (
                  <option key={storylet.id} value={storylet.id}>
                    {storylet.title || storylet.slug}
                  </option>
                ))}
              </select>
              <Button
                variant="outline"
                disabled={!connectSourceId || !connectChoiceId}
                onClick={() => {
                  if (!connectSourceId || !connectChoiceId) return;
                  onConnectChoice?.(
                    connectSourceId,
                    connectChoiceId,
                    connectTargetId
                  );
                }}
              >
                Connect
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Choice picker modal */}
      {showChoiceModal && sourceStorylet && targetStorylet && (
        <ChoicePickerModal
          sourceStorylet={sourceStorylet}
          targetStorylet={targetStorylet}
          allStorylets={storylets}
          onConnect={handleModalConnect}
          onCancel={handleModalCancel}
        />
      )}
    </div>
  );
}
