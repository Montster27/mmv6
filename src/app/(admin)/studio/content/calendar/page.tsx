"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AuthGate } from "@/ui/components/AuthGate";
import { useStoryletsAPI } from "@/hooks/contentStudio/useStoryletsAPI";
import { useArcsAPI, type ArcDefinitionRow } from "@/hooks/contentStudio/useArcsAPI";
import type { Storylet } from "@/types/storylets";
import {
  STREAM_LABELS,
  TRACK_KEY_TO_STREAM_ID,
  type StreamId,
} from "@/types/chapterStreams";
import { Stat } from "@/components/contentStudio/Stat";

// ── constants ─────────────────────────────────────────────────────────────────

const ALL_STREAMS: StreamId[] = [
  "roommate",
  "academic",
  "money",
  "belonging",
  "opportunity",
  "home",
];

const SEGMENTS = ["morning", "afternoon", "evening"] as const;
type Segment = (typeof SEGMENTS)[number];

const SEGMENT_LABELS: Record<Segment, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};

const STREAM_COLORS: Record<StreamId, { bg: string; border: string; text: string }> = {
  roommate: { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700" },
  academic: { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-700" },
  money: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700" },
  belonging: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700" },
  opportunity: { bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-700" },
  home: { bg: "bg-sky-50", border: "border-sky-200", text: "text-sky-700" },
};

// ── helpers ───────────────────────────────────────────────────────────────────

function buildTrackIdToStream(arcs: ArcDefinitionRow[]): Record<string, StreamId> {
  const map: Record<string, StreamId> = {};
  for (const arc of arcs) {
    const direct = ALL_STREAMS.find((s) => s === arc.key);
    if (direct) { map[arc.id] = direct; continue; }
    const mapped = TRACK_KEY_TO_STREAM_ID[arc.key];
    if (mapped) { map[arc.id] = mapped; continue; }
    const found = ALL_STREAMS.find((s) => arc.key.includes(s));
    if (found) { map[arc.id] = found; }
  }
  return map;
}

function getStream(s: Storylet, lookup: Record<string, StreamId>): StreamId | null {
  if (s.track_id && lookup[s.track_id]) return lookup[s.track_id];
  return null;
}

type CalendarCell = {
  day: number;
  segment: Segment;
  storylets: Array<{ storylet: Storylet; stream: StreamId | null }>;
};

function buildCalendar(
  storylets: Storylet[],
  trackIdToStream: Record<string, StreamId>,
  maxDay: number
): CalendarCell[][] {
  // rows = days, each day has 3 segments
  const grid: CalendarCell[][] = [];

  for (let day = 0; day <= maxDay; day++) {
    const row: CalendarCell[] = SEGMENTS.map((seg) => ({
      day,
      segment: seg,
      storylets: [],
    }));
    grid.push(row);
  }

  for (const s of storylets) {
    if (!s.is_active) continue;
    const day = s.due_offset_days ?? 0;
    const seg = s.segment ?? "morning";
    const segIdx = SEGMENTS.indexOf(seg as Segment);
    if (day > maxDay || segIdx === -1) continue;

    const stream = getStream(s, trackIdToStream);
    grid[day][segIdx].storylets.push({ storylet: s, stream });
  }

  return grid;
}

// ── component ─────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const { loadStorylets } = useStoryletsAPI();
  const { arcDefinitions, loadArcDefinitions } = useArcsAPI();
  const [storylets, setStorylets] = useState<Storylet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [maxDay, setMaxDay] = useState(7);

  useEffect(() => {
    Promise.all([
      loadStorylets().then(setStorylets),
      loadArcDefinitions(),
    ]).then(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const trackIdToStream = useMemo(
    () => buildTrackIdToStream(arcDefinitions),
    [arcDefinitions]
  );

  const activeStorylets = useMemo(
    () => (showInactive ? storylets : storylets.filter((s) => s.is_active)),
    [storylets, showInactive]
  );

  // Detect the actual max day from data
  const dataMaxDay = useMemo(() => {
    let m = 0;
    for (const s of activeStorylets) {
      const d = s.due_offset_days ?? 0;
      if (d > m) m = d;
    }
    return Math.max(m, 3); // show at least days 0-3
  }, [activeStorylets]);

  const effectiveMaxDay = Math.max(maxDay, dataMaxDay);

  const grid = useMemo(
    () => buildCalendar(activeStorylets, trackIdToStream, effectiveMaxDay),
    [activeStorylets, trackIdToStream, effectiveMaxDay]
  );

  // Collision stats
  const stats = useMemo(() => {
    let totalSlots = 0;
    let filledSlots = 0;
    let collisionSlots = 0;
    let emptySlots = 0;

    for (const row of grid) {
      for (const cell of row) {
        totalSlots++;
        if (cell.storylets.length === 0) emptySlots++;
        else if (cell.storylets.length === 1) filledSlots++;
        else { filledSlots++; collisionSlots++; }
      }
    }

    return { totalSlots, filledSlots, collisionSlots, emptySlots };
  }, [grid]);

  return (
    <AuthGate>
      {() => (
        <div className="h-full overflow-auto p-4 space-y-4">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-800">
                Collision Calendar
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Storylets by day × segment. Slots with multiple storylets show the time
                pressure that makes players choose. Empty slots are content gaps.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                  className="rounded"
                />
                Include inactive
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-600">
                Days shown:
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={maxDay}
                  onChange={(e) => setMaxDay(Number(e.target.value) || 7)}
                  className="w-14 rounded border border-slate-300 px-2 py-1 text-xs"
                />
              </label>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-2 text-xs">
            {ALL_STREAMS.map((sid) => {
              const c = STREAM_COLORS[sid];
              return (
                <span
                  key={sid}
                  className={`rounded border px-2 py-0.5 font-medium ${c.bg} ${c.border} ${c.text}`}
                >
                  {STREAM_LABELS[sid].split(" ")[0]}
                </span>
              );
            })}
            <span className="rounded border border-slate-300 bg-slate-50 px-2 py-0.5 text-slate-500">
              No track
            </span>
            <span className="self-center text-slate-400">— track colors</span>
          </div>

          {loading ? (
            <p className="text-sm text-slate-400 py-8 text-center">Loading…</p>
          ) : (
            <>
              {/* Calendar grid */}
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-3 py-2 font-semibold text-slate-500 w-16 sticky left-0 bg-slate-50 z-10">
                        Day
                      </th>
                      {SEGMENTS.map((seg) => (
                        <th
                          key={seg}
                          className="text-left px-3 py-2 font-semibold text-slate-500 min-w-[220px]"
                        >
                          {SEGMENT_LABELS[seg]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {grid.map((row, dayIdx) => (
                      <tr
                        key={dayIdx}
                        className="border-b border-slate-100 align-top"
                      >
                        {/* Day label */}
                        <td className="px-3 py-2 font-mono font-bold text-slate-600 sticky left-0 bg-white z-10 border-r border-slate-100">
                          {dayIdx}
                        </td>

                        {/* Segment cells */}
                        {row.map((cell, segIdx) => {
                          const count = cell.storylets.length;
                          const isCollision = count >= 2;
                          const isEmpty = count === 0;

                          return (
                            <td
                              key={segIdx}
                              className={`px-2 py-2 border-r border-slate-100 ${
                                isCollision
                                  ? "bg-amber-50/60"
                                  : isEmpty
                                    ? "bg-slate-50/50"
                                    : ""
                              }`}
                            >
                              {isEmpty ? (
                                <span className="text-slate-300 text-[10px]">—</span>
                              ) : (
                                <div className="space-y-1">
                                  {cell.storylets.map(({ storylet: s, stream }) => {
                                    const c = stream
                                      ? STREAM_COLORS[stream]
                                      : { bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-600" };

                                    return (
                                      <Link
                                        key={s.id}
                                        href={`/studio/content/storylets?id=${s.id}`}
                                        className={`block rounded border px-2 py-1.5 hover:shadow-sm transition-shadow ${c.bg} ${c.border}`}
                                      >
                                        <p className={`font-medium leading-tight ${c.text}`}>
                                          {s.title}
                                        </p>
                                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                          {s.storylet_key ?? s.slug}
                                        </p>
                                        {s.choices.length > 0 && (
                                          <p className="text-[10px] text-slate-400 mt-0.5">
                                            {s.choices.length} choice{s.choices.length !== 1 ? "s" : ""}
                                            {s.default_next_key ? ` → ${s.default_next_key}` : ""}
                                          </p>
                                        )}
                                      </Link>
                                    );
                                  })}
                                  {isCollision && (
                                    <p className="text-[10px] text-amber-600 font-medium pl-1">
                                      ⚡ {count} competing — player picks one
                                    </p>
                                  )}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary */}
              <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-600">
                <Stat label="Total time slots" value={stats.totalSlots} />
                <Stat
                  label="With content"
                  value={stats.filledSlots}
                />
                <Stat
                  label="Collisions (≥2)"
                  value={stats.collisionSlots}
                  highlight={stats.collisionSlots > 0}
                  highlightClass="text-amber-600"
                />
                <Stat
                  label="Empty (gaps)"
                  value={stats.emptySlots}
                  highlight={stats.emptySlots > 0}
                  highlightClass="text-red-500"
                />
              </div>

              {/* Design note */}
              <div className="rounded-md border border-indigo-100 bg-indigo-50 px-4 py-3 text-xs text-indigo-800 space-y-1">
                <p className="font-semibold">Design principle</p>
                <p>
                  Every time slot should have at least two competing storylets from different tracks.
                  This guarantees the player always loses something — the core of MMV&apos;s scarcity model.
                  Single-storylet slots have no tension; empty slots are content gaps.
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </AuthGate>
  );
}
