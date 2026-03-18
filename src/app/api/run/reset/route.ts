import { NextResponse } from "next/server";

import { toLegacyResourceUpdates } from "@/core/resources/resourceMap";
import { supabaseServer } from "@/lib/supabase/server";

function utcToday(): string {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  )
    .toISOString()
    .slice(0, 10);
}

async function getUserFromToken(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : undefined;
  if (!token) return null;
  const { data, error } = await supabaseServer.auth.getUser(token);
  if (error) {
    console.error("Failed to verify user token", error);
    return null;
  }
  return data.user;
}

export async function POST(request: Request) {
  const user = await getUserFromToken(request);
  if (!user) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const userId = user.id;
  const today = utcToday();
  const now = new Date().toISOString();

  // Determine the currently active season so we can sync user_seasons in one
  // shot. This prevents performSeasonReset from firing on the first page load
  // after a reset and overwriting day_index back to 0.
  const { data: currentSeasonRow } = await supabaseServer
    .from("seasons")
    .select("season_index")
    .lte("starts_at", today)
    .gte("ends_at", today)
    .order("season_index", { ascending: false })
    .limit(1)
    .maybeSingle();
  const currentSeasonIndex = currentSeasonRow?.season_index ?? 1;

  const { data: dailyState } = await supabaseServer
    .from("daily_states")
    .select("day_index,replay_intention")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  // Run all deletes in parallel — no FK CASCADE DELETE between these tables.
  // (choice_log.arc_instance_id has ON DELETE SET NULL, so both can run in parallel.)
  await Promise.all([
    supabaseServer.from("storylet_runs").delete().eq("user_id", userId),
    supabaseServer.from("reflections").delete().eq("user_id", userId),
    supabaseServer.from("time_allocations").delete().eq("user_id", userId),
    supabaseServer.from("daily_tensions").delete().eq("user_id", userId),
    supabaseServer.from("skill_bank").delete().eq("user_id", userId),
    supabaseServer.from("daily_posture").delete().eq("user_id", userId),
    supabaseServer.from("skill_point_allocations").delete().eq("user_id", userId),
    supabaseServer.from("arc_instances").delete().eq("user_id", userId),
    supabaseServer.from("arc_offers").delete().eq("user_id", userId),
    supabaseServer.from("player_dispositions").delete().eq("user_id", userId),
    supabaseServer.from("choice_log").delete().eq("user_id", userId),
    supabaseServer.from("chapter_summaries").delete().eq("user_id", userId),
    supabaseServer.from("player_day_state").delete().eq("user_id", userId),
    supabaseServer.from("events").delete().eq("user_id", userId),
    supabaseServer.from("user_anomalies").delete().eq("user_id", userId),
    supabaseServer
      .from("social_actions")
      .delete()
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`),
  ]);

  await supabaseServer
    .from("daily_states")
    .update({
      day_index: 1,
      energy: 100,
      stress: 0,
      vectors: {},
      life_pressure_state: {},
      energy_level: "high",
      money_band: "okay",
      skill_flags: {},
      npc_memory: {},
      relationships: {},
      expired_opportunities: [],
      replay_intention: dailyState?.replay_intention ?? {},
      // TODO(arc-one): decide whether replay intention persists beyond Arc One.
      arc_one_reflection_done: false,
      start_date: today,
      last_day_completed: null,
      last_day_index_completed: null,
      updated_at: now,
    })
    .eq("user_id", userId);

  await supabaseServer.from("player_day_state").insert({
    user_id: userId,
    day_index: 1,
    energy: 100,
    stress: 0,
    ...toLegacyResourceUpdates({
      cashOnHand: 0,
      knowledge: 0,
      socialLeverage: 0,
      physicalResilience: 50,
    }),
    updated_at: now,
  });

  // Sync user_seasons to the current active season so that getOrCreateDailyRun
  // does NOT trigger performSeasonReset on the first load after a reset.
  // performSeasonReset resets daily_states.day_index → 0, which would undo the
  // day_index:1 we just set above.
  await supabaseServer
    .from("user_seasons")
    .upsert(
      {
        user_id: userId,
        current_season_index: currentSeasonIndex,
        last_seen_season_index: currentSeasonIndex,
        last_reset_at: now,
        updated_at: now,
      },
      { onConflict: "user_id" }
    );

  return NextResponse.json({ ok: true });
}
