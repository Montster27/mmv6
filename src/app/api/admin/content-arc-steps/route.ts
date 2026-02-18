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

export async function PUT(request: Request) {
  const user = await ensureAccess(request);
  if (!user) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { arc_key, step_index, title, body, choices } = payload as {
    arc_key?: string;
    step_index?: number;
    title?: string;
    body?: string;
    choices?: unknown;
  };

  if (!arc_key || typeof arc_key !== "string") {
    return NextResponse.json({ error: "arc_key is required" }, { status: 400 });
  }
  if (typeof step_index !== "number") {
    return NextResponse.json({ error: "step_index must be a number" }, { status: 400 });
  }
  if (!title || !body) {
    return NextResponse.json({ error: "title and body are required" }, { status: 400 });
  }

  const { error } = await supabaseServer
    .from("content_arc_steps")
    .upsert(
      {
        arc_key,
        step_index,
        title,
        body,
        choices: choices ?? [],
      },
      { onConflict: "arc_key,step_index" }
    );

  if (error) {
    console.error("Failed to upsert content arc step", error);
    return NextResponse.json({ error: "Failed to save step" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
