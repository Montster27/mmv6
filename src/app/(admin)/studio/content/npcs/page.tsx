"use client";

import { useEffect, useState, useMemo } from "react";
import { AuthGate } from "@/ui/components/AuthGate";
import { useStoryletsAPI } from "@/hooks/contentStudio/useStoryletsAPI";
import type { Storylet } from "@/types/storylets";

// ── NPC extraction ────────────────────────────────────────────────────────────

type NpcRef = {
  storyletId: string;
  storyletTitle: string;
  sources: NpcSource[];
};

type NpcSource =
  | { kind: "introduces_npc" }
  | { kind: "relational_effect"; dimensions: string[] }
  | { kind: "npc_memory"; flags: string[] }
  | { kind: "events_emitted"; types: string[] }
  | { kind: "reaction_text_conditions"; flags: string[] };

type NpcEntry = {
  npcId: string;
  refs: NpcRef[];
  // aggregated
  allRelationalDimensions: Set<string>;
  allMemoryFlags: Set<string>;
  allEventTypes: Set<string>;
  introduced: boolean;
};

function extractNpcs(storylets: Storylet[]): Map<string, NpcEntry> {
  const map = new Map<string, NpcEntry>();

  function ensure(npcId: string): NpcEntry {
    if (!map.has(npcId)) {
      map.set(npcId, {
        npcId,
        refs: [],
        allRelationalDimensions: new Set(),
        allMemoryFlags: new Set(),
        allEventTypes: new Set(),
        introduced: false,
      });
    }
    return map.get(npcId)!;
  }

  for (const s of storylets) {
    // 1. introduces_npc field
    for (const npcId of s.introduces_npc ?? []) {
      const entry = ensure(npcId);
      entry.introduced = true;
      let ref = entry.refs.find((r) => r.storyletId === s.id);
      if (!ref) {
        ref = { storyletId: s.id, storyletTitle: s.title, sources: [] };
        entry.refs.push(ref);
      }
      ref.sources.push({ kind: "introduces_npc" });
    }

    // 2. top-level relational_effects
    for (const c of s.choices) {
      if (c.relational_effects) {
        for (const [npcId, dims] of Object.entries(c.relational_effects)) {
          const entry = ensure(npcId);
          let ref = entry.refs.find((r) => r.storyletId === s.id);
          if (!ref) {
            ref = { storyletId: s.id, storyletTitle: s.title, sources: [] };
            entry.refs.push(ref);
          }
          const dimKeys = Object.keys(dims);
          const existing = ref.sources.find((x) => x.kind === "relational_effect") as
            | { kind: "relational_effect"; dimensions: string[] }
            | undefined;
          if (existing) {
            for (const d of dimKeys) existing.dimensions.push(d);
          } else {
            ref.sources.push({ kind: "relational_effect", dimensions: dimKeys });
          }
          dimKeys.forEach((d) => entry.allRelationalDimensions.add(d));
        }
      }

      // 3. set_npc_memory
      if (c.set_npc_memory) {
        for (const [npcId, flags] of Object.entries(c.set_npc_memory)) {
          const entry = ensure(npcId);
          let ref = entry.refs.find((r) => r.storyletId === s.id);
          if (!ref) {
            ref = { storyletId: s.id, storyletTitle: s.title, sources: [] };
            entry.refs.push(ref);
          }
          const flagKeys = Object.keys(flags);
          const existing = ref.sources.find((x) => x.kind === "npc_memory") as
            | { kind: "npc_memory"; flags: string[] }
            | undefined;
          if (existing) {
            for (const f of flagKeys) existing.flags.push(f);
          } else {
            ref.sources.push({ kind: "npc_memory", flags: flagKeys });
          }
          flagKeys.forEach((f) => entry.allMemoryFlags.add(f));
        }
      }

      // 4. events_emitted
      for (const ev of c.events_emitted ?? []) {
        const entry = ensure(ev.npc_id);
        let ref = entry.refs.find((r) => r.storyletId === s.id);
        if (!ref) {
          ref = { storyletId: s.id, storyletTitle: s.title, sources: [] };
          entry.refs.push(ref);
        }
        const existing = ref.sources.find((x) => x.kind === "events_emitted") as
          | { kind: "events_emitted"; types: string[] }
          | undefined;
        if (existing) {
          existing.types.push(ev.type);
        } else {
          ref.sources.push({ kind: "events_emitted", types: [ev.type] });
        }
        entry.allEventTypes.add(ev.type);
      }

      // 5. reaction_text_conditions relational_effects
      for (const cond of c.reaction_text_conditions ?? []) {
        if (cond.relational_effects) {
          for (const [npcId, dims] of Object.entries(cond.relational_effects)) {
            const entry = ensure(npcId);
            let ref = entry.refs.find((r) => r.storyletId === s.id);
            if (!ref) {
              ref = { storyletId: s.id, storyletTitle: s.title, sources: [] };
              entry.refs.push(ref);
            }
            const dimKeys = Object.keys(dims);
            dimKeys.forEach((d) => entry.allRelationalDimensions.add(d));
          }
        }
        if (cond.set_npc_memory) {
          for (const [npcId, flags] of Object.entries(cond.set_npc_memory)) {
            const entry = ensure(npcId);
            let ref = entry.refs.find((r) => r.storyletId === s.id);
            if (!ref) {
              ref = { storyletId: s.id, storyletTitle: s.title, sources: [] };
              entry.refs.push(ref);
            }
            const flagKeys = Object.keys(flags);
            let existing = ref.sources.find((x) => x.kind === "reaction_text_conditions") as
              | { kind: "reaction_text_conditions"; flags: string[] }
              | undefined;
            if (existing) {
              for (const f of flagKeys) existing.flags.push(f);
            } else {
              ref.sources.push({
                kind: "reaction_text_conditions",
                flags: flagKeys,
              });
            }
            flagKeys.forEach((f) => entry.allMemoryFlags.add(f));
          }
        }
      }
    }
  }

  return map;
}

// ── known NPC display names (extend as needed) ───────────────────────────────

const NPC_DISPLAY_NAMES: Record<string, string> = {
  danny: "Danny Kowalski",
  danny_kowalski: "Danny Kowalski",
  miguel: "Miguel Reyes",
  miguel_reyes: "Miguel Reyes",
  prof_heller: "Professor Heller",
  heller: "Professor Heller",
  karen: "Karen Szymanski",
  karen_szymanski: "Karen Szymanski",
  pat: "Pat (home friend)",
};

function displayName(npcId: string): string {
  return NPC_DISPLAY_NAMES[npcId] ?? npcId;
}

// ── badge helpers ─────────────────────────────────────────────────────────────

const SOURCE_STYLES: Record<NpcSource["kind"], string> = {
  introduces_npc: "bg-green-50 text-green-700 border-green-200",
  relational_effect: "bg-indigo-50 text-indigo-700 border-indigo-200",
  npc_memory: "bg-amber-50 text-amber-700 border-amber-200",
  events_emitted: "bg-violet-50 text-violet-700 border-violet-200",
  reaction_text_conditions: "bg-sky-50 text-sky-700 border-sky-200",
};

const SOURCE_LABELS: Record<NpcSource["kind"], string> = {
  introduces_npc: "intro",
  relational_effect: "relation",
  npc_memory: "memory",
  events_emitted: "event",
  reaction_text_conditions: "cond-memory",
};

// ── component ─────────────────────────────────────────────────────────────────

export default function NpcsPage() {
  const { loadStorylets } = useStoryletsAPI();
  const [storylets, setStorylets] = useState<Storylet[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedNpc, setExpandedNpc] = useState<string | null>(null);

  useEffect(() => {
    loadStorylets().then((rows) => {
      setStorylets(rows);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const npcMap = useMemo(() => extractNpcs(storylets), [storylets]);

  const npcList = useMemo(() => {
    const entries = [...npcMap.values()].sort((a, b) => {
      // Sort introduced NPCs first, then by ref count desc
      if (a.introduced !== b.introduced) return a.introduced ? -1 : 1;
      return b.refs.length - a.refs.length;
    });

    if (!search.trim()) return entries;
    const q = search.toLowerCase();
    return entries.filter(
      (e) =>
        e.npcId.toLowerCase().includes(q) ||
        displayName(e.npcId).toLowerCase().includes(q)
    );
  }, [npcMap, search]);

  return (
    <AuthGate>
      {() => (
        <div className="h-full overflow-auto p-4 space-y-4">
          {/* Header */}
          <div>
            <h2 className="text-base font-semibold text-slate-800">NPC Registry</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Read-only scan of all NPCs referenced across storylets — introductions,
              relational dimensions, memory flags, and emitted events.
            </p>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-2">
            {(Object.keys(SOURCE_LABELS) as NpcSource["kind"][]).map((k) => (
              <span
                key={k}
                className={`rounded border px-2 py-0.5 text-[10px] font-medium ${SOURCE_STYLES[k]}`}
              >
                {SOURCE_LABELS[k]}
              </span>
            ))}
            <span className="text-xs text-slate-400 self-center">— source types</span>
          </div>

          {/* Search */}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search NPC id or name…"
            className="w-full max-w-sm rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />

          {/* NPC cards */}
          {loading ? (
            <p className="text-sm text-slate-400 py-8 text-center">
              Scanning storylets…
            </p>
          ) : npcList.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">
              No NPCs found in current storylets.
            </p>
          ) : (
            <div className="space-y-2">
              {npcList.map((entry) => {
                const isExpanded = expandedNpc === entry.npcId;
                return (
                  <div
                    key={entry.npcId}
                    className="rounded-md border border-slate-200 bg-white overflow-hidden"
                  >
                    {/* Card header */}
                    <button
                      className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-slate-50 transition-colors"
                      onClick={() =>
                        setExpandedNpc(isExpanded ? null : entry.npcId)
                      }
                    >
                      {/* Avatar initial */}
                      <div className="shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold">
                        {displayName(entry.npcId)[0].toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-800 text-sm">
                            {displayName(entry.npcId)}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">
                            {entry.npcId}
                          </span>
                          {entry.introduced && (
                            <span className="rounded border border-green-200 bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-700">
                              introduced
                            </span>
                          )}
                        </div>

                        {/* Aggregate summary */}
                        <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-500">
                          <span>
                            <span className="font-medium text-slate-700">
                              {entry.refs.length}
                            </span>{" "}
                            storylet{entry.refs.length !== 1 ? "s" : ""}
                          </span>
                          {entry.allRelationalDimensions.size > 0 && (
                            <span>
                              <span className="font-medium text-indigo-600">
                                {entry.allRelationalDimensions.size}
                              </span>{" "}
                              relational dim
                              {entry.allRelationalDimensions.size !== 1 ? "s" : ""}:{" "}
                              <span className="font-mono text-indigo-500">
                                {[...entry.allRelationalDimensions].join(", ")}
                              </span>
                            </span>
                          )}
                          {entry.allMemoryFlags.size > 0 && (
                            <span>
                              <span className="font-medium text-amber-600">
                                {entry.allMemoryFlags.size}
                              </span>{" "}
                              memory flag
                              {entry.allMemoryFlags.size !== 1 ? "s" : ""}:{" "}
                              <span className="font-mono text-amber-500">
                                {[...entry.allMemoryFlags].join(", ")}
                              </span>
                            </span>
                          )}
                          {entry.allEventTypes.size > 0 && (
                            <span>
                              <span className="font-medium text-violet-600">
                                {entry.allEventTypes.size}
                              </span>{" "}
                              event type
                              {entry.allEventTypes.size !== 1 ? "s" : ""}:{" "}
                              <span className="font-mono text-violet-500">
                                {[...entry.allEventTypes].join(", ")}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>

                      <span className="shrink-0 text-slate-400 text-xs mt-1">
                        {isExpanded ? "▲" : "▼"}
                      </span>
                    </button>

                    {/* Expanded: per-storylet breakdown */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 divide-y divide-slate-50">
                        {entry.refs.map((ref) => (
                          <div key={ref.storyletId} className="px-4 py-2.5 bg-slate-50">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-xs font-medium text-slate-700">
                                  {ref.storyletTitle}
                                </p>
                                <p className="text-[10px] font-mono text-slate-400">
                                  {ref.storyletId}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-1 justify-end">
                                {ref.sources.map((src, i) => (
                                  <span
                                    key={i}
                                    className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${SOURCE_STYLES[src.kind]}`}
                                    title={getSourceDetail(src)}
                                  >
                                    {SOURCE_LABELS[src.kind]}
                                    {getSourceCount(src) > 1
                                      ? ` ×${getSourceCount(src)}`
                                      : ""}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Inline detail per source */}
                            {ref.sources.map((src, i) => {
                              const detail = getSourceInlineDetail(src);
                              if (!detail) return null;
                              return (
                                <p
                                  key={i}
                                  className="mt-1 text-[10px] font-mono text-slate-500"
                                >
                                  {detail}
                                </p>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer summary */}
          {!loading && (
            <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-600">
              <Stat label="Distinct NPCs" value={npcMap.size} />
              <Stat
                label="Introduced"
                value={[...npcMap.values()].filter((e) => e.introduced).length}
                highlight
              />
              <Stat
                label="Total storylet refs"
                value={[...npcMap.values()].reduce((acc, e) => acc + e.refs.length, 0)}
              />
              <Stat
                label="Unique memory flags"
                value={
                  new Set(
                    [...npcMap.values()].flatMap((e) => [...e.allMemoryFlags])
                  ).size
                }
              />
            </div>
          )}
        </div>
      )}
    </AuthGate>
  );
}

// ── helpers ───────────────────────────────────────────────────────────────────

function getSourceCount(src: NpcSource): number {
  switch (src.kind) {
    case "relational_effect":
      return src.dimensions.length;
    case "npc_memory":
    case "reaction_text_conditions":
      return src.flags.length;
    case "events_emitted":
      return src.types.length;
    default:
      return 1;
  }
}

function getSourceDetail(src: NpcSource): string {
  switch (src.kind) {
    case "relational_effect":
      return `Dimensions: ${src.dimensions.join(", ")}`;
    case "npc_memory":
      return `Flags: ${src.flags.join(", ")}`;
    case "reaction_text_conditions":
      return `Conditional flags: ${src.flags.join(", ")}`;
    case "events_emitted":
      return `Event types: ${src.types.join(", ")}`;
    default:
      return "Introduces this NPC";
  }
}

function getSourceInlineDetail(src: NpcSource): string | null {
  switch (src.kind) {
    case "relational_effect":
      return `dims: ${[...new Set(src.dimensions)].join(", ")}`;
    case "npc_memory":
      return `flags: ${[...new Set(src.flags)].join(", ")}`;
    case "events_emitted":
      return `events: ${[...new Set(src.types)].join(", ")}`;
    case "reaction_text_conditions":
      return `cond flags: ${[...new Set(src.flags)].join(", ")}`;
    default:
      return null;
  }
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
        className={`text-lg font-semibold ${
          highlight ? "text-indigo-600" : "text-slate-800"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
