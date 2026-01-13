"use client";

import { useMemo, useState } from "react";

import { AuthGate } from "@/ui/components/AuthGate";
import { Button } from "@/components/ui/button";
import { isEmailAllowed } from "@/lib/adminAuth";

type Issue = {
  storyletId: string;
  slug: string;
  path: string;
  message: string;
};

export default function StoryletValidatePage() {
  const [errors, setErrors] = useState<Issue[]>([]);
  const [warnings, setWarnings] = useState<Issue[]>([]);
  const [counts, setCounts] = useState<{ storylets: number; errors: number; warnings: number } | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showErrors, setShowErrors] = useState(true);
  const [showWarnings, setShowWarnings] = useState(true);

  const runValidation = async (token: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/storylets/validate", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Failed to run validation");
      }
      setErrors(json.errors ?? []);
      setWarnings(json.warnings ?? []);
      setCounts(json.counts ?? null);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to run validation");
    } finally {
      setLoading(false);
    }
  };

  const groups = useMemo(() => {
    const map = new Map<string, Issue[]>();
    const filtered = [
      ...(showErrors ? errors : []),
      ...(showWarnings ? warnings : []),
    ].filter((issue) =>
      search ? issue.slug.toLowerCase().includes(search.toLowerCase()) : true
    );
    filtered.forEach((issue) => {
      const key = issue.slug || issue.storyletId || "unknown";
      if (!map.has(key)) map.set(key, []);
      map.get(key)?.push(issue);
    });
    return Array.from(map.entries());
  }, [errors, warnings, search, showErrors, showWarnings]);

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(
        JSON.stringify({ errors, warnings, counts }, null, 2)
      );
    } catch (e) {
      console.error("Failed to copy JSON", e);
    }
  };

  return (
    <AuthGate>
      {(session) => {
        const email = session.user.email;
        if (!isEmailAllowed(email)) {
          return (
            <div className="p-6 space-y-3">
              <h1 className="text-2xl font-semibold">Validate Storylets</h1>
              <p className="text-slate-700">Not authorized.</p>
            </div>
          );
        }

        return (
          <div className="p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h1 className="text-2xl font-semibold">Validate Storylets</h1>
                <p className="text-sm text-slate-600">
                  Run lint rules across all storylets.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() => runValidation(session.access_token)}
                  disabled={loading}
                >
                  {loading ? "Running..." : "Run validation"}
                </Button>
                <Button variant="ghost" onClick={copyJson}>
                  Copy JSON
                </Button>
              </div>
            </div>

            {counts ? (
              <div className="text-sm text-slate-700">
                {counts.storylets} storylets · {counts.errors} errors ·{" "}
                {counts.warnings} warnings
              </div>
            ) : null}

            {error ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3 items-end">
              <label className="text-sm text-slate-700">
                Search slug
                <input
                  className="mt-1 rounded-md border border-slate-300 px-3 py-2"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={showErrors}
                  onChange={(e) => setShowErrors(e.target.checked)}
                />
                Errors
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={showWarnings}
                  onChange={(e) => setShowWarnings(e.target.checked)}
                />
                Warnings
              </label>
            </div>

            {groups.length === 0 && !loading ? (
              <p className="text-sm text-slate-600">No issues found.</p>
            ) : (
              <div className="space-y-4">
                {groups.map(([slug, issues]) => (
                  <div key={slug} className="rounded border border-slate-200 bg-white p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900">{slug}</p>
                        <p className="text-xs text-slate-600">
                          {issues.length} issue{issues.length === 1 ? "" : "s"}
                        </p>
                      </div>
                      {issues[0]?.storyletId ? (
                        <a
                          className="text-xs text-slate-700 underline"
                          href={`/admin/storylets/${issues[0].storyletId}`}
                        >
                          Open
                        </a>
                      ) : null}
                    </div>
                    <ul className="mt-2 space-y-1 text-sm">
                      {issues.map((issue, idx) => {
                        const isError = errors.includes(issue);
                        return (
                          <li key={`${issue.path}-${idx}`} className="text-slate-700">
                            <span className="font-medium">
                              {isError ? "Error" : "Warning"}:
                            </span>{" "}
                            {issue.path} — {issue.message}
                          </li>
                        );
                      })}
                    </ul>
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
