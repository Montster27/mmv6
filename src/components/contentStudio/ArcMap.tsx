"use client";

import Link from "next/link";
import { useMemo } from "react";
import { buildArcMap } from "@/core/studio/arcMap";
import type { StudioRecord } from "@/types/studio";

const EDGE_STYLE = {
  requires: { stroke: "#4338ca", dash: "", label: "Needs this scene first" },
  next: { stroke: "#0f766e", dash: "6 4", label: "Leads straight to" },
  flag: { stroke: "#b45309", dash: "2 4", label: "Remembered fact" },
  excludes: { stroke: "#b91c1c", dash: "1 5", label: "Rules out" },
} as const;

/** A small diagram of an arc: its scenes by day, and how they depend on each other. */
export function ArcMap({ scenes }: { scenes: StudioRecord[] }) {
  const map = useMemo(() => buildArcMap(scenes), [scenes]);
  if (map.nodes.length === 0) {
    return <p className="text-sm text-slate-500">Link scenes to this arc to see how they connect.</p>;
  }
  const at = (id: string) => map.nodes.find((n) => n.id === id)!;
  const days = [...new Set(map.nodes.map((n) => n.day))].sort((a, b) => a - b);
  return (
    <figure className="space-y-2">
      <div className="overflow-auto rounded border border-slate-200 bg-white">
        <svg role="img" aria-label="Map of this arc's scenes" width={map.width} height={map.height} viewBox={`0 0 ${map.width} ${map.height}`}>
          <defs>
            {Object.entries(EDGE_STYLE).map(([kind, s]) => (
              <marker key={kind} id={`arrow-${kind}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0 0L10 5L0 10z" fill={s.stroke} />
              </marker>
            ))}
          </defs>
          {days.map((day) => {
            const x = map.nodes.find((n) => n.day === day)!.x;
            return <text key={day} x={x} y={16} fontSize={11} fill="#64748b">Day {day}</text>;
          })}
          {map.edges.map((edge, i) => {
            const a = at(edge.from), b = at(edge.to), s = EDGE_STYLE[edge.kind];
            const sameCol = a.x === b.x;
            // Several arrows can join the same two scenes; fan them out so each stays readable.
            const siblings = map.edges.filter((e) => (e.from === edge.from && e.to === edge.to) || (e.from === edge.to && e.to === edge.from));
            const slot = siblings.indexOf(edge) - (siblings.length - 1) / 2;
            let d: string, lx: number, ly: number, anchor: "middle" | "start" = "middle";
            if (sameCol) {
              const down = a.y < b.y;
              const adjacent = Math.abs(a.y - b.y) <= a.h + 40 + 1;
              if (adjacent) {
                const x = a.x + a.w / 2 + slot * 22;
                const y1 = down ? a.y + a.h : a.y, y2 = down ? b.y : b.y + b.h;
                d = `M${x} ${y1} L${x} ${y2}`;
                lx = x + 6; ly = (y1 + y2) / 2 + 3; anchor = "start";
              } else {
                // Skip over the scenes in between by curving round the right-hand side.
                const x1 = a.x + a.w, y1 = a.y + a.h / 2 + slot * 8, x2 = b.x + b.w, y2 = b.y + b.h / 2 + slot * 8;
                const bulge = 46 + slot * 14;
                d = `M${x1} ${y1} C${x1 + bulge} ${y1}, ${x2 + bulge} ${y2}, ${x2} ${y2}`;
                lx = x1 + bulge * 0.75 + 4; ly = (y1 + y2) / 2; anchor = "start";
              }
            } else {
              const x1 = a.x + a.w, y1 = a.y + a.h / 2 + slot * 8, x2 = b.x, y2 = b.y + b.h / 2 + slot * 8;
              const mx = (x1 + x2) / 2;
              d = `M${x1} ${y1} C${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
              lx = mx; ly = (y1 + y2) / 2 - 5;
            }
            return (
              <g key={i}>
                <path d={d} fill="none" stroke={s.stroke} strokeWidth={1.8} strokeDasharray={s.dash} markerEnd={`url(#arrow-${edge.kind})`} />
                {edge.label ? <text x={lx} y={ly} fontSize={10} fill={s.stroke} textAnchor={anchor}>{edge.label}</text> : null}
              </g>
            );
          })}
          {map.nodes.map((n) => (
            <Link key={n.id} href={`/studio/content/storylets?id=${encodeURIComponent(n.id)}`} aria-label={`Open scene ${n.title}`}>
              <g>
                <rect x={n.x} y={n.y} width={n.w} height={n.h} rx={8} fill="#eef2ff" stroke="#6366f1" />
                <text x={n.x + 10} y={n.y + 20} fontSize={12} fontWeight={600} fill="#1e1b4b">{n.title.length > 22 ? `${n.title.slice(0, 21)}…` : n.title}</text>
                <text x={n.x + 10} y={n.y + 37} fontSize={10} fill="#475569">{n.segment || "any time"} · {n.window === 0 ? "that day only" : `+${n.window} days`}</text>
              </g>
            </Link>
          ))}
        </svg>
      </div>
      <figcaption className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        {Object.entries(EDGE_STYLE).map(([kind, s]) => (
          <span key={kind} className="flex items-center gap-1">
            <svg width="26" height="8" aria-hidden><line x1="0" y1="4" x2="26" y2="4" stroke={s.stroke} strokeWidth="2" strokeDasharray={s.dash} /></svg>
            {s.label}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
