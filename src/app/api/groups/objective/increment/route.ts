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

function clampProgress(value: number, target: number) {
  if (value < 0) return 0;
  if (value > target) return target;
  return value;
}

export async function POST(request: Request) {
  const user = await ensureAuthed(request);
  if (!user) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const body = await request.json();
  const delta = Number(body?.delta ?? 0);
  if (!Number.isFinite(delta) || delta === 0) {
    return NextResponse.json({ error: "Missing delta" }, { status: 400 });
  }

  const groupId = await fetchMembership(user.id);
  if (!groupId) return NextResponse.json({ skipped: true }, { status: 200 });

  const key = weekKey();

  const { data: existing } = await supabaseServer
    .from("group_objective_weeks")
    .select("id,group_id,week_key,objective_type,target,progress,completed")
    .eq("group_id", groupId)
    .eq("week_key", key)
    .limit(1)
    .maybeSingle();

  const base = existing ?? {
    id: null,
    group_id: groupId,
    week_key: key,
    objective_type: "stabilize_v1",
    target: 100,
    progress: 0,
    completed: false,
  };

  const nextProgress = clampProgress(base.progress + delta, base.target);
  const nextCompleted = base.completed || nextProgress >= base.target;

  const { data: upserted, error } = await supabaseServer
    .from("group_objective_weeks")
    .upsert(
      {
        group_id: base.group_id,
        week_key: base.week_key,
        objective_type: base.objective_type,
        target: base.target,
        progress: nextProgress,
        completed: nextCompleted,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "group_id,week_key,objective_type" }
    )
    .select("id,group_id,week_key,objective_type,target,progress,completed,created_at,updated_at")
    .maybeSingle();

  if (error) {
    console.error("Failed to update objective", error);
    return NextResponse.json({ error: "Failed to update objective" }, { status: 500 });
  }

  if (upserted && nextCompleted && !base.completed) {
    await supabaseServer.from("group_feed").insert({
      group_id: groupId,
      event_type: "objective_completed",
      actor_user_id: null,
      payload: { week_key: key, objective_type: base.objective_type },
    });
  }

  return NextResponse.json({ objective: upserted });
}
