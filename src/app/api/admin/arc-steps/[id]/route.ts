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
  if (!user) {
    return null;
  }
  const ok = await canAccessContentStudio(user);
  if (!ok) {
    return null;
  }
  return user;
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await ensureContentStudioAccess(request);
  if (!user) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const { id } = await context.params;
  const admin = getAdminClient();
  const { error } = await admin.from("arc_steps").delete().eq("id", id);
  if (error) {
    console.error("Failed to delete arc step", error);
    return NextResponse.json({ error: "Failed to delete arc step" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
