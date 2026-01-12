import { NextResponse } from "next/server";

import { isEmailAllowed } from "@/lib/adminAuth";
import { supabaseServer } from "@/lib/supabase/server";

function utcToday(): string {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  )
    .toISOString()
    .slice(0, 10);
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

async function ensureAdmin(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : undefined;
  const user = await getUserFromToken(token);
  if (!user || !isEmailAllowed(user.email)) {
    return null;
  }
  return user;
}

async function getCurrentSeasonIndex(): Promise<number | null> {
  const today = utcToday();
  const { data, error } = await supabaseServer
    .from("seasons")
    .select("season_index,starts_at,ends_at")
    .lte("starts_at", today)
    .gte("ends_at", today)
    .order("season_index", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("Failed to load current season", error);
    return null;
  }
  return data?.season_index ?? null;
}

export async function POST(request: Request) {
  const admin = await ensureAdmin(request);
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const payload = await request.json();
  const userId = payload?.user_id;
  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
  }

  const today = utcToday();
  const now = new Date().toISOString();
  const currentSeasonIndex = await getCurrentSeasonIndex();

  await supabaseServer.from("storylet_runs").delete().eq("user_id", userId);
  await supabaseServer.from("reflections").delete().eq("user_id", userId);
  await supabaseServer.from("micro_task_runs").delete().eq("user_id", userId);
  await supabaseServer.from("time_allocations").delete().eq("user_id", userId);
  await supabaseServer.from("events").delete().eq("user_id", userId);
  await supabaseServer.from("user_anomalies").delete().eq("user_id", userId);
  const { data: hypothesisRows } = await supabaseServer
    .from("hypotheses")
    .select("id")
    .eq("user_id", userId);
  const hypothesisIds = hypothesisRows?.map((row) => row.id) ?? [];
  if (hypothesisIds.length > 0) {
    await supabaseServer
      .from("hypothesis_anomalies")
      .delete()
      .in("hypothesis_id", hypothesisIds);
  }
  await supabaseServer.from("hypotheses").delete().eq("user_id", userId);
  await supabaseServer.from("season_recaps").delete().eq("user_id", userId);
  await supabaseServer
    .from("social_actions")
    .delete()
    .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`);

  await supabaseServer
    .from("daily_states")
    .update({
      day_index: 1,
      energy: 100,
      stress: 0,
      vectors: {},
      start_date: today,
      last_day_completed: null,
      last_day_index_completed: null,
      updated_at: now,
    })
    .eq("user_id", userId);

  if (currentSeasonIndex) {
    await supabaseServer
      .from("user_seasons")
      .update({
        current_season_index: currentSeasonIndex,
        last_seen_season_index: currentSeasonIndex,
        last_reset_at: now,
        last_recap: {},
        updated_at: now,
      })
      .eq("user_id", userId);
  }

  return NextResponse.json({ ok: true });
}
