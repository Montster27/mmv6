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

export async function POST(request: Request) {
  if (process.env.TEST_MODE_SERVER !== "1") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const user = await ensureAuthed(request);
  if (!user) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const { data: daily, error } = await supabaseServer
    .from("daily_states")
    .select("id,day_index")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (error || !daily) {
    console.error("Failed to load daily state", error);
    return NextResponse.json({ error: "Daily state not found" }, { status: 404 });
  }

  const nextDay = (daily.day_index ?? 0) + 1;
  const now = new Date().toISOString();

  const { error: updateError } = await supabaseServer
    .from("daily_states")
    .update({
      day_index: nextDay,
      energy: 100,
      stress: 0,
      vectors: {},
      last_day_completed: null,
      last_day_index_completed: null,
      updated_at: now,
    })
    .eq("user_id", user.id);

  if (updateError) {
    console.error("Failed to advance day", updateError);
    return NextResponse.json({ error: "Failed to advance day" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, day_index: nextDay });
}
