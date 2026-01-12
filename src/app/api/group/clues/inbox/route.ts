import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase/server";

type ClueRow = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  anomaly_id: string;
  created_at: string;
};

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

export async function GET(request: Request) {
  const user = await ensureAuthed(request);
  if (!user) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const { data: rows, error } = await supabaseServer
    .from("clue_messages")
    .select("id,from_user_id,to_user_id,anomaly_id,created_at")
    .eq("to_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Failed to load clues", error);
    return NextResponse.json({ error: "Failed to load clues" }, { status: 500 });
  }

  const senderIds = Array.from(
    new Set((rows ?? []).map((row) => row.from_user_id))
  );
  const anomalyIds = Array.from(
    new Set((rows ?? []).map((row) => row.anomaly_id))
  );

  const [{ data: profiles }, { data: anomalies }] = await Promise.all([
    supabaseServer
      .from("profiles")
      .select("id,display_name")
      .in("id", senderIds),
    supabaseServer
      .from("anomalies")
      .select("id,title,description")
      .in("id", anomalyIds),
  ]);

  const profileMap = new Map(
    (profiles ?? []).map((row) => [row.id, row.display_name])
  );
  const anomalyMap = new Map(
    (anomalies ?? []).map((row) => [row.id, row])
  );

  const enriched = (rows ?? []).map((row: ClueRow) => {
    const anomaly = anomalyMap.get(row.anomaly_id);
    return {
      id: row.id,
      from_user_id: row.from_user_id,
      from_display_name: profileMap.get(row.from_user_id) ?? null,
      anomaly_id: row.anomaly_id,
      anomaly_title: anomaly?.title ?? null,
      anomaly_description: anomaly?.description ?? null,
      created_at: row.created_at,
    };
  });

  return NextResponse.json({ clues: enriched });
}
