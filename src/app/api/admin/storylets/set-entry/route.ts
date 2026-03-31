import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { canAccessContentStudio } from "@/lib/adminAuthServer";
import { supabaseServer } from "@/lib/supabase/server";

async function getUserFromToken(token?: string) {
  if (!token) return null;
  const { data, error } = await supabaseServer.auth.getUser(token);
  if (error) return null;
  return data.user;
}

/**
 * POST /api/admin/storylets/set-entry
 * Body: { storyletId: string }
 *
 * Sets the "game_entry" tag on exactly one storylet, removing it from all others.
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
  const user = await getUserFromToken(token);
  if (!user || !(await canAccessContentStudio(user))) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const body = await request.json();
  const { storyletId } = body as { storyletId?: string };
  if (!storyletId) {
    return NextResponse.json({ error: "storyletId required" }, { status: 400 });
  }

  const admin = getAdminClient();

  // 1. Remove game_entry from all storylets
  const { error: removeErr } = await admin.rpc("exec_sql", {
    query: `UPDATE public.storylets SET tags = array_remove(tags, 'game_entry') WHERE 'game_entry' = ANY(tags)`,
  }).maybeSingle();

  // Fallback: if RPC not available, do it with a select-then-update
  if (removeErr) {
    const { data: tagged } = await admin
      .from("storylets")
      .select("id,tags")
      .contains("tags", ["game_entry"]);
    if (tagged) {
      for (const row of tagged) {
        await admin
          .from("storylets")
          .update({ tags: (row.tags as string[]).filter((t: string) => t !== "game_entry") })
          .eq("id", row.id);
      }
    }
  }

  // 2. Add game_entry to the target storylet
  const { data: target, error: fetchErr } = await admin
    .from("storylets")
    .select("id,tags")
    .eq("id", storyletId)
    .single();

  if (fetchErr || !target) {
    return NextResponse.json({ error: "Storylet not found" }, { status: 404 });
  }

  const currentTags = (target.tags as string[]) ?? [];
  if (!currentTags.includes("game_entry")) {
    const { error: updateErr } = await admin
      .from("storylets")
      .update({ tags: [...currentTags, "game_entry"] })
      .eq("id", storyletId);
    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
