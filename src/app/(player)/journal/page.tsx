"use client";

import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { useSession } from "@/contexts/SessionContext";
import { fetchAnomaliesByIds, fetchUserAnomalies } from "@/lib/anomalies";
import { submitReport } from "@/lib/reports";
import { Button } from "@/components/ui/button";
import type { Anomaly, UserAnomaly } from "@/types/anomalies";
import { JournalSkeleton } from "@/components/skeletons/JournalSkeleton";

function JournalContent() {
  const session = useSession();
  const [entries, setEntries] = useState<UserAnomaly[]>([]);
  const [catalog, setCatalog] = useState<Record<string, Anomaly>>({});
  const [clues, setClues] = useState<
    Array<{
      id: string;
      from_display_name: string | null;
      anomaly_title: string | null;
      anomaly_description: string | null;
      created_at: string;
    }>
  >([]);
  const [reportTarget, setReportTarget] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("spam");
  const [reportDetails, setReportDetails] = useState("");
  const [reportSaving, setReportSaving] = useState(false);
  const [reportMessage, setReportMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rows = useMemo(() => {
    return entries.map((entry) => ({
      entry,
      anomaly: catalog[entry.anomaly_id],
    }));
  }, [entries, catalog]);

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

        const clueRes = await fetch("/api/group/clues/inbox", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (clueRes.ok) {
          const json = await clueRes.json();
          setClues(json.clues ?? []);
        }
      } catch (e) {
        console.error(e);
        setError("Failed to load journal.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [session.user.id]);

  useEffect(() => {
    if (reportMessage !== "Report submitted.") return;
    const timer = window.setTimeout(() => setReportMessage(null), 2000);
    return () => window.clearTimeout(timer);
  }, [reportMessage]);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Journal</h1>
        <p className="text-sm text-slate-600">
          Discovered anomalies and the days you found them.
        </p>
      </div>

      {clues.length > 0 ? (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Clues received</h2>
          <div className="space-y-3">
            {clues.map((clue) => (
              <div
                key={clue.id}
                className="rounded-md border border-emerald-200 border-l-4 border-l-emerald-300 bg-emerald-50/40 px-4 py-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                    <span aria-hidden="true">✉️</span>
                    <span>{clue.anomaly_title ?? "Anomaly clue"}</span>
                  </h3>
                  <span className="text-xs text-slate-500">
                    {clue.created_at
                      ? new Date(clue.created_at).toLocaleDateString()
                      : ""}
                  </span>
                </div>
                <p className="text-sm text-slate-700">
                  {clue.anomaly_description ?? "A clue arrived from your group."}
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  From {clue.from_display_name ?? "a group member"}
                </p>
                <Button
                  variant="ghost"
                  className="px-0 text-xs text-slate-700"
                  onClick={() => {
                    setReportTarget(clue.id);
                    setReportMessage(null);
                  }}
                >
                  Report
                </Button>
              </div>
            ))}
          </div>
          {reportTarget ? (
            <div className="rounded-md border border-slate-200 bg-white px-4 py-3 space-y-2">
              <h3 className="text-sm font-semibold text-slate-700">Report clue</h3>
              <label className="text-sm text-slate-700">
                Reason
                <select
                  className="ml-2 rounded border border-slate-300 px-2 py-1"
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                >
                  <option value="spam">Spam</option>
                  <option value="harassment">Harassment</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="block text-sm text-slate-700">
                Details (optional)
                <textarea
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900"
                  rows={2}
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                />
              </label>
              {reportMessage ? (
                reportMessage === "Report submitted." ? (
                  <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                    {reportMessage}
                  </span>
                ) : (
                  <p className="text-xs text-red-600">{reportMessage}</p>
                )
              ) : null}
              <div className="flex items-center gap-2">
                <Button
                  onClick={async () => {
                    setReportSaving(true);
                    try {
                      await submitReport({
                        target_type: "clue",
                        target_id: reportTarget,
                        reason: reportReason,
                        details: reportDetails.trim() || undefined,
                      });
                      setReportMessage("Report submitted.");
                      setReportTarget(null);
                      setReportDetails("");
                    } catch (e) {
                      setReportMessage(
                        e instanceof Error ? e.message : "Failed to submit report."
                      );
                    } finally {
                      setReportSaving(false);
                    }
                  }}
                  disabled={reportSaving}
                >
                  {reportSaving ? "Submitting..." : "Submit report"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setReportTarget(null);
                    setReportDetails("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? <JournalSkeleton /> : null}

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
                <span className="text-xs text-slate-500">Day {entry.day_index}</span>
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
}

export default function JournalPage() {
  return <JournalContent />;
}
