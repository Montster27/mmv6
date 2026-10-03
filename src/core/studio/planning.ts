import { agreementReferences } from "./agreements";
import { recordId } from "./manifest";
import { STUDIO_KINDS, type StudioChange, type StudioManifest, type StudioRecord } from "@/types/studio";

export type PlanningImpact = {
  id: string; title: string; fields: string[]; path: string[];
  before: StudioRecord | null; after: StudioRecord | null;
};
const ids = (value: unknown): string[] => Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
function stable(value: unknown): string {
  if (Array.isArray(value)) return JSON.stringify(value.map(stable));
  if (value && typeof value === "object") return JSON.stringify(Object.entries(value).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => [k,stable(v)]));
  return JSON.stringify(value) ?? "undefined";
}
function references(row: StudioRecord): string[] {
  return [...agreementReferences(row), ...ids(row.dependencies), ...ids(row.storylet_ids), ...(typeof row.parent_id === "string" ? [row.parent_id] : [])];
}
/** Root-to-leaf briefs, preserving attribution rather than flattening conflicting prose. */
export function inheritedBriefs(manifest: StudioManifest, planId: string | null): StudioRecord[] {
  const byId = new Map(manifest.plans.map((row) => [recordId(row), row]));
  const seen = new Set<string>(); const result: StudioRecord[] = [];
  let id = planId;
  while (id && !seen.has(id)) {
    seen.add(id); const plan = byId.get(id); if (!plan) break;
    result.unshift(plan); id = typeof plan.parent_id === "string" ? plan.parent_id : null;
  }
  return result;
}
/** Find changed declared dependencies, including deleted definitions and transitive parents.
 * Uses both baselines so removal of a link cannot erase the reason an author needs review.
 */
export function planningImpact(base: StudioManifest, current: StudioManifest, changes: StudioChange[], planId: string | null): PlanningImpact[] {
  const rows = (manifest: StudioManifest) => STUDIO_KINDS.flatMap((kind) => manifest[kind].map((row) => ({ kind, row })));
  const oldRows = rows(base), newRows = rows(current);
  const allRows = [...oldRows, ...newRows, ...changes.filter((c) => c.payload).map((c) => ({ kind: c.kind, row: c.payload! }))];
  const graph = new Map<string, Set<string>>();
  for (const { row } of allRows) {
    const links = graph.get(recordId(row)) ?? new Set<string>();
    references(row).forEach((id) => links.add(id)); graph.set(recordId(row), links);
  }
  const roots = new Set(changes.map((c) => c.object_id));
  if (planId) roots.add(planId);
  // Editing a storylet also depends on the brief of each arc that owns/references it.
  for (const { kind, row } of allRows) if (kind === "plans" && ids(row.storylet_ids).some((id) => roots.has(id))) roots.add(recordId(row));
  const paths = new Map<string, string[]>();
  const queue = [...roots].map((id) => [id]);
  for (let i = 0; i < queue.length; i++) {
    const path = queue[i]; const id = path[path.length - 1];
    if (paths.has(id)) continue;
    paths.set(id, path);
    for (const dep of graph.get(id) ?? []) if (!paths.has(dep)) queue.push([...path, dep]);
  }
  const before = new Map(oldRows.map(({ kind, row }) => [`${kind}:${recordId(row)}`, row]));
  const after = new Map(newRows.map(({ kind, row }) => [`${kind}:${recordId(row)}`, row]));
  const result: PlanningImpact[] = [];
  for (const identity of new Set([...before.keys(), ...after.keys()])) {
    const prev = before.get(identity) ?? null, next = after.get(identity) ?? null;
    const id = recordId(next ?? prev!); const path = paths.get(id);
    if (!path) continue;
    const fields = [...new Set([...Object.keys(prev ?? {}), ...Object.keys(next ?? {})])]
      .filter((key) => !["updated_at", "created_at", "updated_by", "_studio_revision"].includes(key) && stable(prev?.[key]) !== stable(next?.[key]));
    if (fields.length) result.push({ id: identity, title: String(next?.title ?? prev?.title ?? id), fields, path, before: prev, after: next });
  }
  return result;
}

export function assertImpactAcknowledged(impacts: PlanningImpact[], activeReleaseId: string, comparedReleaseId: unknown, acknowledged: unknown): void {
  if (comparedReleaseId !== activeReleaseId) throw new Error("The release changed. Reload and compare the current release before rebasing.");
  const reviewed = new Set(ids(acknowledged));
  const missing = impacts.filter((impact) => !reviewed.has(impact.id));
  if (missing.length) throw new Error(`Review changed agreements before rebasing: ${missing.map((impact) => impact.title).join(", ")}.`);
}
