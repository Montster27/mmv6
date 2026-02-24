import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase/server";

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

  const { dayIndex, context, message } = payload as {
    dayIndex?: number;
    context?: Record<string, unknown>;
    message?: string;
  };
  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "Missing message" }, { status: 400 });
  }

  const { error } = await supabaseServer.from("tester_feedback").insert({
    user_id: user.id,
    day_index: typeof dayIndex === "number" ? dayIndex : null,
    context: context ?? {},
    message,
  });

  if (error) {
    console.error("Failed to store tester feedback", error);
    return NextResponse.json({ error: "Failed to store feedback" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
