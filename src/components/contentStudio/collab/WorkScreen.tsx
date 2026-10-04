"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { recordId } from "@/core/studio/manifest";
import type { StudioWorkspace } from "@/types/studio";
import { BriefContext } from "../BriefContext";
import {
  buttonClass,
  Field,
  inputClass,
  MemberOptions,
  panelClass,
  primaryClass,
  type StudioCtx,
} from "./shared";

function AssignmentList({ ctx }: { ctx: StudioCtx }) {
  const { actor } = ctx;
  const mine = ctx.data.workspaces.filter(
    (item) =>
      item.owner_id === actor.id ||
      item.reviewer_id === actor.id ||
      item.collaborator_ids.includes(actor.id)
  );
  return (
    <section className={panelClass}>
      <h2 className="font-semibold">Your assignments</h2>
      {mine.length === 0 ? (
        <p className="text-sm text-slate-500">
          No assignments yet. Create a workspace below or ask a lead to add you.
        </p>
      ) : null}
      {mine.map((item) => (
        <button
          key={item.id}
          className="block w-full rounded border p-3 text-left hover:border-indigo-400"
          onClick={() => void ctx.selectWorkspace(item.id)}
        >
          <strong>{item.title}</strong>
          <span className="ml-2 text-xs text-slate-500">
            {item.status} ·{" "}
            {item.owner_id === actor.id
              ? "Writing"
              : item.reviewer_id === actor.id
                ? "Reviewing"
                : "Contributing"}
          </span>
          <p className="text-sm text-slate-600">
            {item.blocked_reason || item.brief || "Add a brief to define the work."}
          </p>
        </button>
      ))}
    </section>
  );
}

function CreateAssignment({ ctx }: { ctx: StudioCtx }) {
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [owner, setOwner] = useState("");
  const [plan, setPlan] = useState("");
  const [reviewer, setReviewer] = useState("");

  useEffect(() => {
    setPlan(new URLSearchParams(window.location.search).get("plan") ?? "");
  }, []);

  async function create() {
    const created = await ctx.act("create", {
      title,
      brief,
      owner_id: owner || ctx.actor.id,
      reviewer_id: reviewer,
      plan_id: plan,
    });
    if (created) {
      setTitle("");
      setBrief("");
      setPlan("");
    }
  }

  return (
    <section className={panelClass}>
      <h2 className="font-semibold">Create an assignment</h2>
      <Field label="Workspace title" value={title} onChange={setTitle} />
      <Field
        label="Brief: experience, constraints, open questions, and acceptance paths"
        value={brief}
        onChange={setBrief}
        multiline
      />
      <label className="block text-xs">
        Approved plan for this assignment
        <select className={inputClass} value={plan} onChange={(event) => setPlan(event.target.value)}>
          <option value="">No parent plan</option>
          {(ctx.data.activePlans ?? []).map((item) => (
            <option key={recordId(item)} value={recordId(item)}>
              {item.title}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-xs">
          Owner
          <select
            className={inputClass}
            value={owner || ctx.actor.id}
            onChange={(event) => setOwner(event.target.value)}
          >
            <MemberOptions members={ctx.members} />
          </select>
        </label>
        <label className="text-xs">
          Reviewer
          <select
            className={inputClass}
            value={reviewer}
            onChange={(event) => setReviewer(event.target.value)}
          >
            <option value="">Assign later</option>
            <MemberOptions members={ctx.members} />
          </select>
        </label>
      </div>
      <button className={primaryClass} disabled={ctx.busy || !title.trim()} onClick={() => void create()}>
        Create draft workspace
      </button>
    </section>
  );
}

function EditAssignment({
  ctx,
  workspace,
  onClose,
}: {
  ctx: StudioCtx;
  workspace: StudioWorkspace;
  onClose: () => void;
}) {
  const [meta, setMeta] = useState<StudioWorkspace>({ ...workspace });
  const { manifest, members } = ctx;
  const toggleContributor = (id: string, on: boolean) =>
    setMeta({
      ...meta,
      collaborator_ids: on
        ? [...meta.collaborator_ids, id]
        : meta.collaborator_ids.filter((existing) => existing !== id),
    });

  return (
    <div className="space-y-3 border-t pt-4">
      <Field label="Title" value={meta.title} onChange={(title) => setMeta({ ...meta, title })} />
      <Field label="Brief" value={meta.brief} onChange={(brief) => setMeta({ ...meta, brief })} multiline />
      <Field
        label="Blocked because (blank when ready)"
        value={meta.blocked_reason}
        onChange={(blocked_reason) => setMeta({ ...meta, blocked_reason })}
      />
      <label className="block text-xs">
        Reviewer
        <select
          className={inputClass}
          value={meta.reviewer_id ?? ""}
          onChange={(event) => setMeta({ ...meta, reviewer_id: event.target.value || null })}
        >
          <option value="">Unassigned</option>
          <MemberOptions members={members} />
        </select>
      </label>
      <label className="block text-xs">
        Parent plan
        <select
          className={inputClass}
          value={meta.plan_id ?? ""}
          onChange={(event) => setMeta({ ...meta, plan_id: event.target.value || null })}
        >
          <option value="">No parent plan</option>
          {manifest.plans.map((plan) => (
            <option key={recordId(plan)} value={recordId(plan)}>
              {plan.title}
            </option>
          ))}
        </select>
      </label>
      <p className="text-xs font-medium">Contributors</p>
      {members
        .filter((member) => member.user_id !== meta.owner_id)
        .map((member) => (
          <label className="mr-4 inline-flex gap-2 text-sm" key={member.user_id}>
            <input
              type="checkbox"
              checked={meta.collaborator_ids.includes(member.user_id)}
              onChange={(event) => toggleContributor(member.user_id, event.target.checked)}
            />
            {member.display_name || member.user_id.slice(0, 8)}
          </label>
        ))}
      <div className="flex gap-2">
        <button
          className={primaryClass}
          disabled={ctx.busy}
          onClick={async () => {
            if (await ctx.act("meta", { ...meta, workspace_id: meta.id, revision: meta.revision })) onClose();
          }}
        >
          Save assignment
        </button>
        <button className={buttonClass} onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function AssignmentBrief({ ctx }: { ctx: StudioCtx }) {
  const { workspace } = ctx;
  const [editing, setEditing] = useState(false);
  const { markDirty } = ctx;
  useEffect(() => {
    markDirty("assignment", editing);
    return () => markDirty("assignment", false);
  }, [editing, markDirty]);
  if (!workspace) return null;
  return (
    <section className={panelClass}>
      <h2 className="font-semibold">Assignment brief</h2>
      <BriefContext plans={ctx.data.inheritedBriefs ?? []} />
      <p className="whitespace-pre-wrap text-sm">{workspace.brief || "No brief yet."}</p>
      <div className="flex flex-wrap gap-2">
        <Link className={primaryClass} href="/studio/content/storylets">
          Write storylets
        </Link>
        <Link className={buttonClass} href="/studio/content/narrative">
          Open narrative map
        </Link>
        <Link className={buttonClass} href="/studio/content/review">
          Review & test
        </Link>
        <button disabled={!ctx.canEdit} className={buttonClass} onClick={() => setEditing(true)}>
          Edit assignment
        </button>
      </div>
      {editing ? <EditAssignment ctx={ctx} workspace={workspace} onClose={() => setEditing(false)} /> : null}
    </section>
  );
}

function ContentTeam({ ctx }: { ctx: StudioCtx }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("writer");
  if (!ctx.actor.admin) return null;
  return (
    <section className={panelClass}>
      <h2 className="font-semibold">Content team</h2>
      <p className="text-sm text-slate-500">
        Add an existing game account. Tester access alone does not grant authoring rights.
      </p>
      <div className="flex flex-wrap gap-2">
        <input
          aria-label="Member email"
          className={inputClass}
          type="email"
          placeholder="Account email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <select
          aria-label="Studio role"
          className={inputClass}
          value={role}
          onChange={(event) => setRole(event.target.value)}
        >
          {["writer", "lead", "reviewer", "publisher"].map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
        <button
          className={buttonClass}
          disabled={ctx.busy || !email.trim()}
          onClick={() => void ctx.act("member", { email, role })}
        >
          Add or update member
        </button>
      </div>
      <ul className="text-sm">
        {ctx.members.map((member) => (
          <li key={member.user_id}>
            {member.display_name} · {member.role}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function WorkScreen({ ctx }: { ctx: StudioCtx }) {
  return (
    <>
      <AssignmentList ctx={ctx} />
      <CreateAssignment ctx={ctx} />
      <AssignmentBrief ctx={ctx} />
      <ContentTeam ctx={ctx} />
    </>
  );
}
