import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase/server";
import { deferStep } from "@/services/arcs/arcActions";
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

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : undefined;
  const user = await getUserFromToken(token);
  if (!user) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { arcInstanceId } = payload as {
    arcInstanceId?: string;
  };
  if (!arcInstanceId || typeof arcInstanceId !== "string") {
    return NextResponse.json({ error: "arcInstanceId required" }, { status: 400 });
  }
  const currentDay = await getCurrentDayIndex(user.id);
  await deferStep({ userId: user.id, currentDay, arcInstanceId });
  return NextResponse.json({ ok: true });
}
