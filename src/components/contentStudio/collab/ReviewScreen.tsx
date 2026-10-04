"use client";

import { useEffect, useState } from "react";
import { agreementReferences } from "@/core/studio/agreements";
import { PILOT_PLAN_ID } from "@/core/studio/studyGroupPilot";
import { recordId } from "@/core/studio/manifest";
import { RehearsalPanel } from "../RehearsalPanel";
import { OfferScenarios } from "./OfferScenarios";
import { buttonClass, Field, inputClass, panelClass, primaryClass, type StudioCtx } from "./shared";

function ReviewActions({ ctx }: { ctx: StudioCtx }) {
  const { workspace, busy, canEdit, canReview } = ctx;
  if (!workspace) return <p className="text-sm">Select a workspace to compare its revisions and review it.</p>;
  const errors = ctx.data.issues.filter((issue) => issue.severity === "error");
  const inReview = workspace.status === "review";
  return (
    <section className={panelClass}>
      <h2 className="font-semibold">Review revision {workspace.revision}</h2>
      <p className="text-sm whitespace-pre-wrap">{workspace.brief}</p>
      <div className="flex flex-wrap gap-2">
        <button className={buttonClass} disabled={busy || !canEdit} onClick={() => void ctx.act("submit")}>
          Request review
        </button>
        <button className={buttonClass} disabled={busy || !canReview || !inReview} onClick={() => void ctx.act("changes")}>
          Request changes
        </button>
        <button
          className={primaryClass}
          disabled={busy || !canReview || !inReview || errors.length > 0}
          onClick={() => void ctx.act("approve")}
        >
          Approve this revision
        </button>
        <button className={buttonClass} disabled={busy || workspace.status === "published"} onClick={() => void ctx.act("withdraw")}>
          Return to draft
        </button>
      </div>
      <p className="text-xs text-slate-500">
        The owner or a contributor cannot approve their own work. Editing an approved package requires a new review.
      </p>
    </section>
  );
}

function ChangedContent({ ctx }: { ctx: StudioCtx }) {
  const { data, manifest } = ctx;
  return (
    <section className={panelClass}>
      <h2 className="font-semibold">Changed content · {data.changes.length}</h2>
      {data.changes.map((change) => {
        const before = data.base?.[change.kind].find((row) => recordId(row) === change.object_id);
        const affected = [...manifest.plans, ...manifest.definitions].filter(
          (row) =>
            agreementReferences(row).includes(change.object_id) ||
            (Array.isArray(row.dependencies) && row.dependencies.includes(change.object_id)) ||
            (Array.isArray(row.storylet_ids) && row.storylet_ids.includes(change.object_id)) ||
            row.parent_id === change.object_id
        );
        const verdict = change.payload ? (before ? "changed" : "new") : "removed";
        return (
          <details key={`${change.kind}:${change.object_id}`} className="rounded border p-3">
            <summary className="cursor-pointer text-sm font-medium">
              {change.payload?.title || before?.title || change.object_id} · {change.kind} · {verdict}
            </summary>
            <div className="grid gap-3 pt-3 lg:grid-cols-2">
              <div>
                <p className="text-xs font-semibold">Approved baseline</p>
                <pre className="max-h-80 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify(before ?? null, null, 2)}</pre>
              </div>
              <div>
                <p className="text-xs font-semibold">Proposed revision</p>
                <pre className="max-h-80 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify(change.payload, null, 2)}</pre>
              </div>
            </div>
            {affected.length > 0 ? (
              <p className="mt-2 text-xs text-amber-800">Dependent work: {affected.map((row) => row.title).join(", ")}</p>
            ) : null}
          </details>
        );
      })}
    </section>
  );
}

function ChecksPanel({ ctx }: { ctx: StudioCtx }) {
  const { data } = ctx;
  const errors = data.issues.filter((issue) => issue.severity === "error");
  return (
    <section className={panelClass}>
      <h2 className="font-semibold">Checks · {errors.length} must fix</h2>
      <p className="text-xs text-slate-500">
        Warnings need editorial judgment. These checks do not prove every possible playthrough.
      </p>
      {data.issues.slice(0, 150).map((issue, index) => (
        <p key={index} className={`text-sm ${issue.severity === "error" ? "text-red-800" : "text-amber-800"}`}>
          <strong>
            {issue.severity === "error" ? "Must fix" : "Review"}: {ctx.titleOf(issue.objectId)}
          </strong>{" "}
          — {issue.message}
        </p>
      ))}
    </section>
  );
}

function PilotPanel({ ctx }: { ctx: StudioCtx }) {
  const alreadyAdded = ctx.manifest.plans.some((plan) => plan.id === PILOT_PLAN_ID);
  return (
    <section className={panelClass}>
      <h2 className="font-semibold">Study-group team pilot</h2>
      <p className="text-sm">
        Add director and strand briefs, three writing assignments, an independent-review brief, seven playable
        scenes and seven rehearsal paths to this draft. The pilot tests explicitly exclude the surrounding
        catalog; integration with the rest of the game needs additional rehearsals before release.
      </p>
      <button className={buttonClass} disabled={!ctx.canEdit || ctx.busy || alreadyAdded} onClick={() => void ctx.act("pilot")}>
        Add study-group pilot to draft
      </button>
      <p className="text-xs text-slate-500">
        Imported as one revision-checked transaction. No player content changes until independently approved and
        published. Assign actual people through My work; role briefs do not count as human review.
      </p>
    </section>
  );
}

function Discussion({ ctx }: { ctx: StudioCtx }) {
  const { workspace, data } = ctx;
  const [comment, setComment] = useState("");
  const [target, setTarget] = useState("");
  if (!workspace) return null;
  return (
    <section className={panelClass}>
      <h2 className="font-semibold">Discussion & revision history</h2>
      <label className="block text-xs">
        Comment on
        <select className={inputClass} value={target} onChange={(event) => setTarget(event.target.value)}>
          <option value="">Whole assignment</option>
          {data.changes.map((change) => (
            <option key={`${change.kind}:${change.object_id}`} value={change.object_id}>
              {ctx.titleOf(change.object_id)}
            </option>
          ))}
        </select>
      </label>
      <Field label="Review note" value={comment} onChange={setComment} multiline />
      <button
        className={buttonClass}
        disabled={ctx.busy || !comment.trim()}
        onClick={async () => {
          if (await ctx.act("comment", { text: comment, object_id: target })) setComment("");
        }}
      >
        Add review note
      </button>
      <div className="space-y-2">
        {data.events.map((event) => (
          <div key={event.id} className="border-t pt-2 text-xs">
            <strong>{ctx.name(event.actor_id)}</strong> · {event.action} · revision {event.revision} ·{" "}
            {new Date(event.created_at).toLocaleString()}
            {event.detail.text ? <p className="mt-1 whitespace-pre-wrap text-sm">{String(event.detail.text)}</p> : null}
          </div>
        ))}
      </div>
    </section>
  );
}

export function ReviewScreen({ ctx }: { ctx: StudioCtx }) {
  const { workspace, data, manifest, markDirty } = ctx;
  const [rehearsalEditing, setRehearsalEditing] = useState(false);
  useEffect(() => {
    markDirty("rehearsal", rehearsalEditing);
    return () => markDirty("rehearsal", false);
  }, [rehearsalEditing, markDirty]);

  return (
    <>
      <ReviewActions ctx={ctx} />
      <ChangedContent ctx={ctx} />
      <ChecksPanel ctx={ctx} />
      <PilotPanel ctx={ctx} />
      <RehearsalPanel
        onEditingChange={setRehearsalEditing}
        key={ctx.workspaceId}
        manifest={manifest}
        tests={data.tests}
        revision={workspace?.revision ?? 0}
        canEdit={ctx.canEdit}
        busy={ctx.busy}
        save={(record, revision) => ctx.act("save", { kind: "scenarios", object_id: recordId(record), payload: record, revision })}
      />
      <OfferScenarios ctx={ctx} />
      <Discussion ctx={ctx} />
    </>
  );
}
