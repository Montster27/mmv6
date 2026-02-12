import { NextResponse } from "next/server";

import { getAdminClient } from "@/lib/supabaseAdmin";
import { isUserAdmin } from "@/lib/adminAuthServer";
import { supabaseServer } from "@/lib/supabase/server";
import type { RemnantRule } from "@/types/remnants";

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

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("remnant_rules")
    .select("*")
    .order("remnant_key", { ascending: true });
  if (error) {
    console.error("Failed to list remnant rules", error);
    return NextResponse.json(
      { error: "Failed to list remnant rules" },
      { status: 500 }
    );
  }

  return NextResponse.json({ rules: (data ?? []) as RemnantRule[] });
}

export async function POST(request: Request) {
  const user = await ensureAdmin(request);
  if (!user) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const payload = await request.json();
  const key = typeof payload?.remnant_key === "string" ? payload.remnant_key : "";
  if (!key) {
    return NextResponse.json({ error: "Missing remnant_key" }, { status: 400 });
  }

  const admin = getAdminClient();
  const { error } = await admin.from("remnant_rules").insert({
    remnant_key: key,
    discovery: payload.discovery ?? {},
    unlock: payload.unlock ?? {},
    caps: payload.caps ?? {},
    updated_at: new Date().toISOString(),
    updated_by: user.email ?? null,
  });
  if (error) {
    console.error("Failed to create remnant rule", error);
    return NextResponse.json(
      { error: "Failed to create remnant rule" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
