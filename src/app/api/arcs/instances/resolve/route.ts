import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase/server";
import { resolveStep } from "@/services/arcs/arcActions";
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

  const { arcInstanceId, optionKey } = payload as {
    arcInstanceId?: string;
    optionKey?: string;
  };
  if (!arcInstanceId || typeof arcInstanceId !== "string") {
    return NextResponse.json({ error: "arcInstanceId required" }, { status: 400 });
  }
  if (!optionKey || typeof optionKey !== "string") {
    return NextResponse.json({ error: "optionKey required" }, { status: 400 });
  }
  const currentDay = await getCurrentDayIndex(user.id);
  try {
    await resolveStep({
      userId: user.id,
      currentDay,
      arcInstanceId,
      optionKey,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to resolve arc step", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to resolve step." },
      { status: 500 }
    );
  }
}
