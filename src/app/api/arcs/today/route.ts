import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase/server";
import { getTodayArcState } from "@/services/arcs/arcScheduler";
import { getCurrentDayIndex } from "@/app/api/arcs/arcDay";

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

  const currentDay = await getCurrentDayIndex(user.id);
  const state = await getTodayArcState({ userId: user.id, currentDay });
  return NextResponse.json({ ...state, currentDay });
}
