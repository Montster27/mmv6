"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { AuthGate } from "@/ui/components/AuthGate";
import { Button } from "@/components/ui/button";
import { isEmailAllowed } from "@/lib/adminAuth";

type ReportRow = {
  id: string;
  reporter_user_id: string;
  target_type: string;
  target_id: string;
  reason: string;
  details: string | null;
  created_at: string;
  status: string;
};

export default function AdminReportsPage() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("open");

  const filtered = useMemo(() => {
    if (!statusFilter) return reports;
    return reports.filter((r) => r.status === statusFilter);
  }, [reports, statusFilter]);

  const loadReports = useCallback(async (token: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/reports", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Failed to load reports");
      }
      setReports(json.reports ?? []);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <AuthGate>
      {(session) => (
        <ReportsContent
          session={session}
          reports={reports}
          filtered={filtered}
          loading={loading}
          error={error}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          loadReports={loadReports}
        />
      )}
    </AuthGate>
  );
}

function ReportsContent({
  session,
  reports,
  filtered,
  loading,
  error,
  statusFilter,
  setStatusFilter,
  loadReports,
}: {
  session: { user: { email?: string | null }; access_token: string };
  reports: ReportRow[];
  filtered: ReportRow[];
  loading: boolean;
  error: string | null;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  loadReports: (token: string) => void;
}) {
  useEffect(() => {
    loadReports(session.access_token);
  }, [session.access_token, loadReports]);

  const email = session.user.email;
  if (!isEmailAllowed(email)) {
    return (
      <div className="p-6 space-y-3">
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="text-slate-700">Not authorized.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Reports</h1>
          <p className="text-sm text-slate-600">
            Recent player reports (read-only).
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => loadReports(session.access_token)}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      <div className="flex items-center gap-2 text-sm text-slate-700">
        <label>
          Status
          <select
            className="ml-2 rounded border border-slate-300 px-2 py-1"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="open">open</option>
            <option value="reviewed">reviewed</option>
            <option value="closed">closed</option>
            <option value="">all</option>
          </select>
        </label>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {filtered.length === 0 && !loading ? (
        <p className="text-sm text-slate-600">No reports found.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((report) => (
            <div
              key={report.id}
              className="rounded border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-slate-900">
                  {report.target_type}
                </span>
                <span className="text-xs text-slate-500">
                  {new Date(report.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Reason: {report.reason} · Status: {report.status}
              </p>
              <p className="text-xs text-slate-600 mt-1">
                Target: {report.target_id}
              </p>
              {report.details ? (
                <p className="text-xs text-slate-700 mt-1">
                  Details: {report.details}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
