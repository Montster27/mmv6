import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/events";
import type { Storylet, StoryletChoice } from "@/types/storylets";

export type GraphViewProps = {
  storylets: Storylet[];
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
  belonging:         "bg-purple-100 border-purple-300 text-purple-800",
  opportunity:       "bg-orange-100 border-orange-300 text-orange-800",
  home:              "bg-rose-100 border-rose-300 text-rose-800",
  // Legacy phase tags
  intro_hook:        "bg-blue-100 border-blue-300 text-blue-800",
  guided_core_loop:  "bg-emerald-100 border-emerald-300 text-emerald-800",
  reflection_arc:    "bg-amber-100 border-amber-300 text-amber-800",
  community_purpose: "bg-purple-100 border-purple-300 text-purple-800",
  unphased:          "bg-slate-50 border-slate-200 text-slate-600",
};

const STREAM_SET = new Set(STREAM_ORDER);

const NODE_WIDTH = 220;
const NODE_HEIGHT = 108;
const COLUMN_GAP = 80;
const ROW_GAP = 32;

// ── Helper functions ──────────────────────────────────────────────────────────

/** Returns the group key for a storylet (stream tag first, then phase: tag, then "unphased"). */
function getGroupTag(storylet: Storylet): string {
  const tags = storylet.tags ?? [];
  const streamTag = tags.find((t) => STREAM_SET.has(t));
  if (streamTag) return streamTag;
  const phaseTag = tags.find((t) => t.startsWith("phase:"));
  if (phaseTag) return phaseTag.replace("phase:", "");
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

// ── Component ─────────────────────────────────────────────────────────────────

export function GraphView({
  storylets,
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
  const [connectSourceId, setConnectSourceId] = useState("");
  const [connectChoiceId, setConnectChoiceId] = useState("");
  const [connectTargetId, setConnectTargetId] = useState("");

  useEffect(() => {
    trackEvent({ event_type: "graph_opened" });
  }, []);

  // Build a slug → id map for preclusion edge lookups
  const slugToId = useMemo(() => {
    const map: Record<string, string> = {};
    storylets.forEach((s) => { map[s.slug] = s.id; });
    return map;
  }, [storylets]);

  const nodePositions = useMemo(() => {
    const grouped: Record<string, Storylet[]> = {};
    storylets.forEach((storylet) => {
      const group = getGroupTag(storylet);
      if (!grouped[group]) grouped[group] = [];
      grouped[group].push(storylet);
    });

    // Sort each group by min_day_index for a natural timeline order
    Object.values(grouped).forEach((list) =>
      list.sort((a, b) => getMinDay(a) - getMinDay(b))
    );

    // Build ordered column list: streams first, then legacy phases, then unphased
    const allGroups = [
      ...STREAM_ORDER.filter((g) => grouped[g]),
      ...PHASE_ORDER.filter((g) => grouped[g] && !STREAM_SET.has(g)),
      ...Object.keys(grouped).filter(
        (g) =>
          !STREAM_SET.has(g) &&
          !PHASE_ORDER.includes(g) &&
          g !== "unphased"
      ),
      ...(grouped.unphased ? ["unphased"] : []),
    ];

    const positions: Record<string, { x: number; y: number }> = {};
    allGroups.forEach((group, colIndex) => {
      const list = grouped[group] ?? [];
      list.forEach((storylet, rowIndex) => {
        positions[storylet.id] = {
          x: colIndex * (NODE_WIDTH + COLUMN_GAP),
          y: rowIndex * (NODE_HEIGHT + ROW_GAP),
        };
      });
    });
    return positions;
  }, [storylets]);

  /** Directed edges: targetStoryletId (solid) + precludes (dashed red) */
  const edges = useMemo(() => {
    const list: Array<{
      from: string;
      to: string;
      invalid: boolean;
      kind: "target" | "precludes";
    }> = [];
    const ids = new Set(storylets.map((s) => s.id));

    storylets.forEach((storylet) => {
      storylet.choices.forEach((choice) => {
        // targetStoryletId edges
        const target = getChoiceTarget(choice);
        if (target) {
          list.push({ from: storylet.id, to: target, invalid: !ids.has(target), kind: "target" });
        }

        // precludes edges — choice blocks a future storylet
        const precludes = (choice as StoryletChoice & { precludes?: string[] }).precludes ?? [];
        precludes.forEach((slug) => {
          const toId = slugToId[slug];
          if (toId && toId !== storylet.id) {
            list.push({ from: storylet.id, to: toId, invalid: false, kind: "precludes" });
          }
        });
      });
    });
    return list;
  }, [storylets, slugToId]);

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
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
        <span>Drag to pan · Scroll to zoom · Columns = narrative stream</span>
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
        </div>
      </div>

      {/* Stream colour legend */}
      <div className="flex flex-wrap gap-2 text-xs">
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
        <span className="flex items-center gap-1 text-red-500">
          <span className="inline-block h-0.5 w-6 border-t-2 border-dashed border-red-400" /> precludes
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div
          className="relative h-[540px] overflow-hidden rounded-md border border-slate-200 bg-white"
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

                if (isPrecludes) {
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
            </svg>

            {storylets.map((storylet) => {
              const pos = nodePositions[storylet.id];
              if (!pos) return null;
              const group = getGroupTag(storylet);
              const color = GROUP_COLORS[group] ?? GROUP_COLORS.unphased;
              const orphan = !incomingCounts[storylet.id];
              const deadEnd = outgoingCounts[storylet.id] === 0;
              const isEntry = entrySet.has(storylet.id);
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
                  <div className="flex items-center justify-between">
                    <div className="text-xs uppercase tracking-wide capitalize">{group}</div>
                    {dayLabel && <div className="text-[10px] opacity-60">{dayLabel}</div>}
                  </div>
                  <div className="mt-0.5 text-sm font-semibold text-slate-900 truncate">
                    {storylet.title || storylet.slug}
                  </div>
                  <div className="text-xs text-slate-600 truncate">{storylet.slug}</div>
                  <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-slate-500">
                    {isEntry && <span className="rounded bg-white/60 px-1">Start</span>}
                    {orphan && <span className="rounded bg-white/60 px-1">Orphan</span>}
                    {deadEnd && <span className="rounded bg-white/60 px-1">Dead-end</span>}
                    {missingLinks && <span className="rounded bg-red-100 px-1 text-red-700">Bad link</span>}
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
    </div>
  );
}
