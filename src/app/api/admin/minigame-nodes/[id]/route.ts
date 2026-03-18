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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await ensureContentStudioAccess(request);
  if (!user) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const { id } = await params;
  const payload = await request.json();

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("minigame_nodes")
    .update({
      title: payload.title,
      description: payload.description,
      game_type: payload.game_type,
      arc_id: payload.arc_id ?? null,
      order_index: payload.order_index,
      due_offset_days: payload.due_offset_days,
      trigger_condition: payload.trigger_condition ?? null,
      outcomes: payload.outcomes,
      is_active: payload.is_active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id,key,title,description,game_type,arc_id,order_index,due_offset_days,trigger_condition,outcomes,is_active,created_at,updated_at")
    .maybeSingle();

  if (error) {
    console.error("Failed to update minigame node", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ minigameNode: data });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await ensureContentStudioAccess(request);
  if (!user) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const { id } = await params;

  const admin = getAdminClient();
  const { error } = await admin
    .from("minigame_nodes")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Failed to delete minigame node", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
