import { NextResponse } from "next/server";
import { supabaseServer as db } from "@/lib/supabase/server";
import { failure, studioActor, handleStudioCommand } from "@/lib/contentStudio/server";
export async function GET(request: Request) {
  try {
    await studioActor(request);
    const { data, error } = await db.from("studio_releases").select("id,title,created_at,created_by").order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ versions: (data ?? []).map((row) => ({ version_id: row.id, state: "published", note: row.title, author: row.created_by, created_at: row.created_at })) });
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try {
    const actor = await studioActor(request);
    const result = await handleStudioCommand(actor, "publish", { workspace_id: request.headers.get("x-studio-workspace"), revision: Number(request.headers.get("x-studio-revision")) });
    return NextResponse.json({ version_id: result.release_id });
  } catch (error) { return failure(error); }
}
