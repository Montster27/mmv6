"use client";

import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { AuthGate } from "@/ui/components/AuthGate";
import { Button } from "@/components/ui/button";
import { fetchUserAnomalies, fetchAnomaliesByIds } from "@/lib/anomalies";
import {
  getHypothesis,
  listHypothesisAnomalies,
  linkAnomaly,
  unlinkAnomaly,
  updateHypothesis,
} from "@/lib/hypotheses";
import type { Anomaly, UserAnomaly } from "@/types/anomalies";
import type { Hypothesis } from "@/types/hypotheses";

function TheoryDetailContent({
  params,
  session,
}: {
  params: { id: string };
  session: Session;
}) {
  const [hypothesis, setHypothesis] = useState<Hypothesis | null>(null);
  const [linked, setLinked] = useState<Set<string>>(new Set());
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const anomaliesById = useMemo(() => {
    return anomalies.reduce<Record<string, Anomaly>>((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {});
  }, [anomalies]);

  const load = async (userId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getHypothesis(params.id);
      if (!data || data.user_id !== userId) {
        setError("Not authorized.");
        setHypothesis(null);
        return;
      }
      setHypothesis(data);
      setTitle(data.title);
      setBody(data.body);
      const links = await listHypothesisAnomalies(params.id);
      setLinked(new Set(links.map((link) => link.anomaly_id)));

      const userAnomalies: UserAnomaly[] = await fetchUserAnomalies(userId);
      const anomalyIds = Array.from(new Set(userAnomalies.map((row) => row.anomaly_id)));
      const catalog = await fetchAnomaliesByIds(anomalyIds);
      setAnomalies(catalog);
    } catch (e) {
      console.error(e);
      setError("Failed to load hypothesis.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(session.user.id);
  }, [session.user.id]);

  if (error && !hypothesis) {
    return (
      <div className="p-6">
        <p className="text-slate-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Hypothesis</h1>
        <p className="text-sm text-slate-600">
          Refine your theory and link anomalies.
        </p>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? <p className="text-slate-700">Loading…</p> : null}

      {hypothesis ? (
        <div className="space-y-4">
          <div className="rounded-md border border-slate-200 bg-white px-4 py-3 space-y-3">
            <label className="block text-sm text-slate-700">
              Title
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <label className="block text-sm text-slate-700">
              Notes
              <textarea
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                rows={4}
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </label>
            <div className="flex items-center gap-2">
              <Button
                onClick={async () => {
                  setSaving(true);
                  const ok = await updateHypothesis(hypothesis.id, {
                    title: title.trim(),
                    body: body.trim(),
                  });
                  setSaving(false);
                  if (!ok) {
                    setError("Failed to save.");
                  } else {
                    setError(null);
                    setHypothesis({ ...hypothesis, title, body });
                  }
                }}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save"}
              </Button>
              <Button
                variant="secondary"
                onClick={async () => {
                  setSaving(true);
                  const nextStatus = hypothesis.status === "active" ? "archived" : "active";
                  const ok = await updateHypothesis(hypothesis.id, {
                    status: nextStatus,
                  });
                  setSaving(false);
                  if (!ok) {
                    setError("Failed to update status.");
                  } else {
                    setHypothesis({ ...hypothesis, status: nextStatus });
                  }
                }}
                disabled={saving}
              >
                {hypothesis.status === "active" ? "Archive" : "Unarchive"}
              </Button>
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-white px-4 py-3 space-y-3">
            <h2 className="text-sm font-semibold text-slate-700">Linked anomalies</h2>
            {linked.size === 0 ? (
              <p className="text-sm text-slate-600">None linked yet.</p>
            ) : (
              <ul className="space-y-2">
                {Array.from(linked).map((id) => (
                  <li
                    key={id}
                    className="flex items-center justify-between rounded border border-slate-200 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {anomaliesById[id]?.title ?? id}
                      </p>
                      <p className="text-xs text-slate-600">
                        {anomaliesById[id]?.description ?? ""}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      onClick={async () => {
                        await unlinkAnomaly(hypothesis.id, id);
                        setLinked((prev) => {
                          const next = new Set(prev);
                          next.delete(id);
                          return next;
                        });
                      }}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-md border border-slate-200 bg-white px-4 py-3 space-y-3">
            <h2 className="text-sm font-semibold text-slate-700">Link anomalies</h2>
            {anomalies.length === 0 ? (
              <p className="text-sm text-slate-600">No anomalies discovered yet.</p>
            ) : (
              <div className="space-y-2">
                {anomalies.map((anomaly) => {
                  const isLinked = linked.has(anomaly.id);
                  return (
                    <label
                      key={anomaly.id}
                      className="flex items-start gap-2 text-sm text-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={isLinked}
                        onChange={async () => {
                          if (isLinked) {
                            await unlinkAnomaly(hypothesis.id, anomaly.id);
                            setLinked((prev) => {
                              const next = new Set(prev);
                              next.delete(anomaly.id);
                              return next;
                            });
                          } else {
                            await linkAnomaly(hypothesis.id, anomaly.id);
                            setLinked((prev) => new Set(prev).add(anomaly.id));
                          }
                        }}
                      />
                      <div>
                        <p className="font-medium text-slate-900">{anomaly.title}</p>
                        <p className="text-xs text-slate-600">{anomaly.description}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function TheoryDetailPage({ params }: { params: { id: string } }) {
  return (
    <AuthGate>{(session) => <TheoryDetailContent params={params} session={session} />}</AuthGate>
  );
}
