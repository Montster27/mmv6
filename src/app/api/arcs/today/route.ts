import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase/server";
import { getTodayArcState } from "@/services/arcs/arcScheduler";

async function getUserFromToken(token?: string) {
  if (!token) return null;
  const { data, error } = await supabaseServer.auth.getUser(token);
  if (error) {
    console.error("Failed to verify user token", error);
    return null;
  }
  return data.user;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : undefined;
  const user = await getUserFromToken(token);
  if (!user) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const day = Number(searchParams.get("day"));
  if (!Number.isFinite(day)) {
    return NextResponse.json({ error: "Invalid day" }, { status: 400 });
  }

  const state = await getTodayArcState({ userId: user.id, currentDay: day });
  return NextResponse.json(state);
}
