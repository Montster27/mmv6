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

export async function POST(request: Request) {
  const admin = await ensureAdmin(request);
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const payload = await request.json();
  const userId = payload?.user_id;
  const isAdmin = payload?.is_admin;
  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
  }
  if (typeof isAdmin !== "boolean") {
    return NextResponse.json({ error: "Missing is_admin" }, { status: 400 });
  }

  const { error } = await supabaseServer
    .from("profiles")
    .update({ is_admin: isAdmin })
    .eq("id", userId);

  if (error) {
    console.error("Failed to update admin flag", error);
    return NextResponse.json({ error: "Failed to update admin flag" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
