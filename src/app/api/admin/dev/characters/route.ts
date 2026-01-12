import { NextResponse } from "next/server";

import { isUserAdmin } from "@/lib/adminAuthServer";
import { supabaseServer } from "@/lib/supabase/server";

type CharacterRow = {
  user_id: string;
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

async function ensureAdmin(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : undefined;
  const user = await getUserFromToken(token);
  if (!user) {
    return null;
  }
  const ok = await isUserAdmin(user);
  if (!ok) {
    return null;
  }
  return user;
}

export async function GET(request: Request) {
  const user = await ensureAdmin(request);
  if (!user) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const { data: characters, error } = await supabaseServer
    .from("characters")
    .select("user_id,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to list characters", error);
    return NextResponse.json({ error: "Failed to list characters" }, { status: 500 });
  }

  const userIds = Array.from(
    new Set((characters ?? []).map((row: CharacterRow) => row.user_id))
  );

  const { data: profiles } = await supabaseServer
    .from("profiles")
    .select("id,email,username,is_admin")
    .in("id", userIds);

  const { data: dailyStates } = await supabaseServer
    .from("daily_states")
    .select("user_id,day_index")
    .in("user_id", userIds);

  const profileMap = new Map(
    (profiles ?? []).map((row) => [row.id, row])
  );
  const dailyMap = new Map(
    (dailyStates ?? []).map((row) => [row.user_id, row])
  );

  const rows = (characters ?? []).map((row: CharacterRow) => {
    const profile = profileMap.get(row.user_id);
    const daily = dailyMap.get(row.user_id);
    return {
      user_id: row.user_id,
      created_at: row.created_at,
      email: profile?.email ?? null,
      username: profile?.username ?? null,
      is_admin: profile?.is_admin ?? false,
      day_index: daily?.day_index ?? null,
    };
  });

  return NextResponse.json({ characters: rows });
}
