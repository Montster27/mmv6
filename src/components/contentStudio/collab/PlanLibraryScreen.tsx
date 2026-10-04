"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { recordId } from "@/core/studio/manifest";
import type { StudioKind, StudioRecord } from "@/types/studio";
import { AgreementEditor } from "../AgreementEditor";
import { ArcMap } from "../ArcMap";
import { ChipPicker } from "../ChipPicker";
import { StaleFormNotice } from "./StaleFormNotice";
import { buttonClass, Field, inputClass, panelClass, primaryClass, type Mode, type StudioCtx } from "./shared";

const PLAN_FIELDS: [string, string][] = [
  ["experience", "Player experience"],
  ["question", "Dramatic question"],
  ["constraints", "Required constraints"],
  ["suggestions", "Creative suggestions"],
  ["open_questions", "Open questions"],
  ["entrances", "Entrances and assumptions"],
  ["outcomes", "Possible conclusions"],
  ["miss_path", "Miss, decline, late-entry, and repair paths"],
  ["timing", "Timing and costs"],
  ["acceptance", "Acceptance paths to play"],
];
const DEFINITION_FIELDS: [string, string][] = [
  ["meaning", "Meaning / biography / agreement"],
  ["scope", "Scope and who may know"],
  ["constraints", "Constraints and allowed changes"],
  ["guidance", "Voice or implementation guidance"],
];
const PLAN_KINDS = ["direction", "plot", "strand", "arc"];
const DEFINITION_KINDS = ["fact", "npc", "location", "calendar", "skill", "resource", "rule"];

export function PlanLibraryScreen({ ctx, mode }: { ctx: StudioCtx; mode: Extract<Mode, "narrative" | "library"> }) {
  const { manifest, workspace, markDirty } = ctx;
  const kind: StudioKind = mode === "library" ? "definitions" : "plans";
  const records = manifest[kind];
  const [editing, setEditing] = useState<StudioRecord | null>(null);
  const [editRevision, setEditRevision] = useState(0);

  useEffect(() => {
    markDirty("plan", editing !== null);
    return () => markDirty("plan", false);
  }, [editing, markDirty]);

  const patch = (key: string, value: unknown) =>
    setEditing((row) => (row ? { ...row, [key]: value } : null));
  const edit = (row: StudioRecord) => {
    setEditing({ ...row });
    setEditRevision(workspace?.revision ?? 0);
  };
  function depth(row: StudioRecord): number {
    const seen = new Set<string>();
    let next = row.parent_id;
    let count = 0;
    while (typeof next === "string" && next && !seen.has(next)) {
      seen.add(next);
      count++;
      next = manifest.plans.find((plan) => recordId(plan) === next)?.parent_id;
    }
    return Math.min(count, 5);
  }
  const isApproved = editing ? (ctx.data.activePlans ?? []).some((plan) => recordId(plan) === recordId(editing)) : false;
  const fields = mode === "narrative" ? PLAN_FIELDS : DEFINITION_FIELDS;
  const latestSaved = editing ? manifest[kind].find((row) => recordId(row) === recordId(editing)) : null;

  return (
    <>
      {workspace && editing && editRevision !== workspace.revision ? (
        <StaleFormNotice
          startedAt={editRevision}
          latest={latestSaved}
          onAcknowledge={() => setEditRevision(workspace.revision)}
        />
      ) : null}
      <div className="grid gap-5 xl:grid-cols-[minmax(240px,1fr)_2fr]">
        <section className={panelClass}>
          <h2 className="font-semibold">
            {mode === "narrative" ? "Direction → plots → strands → arcs" : "Facts, people, and world agreements"}
          </h2>
          <p className="text-xs text-slate-500">
            {mode === "narrative"
              ? "This outline organizes responsibility. It does not force a player route."
              : "Shared guidance is distinct from implemented game state. New mechanics need an engine integration."}
          </p>
          <button
            className={buttonClass}
            disabled={!ctx.canEdit}
            onClick={() =>
              edit({
                id: crypto.randomUUID(),
                title: "",
                kind: mode === "narrative" ? "arc" : "fact",
                dependencies: [],
                storylet_ids: [],
              })
            }
          >
            + {mode === "narrative" ? "Plan" : "Definition"}
          </button>
          {records.length === 0 ? (
            <p className="text-sm text-slate-500">Create a draft workspace, then add the first brief.</p>
          ) : null}
          {records.map((row) => (
            <button
              key={recordId(row)}
              className="block w-full rounded border px-3 py-2 text-left hover:border-indigo-400"
              style={{ paddingLeft: 12 + depth(row) * 16 }}
              onClick={() => edit(row)}
            >
              <span className="text-xs uppercase text-slate-400">{String(row.kind ?? "")}</span>
              <p className="text-sm font-medium">{row.title || "Untitled"}</p>
            </button>
          ))}
        </section>

        <section className={panelClass}>
          {editing ? (
            <>
              {mode === "narrative" && isApproved ? (
                <Link
                  className="inline-block text-sm text-indigo-700 underline"
                  href={`/studio/content/work?plan=${encodeURIComponent(recordId(editing))}`}
                >
                  Assign work from the approved version of this plan
                </Link>
              ) : null}
              <Field label="Title" value={String(editing.title ?? "")} onChange={(value) => patch("title", value)} />
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-xs">
                  Type
                  <select
                    className={inputClass}
                    value={String(editing.kind)}
                    onChange={(event) => patch("kind", event.target.value)}
                  >
                    {(mode === "narrative" ? PLAN_KINDS : DEFINITION_KINDS).map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>
                <label className="text-xs">
                  Parent plan
                  <select
                    className={inputClass}
                    value={String(editing.parent_id ?? "")}
                    onChange={(event) => patch("parent_id", event.target.value || null)}
                  >
                    <option value="">None</option>
                    {manifest.plans
                      .filter((row) => recordId(row) !== recordId(editing))
                      .map((row) => (
                        <option key={recordId(row)} value={recordId(row)}>
                          {row.title}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
              {fields.map(([key, label]) => (
                <Field key={key} label={label} value={String(editing[key] ?? "")} onChange={(value) => patch(key, value)} multiline />
              ))}
              <AgreementEditor record={editing} manifest={manifest} patch={patch} disabled={!ctx.canEdit} />
              <ChipPicker
                label="Depends on"
                emptyText="Nothing yet. Add the facts, people or plans this relies on."
                placeholder="Search plans and shared definitions…"
                options={[...manifest.plans, ...manifest.definitions]
                  .filter((row) => recordId(row) !== recordId(editing))
                  .map((row) => ({ value: recordId(row), label: String(row.title || "Untitled"), hint: String(row.kind ?? "") }))}
                value={Array.isArray(editing.dependencies) ? (editing.dependencies as string[]) : []}
                onChange={(next) => patch("dependencies", next)}
              />
              {mode === "narrative" ? (
                <ChipPicker
                  label="Scenes in this arc"
                  emptyText="No scenes linked yet."
                  placeholder="Search scenes…"
                  options={manifest.storylets.map((row) => ({ value: recordId(row), label: String(row.title || "Untitled scene"), hint: String(row.storylet_key ?? "") }))}
                  value={Array.isArray(editing.storylet_ids) ? (editing.storylet_ids as string[]) : []}
                  onChange={(next) => patch("storylet_ids", next)}
                />
              ) : null}
              {mode === "narrative" && Array.isArray(editing.storylet_ids) && editing.storylet_ids.length > 0 ? (
                <div className="space-y-1">
                  <h3 className="text-xs font-medium text-slate-600">How the scenes in this arc connect</h3>
                  <ArcMap scenes={manifest.storylets.filter((row) => (editing.storylet_ids as string[]).includes(recordId(row)))} />
                </div>
              ) : null}
              <label className="flex gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editing.runtime_required === true}
                  onChange={(event) => patch("runtime_required", event.target.checked)}
                />
                Requires an engine capability that is not implemented yet
              </label>
              <div className="flex gap-2">
                <button
                  className={primaryClass}
                  disabled={!ctx.canEdit || ctx.busy || !String(editing.title ?? "").trim()}
                  onClick={async () => {
                    if (await ctx.act("save", { kind, object_id: recordId(editing), payload: editing, revision: editRevision })) {
                      setEditing(null);
                    }
                  }}
                >
                  Save draft
                </button>
                <button className={buttonClass} onClick={() => setEditing(null)}>
                  Close
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500">Select a plan or definition to see its brief and connections.</p>
          )}
        </section>
      </div>
    </>
  );
}
