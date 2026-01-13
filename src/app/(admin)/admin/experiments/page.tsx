"use client";

import { useCallback, useEffect, useState } from "react";

import { AuthGate } from "@/ui/components/AuthGate";
import { Button } from "@/components/ui/button";
import { isEmailAllowed } from "@/lib/adminAuth";
import { supabase } from "@/lib/supabase/browser";

type ExperimentRow = {
  id: string;
  description: string;
  variants: string[];
  active: boolean;
};

export default function ExperimentsAdminPage() {
  const [experiments, setExperiments] = useState<ExperimentRow[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overrideUserId, setOverrideUserId] = useState("");
  const [overrideExperiment, setOverrideExperiment] = useState("");
  const [overrideVariant, setOverrideVariant] = useState("");
  const [saving, setSaving] = useState(false);

  const loadExperiments = useCallback(async (token: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: expError } = await supabase
        .from("experiments")
        .select("id,description,variants,active")
        .order("id", { ascending: true });
      if (expError) throw expError;
      setExperiments(data ?? []);
      if (data?.length && !overrideExperiment) {
        setOverrideExperiment(data[0].id);
      }
      const res = await fetch("/api/experiments/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setAssignments(json.assignments ?? {});
      }
    } catch (e) {
      console.error(e);
      setError("Failed to load experiments.");
    } finally {
      setLoading(false);
    }
  }, [overrideExperiment]);

  const handleOverride = async (token: string) => {
    if (!overrideUserId || !overrideExperiment || !overrideVariant) {
      setError("Fill user id, experiment, and variant.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/experiments/override", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: overrideUserId,
          experiment_id: overrideExperiment,
          variant: overrideVariant,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Failed to override.");
      }
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to override.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthGate>
      {(session) => (
        <ExperimentsContent
          session={session}
          experiments={experiments}
          assignments={assignments}
          loading={loading}
          error={error}
          overrideUserId={overrideUserId}
          overrideExperiment={overrideExperiment}
          overrideVariant={overrideVariant}
          saving={saving}
          setOverrideUserId={setOverrideUserId}
          setOverrideExperiment={setOverrideExperiment}
          setOverrideVariant={setOverrideVariant}
          loadExperiments={loadExperiments}
          handleOverride={handleOverride}
        />
      )}
    </AuthGate>
  );
}

function ExperimentsContent({
  session,
  experiments,
  assignments,
  loading,
  error,
  overrideUserId,
  overrideExperiment,
  overrideVariant,
  saving,
  setOverrideUserId,
  setOverrideExperiment,
  setOverrideVariant,
  loadExperiments,
  handleOverride,
}: {
  session: { user: { email?: string | null }; access_token: string };
  experiments: ExperimentRow[];
  assignments: Record<string, string>;
  loading: boolean;
  error: string | null;
  overrideUserId: string;
  overrideExperiment: string;
  overrideVariant: string;
  saving: boolean;
  setOverrideUserId: (value: string) => void;
  setOverrideExperiment: (value: string) => void;
  setOverrideVariant: (value: string) => void;
  loadExperiments: (token: string) => void;
  handleOverride: (token: string) => void;
}) {
  useEffect(() => {
    loadExperiments(session.access_token);
  }, [session.access_token, loadExperiments]);

  const email = session.user.email;
  if (!isEmailAllowed(email)) {
    return (
      <div className="p-6 space-y-3">
        <h1 className="text-2xl font-semibold">Experiments</h1>
        <p className="text-slate-700">Not authorized.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Experiments</h1>
          <p className="text-sm text-slate-600">
            Active experiments and your current assignment.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => loadExperiments(session.access_token)}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="space-y-2">
        {experiments.map((exp) => (
          <div
            key={exp.id}
            className="rounded border border-slate-200 bg-white px-3 py-2"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900">{exp.id}</p>
                <p className="text-xs text-slate-600">{exp.description}</p>
              </div>
              <span className="text-xs text-slate-600">
                {exp.active ? "Active" : "Inactive"}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Variants: {exp.variants.join(", ")} · Your assignment:{" "}
              {assignments[exp.id] ?? "—"}
            </p>
          </div>
        ))}
        {!loading && experiments.length === 0 ? (
          <p className="text-sm text-slate-600">No experiments found.</p>
        ) : null}
      </div>

      <div className="rounded-md border border-slate-200 bg-white px-4 py-3 space-y-3">
        <h2 className="text-lg font-semibold">Override assignment</h2>
        <label className="text-sm text-slate-700">
          User ID
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            value={overrideUserId}
            onChange={(e) => setOverrideUserId(e.target.value)}
            placeholder="user id"
          />
        </label>
        <label className="text-sm text-slate-700">
          Experiment
          <select
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            value={overrideExperiment}
            onChange={(e) => setOverrideExperiment(e.target.value)}
          >
            {experiments.map((exp) => (
              <option key={exp.id} value={exp.id}>
                {exp.id}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-slate-700">
          Variant
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            value={overrideVariant}
            onChange={(e) => setOverrideVariant(e.target.value)}
            placeholder="A"
          />
        </label>
        <Button
          onClick={() => handleOverride(session.access_token)}
          disabled={saving}
        >
          {saving ? "Saving..." : "Set override"}
        </Button>
      </div>
    </div>
  );
}
