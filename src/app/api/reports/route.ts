import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase/server";
import { validateReportPayload } from "@/lib/reports";

async function getUserFromToken(token?: string) {
  if (!token) return null;
  const { data, error } = await supabaseServer.auth.getUser(token);
  if (error) {
    console.error("Failed to verify user token", error);
    return null;
  }
  return data.user;
}

async function ensureAuthed(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : undefined;
  return getUserFromToken(token);
}

export async function POST(request: Request) {
  const user = await ensureAuthed(request);
  if (!user) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const payload = await request.json();
  const validation = validateReportPayload(payload);
  if (validation) {
    return NextResponse.json({ error: validation }, { status: 400 });
  }

  const { error } = await supabaseServer.from("reports").insert({
    reporter_user_id: user.id,
    target_type: payload.target_type,
    target_id: payload.target_id,
    reason: payload.reason,
    details: payload.details ?? null,
    status: "open",
  });

  if (error) {
    console.error("Failed to submit report", error);
    return NextResponse.json({ error: "Failed to submit report" }, { status: 500 });
  }

  await supabaseServer.from("events").insert({
    user_id: user.id,
    event_type: "report_submitted",
    payload: { target_type: payload.target_type, reason: payload.reason },
  });

  return NextResponse.json({ ok: true });
}

export async function GET(request: Request) {
  const user = await ensureAuthed(request);
  if (!user) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const { data, error } = await supabaseServer
    .from("reports")
    .select("id,target_type,target_id,reason,details,created_at,status")
    .eq("reporter_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Failed to load reports", error);
    return NextResponse.json({ error: "Failed to load reports" }, { status: 500 });
  }

  return NextResponse.json({ reports: data ?? [] });
}
