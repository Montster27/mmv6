import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import type { RoutineActivity, PlayerScheduleSelection } from "@/types/routine";
import { commitWeek, runWeek } from "@/core/routine/weeklyTick";

async function getUserFromToken(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : undefined;
  if (!token) return null;
  const { data, error } = await supabaseServer.auth.getUser(token);
  if (error) return null;
  return data.user;
}

/**
 * POST /api/routine/commit
 *
 * Body: { week_start: number, activity_keys: string[] }
 *
 * Validates the schedule, persists it, and runs the first tick.
 */
export async function POST(request: Request) {
  const user = await getUserFromToken(request);
  if (!user) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const body = await request.json();
  const weekStart = body.week_start as number;
  const activityKeys = body.activity_keys as string[];

  if (typeof weekStart !== "number" || !Array.isArray(activityKeys)) {
    return NextResponse.json(
      { error: "Invalid request: expected week_start (number) and activity_keys (string[])" },
      { status: 400 },
    );
  }

  // Load activity catalog
  const { data: activityRows } = await supabaseServer
    .from("routine_activities")
    .select("*")
    .eq("is_active", true);

  const activities = (activityRows ?? []) as RoutineActivity[];

  // Load player flags
  const { data: dailyState } = await supabaseServer
    .from("daily_states")
    .select("skill_flags")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const playerFlags = (dailyState?.skill_flags as Record<string, boolean>) ?? {};

  const selections: PlayerScheduleSelection[] = activityKeys.map((k) => ({
    activity_key: k,
  }));

  // Commit
  const commitResult = await commitWeek(
    supabaseServer,
    user.id,
    weekStart,
    selections,
    activities,
    playerFlags,
  );

  if (!commitResult.ok) {
    return NextResponse.json({ error: commitResult.error }, { status: 422 });
  }

  // Run first tick
  const tickResult = await runWeek(supabaseServer, user.id, weekStart);

  return NextResponse.json({
    ok: true,
    tick: tickResult,
  });
}
