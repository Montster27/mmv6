import "server-only";
import { assertImpactAcknowledged, planningImpact } from "@/core/studio/planning";
import { NextResponse } from "next/server";
import { supabaseServer as db } from "@/lib/supabase/server";
import { isUserAdmin } from "@/lib/adminAuthServer";
import { normalizeManifest, overlayManifest, recordId, rebaseConflicts, runStudioScenarios, validateManifest } from "@/core/studio/manifest";
import { validateStoryletIssues } from "@/core/validation/storyletValidation";
import type { StudioActor, StudioChange, StudioKind, StudioManifest, StudioRecord, StudioWorkspace } from "@/types/studio";

export class StudioError extends Error { constructor(message: string, public status = 400) { super(message); } }
export function failure(error: unknown) {
  return NextResponse.json({ error: error instanceof Error ? error.message : "Studio request failed" }, { status: error instanceof StudioError ? error.status : 500 });
}
export async function studioActor(request: Request): Promise<StudioActor> {
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) throw new StudioError("Sign in to use Content Studio.", 401);
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) throw new StudioError("Session expired. Sign in again.", 401);
  const admin = await isUserAdmin(data.user);
  const membership = await db.from("studio_members").select("role").eq("user_id", data.user.id).maybeSingle();
  if (!admin && !membership.data) throw new StudioError("A Studio administrator must add you to the content team.", 403);
  return { id: data.user.id, email: data.user.email ?? null, admin, role: membership.data?.role ?? "publisher" };
}
export async function workspaceContext(id: string) {
  const { data: workspace, error } = await db.from("studio_workspaces").select("*").eq("id", id).single();
  if (error || !workspace) throw new StudioError("Workspace not found", 404);
  const [release, changes] = await Promise.all([
    db.from("studio_releases").select("manifest").eq("id", workspace.base_release_id).single(),
    db.from("studio_changes").select("kind,object_id,payload").eq("workspace_id", id),
  ]);
  if (release.error || changes.error) throw new StudioError("Could not load workspace baseline", 500);
  const base = normalizeManifest(release.data!.manifest);
  return { workspace: workspace as StudioWorkspace, base, changes: (changes.data ?? []) as StudioChange[], manifest: overlayManifest(base, (changes.data ?? []) as StudioChange[]) };
}
export async function activeContext() {
  const active = await db.from("studio_active_release").select("release_id").single();
  if (active.error) throw new StudioError("Studio migration is not available", 503);
  const release = await db.from("studio_releases").select("*").eq("id", active.data!.release_id).single();
  if (release.error) throw new StudioError("Release unavailable", 503);
  return { release: release.data, manifest: normalizeManifest(release.data.manifest) };
}
export async function command(actor: StudioActor, action: string, payload: Record<string, unknown>) {
  const { data, error } = await db.rpc("studio_command", { p_actor: actor.id, p_admin: actor.admin, p_action: action, p_data: payload });
  if (error) throw new StudioError(error.message, error.code === "40001" ? 409 : error.code === "42501" ? 403 : 400);
  return data;
}
export function assertManifest(manifest: StudioManifest) {
  const errors = validateManifest(manifest).filter((issue) => issue.severity === "error");
  const tests = runStudioScenarios(manifest);
  if (errors.length || tests.some((test) => !test.passed)) throw new StudioError(
    [...errors.slice(0, 8).map((issue) => `${issue.objectId}: ${issue.message}`), ...tests.filter((test) => !test.passed).map((test) => `${test.title}: ${test.failures.join(" ")}`)].join("\n"));
}
export async function handleStudioCommand(actor: StudioActor, action: string, payload: Record<string, unknown>) {
  if ((action === "create" || action === "meta") && payload.plan_id) {
    const manifest = action === "create" ? (await activeContext()).manifest : (await workspaceContext(String(payload.workspace_id))).manifest;
    if (!manifest.plans.some((plan) => recordId(plan) === payload.plan_id)) throw new StudioError("The selected plan is not in this baseline. Publish the plan first, or choose a current plan.", 409);
  }
  if (action === "member" && payload.email) {
    if (!actor.admin) throw new StudioError("Administrator required", 403);
    const lookup = await db.from("profiles").select("id,email").eq("email", String(payload.email).trim().toLowerCase()).maybeSingle();
    if (!lookup.data) throw new StudioError("No existing account with that email. Ask the contributor to create an account first.");
    payload.user_id = lookup.data.id;
    payload.display_name = lookup.data.email;
  }
  if (["submit", "approve", "publish", "rebase"].includes(action)) {
    const context = await workspaceContext(String(payload.workspace_id));
    if (context.workspace.revision !== Number(payload.revision)) throw new StudioError("Workspace changed. Reload and compare before continuing.", 409);
    if (action === "rebase") {
      const current = await activeContext();
      const impacts = planningImpact(context.base, current.manifest, context.changes, context.workspace.plan_id);
      try { assertImpactAcknowledged(impacts, current.release.id, payload.release_id, payload.acknowledged_impacts); }
      catch (error) { throw new StudioError(error instanceof Error ? error.message : "Review changed agreements before rebasing.", 409); }
      payload.impact_review = impacts.map(({ id, fields, path }) => ({ id, fields, path }));
      const conflicts = rebaseConflicts(context.base, current.manifest, context.changes);
      const resolutions = payload.resolutions as Record<string, string> | undefined;
      if (conflicts.length && (payload.release_id !== current.release.id || !resolutions || conflicts.some((id) => !["draft", "released"].includes(resolutions[id])))) {
        throw new StudioError(`Overlapping edits need review: ${conflicts.join(", ")}. Compare each version below and choose what to keep.`, 409);
      }
      // Only server-detected conflicts may drop a draft change; never trust arbitrary identities.
      payload.discard_changes = conflicts.filter((id) => resolutions?.[id] === "released").map((id) => {
        const separator = id.indexOf(":"); return { kind: id.slice(0, separator), object_id: id.slice(separator + 1) };
      });
      payload.release_id = current.release.id;
    } else {
      if (context.workspace.plan_id && !context.manifest.plans.some((plan) => recordId(plan) === context.workspace.plan_id)) throw new StudioError("The assignment plan was removed. Choose a current plan before review.");
      assertManifest(context.manifest);
      payload.validation = { runtime_version: "narrative-offers-v1", tested_revision: context.workspace.revision, issues: validateManifest(context.manifest), tests: runStudioScenarios(context.manifest) };
      if (action === "publish" && context.changes.some((change) => ["storylets", "tracks", "consequences"].includes(change.kind)) && context.manifest.scenarios.length === 0) throw new StudioError("Add and pass at least one saved offer scenario before publication.");
    }
  }
  return command(actor, action, payload);
}

export async function contentRead(request: Request, kind: StudioKind): Promise<StudioRecord[]> {
  await studioActor(request);
  const workspaceId = request.headers.get("x-studio-workspace");
  if (workspaceId) {
    const context = await workspaceContext(workspaceId);
    return context.manifest[kind].map((row) => ({ ...row, _studio_revision: context.workspace.revision }));
  }
  return (await activeContext()).manifest[kind];
}
export async function contentWrite(request: Request, kind: StudioKind, objectId?: string, remove = false) {
  const actor = await studioActor(request);
  const workspaceId = request.headers.get("x-studio-workspace");
  if (!workspaceId) throw new StudioError("Open a draft workspace in My work before editing content.", 409);
  const context = await workspaceContext(workspaceId);
  const body = remove ? {} : await request.json() as StudioRecord;
  const id = objectId ?? (kind === "consequences" ? String(body.key ?? "") : crypto.randomUUID());
  if (!id) throw new StudioError("Content identity required");
  const existing = context.manifest[kind].find((row) => recordId(row) === id);
  if (!objectId && existing) throw new StudioError("This identity already exists. Open it to edit.", 409);
  if (objectId && !existing) throw new StudioError("Content not found", 404);
  const revision = remove ? Number(request.headers.get("x-studio-revision")) : Number(objectId ? body._studio_revision : request.headers.get("x-studio-revision"));
  if (!Number.isInteger(revision) || revision < 1) throw new StudioError("Reload this workspace before saving.", 409);
  const defaults: StudioRecord = kind === "tracks" ? { category: "life_stream", chapter: "one", is_enabled: true, tags: [] }
    : kind === "storylets" ? { is_active: false, tags: [], requirements: {}, weight: 1 } : {};
  const clean: StudioRecord = { ...defaults, ...(existing ? {} : { created_at: new Date().toISOString() }), ...existing, ...body, ...(kind === "consequences" ? { key: id } : { id }), updated_at: new Date().toISOString() };
  delete clean._studio_revision;
  if (kind === "storylets" && !remove) {
    const errors = validateStoryletIssues(clean).errors;
    if (errors.length) throw new StudioError(errors.map((error) => `${error.path}: ${error.message}`).join("\n"));
  }
  const result = await command(actor, "save", { workspace_id: workspaceId, revision, kind, object_id: id, payload: remove ? null : clean });
  return { ok: true, id, revision: result.revision, record: remove ? null : { ...clean, _studio_revision: result.revision } };
}
