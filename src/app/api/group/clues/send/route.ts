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

async function ensureAuthed(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : undefined;
  return getUserFromToken(token);
}

async function fetchMembership(userId: string) {
  const { data } = await supabaseServer
    .from("group_members")
    .select("group_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  return data?.group_id ?? null;
}

export async function POST(request: Request) {
  const user = await ensureAuthed(request);
  if (!user) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const payload = await request.json();
  const toUserId = payload?.to_user_id;
  const anomalyId = payload?.anomaly_id;
  if (typeof toUserId !== "string" || typeof anomalyId !== "string") {
    return NextResponse.json({ error: "Missing recipient or anomaly" }, { status: 400 });
  }

  const groupId = await fetchMembership(user.id);
  if (!groupId) return NextResponse.json({ error: "No group" }, { status: 404 });

  const { data: recipientMember } = await supabaseServer
    .from("group_members")
    .select("id")
    .eq("group_id", groupId)
    .eq("user_id", toUserId)
    .limit(1)
    .maybeSingle();

  if (!recipientMember) {
    return NextResponse.json({ error: "Recipient not in group" }, { status: 403 });
  }

  const { data: daily } = await supabaseServer
    .from("daily_states")
    .select("day_index")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const dayIndex = typeof daily?.day_index === "number" ? daily.day_index : 1;

  const { data: existing } = await supabaseServer
    .from("clue_messages")
    .select("id")
    .eq("from_user_id", user.id)
    .eq("day_index", dayIndex)
    .limit(1)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "Already sent today" }, { status: 409 });
  }

  const { data: inserted, error } = await supabaseServer
    .from("clue_messages")
    .insert({
      group_id: groupId,
      from_user_id: user.id,
      to_user_id: toUserId,
      day_index: dayIndex,
      anomaly_id: anomalyId,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Failed to send clue", error);
    return NextResponse.json({ error: "Failed to send clue" }, { status: 500 });
  }

  await supabaseServer.from("events").insert({
    user_id: user.id,
    event_type: "clue_sent",
    payload: { anomaly_id: anomalyId, to_user_id: toUserId },
  });

  return NextResponse.json({ id: inserted?.id ?? null, day_index: dayIndex });
}
