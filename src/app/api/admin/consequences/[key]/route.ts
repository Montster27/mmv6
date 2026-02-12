import { NextResponse, type NextRequest } from "next/server";

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const resolvedParams = await params;
  const user = await ensureAdmin(request);
  if (!user) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("delayed_consequence_rules")
    .select("*")
    .eq("key", resolvedParams.key)
    .maybeSingle();
  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ rule: data as DelayedConsequenceRule });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const resolvedParams = await params;
  const user = await ensureAdmin(request);
  if (!user) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const payload = await request.json();
  const admin = getAdminClient();
  const { error } = await admin
    .from("delayed_consequence_rules")
    .update({
      trigger: payload.trigger ?? {},
      resolve: payload.resolve ?? {},
      timing: payload.timing ?? {},
      payload: payload.payload ?? {},
      updated_at: new Date().toISOString(),
      updated_by: user.email ?? null,
    })
    .eq("key", resolvedParams.key);
  if (error) {
    console.error("Failed to update consequence rule", error);
    return NextResponse.json(
      { error: "Failed to update consequence rule" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const resolvedParams = await params;
  const user = await ensureAdmin(request);
  if (!user) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const admin = getAdminClient();
  const { error } = await admin
    .from("delayed_consequence_rules")
    .delete()
    .eq("key", resolvedParams.key);
  if (error) {
    console.error("Failed to delete consequence rule", error);
    return NextResponse.json(
      { error: "Failed to delete consequence rule" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
