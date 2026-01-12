import { NextResponse, type NextRequest } from "next/server";

import { getAdminClient } from "@/lib/supabaseAdmin";
import { isUserAdmin } from "@/lib/adminAuthServer";
import { validateStorylet, coerceStoryletRow } from "@/core/validation/storyletValidation";
import type { Storylet } from "@/types/storylets";
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
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const user = await ensureAdmin(request);
  if (!user) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("storylets")
    .select("*")
    .eq("id", resolvedParams.id)
    .maybeSingle();

  if (error || !data) {
    console.error("Failed to load storylet", error);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ storylet: coerceStoryletRow(data) });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const user = await ensureAdmin(request);
  if (!user) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const payload = await request.json();
  const draft: Storylet = {
    id: resolvedParams.id,
    slug: payload.slug ?? "",
    title: payload.title ?? "",
    body: payload.body ?? "",
    is_active: Boolean(payload.is_active),
    tags: payload.tags ?? [],
    weight: payload.weight ?? 100,
    requirements: payload.requirements ?? {},
    choices: payload.choices ?? [],
    created_at: payload.created_at,
  };

  const validation = validateStorylet(draft);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.errors }, { status: 400 });
  }

  const admin = getAdminClient();
  const { error } = await admin
    .from("storylets")
    .update({
      slug: draft.slug,
      title: draft.title,
      body: draft.body,
      choices: draft.choices,
      is_active: draft.is_active,
      tags: draft.tags ?? [],
      weight: draft.weight ?? 100,
      requirements: draft.requirements ?? {},
      updated_at: new Date().toISOString(),
    })
    .eq("id", resolvedParams.id);

  if (error) {
    console.error("Failed to update storylet", error);
    return NextResponse.json({ error: "Failed to update storylet" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
