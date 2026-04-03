/**
 * PUT/DELETE /api/admin/arc-steps/[id]
 *
 * Routes arc step mutations to the unified storylets table.
 * The [id] is the storylet id (same id was used in the migration from arc_steps).
 */
import { NextResponse, type NextRequest } from "next/server";

import { getAdminClient } from "@/lib/supabaseAdmin";
import { canAccessContentStudio } from "@/lib/adminAuthServer";
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

async function ensureContentStudioAccess(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : undefined;
  const user = await getUserFromToken(token);
  if (!user) return null;
  const ok = await canAccessContentStudio(user);
  if (!ok) return null;
  return user;
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await ensureContentStudioAccess(request);
  if (!user) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const { id } = await context.params;
  const payload = await request.json();

  const admin = getAdminClient();
  // Accept either choices (new) or options (legacy) — prefer choices
  const choices = payload.choices ?? payload.options ?? [];

  const { error } = await admin
    .from("storylets")
    .update({
      title: payload.title,
      body: payload.body,
      step_key: payload.step_key,
      order_index: payload.order_index,
      due_offset_days: payload.due_offset_days,
      expires_after_days: payload.expires_after_days,
      default_next_key: payload.default_next_step_key ?? null,
      choices,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("Failed to update arc step in storylets", error);
    return NextResponse.json({ error: "Failed to update arc step" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await ensureContentStudioAccess(request);
  if (!user) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const { id } = await context.params;
  const admin = getAdminClient();
  const { error } = await admin.from("storylets").delete().eq("id", id);
  if (error) {
    console.error("Failed to delete arc step from storylets", error);
    return NextResponse.json({ error: "Failed to delete arc step" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
