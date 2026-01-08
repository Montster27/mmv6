"use client";

import { useEffect, useState } from "react";

import { AuthGate } from "@/ui/components/AuthGate";
import { Button } from "@/components/ui/button";
import { isEmailAllowed } from "@/lib/adminAuth";
import { supabase } from "@/lib/supabase/browser";

type DailyMetric = {
  date: string;
  dau: number;
  sessions: number;
  completions: number;
  completion_rate: number | null;
};

type StageAverage = {
  stage: string;
  avg_duration_ms: number | null;
  count: number;
};

type MetricsResponse = {
  range: { start: string; end: string; days: number };
  summary: {
    dau_today: number;
    completion_rate_today: number | null;
    avg_session_duration_ms: number | null;
    reflection_skip_rate: number | null;
    social_skip_rate: number | null;
    retention: {
      d1: number | null;
      d3: number | null;
      d7: number | null;
    };
  };
  daily: DailyMetric[];
  stage_averages: StageAverage[];
};

function formatPercent(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "—";
  return `${value.toFixed(1)}%`;
}

function formatDuration(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "—";
  if (value < 1000) return `${Math.round(value)} ms`;
  const seconds = Math.round(value / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  return `${minutes}m`;
}

export default function AdminMetricsPage() {
  const [days, setDays] = useState(14);
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMetrics = async (token: string, rangeDays: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/metrics?days=${rangeDays}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Failed to load metrics");
      }
      setMetrics(json as MetricsResponse);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to load metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) {
        loadMetrics(token, days);
      }
    };
    load();
  }, [days]);

  return (
    <AuthGate>
      {(session) => {
        const email = session.user.email;
        if (!isEmailAllowed(email)) {
          return (
            <div className="p-6 space-y-3">
              <h1 className="text-2xl font-semibold">Metrics</h1>
              <p className="text-slate-700">Not authorized.</p>
            </div>
          );
        }

        return (
          <div className="p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold">Phase One Metrics</h1>
                <p className="text-sm text-slate-600">
                  Range: last {days} days (UTC)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                >
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                </select>
                <Button
                  variant="secondary"
                  onClick={async () => {
                    const { data } = await supabase.auth.getSession();
                    const token = data.session?.access_token;
                    if (token) loadMetrics(token, days);
                  }}
                >
                  Refresh
                </Button>
              </div>
            </div>

            {error ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {loading ? <p className="text-slate-700">Loading…</p> : null}

            {metrics ? (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-md border border-slate-200 bg-white px-4 py-3">
                    <p className="text-xs uppercase text-slate-500">DAU (today)</p>
                    <p className="text-2xl font-semibold">
                      {metrics.summary.dau_today}
                    </p>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-white px-4 py-3">
                    <p className="text-xs uppercase text-slate-500">Completion rate</p>
                    <p className="text-2xl font-semibold">
                      {formatPercent(metrics.summary.completion_rate_today)}
                    </p>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-white px-4 py-3">
                    <p className="text-xs uppercase text-slate-500">Avg session</p>
                    <p className="text-2xl font-semibold">
                      {formatDuration(metrics.summary.avg_session_duration_ms)}
                    </p>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-white px-4 py-3">
                    <p className="text-xs uppercase text-slate-500">Reflection skip</p>
                    <p className="text-2xl font-semibold">
                      {formatPercent(metrics.summary.reflection_skip_rate)}
                    </p>
                  </div>
                </div>

                <div className="rounded-md border border-slate-200 bg-white px-4 py-3">
                  <p className="text-sm text-slate-600">
                    Retention: D1 {formatPercent(metrics.summary.retention.d1)} · D3{" "}
                    {formatPercent(metrics.summary.retention.d3)} · D7{" "}
                    {formatPercent(metrics.summary.retention.d7)}
                  </p>
                  {metrics.summary.social_skip_rate !== null ? (
                    <p className="text-sm text-slate-600">
                      Social skip rate: {formatPercent(metrics.summary.social_skip_rate)}
                    </p>
                  ) : null}
                </div>

                <div className="rounded-md border border-slate-200 bg-white">
                  <div className="border-b border-slate-100 px-4 py-2">
                    <h2 className="text-sm font-semibold text-slate-700">
                      Daily activity
                    </h2>
                  </div>
                  <div className="overflow-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50 text-left text-slate-600">
                        <tr>
                          <th className="px-3 py-2">Date (UTC)</th>
                          <th className="px-3 py-2">DAU</th>
                          <th className="px-3 py-2">Completions</th>
                          <th className="px-3 py-2">Completion rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.daily.map((row) => (
                          <tr key={row.date} className="border-t border-slate-100">
                            <td className="px-3 py-2 text-slate-700">{row.date}</td>
                            <td className="px-3 py-2">{row.dau}</td>
                            <td className="px-3 py-2">{row.completions}</td>
                            <td className="px-3 py-2">
                              {formatPercent(row.completion_rate)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-md border border-slate-200 bg-white">
                  <div className="border-b border-slate-100 px-4 py-2">
                    <h2 className="text-sm font-semibold text-slate-700">
                      Stage duration averages
                    </h2>
                  </div>
                  <div className="overflow-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50 text-left text-slate-600">
                        <tr>
                          <th className="px-3 py-2">Stage</th>
                          <th className="px-3 py-2">Avg duration</th>
                          <th className="px-3 py-2">Samples</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.stage_averages.length === 0 ? (
                          <tr>
                            <td
                              className="px-3 py-3 text-slate-600"
                              colSpan={3}
                            >
                              No stage duration data yet.
                            </td>
                          </tr>
                        ) : (
                          metrics.stage_averages.map((row) => (
                            <tr key={row.stage} className="border-t border-slate-100">
                              <td className="px-3 py-2 text-slate-700">
                                {row.stage}
                              </td>
                              <td className="px-3 py-2">
                                {formatDuration(row.avg_duration_ms)}
                              </td>
                              <td className="px-3 py-2">{row.count}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        );
      }}
    </AuthGate>
  );
}
