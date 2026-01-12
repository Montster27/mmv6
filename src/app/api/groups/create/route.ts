import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase/server";

const JOIN_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateJoinCode(length = 7) {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    const idx = Math.floor(Math.random() * JOIN_CODE_CHARS.length);
    out += JOIN_CODE_CHARS[idx];
  }
  return out;
}

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
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Missing name" }, { status: 400 });
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

  let attempts = 0;
  while (attempts < 5) {
    attempts += 1;
    const joinCode = generateJoinCode();

    const { data: group, error: groupError } = await supabaseServer
      .from("groups")
      .insert({
        name,
        join_code: joinCode,
        created_by: user.id,
      })
      .select("id,name,join_code,created_by,created_at")
      .maybeSingle();

    if (groupError) {
      if ((groupError as { code?: string }).code === "23505") {
        continue;
      }
      console.error("Failed to create group", groupError);
      return NextResponse.json({ error: "Failed to create group" }, { status: 500 });
    }

    await supabaseServer.from("group_members").insert({
      group_id: group?.id,
      user_id: user.id,
      role: "owner",
    });

    insertEvent(user.id, "group_created", { group_id: group?.id }).catch(() => {});

    return NextResponse.json({ group });
  }

  return NextResponse.json({ error: "Failed to create group" }, { status: 500 });
}
