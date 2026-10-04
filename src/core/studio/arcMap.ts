import type { StudioRecord } from "@/types/studio";
import { recordId } from "./manifest";

export type MapNode = { id: string; key: string; title: string; day: number; window: number; segment: string; x: number; y: number; w: number; h: number };
export type MapEdge = { from: string; to: string; kind: "requires" | "next" | "flag" | "excludes"; label?: string };
export type ArcMap = { nodes: MapNode[]; edges: MapEdge[]; width: number; height: number };

const SEGMENTS = ["morning", "afternoon", "evening", "night"];
const NODE_W = 168, NODE_H = 48, COL_GAP = 72, ROW_GAP = 40, PAD = 24;
const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : typeof v === "string" && v ? [v] : []);

/**
 * Lay out the scenes of one arc by day (left to right) and part of day (top to bottom),
 * and work out how they connect. Pure so it can be tested without a browser.
 */
export function buildArcMap(scenes: StudioRecord[]): ArcMap {
  const rows = scenes.map((row) => ({
    id: recordId(row),
    key: String(row.storylet_key ?? ""),
    track: String(row.track_id ?? ""),
    title: String(row.title || "Untitled scene"),
    day: Number(row.due_offset_days ?? 0),
    window: Number(row.expires_after_days ?? 0),
    segment: String(row.segment ?? ""),
    req: (row.requirements ?? {}) as Record<string, unknown>,
    next: [row.default_next_key, ...(Array.isArray(row.choices) ? (row.choices as StudioRecord[]).map((c) => c.next_key) : [])].filter((k): k is string => typeof k === "string" && !!k),
    sets: (Array.isArray(row.choices) ? (row.choices as StudioRecord[]) : []).flatMap((c) => strings(c.sets_flag)),
  }));

  const days = [...new Set(rows.map((r) => r.day))].sort((a, b) => a - b);
  const nodes: MapNode[] = [];
  let height = PAD;
  for (const [col, day] of days.entries()) {
    const inCol = rows.filter((r) => r.day === day).sort((a, b) => SEGMENTS.indexOf(a.segment) - SEGMENTS.indexOf(b.segment) || a.title.localeCompare(b.title));
    inCol.forEach((r, i) => {
      nodes.push({ id: r.id, key: r.key, title: r.title, day: r.day, window: r.window, segment: r.segment, x: PAD + col * (NODE_W + COL_GAP), y: PAD + 22 + i * (NODE_H + ROW_GAP), w: NODE_W, h: NODE_H });
    });
    height = Math.max(height, PAD + 22 + inCol.length * (NODE_H + ROW_GAP));
  }

  const byKey = new Map(rows.map((r) => [`${r.track}:${r.key}`, r]));
  const edges: MapEdge[] = [];
  const seen = new Set<string>();
  const add = (edge: MapEdge) => {
    if (edge.from === edge.to) return;
    const id = `${edge.kind}|${edge.from}|${edge.to}|${edge.label ?? ""}`;
    if (!seen.has(id)) { seen.add(id); edges.push(edge); }
  };
  for (const r of rows) {
    for (const key of [...strings(r.req.requires_storylets), ...strings(r.req.requires_any_storylets)]) {
      const from = byKey.get(`${r.track}:${key}`);
      if (from) add({ from: from.id, to: r.id, kind: "requires" });
    }
    for (const key of strings(r.req.excludes_storylets)) {
      const other = byKey.get(`${r.track}:${key}`);
      if (other) add({ from: other.id, to: r.id, kind: "excludes" });
    }
    for (const key of r.next) {
      const to = byKey.get(`${r.track}:${key}`);
      if (to) add({ from: r.id, to: to.id, kind: "next" });
    }
    const needs = strings(r.req.requires_flag);
    for (const flag of needs) {
      for (const setter of rows) if (setter.sets.includes(flag)) add({ from: setter.id, to: r.id, kind: "flag", label: flag.replace(/_/g, " ") });
    }
  }
  return { nodes, edges, width: PAD * 2 + Math.max(1, days.length) * (NODE_W + COL_GAP) - COL_GAP, height: height + PAD };
}
