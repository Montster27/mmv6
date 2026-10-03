import { NextResponse } from "next/server";
import { supabaseServer as db } from "@/lib/supabase/server";
import { activeContext, failure, handleStudioCommand, studioActor, workspaceContext } from "@/lib/contentStudio/server";
import { rebaseConflicts, recordId, runStudioScenarios, validateManifest } from "@/core/studio/manifest";

export async function GET(request: Request) {
  try {
    const actor = await studioActor(request);
    const workspaceId = new URL(request.url).searchParams.get("workspace");
    const [workspaces, members, releases, active] = await Promise.all([
      db.from("studio_workspaces").select("*").order("updated_at", { ascending: false }),
      db.from("studio_members").select("user_id,role,display_name"),
      db.from("studio_releases").select("id,title,created_at,source_workspace_id,runtime_version").order("created_at", { ascending: false }),
      activeContext(),
    ]);
    if (workspaces.error || members.error || releases.error) throw new Error("Unable to load Studio");
    const context = workspaceId ? await workspaceContext(workspaceId) : null;
    const events = workspaceId ? await db.from("studio_events").select("*").eq("workspace_id", workspaceId).order("id", { ascending: false }).limit(100) : null;
    const manifest = context?.manifest ?? active.manifest;
    return NextResponse.json({ actor, workspaces: workspaces.data, members: members.data, releases: releases.data,
      activeReleaseId: active.release.id, manifest, workspace: context?.workspace ?? null,
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
    if (!["create", "meta", "save", "submit", "approve", "changes", "withdraw", "rebase", "publish", "activate", "comment", "member"].includes(action)) return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    return NextResponse.json(await handleStudioCommand(actor, action, payload));
  } catch (error) { return failure(error); }
}
