import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { finalizeDay, createDayStateFromPrevious } from "@/lib/dayState";
import { logState } from "@/lib/stateLog";

// Canonical single entry point for time advancement. Replaces the former
// /api/day/advance-segment and /api/day/advance-day split. Decides internally
// whether to bump the segment or roll to the next day based on the current
// daily_states row.
//
// Day-by-day mode (Chapter One, days 1-2 and anywhere routine mode isn't
// active) is the only caller. Routine mode's weeklyTick.runWeek should call
// this too instead of writing daily_states.day_index directly — enforcing
// a single writer.

const SEGMENT_ORDER = ["morning", "afternoon", "evening", "night"] as const;
type Segment = typeof SEGMENT_ORDER[number];

async function getUserFromToken(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : undefined;
  if (!token) return null;
  const { data, error } = await supabaseServer.auth.getUser(token);
  if (error) {
    console.error("[time-advance] token verification failed", error);
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

  logState({
    surface: "time-advance",
    action: "request",
    userId,
    details: {},
  });

  const { data: dailyState, error: dsError } = await supabaseServer
    .from("daily_states")
    .select("day_index,current_segment,hours_remaining")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (dsError || !dailyState) {
    logState({
      surface: "time-advance",
      action: "request.noDailyState",
      userId,
      details: { error: dsError?.message ?? null },
    });
    return NextResponse.json(
      { error: "No daily state found" },
      { status: 404 }
    );
  }

  const dayIndex = dailyState.day_index as number;
  const currentSegment = (dailyState.current_segment as Segment) ?? "morning";
  const hoursRemaining = dailyState.hours_remaining as number ?? 16;

  const shouldAdvanceDay =
    currentSegment === "night" || hoursRemaining <= 0;

  logState({
    surface: "time-advance",
    action: "request.dispatch",
    userId,
    details: {
      dayIndex,
      currentSegment,
      hoursRemaining,
      branch: shouldAdvanceDay ? "advanceDay" : "advanceSegment",
    },
  });

  if (!shouldAdvanceDay) {
    return advanceSegment(userId, dayIndex, currentSegment, hoursRemaining);
  }

  return advanceDay(userId, dayIndex);
}

async function advanceSegment(
  userId: string,
  dayIndex: number,
  currentSegment: Segment,
  hoursRemaining: number
) {
  const idx = SEGMENT_ORDER.indexOf(currentSegment);
  if (idx < 0 || idx >= SEGMENT_ORDER.length - 1) {
    return NextResponse.json(
      { error: "Cannot advance beyond last segment" },
      { status: 400 }
    );
  }

  const nextSegment = SEGMENT_ORDER[idx + 1];
  const nextHours = Math.max(0, hoursRemaining - 4);
  const now = new Date().toISOString();

  logState({
    surface: "time-advance",
    action: "advanceSegment.before",
    userId,
    details: { dayIndex, prevSegment: currentSegment, nextSegment, prevHoursRemaining: hoursRemaining, nextHoursRemaining: nextHours },
  });

  // Conditional UPDATE — guards against double-advance (two tabs, retry).
  // Matches current_segment so a concurrent call that already bumped fails.
  const { data: updated, error: updateError } = await supabaseServer
    .from("daily_states")
    .update({
      current_segment: nextSegment,
      hours_remaining: nextHours,
      updated_at: now,
    })
    .eq("user_id", userId)
    .eq("day_index", dayIndex)
    .eq("current_segment", currentSegment)
    .select("day_index,current_segment,hours_remaining")
    .maybeSingle();

  if (updateError) {
    console.error("[time-advance] segment update failed", updateError);
    logState({
      surface: "time-advance",
      action: "advanceSegment.error",
      userId,
      details: { dayIndex, error: updateError.message },
    });
    return NextResponse.json(
      { error: "Failed to advance segment" },
      { status: 500 }
    );
  }

  if (!updated) {
    logState({
      surface: "time-advance",
      action: "advanceSegment.raceLost",
      userId,
      details: { dayIndex, expectedSegment: currentSegment },
    });
    return NextResponse.json(
      { error: "segment_already_advanced" },
      { status: 409 }
    );
  }

  logState({
    surface: "time-advance",
    action: "advanceSegment.after",
    userId,
    details: { dayIndex, newSegment: updated.current_segment, newHoursRemaining: updated.hours_remaining },
  });

  // Keep player_day_state in sync for code that still reads segment from there.
  // Safe to no-op via conditional UPDATE; if the row doesn't exist we ignore.
  const { data: mirrorUpdated } = await supabaseServer
    .from("player_day_state")
    .update({
      current_segment: nextSegment,
      hours_remaining: nextHours,
      updated_at: now,
    })
    .eq("user_id", userId)
    .eq("day_index", dayIndex)
    .select("day_index,current_segment");

  logState({
    surface: "time-advance",
    action: "advanceSegment.mirrorPlayerDayState",
    userId,
    details: { dayIndex, rowsAffected: mirrorUpdated?.length ?? 0 },
  });

  return NextResponse.json({
    ok: true,
    action: "segment",
    day_index: dayIndex,
    current_segment: nextSegment,
    hours_remaining: nextHours,
  });
}

async function advanceDay(userId: string, dayIndex: number) {
  logState({
    surface: "time-advance",
    action: "advanceDay.before",
    userId,
    details: { prevDayIndex: dayIndex },
  });

  // Finalize current day (end-of-day stats, skill points, tension penalties).
  try {
    await finalizeDay(userId, dayIndex, supabaseServer);
    logState({
      surface: "time-advance",
      action: "advanceDay.finalizeDay.ok",
      userId,
      details: { dayIndex },
    });
  } catch (err) {
    console.error("[time-advance] finalizeDay failed", err);
    logState({
      surface: "time-advance",
      action: "advanceDay.finalizeDay.error",
      userId,
      details: { dayIndex, error: (err as Error)?.message ?? String(err) },
    });
    return NextResponse.json(
      { error: "Failed to finalize day" },
      { status: 500 }
    );
  }

  // Create the next day's player_day_state (carry-over stats).
  const nextDay = dayIndex + 1;
  try {
    await createDayStateFromPrevious(userId, nextDay, supabaseServer);
    logState({
      surface: "time-advance",
      action: "advanceDay.createNextDayState.ok",
      userId,
      details: { nextDay },
    });
  } catch (err) {
    if ((err as { code?: string })?.code !== "23505") {
      console.error("[time-advance] createDayStateFromPrevious failed", err);
      logState({
        surface: "time-advance",
        action: "advanceDay.createNextDayState.error",
        userId,
        details: { nextDay, error: (err as Error)?.message ?? String(err) },
      });
      return NextResponse.json(
        { error: "Failed to create next day state" },
        { status: 500 }
      );
    }
    logState({
      surface: "time-advance",
      action: "advanceDay.createNextDayState.duplicate",
      userId,
      details: { nextDay },
    });
  }

  // Advance the canonical pointer + reset segment to morning atomically.
  // Conditional on current day_index so double-advance races return 409.
  const { data: updated, error: updateError } = await supabaseServer
    .from("daily_states")
    .update({
      day_index: nextDay,
      current_segment: "morning",
      hours_remaining: 16,
      hours_committed: 0,
      last_day_completed: null,
      last_day_index_completed: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("day_index", dayIndex)
    .select("day_index,current_segment,hours_remaining")
    .maybeSingle();

  if (updateError) {
    console.error("[time-advance] day update failed", updateError);
    logState({
      surface: "time-advance",
      action: "advanceDay.error",
      userId,
      details: { dayIndex, nextDay, error: updateError.message },
    });
    return NextResponse.json(
      { error: "Failed to advance day" },
      { status: 500 }
    );
  }

  if (!updated) {
    logState({
      surface: "time-advance",
      action: "advanceDay.raceLost",
      userId,
      details: { dayIndex, nextDay },
    });
    return NextResponse.json(
      { error: "day_already_advanced" },
      { status: 409 }
    );
  }

  logState({
    surface: "time-advance",
    action: "advanceDay.after",
    userId,
    details: { prevDayIndex: dayIndex, newDayIndex: updated.day_index, newSegment: updated.current_segment, newHoursRemaining: updated.hours_remaining },
  });

  return NextResponse.json({
    ok: true,
    action: "day",
    day_index: nextDay,
    current_segment: "morning",
    hours_remaining: 16,
  });
}
