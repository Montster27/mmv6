import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { finalizeDay, createDayStateFromPrevious } from "@/lib/dayState";

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

  // 2. Finalize current day (compute carry-over stats, skill points, tension penalties)
  try {
    await finalizeDay(userId, dayIndex, supabaseServer);
  } catch (err) {
    console.error("Failed to finalize day", err);
    return NextResponse.json(
      { error: "Failed to finalize day" },
      { status: 500 }
    );
  }

  // 3. Create new day state for next day (morning, carried stats)
  const nextDay = dayIndex + 1;
  try {
    await createDayStateFromPrevious(userId, nextDay, supabaseServer);
  } catch (err) {
    // 23505 = duplicate key — day state already exists (race or retry), which is fine
    if ((err as { code?: string })?.code !== "23505") {
      console.error("Failed to create next day state", err);
      return NextResponse.json(
        { error: "Failed to create next day state" },
        { status: 500 }
      );
    }
  }

  // 4. Conditional UPDATE — advance day_index only if it still matches expected value
  const { data: updated, error: updateError } = await supabaseServer
    .from("daily_states")
    .update({
      day_index: nextDay,
      last_day_completed: null,
      last_day_index_completed: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("day_index", dayIndex)
    .select("day_index")
    .maybeSingle();

  if (updateError) {
    console.error("Failed to advance day", updateError);
    return NextResponse.json(
      { error: "Failed to advance day" },
      { status: 500 }
    );
  }

  if (!updated) {
    // Zero rows matched — day was already advanced (double-click / two tabs)
    return NextResponse.json(
      { error: "day_already_advanced" },
      { status: 409 }
    );
  }

  return NextResponse.json({
    ok: true,
    day_index: nextDay,
  });
}
