/**
 * GET /api/admin/arc-steps
 *
 * Reads arc steps from the unified storylets table (arc_id IS NOT NULL).
 * Kept for backward compatibility with Content Studio hooks.
 */
import { NextResponse } from "next/server";

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

export async function GET(request: Request) {
  const user = await ensureContentStudioAccess(request);
  if (!user) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const arcId = searchParams.get("arc_id");

  const admin = getAdminClient();
  let query = admin
    .from("storylets")
    .select(
      "id,arc_id,step_key,order_index,title,body,choices,default_next_step_key,due_offset_days,expires_after_days"
    )
    .not("arc_id", "is", null);

  if (arcId) {
    query = query.eq("arc_id", arcId);
  }

  const { data, error } = await query.order("order_index", { ascending: true });
  if (error) {
    console.error("Failed to list arc steps from storylets", error);
    return NextResponse.json({ error: "Failed to list arc steps" }, { status: 500 });
  }

  // Shape the response to match the old arc_steps format for backward compat
  const steps = (data ?? []).map((row) => ({
    id: row.id,
    arc_id: row.arc_id,
    step_key: row.step_key,
    order_index: row.order_index,
    title: row.title,
    body: row.body,
    // choices in the unified model; expose as both names
    options: row.choices ?? [],
    choices: row.choices ?? [],
    default_next_step_key: row.default_next_step_key,
    due_offset_days: row.due_offset_days,
    expires_after_days: row.expires_after_days,
  }));

  return NextResponse.json({ steps });
}
