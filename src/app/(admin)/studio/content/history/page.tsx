"use client";

import { useEffect, useState } from "react";
import { AuthGate } from "@/ui/components/AuthGate";
import { Button } from "@/components/ui/button";
import { useContentVersionsAPI } from "@/hooks/contentStudio/useContentVersionsAPI";
import type { ContentVersion } from "@/types/contentVersions";
import { getFeatureFlags } from "@/lib/featureFlags";

const flags = getFeatureFlags();

export default function HistoryPage() {
  const { versions, loading, error, loadVersions, publishContent, rollbackVersion } =
    useContentVersionsAPI();
  const [publishNote, setPublishNote] = useState("");
  const [publishState, setPublishState] = useState<"idle" | "saving" | "saved">("idle");
  const [rollbackState, setRollbackState] = useState<"idle" | "saving">("idle");
  const [rollbackError, setRollbackError] = useState<string | null>(null);

  useEffect(() => {
    loadVersions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handlePublish() {
    if (!publishNote.trim()) return;
    setPublishState("saving");
    const result = await publishContent(publishNote.trim());
    if (result.ok) {
      setPublishState("saved");
      setPublishNote("");
      setTimeout(() => setPublishState("idle"), 2000);
      await loadVersions();
    } else {
      setPublishState("idle");
    }
  }

  async function handleRollback(version: ContentVersion) {
    if (!confirm(`Roll back to version ${version.version_id.slice(0, 8)}?`)) return;
    setRollbackState("saving");
    setRollbackError(null);
    const result = await rollbackVersion(version.version_id);
    setRollbackState("idle");
    if (result.ok) {
      await loadVersions();
    } else {
      setRollbackError(result.error ?? "Rollback failed");
    }
  }

  return (
    <AuthGate>
      {() => (
        <div className="h-full overflow-auto p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Versions</h2>
              <p className="text-sm text-slate-600">Published snapshots with notes.</p>
            </div>
            <Button variant="outline" onClick={loadVersions}>
              Refresh
            </Button>
          </div>

          {flags.contentStudioPublishEnabled && (
            <div className="rounded-md border border-slate-200 bg-white p-4 space-y-2">
              <p className="text-sm font-medium text-slate-700">Publish snapshot</p>
              <div className="flex gap-2">
                <input
                  className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Release note…"
                  value={publishNote}
                  onChange={(e) => setPublishNote(e.target.value)}
                />
                <Button
                  onClick={handlePublish}
                  disabled={!publishNote.trim() || publishState === "saving"}
                >
                  {publishState === "saving"
                    ? "Publishing…"
                    : publishState === "saved"
                      ? "Published ✓"
                      : "Publish"}
                </Button>
              </div>
            </div>
          )}

          {rollbackError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              Rollback failed: {rollbackError}
            </p>
          )}

          {loading ? (
            <p className="text-sm text-slate-600">Loading…</p>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : versions.length === 0 ? (
            <p className="text-sm text-slate-600">No versions yet.</p>
          ) : (
            <div className="space-y-2">
              {versions.map((version) => (
                <div
                  key={version.version_id}
                  className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold font-mono">
                      {version.version_id.slice(0, 8)}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                      {version.state}
                    </span>
                  </div>
                  <p className="mt-1 text-slate-700">{version.note}</p>
                  <p className="text-xs text-slate-500">
                    {version.author ?? "unknown"} · {version.created_at}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleRollback(version)}
                      disabled={rollbackState === "saving"}
                    >
                      {rollbackState === "saving" ? "Rolling back…" : "Rollback"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </AuthGate>
  );
}
