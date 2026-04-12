import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { runWeek } from "@/core/routine/weeklyTick";

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
 * POST /api/routine/tick
 *
 * Body: { week_start: number }
 *
 * Advances deposits for a committed week. Called lazily when
 * the player returns to the game.
 */
export async function POST(request: Request) {
  const user = await getUserFromToken(request);
  if (!user) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const body = await request.json();
  const weekStart = body.week_start as number;

  if (typeof weekStart !== "number") {
    return NextResponse.json(
      { error: "Invalid request: expected week_start (number)" },
      { status: 400 },
    );
  }

  const tickResult = await runWeek(supabaseServer, user.id, weekStart);

  return NextResponse.json({ ok: true, tick: tickResult });
}
