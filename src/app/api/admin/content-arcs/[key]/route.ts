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

export async function PUT(request: Request, context: { params: { key: string } }) {
  const user = await ensureAccess(request);
  if (!user) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const key = context.params.key;
  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { title, description, tags, is_active } = payload as {
    title?: string;
    description?: string;
    tags?: string[];
    is_active?: boolean;
  };

  const { error } = await supabaseServer
    .from("content_arcs")
    .update({
      title: title ?? "",
      description: description ?? "",
      tags: Array.isArray(tags) ? tags : [],
      is_active: Boolean(is_active),
    })
    .eq("key", key);

  if (error) {
    console.error("Failed to update content arc", error);
    return NextResponse.json({ error: "Failed to update arc" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
