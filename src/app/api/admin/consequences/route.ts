import { NextResponse } from "next/server";

import { getAdminClient } from "@/lib/supabaseAdmin";
import { isUserAdmin } from "@/lib/adminAuthServer";
import { supabaseServer } from "@/lib/supabase/server";
import type { DelayedConsequenceRule } from "@/types/consequences";

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
    .from("delayed_consequence_rules")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) {
    console.error("Failed to list consequence rules", error);
    return NextResponse.json(
      { error: "Failed to list consequence rules" },
      { status: 500 }
    );
  }

  return NextResponse.json({ rules: (data ?? []) as DelayedConsequenceRule[] });
}

export async function POST(request: Request) {
  const user = await ensureAdmin(request);
  if (!user) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const payload = await request.json();
  const key = typeof payload?.key === "string" ? payload.key.trim() : "";
  if (!key) {
    return NextResponse.json({ error: "Missing key" }, { status: 400 });
  }

  const admin = getAdminClient();
  const { error } = await admin.from("delayed_consequence_rules").insert({
    key,
    trigger: payload.trigger ?? {},
    resolve: payload.resolve ?? {},
    timing: payload.timing ?? {},
    payload: payload.payload ?? {},
    updated_at: new Date().toISOString(),
    updated_by: user.email ?? null,
  });
  if (error) {
    console.error("Failed to create consequence rule", error);
    return NextResponse.json(
      { error: "Failed to create consequence rule" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
