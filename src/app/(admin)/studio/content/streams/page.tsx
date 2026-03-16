"use client";

import { useEffect, useState, useMemo } from "react";
import { AuthGate } from "@/ui/components/AuthGate";
import { useStoryletsAPI } from "@/hooks/contentStudio/useStoryletsAPI";
import type { Storylet } from "@/types/storylets";
import {
  STREAM_LABELS,
  ARC_KEY_TO_STREAM_ID,
  STREAM_ALIASES,
  type StreamId,
} from "@/types/arcOneStreams";

// ── helpers ──────────────────────────────────────────────────────────────────

function getStreamsForStorylet(s: Storylet): StreamId[] {
  const ids = new Set<StreamId>();

  if (s.arc_id) {
    const direct = ARC_KEY_TO_STREAM_ID[s.arc_id];
    if (direct) ids.add(direct);
  }

  for (const tag of s.tags ?? []) {
    if (tag.startsWith("stream:")) {
      const raw = tag.replace("stream:", "");
      const resolved =
        (STREAM_ALIASES[raw] as StreamId | undefined) ?? (raw as StreamId);
      if (STREAM_LABELS[resolved]) ids.add(resolved);
    }
  }

  return [...ids];
}

function getStreamTransitions(
  s: Storylet
): { stream: StreamId; state: string; choiceLabel: string }[] {
  const out: { stream: StreamId; state: string; choiceLabel: string }[] = [];
  for (const c of s.choices) {
    if (c.sets_stream_state) {
      const { stream, state } = c.sets_stream_state;
      const resolved =
        (STREAM_ALIASES[stream] as StreamId | undefined) ?? (stream as StreamId);
      if (STREAM_LABELS[resolved]) {
        out.push({ stream: resolved, state, choiceLabel: c.label });
      }
    }
  }
  return out;
}

function getPrecludes(s: Storylet): { target: string; choiceLabel: string }[] {
  const out: { target: string; choiceLabel: string }[] = [];
  for (const c of s.choices) {
    for (const p of c.precludes ?? []) {
      out.push({ target: p, choiceLabel: c.label });
    }
  }
  // dedupe by target
  const seen = new Set<string>();
  return out.filter((x) => (seen.has(x.target) ? false : (seen.add(x.target), true)));
}

// ── palette ──────────────────────────────────────────────────────────────────

const STREAM_COLORS: Record<
  StreamId,
  { bg: string; border: string; text: string; badge: string; dot: string }
> = {
  roommate: {
    bg: "bg-rose-50",
    border: "border-rose-200",
    text: "text-rose-700",
    badge: "bg-rose-100 text-rose-700",
    dot: "bg-rose-400",
  },
  academic: {
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    text: "text-indigo-700",
    badge: "bg-indigo-100 text-indigo-700",
    dot: "bg-indigo-400",
  },
  money: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    badge: "bg-amber-100 text-amber-700",
    dot: "bg-amber-400",
  },
  belonging: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
    badge: "bg-emerald-100 text-emerald-700",
    dot: "bg-emerald-400",
  },
  opportunity: {
    bg: "bg-violet-50",
    border: "border-violet-200",
    text: "text-violet-700",
    badge: "bg-violet-100 text-violet-700",
    dot: "bg-violet-400",
  },
  home: {
    bg: "bg-sky-50",
    border: "border-sky-200",
    text: "text-sky-700",
    badge: "bg-sky-100 text-sky-700",
    dot: "bg-sky-400",
  },
};

const ALL_STREAMS: StreamId[] = [
  "roommate",
  "academic",
  "money",
  "belonging",
  "opportunity",
  "home",
];

// ── types ─────────────────────────────────────────────────────────────────────

type CollisionEntry = {
  storylet: Storylet;
  streams: StreamId[];
  transitions: { stream: StreamId; state: string; choiceLabel: string }[];
  precludes: { target: string; choiceLabel: string }[];
};

// ── component ─────────────────────────────────────────────────────────────────

export default function StreamsPage() {
  const { loadStorylets } = useStoryletsAPI();
  const [storylets, setStorylets] = useState<Storylet[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StreamId | "all" | "collisions">("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadStorylets().then((rows) => {
      setStorylets(rows);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const entries: CollisionEntry[] = useMemo(
    () =>
      storylets.map((s) => ({
        storylet: s,
        streams: getStreamsForStorylet(s),
        transitions: getStreamTransitions(s),
        precludes: getPrecludes(s),
      })),
    [storylets]
  );

  const streamCounts = useMemo(() => {
    const counts = {} as Record<StreamId, number>;
    for (const sid of ALL_STREAMS) counts[sid] = 0;
    for (const e of entries) {
      for (const sid of e.streams) counts[sid]++;
    }
    return counts;
  }, [entries]);

  const collisionCount = useMemo(
    () => entries.filter((e) => e.streams.length >= 2).length,
    [entries]
  );

  const filtered = useMemo(() => {
    let rows = entries;
    if (filter === "collisions") rows = rows.filter((e) => e.streams.length >= 2);
    else if (filter !== "all") rows = rows.filter((e) => e.streams.includes(filter as StreamId));
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (e) =>
          e.storylet.title.toLowerCase().includes(q) ||
          e.storylet.id.toLowerCase().includes(q) ||
          (e.storylet.slug ?? "").toLowerCase().includes(q)
      );
    }
    return rows;
  }, [entries, filter, search]);

  return (
    <AuthGate>
      {() => (
        <div className="h-full overflow-auto p-4 space-y-4">
          {/* Header */}
          <div>
            <h2 className="text-base font-semibold text-slate-800">
              Stream Collision View
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Which storylets touch multiple concurrent streams — and what state
              transitions and preclusions they fire.
            </p>
          </div>

          {/* Filter pills */}
          <div className="flex flex-wrap gap-2">
            <FilterPill
              active={filter === "all"}
              onClick={() => setFilter("all")}
              label={`All (${entries.length})`}
              variant="neutral"
            />
            <FilterPill
              active={filter === "collisions"}
              onClick={() => setFilter("collisions")}
              label={`⚡ Multi-stream (${collisionCount})`}
              variant="neutral"
            />
            {ALL_STREAMS.map((sid) => (
              <FilterPill
                key={sid}
                active={filter === sid}
                onClick={() => setFilter(sid)}
                label={`${STREAM_LABELS[sid]} (${streamCounts[sid]})`}
                variant={sid}
              />
            ))}
          </div>

          {/* Search */}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, id, or slug…"
            className="w-full max-w-sm rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />

          {/* Table */}
          <div className="overflow-x-auto rounded-md border border-slate-200">
            <table className="w-full min-w-[860px] border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 w-56">
                    Storylet
                  </th>
                  {ALL_STREAMS.map((sid) => {
                    const c = STREAM_COLORS[sid];
                    return (
                      <th key={sid} className="px-2 py-2 text-center">
                        <span
                          className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${c.badge}`}
                        >
                          {STREAM_LABELS[sid].split(" ")[0]}
                        </span>
                      </th>
                    );
                  })}
                  <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500">
                    Transitions
                  </th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500">
                    Precludes
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-3 py-8 text-center text-sm text-slate-400"
                    >
                      Loading storylets…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-3 py-8 text-center text-sm text-slate-400"
                    >
                      No results for current filter.
                    </td>
                  </tr>
                ) : (
                  filtered.map((e) => {
                    const isCollision = e.streams.length >= 2;
                    const isExpanded = expandedId === e.storylet.id;

                    return (
                      <>
                        <tr
                          key={e.storylet.id}
                          className={`border-b border-slate-100 cursor-pointer hover:bg-slate-50 ${
                            isCollision ? "bg-amber-50/50" : ""
                          }`}
                          onClick={() =>
                            setExpandedId(isExpanded ? null : e.storylet.id)
                          }
                        >
                          {/* Label */}
                          <td className="px-3 py-2 max-w-[14rem]">
                            <div className="flex items-start gap-1.5">
                              {isCollision && (
                                <span
                                  className="mt-0.5 shrink-0 text-amber-500 text-xs"
                                  title="Multi-stream collision"
                                >
                                  ⚡
                                </span>
                              )}
                              <div>
                                <p className="font-medium text-slate-800 text-xs leading-tight">
                                  {e.storylet.title}
                                </p>
                                <p className="text-[10px] text-slate-400 font-mono">
                                  {e.storylet.id}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Stream membership */}
                          {ALL_STREAMS.map((sid) => {
                            const inStream = e.streams.includes(sid);
                            const hasTransitions = e.transitions.some(
                              (t) => t.stream === sid
                            );
                            const c = STREAM_COLORS[sid];
                            return (
                              <td key={sid} className="px-2 py-2 text-center">
                                {inStream ? (
                                  <span
                                    className={`inline-flex items-center justify-center w-5 h-5 rounded-full border ${c.bg} ${c.border} ${c.text} text-[9px] font-bold`}
                                    title={
                                      hasTransitions
                                        ? `Sets state in ${STREAM_LABELS[sid]}`
                                        : `Member of ${STREAM_LABELS[sid]}`
                                    }
                                  >
                                    {hasTransitions ? "→" : "●"}
                                  </span>
                                ) : (
                                  <span className="text-slate-200 text-xs">·</span>
                                )}
                              </td>
                            );
                          })}

                          {/* Transitions summary */}
                          <td className="px-3 py-2">
                            {e.transitions.length === 0 ? (
                              <span className="text-slate-300 text-xs">—</span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {e.transitions.map((t, i) => {
                                  const c = STREAM_COLORS[t.stream];
                                  return (
                                    <span
                                      key={i}
                                      className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${c.badge}`}
                                      title={`Choice: "${t.choiceLabel}"`}
                                    >
                                      {t.stream.slice(0, 3)} → {t.state}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </td>

                          {/* Precludes summary */}
                          <td className="px-3 py-2">
                            {e.precludes.length === 0 ? (
                              <span className="text-slate-300 text-xs">—</span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {e.precludes.map((p) => (
                                  <span
                                    key={p.target}
                                    className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-mono text-red-600 border border-red-200"
                                    title={`Choice: "${p.choiceLabel}"`}
                                  >
                                    ✕ {p.target}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>

                        {/* Expanded detail row */}
                        {isExpanded && (
                          <tr
                            key={`${e.storylet.id}-detail`}
                            className="border-b border-slate-100 bg-slate-50"
                          >
                            <td colSpan={10} className="px-6 py-3">
                              <div className="space-y-2 text-xs text-slate-700">
                                <p className="font-semibold text-slate-800">
                                  {e.storylet.title}
                                </p>
                                <p className="text-slate-500 line-clamp-2">
                                  {e.storylet.body}
                                </p>
                                <div className="flex flex-wrap gap-4 pt-1">
                                  <div>
                                    <p className="font-medium text-slate-500 mb-1">
                                      Choices ({e.storylet.choices.length})
                                    </p>
                                    <div className="space-y-0.5">
                                      {e.storylet.choices.map((c) => (
                                        <div key={c.id} className="flex items-center gap-2">
                                          <span className="text-slate-600">"{c.label}"</span>
                                          {c.sets_stream_state && (
                                            <span className="rounded bg-indigo-50 border border-indigo-200 px-1 py-0.5 text-[10px] text-indigo-600">
                                              → {c.sets_stream_state.stream}:{c.sets_stream_state.state}
                                            </span>
                                          )}
                                          {(c.precludes ?? []).map((p) => (
                                            <span
                                              key={p}
                                              className="rounded bg-red-50 border border-red-200 px-1 py-0.5 text-[10px] text-red-600"
                                            >
                                              ✕ {p}
                                            </span>
                                          ))}
                                          {(c.identity_tags ?? []).map((t) => (
                                            <span
                                              key={t}
                                              className="rounded bg-slate-100 px-1 py-0.5 text-[10px] text-slate-500"
                                            >
                                              #{t}
                                            </span>
                                          ))}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Summary bar */}
          {!loading && (
            <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-600">
              <Stat label="Total storylets" value={entries.length} />
              <Stat label="Multi-stream" value={collisionCount} highlight />
              <Stat
                label="With transitions"
                value={entries.filter((e) => e.transitions.length > 0).length}
              />
              <Stat
                label="With precludes"
                value={entries.filter((e) => e.precludes.length > 0).length}
              />
            </div>
          )}
        </div>
      )}
    </AuthGate>
  );
}

// ── sub-components ────────────────────────────────────────────────────────────

function FilterPill({
  active,
  onClick,
  label,
  variant,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  variant: StreamId | "neutral";
}) {
  if (variant === "neutral") {
    return (
      <button
        onClick={onClick}
        className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
          active
            ? "bg-slate-800 text-white border-slate-800"
            : "bg-white text-slate-600 border-slate-300 hover:border-slate-500"
        }`}
      >
        {label}
      </button>
    );
  }
  const c = STREAM_COLORS[variant];
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
        active
          ? `${c.bg} ${c.border} ${c.text} font-semibold`
          : "bg-white text-slate-600 border-slate-300 hover:border-slate-500"
      }`}
    >
      {label}
    </button>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-slate-400">{label}</p>
      <p
        className={`text-lg font-semibold ${highlight ? "text-amber-600" : "text-slate-800"}`}
      >
        {value}
      </p>
    </div>
  );
}
