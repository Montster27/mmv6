"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { recordId } from "@/core/studio/manifest";
import { apiRequest } from "@/lib/contentStudio/apiClient";
import { PlanLibraryScreen } from "./collab/PlanLibraryScreen";
import { ConflictPanel, ImpactPanel } from "./collab/RebasePanels";
import { ReleasesScreen } from "./collab/ReleasesScreen";
import { ReviewScreen } from "./collab/ReviewScreen";
import {
  buttonClass,
  inputClass,
  SCREEN_TITLES,
  type Mode,
  type StudioCtx,
  type StudioData,
} from "./collab/shared";
import { WorkScreen } from "./collab/WorkScreen";

/**
 * Shell for the five collaboration screens. It owns loading, the working-context switch,
 * and the rebase flow; each screen owns its own forms.
 */
export function CollaborationStudio({ mode }: { mode: Mode }) {
  const [data, setData] = useState<StudioData | null>(null);
  const [workspaceId, setWorkspaceId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [acknowledgedImpacts, setAcknowledgedImpacts] = useState<string[]>([]);
  const [resolutions, setResolutions] = useState<Record<string, string>>({});
  const dirty = useRef(new Set<string>());

  const markDirty = useCallback((source: string, isDirty: boolean) => {
    if (isDirty) dirty.current.add(source);
    else dirty.current.delete(source);
  }, []);

  const load = useCallback(async (id: string) => {
    const result = await apiRequest<StudioData>(`/api/admin/studio${id ? `?workspace=${encodeURIComponent(id)}` : ""}`);
    if (!result.ok || !result.data) {
      setError(result.error ?? "Unable to load Studio");
      return;
    }
    setData(result.data);
    setResolutions({});
    setAcknowledgedImpacts([]);
  }, []);

  useEffect(() => {
    const id = sessionStorage.getItem("studio.workspace") ?? "";
    setWorkspaceId(id);
    void load(id);
  }, [load]);

  const selectWorkspace = useCallback(
    async (id: string) => {
      if (dirty.current.size > 0 && !window.confirm("Leave this unsaved form?")) return;
      dirty.current.clear();
      if (id) sessionStorage.setItem("studio.workspace", id);
      else sessionStorage.removeItem("studio.workspace");
      sessionStorage.removeItem("studio.revision");
      setWorkspaceId(id);
      setError("");
      setNotice("");
      window.dispatchEvent(new Event("studio-workspace-change"));
      await load(id);
    },
    [load]
  );

  const act = useCallback(
    async (action: string, payload: Record<string, unknown> = {}) => {
      if (!data) return false;
      setBusy(true);
      setError("");
      setNotice("");
      const result = await apiRequest<{ id?: string; revision?: number }>("/api/admin/studio", {
        method: "POST",
        body: JSON.stringify({ workspace_id: workspaceId, revision: data.workspace?.revision, ...payload, action }),
      });
      setBusy(false);
      if (!result.ok) {
        setError(result.error ?? "Request failed. Your edits are still here.");
        return false;
      }
      if (action === "create" && result.data?.id) await selectWorkspace(result.data.id);
      else await load(workspaceId);
      window.dispatchEvent(new Event("studio-workspace-change"));
      setNotice(action === "save" ? "Saved to this draft. Player content is unchanged." : "Saved.");
      return true;
    },
    [data, workspaceId, selectWorkspace, load]
  );

  const ctx = useMemo<StudioCtx | null>(() => {
    if (!data) return null;
    const { actor, workspace, manifest } = data;
    const members = data.members.some((member) => member.user_id === actor.id)
      ? data.members
      : [...data.members, { user_id: actor.id, display_name: actor.email ?? "You", role: actor.role }];
    return {
      data,
      workspace,
      workspaceId,
      actor,
      manifest,
      members,
      canEdit: Boolean(
        workspace &&
          workspace.status === "draft" &&
          (actor.admin || workspace.owner_id === actor.id || workspace.collaborator_ids.includes(actor.id))
      ),
      canReview: Boolean(workspace && (actor.admin || workspace.reviewer_id === actor.id)),
      canPublish: actor.admin || actor.role === "publisher",
      stale: Boolean(workspace && workspace.base_release_id !== data.activeReleaseId),
      busy,
      act,
      selectWorkspace,
      markDirty,
      name: (id) =>
        members.find((member) => member.user_id === id)?.display_name ||
        (id === actor.id ? "You" : (id?.slice(0, 8) ?? "Unassigned")),
      titleOf: (id) => Object.values(manifest).flat().find((row) => recordId(row) === id)?.title ?? id,
    };
  }, [data, workspaceId, busy, act, selectWorkspace, markDirty]);

  if (!data || !ctx) return <div className="p-6 text-sm">{error || "Loading collaborative Studio…"}</div>;
  const { workspace } = ctx;

  return (
    <div className="h-full overflow-auto bg-slate-50 p-5 space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-indigo-700">Narrative production</p>
          <h1 className="text-2xl font-semibold text-slate-900">{SCREEN_TITLES[mode]}</h1>
        </div>
        <label className="text-xs text-slate-600">
          Working context
          <select
            className={`${inputClass} mt-1`}
            value={workspaceId}
            onChange={(event) => void selectWorkspace(event.target.value)}
          >
            <option value="">Current release · read only</option>
            {data.workspaces.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title} · {item.status}
              </option>
            ))}
          </select>
        </label>
      </header>

      {error ? (
        <div role="alert" className="whitespace-pre-wrap rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
          <button className={`${buttonClass} ml-3`} onClick={() => void load(workspaceId)}>
            Reload latest context
          </button>
        </div>
      ) : null}
      {notice ? (
        <p role="status" className="text-sm text-green-800">
          {notice}
        </p>
      ) : null}

      {workspace ? (
        <div className="rounded border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-900">
          <strong>{workspace.title}</strong> · revision {workspace.revision} · {workspace.status} · owner{" "}
          {ctx.name(workspace.owner_id)} · reviewer {ctx.name(workspace.reviewer_id)}
          {ctx.stale ? (
            <p className="mt-2 text-amber-900">
              A newer release is active. Compare and rebase this workspace before publication; approval will need to
              be renewed.{" "}
              <button
                disabled={busy || (data.impacts ?? []).some((impact) => !acknowledgedImpacts.includes(impact.id))}
                className={buttonClass}
                onClick={() =>
                  void act("rebase", {
                    release_id: data.activeReleaseId,
                    resolutions,
                    acknowledged_impacts: acknowledgedImpacts,
                  })
                }
              >
                Rebase reviewed changes
              </button>
            </p>
          ) : null}
        </div>
      ) : null}

      <ImpactPanel ctx={ctx} acknowledged={acknowledgedImpacts} setAcknowledged={setAcknowledgedImpacts} />
      <ConflictPanel ctx={ctx} resolutions={resolutions} setResolutions={setResolutions} />

      {mode === "work" ? <WorkScreen ctx={ctx} /> : null}
      {mode === "narrative" || mode === "library" ? <PlanLibraryScreen ctx={ctx} mode={mode} /> : null}
      {mode === "review" ? <ReviewScreen ctx={ctx} /> : null}
      {mode === "releases" ? <ReleasesScreen ctx={ctx} /> : null}
    </div>
  );
}
