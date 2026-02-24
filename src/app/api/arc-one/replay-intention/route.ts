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

const INTENT_KEYS = new Set([
  "risk_bias",
  "people_bias",
  "confront_bias",
  "achievement_bias",
]);

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : undefined;
  const user = await getUserFromToken(token);
  if (!user) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { intention } = payload as { intention?: string };
  if (!intention || !INTENT_KEYS.has(intention)) {
    return NextResponse.json({ error: "Invalid intention" }, { status: 400 });
  }

  const replayIntention = {
    risk_bias: false,
    people_bias: false,
    confront_bias: false,
    achievement_bias: false,
    [intention]: true,
  };

  const { error } = await supabaseServer
    .from("daily_states")
    .update({
      replay_intention: replayIntention,
      arc_one_reflection_done: true,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to update replay intention", error);
    return NextResponse.json({ error: "Failed to save intention" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
