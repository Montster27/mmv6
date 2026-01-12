import { NextResponse } from "next/server";

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

async function ensureAuthed(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : undefined;
  return getUserFromToken(token);
}

async function insertEvent(userId: string, eventType: string, payload: Record<string, unknown>) {
  await supabaseServer.from("events").insert({
    user_id: userId,
    event_type: eventType,
    payload,
  });
}

export async function POST(request: Request) {
  const user = await ensureAuthed(request);
  if (!user) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const { data: member } = await supabaseServer
    .from("group_members")
    .select("id,group_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!member) {
    return NextResponse.json({ error: "Not in a group" }, { status: 404 });
  }

  const { error } = await supabaseServer
    .from("group_members")
    .delete()
    .eq("id", member.id);

  if (error) {
    console.error("Failed to leave group", error);
    return NextResponse.json({ error: "Failed to leave group" }, { status: 500 });
  }

  insertEvent(user.id, "group_left", { group_id: member.group_id }).catch(() => {});

  return NextResponse.json({ ok: true });
}
