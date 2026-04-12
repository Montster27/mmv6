import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import type { RoutineActivity } from "@/types/routine";

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
 * GET /api/routine/activities
 *
 * Returns available routine activities, filtering out those whose
 * requirements the player hasn't met.
 */
export async function GET(request: Request) {
  const user = await getUserFromToken(request);
  if (!user) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  // Load activity catalog
  const { data: activityRows, error: actErr } = await supabaseServer
    .from("routine_activities")
    .select("*")
    .eq("is_active", true)
    .order("half_day_cost", { ascending: true });

  if (actErr) {
    return NextResponse.json({ error: "Failed to load activities" }, { status: 500 });
  }

  const activities = (activityRows ?? []) as RoutineActivity[];

  // Load player flags for requirement checking
  const { data: dailyState } = await supabaseServer
    .from("daily_states")
    .select("skill_flags")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const playerFlags = (dailyState?.skill_flags as Record<string, boolean>) ?? {};

  // Filter and annotate activities
  const available = activities.map((a) => {
    let locked = false;
    let lockReason: string | null = null;

    if (a.requirements) {
      const req = a.requirements as Record<string, unknown>;
      if (typeof req.requires_flag === "string" && !playerFlags[req.requires_flag]) {
        locked = true;
        lockReason = "You haven't unlocked this yet.";
      }
    }

    return { ...a, locked, lockReason };
  });

  return NextResponse.json({ activities: available });
}
