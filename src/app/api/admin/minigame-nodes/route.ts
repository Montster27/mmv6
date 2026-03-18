import { NextResponse } from "next/server";

import { getAdminClient } from "@/lib/supabaseAdmin";
import { canAccessContentStudio } from "@/lib/adminAuthServer";
import { supabaseServer } from "@/lib/supabase/server";

async function getUserFromToken(token?: string) {
  if (!token) return null;
  const { data, error } = await supabaseServer.auth.getUser(token);
  if (error) {
    console.error("Failed to verify user token", error);
    return null;
  }
  return data.user;
}

async function ensureContentStudioAccess(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : undefined;
  const user = await getUserFromToken(token);
  if (!user) {
    return null;
  }
  const ok = await canAccessContentStudio(user);
  if (!ok) {
    return null;
  }
  return user;
}

export async function GET(request: Request) {
  const user = await ensureContentStudioAccess(request);
  if (!user) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const arcId = searchParams.get("arc_id");

  const admin = getAdminClient();
  let query = admin
    .from("minigame_nodes")
    .select("id,key,title,description,game_type,arc_id,order_index,due_offset_days,trigger_condition,outcomes,is_active,created_at,updated_at")
    .order("order_index", { ascending: true });

  if (arcId) {
    query = query.eq("arc_id", arcId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to list minigame nodes", error);
    return NextResponse.json({ error: "Failed to list minigame nodes" }, { status: 500 });
  }

  return NextResponse.json({ minigameNodes: data ?? [] });
}

export async function POST(request: Request) {
  const user = await ensureContentStudioAccess(request);
  if (!user) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const payload = await request.json();
  const key = (payload.key ?? "").trim();
  const title = (payload.title ?? "").trim();
  const game_type = (payload.game_type ?? "caps").trim();

  if (!key) return NextResponse.json({ error: "key is required" }, { status: 400 });
  if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });
  if (!game_type) return NextResponse.json({ error: "game_type is required" }, { status: 400 });

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("minigame_nodes")
    .insert({
      key,
      title,
      description: payload.description ?? "",
      game_type,
      arc_id: payload.arc_id ?? null,
      order_index: payload.order_index ?? 0,
      due_offset_days: payload.due_offset_days ?? 0,
      trigger_condition: payload.trigger_condition ?? null,
      outcomes: payload.outcomes ?? {
        win: { deltas: {}, next_step_key: null, reaction_text: "" },
        lose: { deltas: {}, next_step_key: null, reaction_text: "" },
        skip: { deltas: {}, next_step_key: null, reaction_text: "" },
      },
      is_active: payload.is_active ?? true,
    })
    .select("id,key,title,description,game_type,arc_id,order_index,due_offset_days,trigger_condition,outcomes,is_active,created_at,updated_at")
    .maybeSingle();

  if (error) {
    console.error("Failed to create minigame node", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ minigameNode: data });
}
