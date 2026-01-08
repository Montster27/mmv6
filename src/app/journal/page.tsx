"use client";

import { useEffect, useMemo, useState } from "react";

import { AuthGate } from "@/ui/components/AuthGate";
import { fetchAnomaliesByIds, fetchUserAnomalies } from "@/lib/anomalies";
import type { Anomaly, UserAnomaly } from "@/types/anomalies";

export default function JournalPage() {
  const [entries, setEntries] = useState<UserAnomaly[]>([]);
  const [catalog, setCatalog] = useState<Record<string, Anomaly>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rows = useMemo(() => {
    return entries.map((entry) => ({
      entry,
      anomaly: catalog[entry.anomaly_id],
    }));
  }, [entries, catalog]);

  return (
    <AuthGate>
      {(session) => {
        useEffect(() => {
          const load = async () => {
            setLoading(true);
            setError(null);
            try {
              const list = await fetchUserAnomalies(session.user.id);
              setEntries(list);
              const ids = Array.from(new Set(list.map((row) => row.anomaly_id)));
              const anomalies = await fetchAnomaliesByIds(ids);
              const map = anomalies.reduce<Record<string, Anomaly>>((acc, item) => {
                acc[item.id] = item;
                return acc;
              }, {});
              setCatalog(map);
            } catch (e) {
              console.error(e);
              setError("Failed to load journal.");
            } finally {
              setLoading(false);
            }
          };
          load();
        }, [session.user.id]);

        return (
          <div className="p-6 space-y-4">
            <div>
              <h1 className="text-2xl font-semibold">Journal</h1>
              <p className="text-sm text-slate-600">
                Discovered anomalies and the days you found them.
              </p>
            </div>

            {error ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {loading ? <p className="text-slate-700">Loading…</p> : null}

            {!loading && rows.length === 0 ? (
              <p className="text-slate-700">No anomalies yet. Keep playing.</p>
            ) : (
              <div className="space-y-3">
                {rows.map(({ entry, anomaly }) => (
                  <div
                    key={entry.anomaly_id}
                    className="rounded-md border border-slate-200 bg-white px-4 py-3"
                  >
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-slate-900">
                        {anomaly?.title ?? entry.anomaly_id}
                      </h2>
                      <span className="text-xs text-slate-500">
                        Day {entry.day_index}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700">
                      {anomaly?.description ?? "Mystery recorded."}
                    </p>
                    <div className="mt-2 text-xs text-slate-500">
                      {entry.discovered_at
                        ? new Date(entry.discovered_at).toLocaleDateString()
                        : ""}
                      {entry.source ? ` · ${entry.source}` : ""}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }}
    </AuthGate>
  );
}
