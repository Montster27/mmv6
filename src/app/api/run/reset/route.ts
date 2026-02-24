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

  const { data: dailyState } = await supabaseServer
    .from("daily_states")
    .select("day_index,replay_intention")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  await supabaseServer.from("storylet_runs").delete().eq("user_id", userId);
  await supabaseServer.from("reflections").delete().eq("user_id", userId);
  await supabaseServer.from("micro_task_runs").delete().eq("user_id", userId);
  await supabaseServer.from("time_allocations").delete().eq("user_id", userId);
  await supabaseServer.from("daily_tensions").delete().eq("user_id", userId);
  await supabaseServer.from("skill_bank").delete().eq("user_id", userId);
  await supabaseServer.from("daily_posture").delete().eq("user_id", userId);
  await supabaseServer.from("skill_point_allocations").delete().eq("user_id", userId);
  await supabaseServer.from("arc_instances").delete().eq("user_id", userId);
  await supabaseServer.from("arc_offers").delete().eq("user_id", userId);
  await supabaseServer.from("player_dispositions").delete().eq("user_id", userId);
  await supabaseServer.from("choice_log").delete().eq("user_id", userId);
  await supabaseServer.from("chapter_summaries").delete().eq("user_id", userId);
  await supabaseServer.from("player_day_state").delete().eq("user_id", userId);
  await supabaseServer.from("events").delete().eq("user_id", userId);
  await supabaseServer.from("user_anomalies").delete().eq("user_id", userId);
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
      life_pressure_state: {},
      energy_level: "high",
      money_band: "okay",
      skill_flags: {},
      npc_memory: {},
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

  return NextResponse.json({ ok: true });
}
