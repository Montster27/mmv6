import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

const SEGMENT_ORDER = ["morning", "afternoon", "evening", "night"] as const;

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

  // 1. Read current day_index
  const { data: dailyState, error: dsError } = await supabaseServer
    .from("daily_states")
    .select("day_index")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (dsError || !dailyState) {
    return NextResponse.json(
      { error: "No daily state found" },
      { status: 404 }
    );
  }

  const dayIndex = dailyState.day_index;

  // 2. Read current segment
  const { data: dayState, error: pdsError } = await supabaseServer
    .from("player_day_state")
    .select("current_segment, hours_remaining")
    .eq("user_id", userId)
    .eq("day_index", dayIndex)
    .limit(1)
    .maybeSingle();

  if (pdsError || !dayState) {
    return NextResponse.json(
      { error: "No player day state found" },
      { status: 404 }
    );
  }

  const current = (dayState.current_segment as string) ?? "morning";
  const idx = SEGMENT_ORDER.indexOf(current as typeof SEGMENT_ORDER[number]);
  if (idx < 0 || idx >= SEGMENT_ORDER.length - 1) {
    return NextResponse.json(
      { error: "Cannot advance beyond last segment" },
      { status: 400 }
    );
  }

  const nextSegment = SEGMENT_ORDER[idx + 1];
  const nextHours = Math.max(0, (dayState.hours_remaining ?? 16) - 4);

  // 3. Conditional UPDATE — rejects if segment already advanced (concurrency guard)
  const { data: updated, error: updateError } = await supabaseServer
    .from("player_day_state")
    .update({
      current_segment: nextSegment,
      hours_remaining: nextHours,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("day_index", dayIndex)
    .eq("current_segment", current)
    .select("current_segment, hours_remaining")
    .maybeSingle();

  if (updateError) {
    console.error("Failed to advance segment", updateError);
    return NextResponse.json(
      { error: "Failed to advance segment" },
      { status: 500 }
    );
  }

  if (!updated) {
    // Zero rows matched — segment was already advanced (double-click / two tabs)
    return NextResponse.json(
      { error: "segment_already_advanced" },
      { status: 409 }
    );
  }

  return NextResponse.json({
    ok: true,
    day_index: dayIndex,
    segment: nextSegment,
    hours_remaining: nextHours,
  });
}
