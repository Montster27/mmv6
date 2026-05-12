"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Storylet } from "@/types/storylets";
import type { ArcDefinitionRow } from "@/hooks/contentStudio/useArcsAPI";
import { TRACK_LABELS, TRACK_PALETTE, trackStyle, type TrackKey } from "@/lib/trackPalette";

// ── constants ─────────────────────────────────────────────────────────────────

const CANVAS_W = 2200;
const CANVAS_H = 1100;
const NODE_W = 130;
const NODE_H = 50;
const TRACK_ORDER: TrackKey[] = [
  "roommate",
  "academic",
  "money",
  "belonging",
  "opportunity",
  "home",
];

// ── helpers ───────────────────────────────────────────────────────────────────

function buildTrackIdToKey(arcs: ArcDefinitionRow[]): Record<string, TrackKey> {
  const map: Record<string, TrackKey> = {};
  for (const arc of arcs) {
    const match = TRACK_ORDER.find((k) => k === arc.key || arc.key.includes(k));
    if (match) map[arc.id] = match;
  }
  return map;
}

function slKey(sl: Storylet): string {
  return sl.storylet_key ?? String(sl.id);
}

interface NodePos {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface EdgeDef {
  from: string;
  to: string;
  kind: "chain" | "preclude";
}

// ── ConstellationView ─────────────────────────────────────────────────────────

interface ConstellationViewProps {
  storylets: Storylet[];
  arcDefinitions: ArcDefinitionRow[];
  loading: boolean;
}

export function ConstellationView({
  storylets,
  arcDefinitions,
  loading,
}: ConstellationViewProps) {
  const router = useRouter();
  const [zoom, setZoom] = useState(0.85);
  const [pan, setPan] = useState({ x: 20, y: 20 });
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const trackIdToKey = useMemo(
    () => buildTrackIdToKey(arcDefinitions),
    [arcDefinitions]
  );

  // Non-passive wheel listener for zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      setZoom((z) => Math.min(1.6, Math.max(0.4, z - e.deltaY * 0.001)));
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  const layout = useMemo(() => {
    let maxDay = 0;
    for (const sl of storylets) {
      const d = sl.due_offset_days ?? 0;
      if (d > maxDay) maxDay = d;
    }
    maxDay = Math.max(maxDay, 14);

    const dayW = (CANVAS_W - 100) / maxDay;
    const trackH = (CANVAS_H - 80) / TRACK_ORDER.length;

    const positions: Record<string, NodePos> = {};
    for (const sl of storylets) {
      const key = slKey(sl);
      const trackKey = sl.track_id ? (trackIdToKey[sl.track_id] ?? null) : null;
      const ti = trackKey ? TRACK_ORDER.indexOf(trackKey) : -1;
      if (ti === -1) continue;

      const seg = sl.segment ?? "morning";
      const segOff = seg === "morning" ? 0 : seg === "afternoon" ? 0.33 : 0.66;
      const day = sl.due_offset_days ?? 0;
      const x = 60 + day * dayW + segOff * dayW;
      const y = 60 + ti * trackH;
      positions[key] = { x, y, w: NODE_W, h: NODE_H };
    }

    const days = Array.from({ length: maxDay + 1 }, (_, i) => i);
    return { positions, days, dayW, trackH, maxDay };
  }, [storylets, trackIdToKey]);

  const edges = useMemo(() => {
    const out: EdgeDef[] = [];
    const seen = new Set<string>();

    function addEdge(from: string, to: string, kind: EdgeDef["kind"]) {
      const k = `${from}→${to}:${kind}`;
      if (!seen.has(k) && layout.positions[from] && layout.positions[to]) {
        seen.add(k);
        out.push({ from, to, kind });
      }
    }

    for (const sl of storylets) {
      const from = slKey(sl);

      // Chain: default_next_key
      if (sl.default_next_key) {
        addEdge(from, sl.default_next_key, "chain");
      }

      // Chain + preclusion: choices
      for (const choice of sl.choices) {
        if (choice.next_key) {
          addEdge(from, choice.next_key, "chain");
        }
        for (const p of choice.precludes ?? []) {
          addEdge(from, p, "preclude");
        }
      }
    }

    return out;
  }, [layout, storylets]);

  function onMouseDown(e: React.MouseEvent) {
    const target = e.target as HTMLElement;
    if (target.closest(".node")) return;
    dragRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!dragRef.current) return;
    setPan({
      x: e.clientX - dragRef.current.x,
      y: e.clientY - dragRef.current.y,
    });
  }

  function stopDrag() {
    dragRef.current = null;
  }

  function handleNodeClick(sl: Storylet) {
    const key = slKey(sl);
    setSelectedKey(key);
    router.push(`/studio/content/storylets?id=${sl.id}`);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Canvas head */}
      <div className="canvas-head">
        <h2>Constellation</h2>
        <span className="sub">
          {storylets.length} storylet{storylets.length !== 1 ? "s" : ""} ·{" "}
          {edges.filter((e) => e.kind === "chain").length} chain ·{" "}
          {edges.filter((e) => e.kind === "preclude").length} preclude
        </span>
      </div>

      {/* Constellation canvas */}
      <div
        ref={containerRef}
        className="constellation"
        style={{ flex: 1, height: "auto", cursor: dragRef.current ? "grabbing" : "grab" }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
      >
        {/* Zoom controls */}
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            zIndex: 10,
            display: "flex",
            gap: 6,
            background: "white",
            border: "1px solid var(--line)",
            borderRadius: 6,
            padding: 4,
          }}
        >
          <button
            className="btn ghost"
            onClick={() => setZoom((z) => Math.max(0.4, z - 0.1))}
          >
            −
          </button>
          <span
            className="mono"
            style={{
              fontSize: 11,
              alignSelf: "center",
              color: "var(--ink-3)",
              minWidth: 36,
              textAlign: "center",
            }}
          >
            {Math.round(zoom * 100)}%
          </span>
          <button
            className="btn ghost"
            onClick={() => setZoom((z) => Math.min(1.6, z + 0.1))}
          >
            +
          </button>
          <button
            className="btn ghost"
            onClick={() => {
              setZoom(0.85);
              setPan({ x: 20, y: 20 });
            }}
          >
            Fit
          </button>
        </div>

        {/* Pan/zoom canvas */}
        <div
          className="canvas-inner"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            width: CANVAS_W,
            height: CANVAS_H,
          }}
        >
          {/* Track bands */}
          {TRACK_ORDER.map((key, i) => {
            const p = TRACK_PALETTE[key];
            const label = TRACK_LABELS.find((t) => t.key === key)?.label ?? key;
            return (
              <div
                key={key}
                style={{
                  position: "absolute",
                  top: 60 + i * layout.trackH - 8,
                  left: 0,
                  right: 0,
                  height: layout.trackH,
                  background: p.soft,
                  opacity: 0.35,
                  borderTop: `1px dashed ${p.line}`,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 8,
                    left: 8,
                    fontSize: 11,
                    fontWeight: 600,
                    color: p.ink,
                    textTransform: "uppercase",
                    letterSpacing: ".06em",
                  }}
                >
                  {label}
                </div>
              </div>
            );
          })}

          {/* Day grid lines */}
          {layout.days.map((d) => (
            <div
              key={`d${d}`}
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: 60 + d * layout.dayW,
                width: 1,
                background: "rgba(148,163,184,0.18)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 4,
                  fontSize: 10,
                  color: "var(--ink-4)",
                }}
              >
                D{d}
              </div>
            </div>
          ))}

          {/* SVG edges */}
          <svg
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: CANVAS_W,
              height: CANVAS_H,
              pointerEvents: "none",
            }}
          >
            <defs>
              <marker
                id="arr"
                markerWidth="8"
                markerHeight="8"
                refX="6"
                refY="3"
                orient="auto"
              >
                <path d="M0,0 L6,3 L0,6 Z" fill="#94a3b8" />
              </marker>
              <marker
                id="arr-pre"
                markerWidth="8"
                markerHeight="8"
                refX="6"
                refY="3"
                orient="auto"
              >
                <path d="M0,0 L6,3 L0,6 Z" fill="#ef4444" />
              </marker>
            </defs>

            {edges.map((edge, i) => {
              const a = layout.positions[edge.from];
              const b = layout.positions[edge.to];
              if (!a || !b) return null;
              const x1 = a.x + a.w;
              const y1 = a.y + a.h / 2;
              const x2 = b.x;
              const y2 = b.y + b.h / 2;
              const cx = (x1 + x2) / 2;
              const isPre = edge.kind === "preclude";
              return (
                <path
                  key={i}
                  d={`M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`}
                  stroke={isPre ? "#ef4444" : "#94a3b8"}
                  strokeWidth={isPre ? 1.2 : 1.5}
                  strokeDasharray={isPre ? "4 3" : undefined}
                  fill="none"
                  opacity={isPre ? 0.6 : 0.7}
                  markerEnd={isPre ? "url(#arr-pre)" : "url(#arr)"}
                />
              );
            })}
          </svg>

          {/* Nodes */}
          {storylets.map((sl) => {
            const key = slKey(sl);
            const pos = layout.positions[key];
            if (!pos) return null;
            const trackKey = sl.track_id
              ? (trackIdToKey[sl.track_id] ?? null)
              : null;
            const seg = (sl.segment ?? "morning").slice(0, 3);
            const day = sl.due_offset_days ?? 0;
            const isDraft = !sl.is_active;

            return (
              <div
                key={sl.id}
                className="node"
                style={{
                  ...trackStyle(trackKey),
                  left: pos.x,
                  top: pos.y,
                  width: pos.w,
                  ...(key === selectedKey
                    ? { boxShadow: "0 0 0 2px var(--indigo)" }
                    : {}),
                }}
                onClick={() => handleNodeClick(sl)}
              >
                <div className="title">{sl.title}</div>
                <div className="sub mono">
                  D{day}/{seg}
                  {isDraft ? " · draft" : ""}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div
          style={{
            position: "absolute",
            bottom: 12,
            left: 12,
            fontSize: 11,
            color: "var(--ink-3)",
            background: "rgba(255,255,255,0.85)",
            border: "1px solid var(--line)",
            padding: "6px 10px",
            borderRadius: 6,
          }}
        >
          <span className="mono">drag</span> pan ·{" "}
          <span className="mono">scroll</span> zoom ·{" "}
          <span className="mono">click</span> open · grey = chain · red dashed =
          preclude
        </div>

        {loading && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(246,247,251,0.8)",
              fontSize: 13,
              color: "var(--ink-4)",
            }}
          >
            Loading…
          </div>
        )}
      </div>
    </div>
  );
}
