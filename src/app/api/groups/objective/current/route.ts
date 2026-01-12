import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase/server";
import { weekKey } from "@/core/time/weekKey";

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

async function fetchMembership(userId: string) {
  const { data } = await supabaseServer
    .from("group_members")
    .select("group_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  return data?.group_id ?? null;
}

export async function GET(request: Request) {
  const user = await ensureAuthed(request);
  if (!user) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const groupId = await fetchMembership(user.id);
  if (!groupId) return NextResponse.json({ error: "No group" }, { status: 404 });

  const key = weekKey();

  const { data: existing } = await supabaseServer
    .from("group_objective_weeks")
    .select("id,group_id,week_key,objective_type,target,progress,completed,created_at,updated_at")
    .eq("group_id", groupId)
    .eq("week_key", key)
    .limit(1)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ objective: existing });
  }

  const { data: created, error } = await supabaseServer
    .from("group_objective_weeks")
    .insert({
      group_id: groupId,
      week_key: key,
      objective_type: "stabilize_v1",
      target: 100,
      progress: 0,
      completed: false,
    })
    .select("id,group_id,week_key,objective_type,target,progress,completed,created_at,updated_at")
    .maybeSingle();

  if (error) {
    console.error("Failed to create objective row", error);
    return NextResponse.json({ error: "Failed to load objective" }, { status: 500 });
  }

  return NextResponse.json({ objective: created });
}
