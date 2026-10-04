import { inheritedBriefs, planningImpact } from "@/core/studio/planning";
import { NextResponse } from "next/server";
import { supabaseServer as db } from "@/lib/supabase/server";
import { activeContext, failure, handleStudioCommand, studioActor, workspaceContext } from "@/lib/contentStudio/server";
import { rebaseConflicts, recordId, runStudioScenarios, validateManifest } from "@/core/studio/manifest";

export async function GET(request: Request) {
  try {
    const actor = await studioActor(request);
    const workspaceId = new URL(request.url).searchParams.get("workspace");
    const releaseColumns = "id,title,created_at,source_workspace_id,runtime_version";
    const [workspaces, members, newReleases, active, settings] = await Promise.all([
      db.from("studio_workspaces").select("*").order("updated_at", { ascending: false }),
      db.from("studio_members").select("user_id,role,display_name"),
      db.from("studio_releases").select(`${releaseColumns},self_reviewed`).order("created_at", { ascending: false }),
      activeContext(),
      db.from("studio_settings").select("solo_mode").maybeSingle(),
    ]);
    // Databases that have not yet applied the solo-mode migration lack `self_reviewed` and
    // `studio_settings`. Studio still loads; solo mode simply stays off until it is applied.
    const releases = newReleases.error
      ? await db.from("studio_releases").select(releaseColumns).order("created_at", { ascending: false })
      : newReleases;
    const failed = [["workspaces", workspaces.error], ["members", members.error], ["releases", releases.error]].find(([, e]) => e);
    if (failed) throw new Error(`Unable to load Studio (${failed[0]}: ${(failed[1] as { message?: string }).message ?? "database error"}). Check that the Studio migrations have been applied.`);
    const context = workspaceId ? await workspaceContext(workspaceId) : null;
    const events = workspaceId ? await db.from("studio_events").select("*").eq("workspace_id", workspaceId).order("id", { ascending: false }).limit(100) : null;
    const manifest = context?.manifest ?? active.manifest;
    return NextResponse.json({ actor, workspaces: workspaces.data, members: members.data, releases: releases.data,
      activeReleaseId: active.release.id, soloMode: settings.data?.solo_mode === true, activePlans: active.manifest.plans, manifest,
      inheritedBriefs: context ? inheritedBriefs(manifest, context.workspace.plan_id) : [],
      impacts: context ? planningImpact(context.base, active.manifest, context.changes, context.workspace.plan_id) : [], workspace: context?.workspace ?? null,
      conflicts: context ? rebaseConflicts(context.base, active.manifest, context.changes).map((id) => {
        const change = context.changes.find((item) => `${item.kind}:${item.object_id}` === id)!;
        return { id, draft: change.payload, released: active.manifest[change.kind].find((row) => recordId(row) === change.object_id) ?? null };
      }) : [],
      base: context?.base ?? null, changes: context?.changes ?? [], events: events?.data ?? [],
      issues: validateManifest(manifest), tests: runStudioScenarios(manifest) });
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try {
    const actor = await studioActor(request);
    const { action, ...payload } = await request.json();
    if (!["create", "meta", "save", "pilot", "submit", "approve", "changes", "withdraw", "rebase", "publish", "activate", "comment", "member", "solo", "clear", "starter", "fresh"].includes(action)) return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    return NextResponse.json(await handleStudioCommand(actor, action, payload));
  } catch (error) { return failure(error); }
}
