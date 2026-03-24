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

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("tracks")
    .select("id,key,title,description,tags,is_enabled,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to list arc definitions", error);
    return NextResponse.json({ error: "Failed to list arc definitions" }, { status: 500 });
  }

  return NextResponse.json({ arcs: data ?? [] });
}

export async function POST(request: Request) {
  const user = await ensureContentStudioAccess(request);
  if (!user) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const payload = await request.json();
  const key = (payload.key ?? "").trim();
  const title = (payload.title ?? "").trim();

  if (!key) return NextResponse.json({ error: "key is required" }, { status: 400 });
  if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("tracks")
    .insert({
      key,
      title,
      description: payload.description ?? "",
      tags: payload.tags ?? [],
      is_enabled: payload.is_enabled ?? true,
    })
    .select("id,key,title,description,tags,is_enabled,created_at")
    .maybeSingle();

  if (error) {
    console.error("Failed to create arc definition", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ arc: data });
}
