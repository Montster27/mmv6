"use client";

import { buttonClass, panelClass, primaryClass, type StudioCtx } from "./shared";

export function ReleasesScreen({ ctx }: { ctx: StudioCtx }) {
  const { workspace, data, busy, canPublish, stale } = ctx;
  return (
    <section className={panelClass}>
      <h2 className="font-semibold">Release complete, approved work</h2>
      <p className="text-sm text-slate-600">
        New playthroughs use the active release. Existing playthroughs remain on their pinned release, including
        after rollback.
      </p>
      {workspace ? (
        <button
          className={primaryClass}
          disabled={busy || !canPublish || workspace.status !== "approved" || stale}
          onClick={() => void ctx.act("publish")}
        >
          Publish {workspace.title}
        </button>
      ) : null}
      {data.releases.map((release) => (
        <div key={release.id} className="flex flex-wrap items-center justify-between gap-3 rounded border p-3">
          <div>
            <strong>{release.title}</strong>
            {release.id === data.activeReleaseId ? (
              <span className="ml-2 rounded bg-green-100 px-2 text-xs text-green-800">Active for new runs</span>
            ) : null}
            <p className="text-xs text-slate-500">
              {new Date(release.created_at).toLocaleString()} · {release.runtime_version}
            </p>
          </div>
          <button
            className={buttonClass}
            disabled={busy || !canPublish || release.id === data.activeReleaseId}
            onClick={() => {
              if (window.confirm(`Use “${release.title}” for new playthroughs? Existing runs keep their release.`)) {
                void ctx.act("activate", { release_id: release.id });
              }
            }}
          >
            Activate this release
          </button>
        </div>
      ))}
    </section>
  );
}
