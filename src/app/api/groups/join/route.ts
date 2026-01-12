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

  const body = await request.json();
  const joinCode =
    typeof body?.join_code === "string" ? body.join_code.trim().toUpperCase() : "";
  if (!joinCode) {
    return NextResponse.json({ error: "Missing join_code" }, { status: 400 });
  }

  const { data: existingMember } = await supabaseServer
    .from("group_members")
    .select("id,group_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (existingMember) {
    return NextResponse.json({ error: "User already in a group" }, { status: 400 });
  }

  const { data: group, error: groupError } = await supabaseServer
    .from("groups")
    .select("id,name,join_code,created_by,created_at")
    .eq("join_code", joinCode)
    .limit(1)
    .maybeSingle();

  if (groupError || !group) {
    return NextResponse.json({ error: "Invalid join code" }, { status: 404 });
  }

  const { error: memberError } = await supabaseServer.from("group_members").insert({
    group_id: group.id,
    user_id: user.id,
    role: "member",
  });

  if (memberError) {
    console.error("Failed to join group", memberError);
    return NextResponse.json({ error: "Failed to join group" }, { status: 500 });
  }

  insertEvent(user.id, "group_joined", { group_id: group.id }).catch(() => {});

  return NextResponse.json({ group });
}
