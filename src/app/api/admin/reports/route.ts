import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase/server";
import { isUserAdmin } from "@/lib/adminAuthServer";

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
  if (!user) return null;
  const ok = await isUserAdmin(user);
  return ok ? user : null;
}

export async function GET(request: Request) {
  const admin = await ensureAdmin(request);
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const { data, error } = await supabaseServer
    .from("reports")
    .select("id,reporter_user_id,target_type,target_id,reason,details,created_at,status")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Failed to load reports", error);
    return NextResponse.json({ error: "Failed to load reports" }, { status: 500 });
  }

  return NextResponse.json({ reports: data ?? [] });
}
