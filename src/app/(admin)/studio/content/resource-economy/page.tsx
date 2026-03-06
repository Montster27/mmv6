"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AuthGate } from "@/ui/components/AuthGate";
import { useStoryletsAPI } from "@/hooks/contentStudio/useStoryletsAPI";
import {
  computeStoryletsEconomy,
  PRIMARY_RESOURCE_KEYS,
  type StoryletsEconomyRow,
} from "@/lib/resourceEconomy";
import type { ResourceKey } from "@/core/resources/resourceKeys";

const RESOURCE_LABELS: Record<ResourceKey, string> = {
  energy: "Energy",
  stress: "Stress",
  knowledge: "Knowledge",
  cashOnHand: "Cash",
  socialLeverage: "Social",
  physicalResilience: "Physical",
  morale: "Morale",
  skillPoints: "Skill Pts",
  focus: "Focus",
  memory: "Memory",
  networking: "Networking",
  grit: "Grit",
};

function deltaColor(value: number | undefined): string {
  if (value === undefined || value === 0) return "bg-slate-100 text-slate-400";
  if (value > 0) {
    const intensity = Math.min(1, Math.abs(value) / 20);
    return intensity > 0.5 ? "bg-green-500 text-white" : "bg-green-200 text-green-800";
  } else {
    const intensity = Math.min(1, Math.abs(value) / 20);
    return intensity > 0.5 ? "bg-red-500 text-white" : "bg-red-100 text-red-700";
  }
}

function fmt(v: number | undefined): string {
  if (v === undefined) return "—";
  return v > 0 ? `+${v.toFixed(1)}` : v.toFixed(1);
}

type SortKey = "title" | "phase" | "weight" | "choices" | ResourceKey;

export default function ResourceEconomyPage() {
  const { loadStorylets, loading, error } = useStoryletsAPI();
  const [allStorylets, setAllStorylets] = useState<Awaited<ReturnType<typeof loadStorylets>>>([]);
  const [sortKey, setSortKey] = useState<SortKey>("phase");
  const [sortDir, setSortDir] = useState<1 | -1>(1);
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    loadStorylets().then(setAllStorylets);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const storylets = useMemo(
    () => (showInactive ? allStorylets : allStorylets.filter((s) => s.is_active)),
    [allStorylets, showInactive]
  );

  const economy = useMemo(() => computeStoryletsEconomy(storylets), [storylets]);

  const sorted = useMemo(() => {
    const rows = [...economy.rows];
    rows.sort((a, b) => {
      let av: string | number, bv: string | number;
      if (sortKey === "title") { av = a.title; bv = b.title; }
      else if (sortKey === "phase") { av = a.phase; bv = b.phase; }
      else if (sortKey === "weight") { av = a.weight; bv = b.weight; }
      else if (sortKey === "choices") { av = a.choiceCount; bv = b.choiceCount; }
      else { av = a.avgDeltas[sortKey] ?? 0; bv = b.avgDeltas[sortKey] ?? 0; }
      return (av < bv ? -1 : av > bv ? 1 : 0) * sortDir;
    });
    return rows;
  }, [economy.rows, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setDir((d) => (d === 1 ? -1 : 1));
    else { setSortKey(key); setSortDir(1); }
  }
  // workaround for strict mode — use setSortDir alias
  function setDir(fn: (d: 1 | -1) => 1 | -1) {
    setSortDir((d) => fn(d));
  }

  function ThCell({ label, sk }: { label: string; sk: SortKey }) {
    const active = sortKey === sk;
    return (
      <th
        className="px-2 py-2 text-xs font-medium text-slate-600 text-center cursor-pointer select-none hover:bg-slate-100 whitespace-nowrap"
        onClick={() => toggleSort(sk)}
      >
        {label}
        {active && <span className="ml-1">{sortDir === 1 ? "↑" : "↓"}</span>}
      </th>
    );
  }

  const { globalAvgDeltas, gateCounts } = economy;

  return (
    <AuthGate>
      {() => (
        <div className="h-full overflow-auto p-4 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Resource Economy</h2>
              <p className="text-sm text-slate-600">
                Balance view across all {storylets.length} storylets.
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
              />
              Include inactive
            </label>
          </div>

          {loading && <p className="text-sm text-slate-500">Loading…</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
            {PRIMARY_RESOURCE_KEYS.map((key) => {
              const avg = globalAvgDeltas[key];
              const gates = gateCounts[key] ?? 0;
              return (
                <div key={key} className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-xs font-medium text-slate-500 mb-1">
                    {RESOURCE_LABELS[key]}
                  </p>
                  <p
                    className={`text-lg font-bold ${
                      avg === undefined || avg === 0
                        ? "text-slate-400"
                        : avg > 0
                          ? "text-green-600"
                          : "text-red-600"
                    }`}
                  >
                    {fmt(avg)}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">avg Δ/storylet</p>
                  {gates > 0 && (
                    <p className="text-xs text-blue-500 mt-0.5">{gates} gated</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Gate analysis sidebar note */}
          <div className="rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800 space-y-1">
            <p className="font-semibold">Gate analysis</p>
            {PRIMARY_RESOURCE_KEYS.filter((k) => (gateCounts[k] ?? 0) > 0).map((k) => (
              <p key={k}>
                <span className="font-medium">{RESOURCE_LABELS[k]}:</span>{" "}
                {gateCounts[k]} storylet{(gateCounts[k] ?? 0) !== 1 ? "s" : ""} gated
              </p>
            ))}
            {PRIMARY_RESOURCE_KEYS.every((k) => !gateCounts[k]) && (
              <p className="text-blue-600">No resource gates found.</p>
            )}
          </div>

          {/* Heat map table */}
          <div className="rounded-lg border border-slate-200 bg-white overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <ThCell label="Storylet" sk="title" />
                  <ThCell label="Phase" sk="phase" />
                  <ThCell label="Wt" sk="weight" />
                  <ThCell label="Choices" sk="choices" />
                  {PRIMARY_RESOURCE_KEYS.map((k) => (
                    <ThCell key={k} label={RESOURCE_LABELS[k]} sk={k} />
                  ))}
                  <th className="px-2 py-2 text-xs font-medium text-slate-600 text-center">
                    Gates
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row) => (
                  <tr
                    key={row.storyletId}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-2 py-1.5 max-w-[200px]">
                      <Link
                        href={`/studio/content/storylets?id=${row.storyletId}`}
                        className="text-indigo-600 hover:underline font-medium truncate block"
                      >
                        {row.title}
                      </Link>
                    </td>
                    <td className="px-2 py-1.5 text-center text-slate-500 whitespace-nowrap">
                      {row.phase || "—"}
                    </td>
                    <td className="px-2 py-1.5 text-center text-slate-500">
                      {row.weight}
                    </td>
                    <td className="px-2 py-1.5 text-center text-slate-500">
                      {row.choiceCount}
                    </td>
                    {PRIMARY_RESOURCE_KEYS.map((k) => {
                      const v = row.avgDeltas[k];
                      return (
                        <td key={k} className="px-1 py-1.5 text-center">
                          {v !== undefined ? (
                            <span
                              className={`inline-block rounded px-1.5 py-0.5 text-xs font-mono ${deltaColor(v)}`}
                            >
                              {fmt(v)}
                            </span>
                          ) : (
                            <span className="text-slate-200">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-2 py-1.5 text-center">
                      {row.gates.length > 0 ? (
                        <span className="text-blue-500" title={row.gates.map((g) => `${g.key}≥${g.min}`).join(", ")}>
                          {row.gates.map((g) => RESOURCE_LABELS[g.key][0]).join("")}
                        </span>
                      ) : (
                        <span className="text-slate-200">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sorted.length === 0 && !loading && (
              <p className="px-4 py-6 text-sm text-slate-500 text-center">
                No storylets to display.
              </p>
            )}
          </div>
        </div>
      )}
    </AuthGate>
  );
}
