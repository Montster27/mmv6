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
  if (!user) {
    return null;
  }
  const ok = await canAccessContentStudio(user);
  if (!ok) {
    return null;
  }
  return user;
}

export async function GET(request: Request) {
  const user = await ensureContentStudioAccess(request);
  if (!user) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const arcId = searchParams.get("arc_id");

  const admin = getAdminClient();
  let query = admin
    .from("arc_steps")
    .select(
      "id,arc_id,step_key,order_index,title,body,options,due_offset_days,expires_after_days"
    );

  if (arcId) {
    query = query.eq("arc_id", arcId);
  }

  const { data, error } = await query.order("order_index", { ascending: true });
  if (error) {
    console.error("Failed to list arc steps", error);
    return NextResponse.json({ error: "Failed to list arc steps" }, { status: 500 });
  }

  return NextResponse.json({ steps: data ?? [] });
}
