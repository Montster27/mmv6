import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import type { RoutineActivity } from "@/types/routine";

// Display priority for the weekly schedule UI:
// classes → work → skill training (creative/physical) → social/leisure (social/practical).
// Within a category, larger commitments sort first (half_day_cost DESC), then alphabetical.
const CATEGORY_DISPLAY_PRIORITY: Record<string, number> = {
  academic: 0,
  work: 1,
  creative: 2,
  physical: 2,
  social: 3,
  practical: 4,
};

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
    .eq("is_active", true);

  if (actErr) {
    return NextResponse.json({ error: "Failed to load activities" }, { status: 500 });
  }

  const activities = ((activityRows ?? []) as RoutineActivity[]).slice().sort((a, b) => {
    const ap = CATEGORY_DISPLAY_PRIORITY[a.category] ?? 99;
    const bp = CATEGORY_DISPLAY_PRIORITY[b.category] ?? 99;
    if (ap !== bp) return ap - bp;
    if (a.half_day_cost !== b.half_day_cost) return b.half_day_cost - a.half_day_cost;
    return a.display_name.localeCompare(b.display_name);
  });

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
