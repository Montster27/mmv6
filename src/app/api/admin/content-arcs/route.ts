import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase/server";
import { canAccessContentStudio } from "@/lib/adminAuthServer";

async function getUserFromToken(token?: string) {
  if (!token) return null;
  const { data, error } = await supabaseServer.auth.getUser(token);
  if (error) {
    console.error("Failed to verify user token", error);
    return null;
  }
  return data.user;
}

async function ensureAccess(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : undefined;
  const user = await getUserFromToken(token);
  if (!user) return null;
  const ok = await canAccessContentStudio(user);
  return ok ? user : null;
}

export async function GET(request: Request) {
  const user = await ensureAccess(request);
  if (!user) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const { data: arcs, error: arcError } = await supabaseServer
    .from("content_arcs")
    .select("*")
    .order("created_at", { ascending: true });

  if (arcError) {
    console.error("Failed to fetch content arcs", arcError);
    return NextResponse.json({ error: "Failed to fetch content arcs" }, { status: 500 });
  }

  const { data: steps, error: stepError } = await supabaseServer
    .from("content_arc_steps")
    .select("*")
    .order("arc_key", { ascending: true })
    .order("step_index", { ascending: true });

  if (stepError) {
    console.error("Failed to fetch content arc steps", stepError);
    return NextResponse.json({ error: "Failed to fetch content arc steps" }, { status: 500 });
  }

  return NextResponse.json({ arcs: arcs ?? [], steps: steps ?? [] });
}
