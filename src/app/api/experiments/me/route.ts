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

export async function GET(request: Request) {
  const user = await ensureAuthed(request);
  if (!user) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const { data, error } = await supabaseServer
    .from("user_experiments")
    .select("experiment_id,variant")
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to load experiments", error);
    return NextResponse.json({ error: "Failed to load experiments" }, { status: 500 });
  }

  const assignments = (data ?? []).reduce<Record<string, string>>((acc, row) => {
    acc[row.experiment_id] = row.variant;
    return acc;
  }, {});

  return NextResponse.json({ assignments });
}
