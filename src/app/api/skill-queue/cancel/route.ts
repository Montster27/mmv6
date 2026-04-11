import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase/server";
import { cancelQueued } from "@/core/skills/queue";
import type { PlayerSkill } from "@/types/skills";

async function getUserFromToken(token?: string) {
  if (!token) return null;
  const { data, error } = await supabaseServer.auth.getUser(token);
  if (error) {
    console.error("Failed to verify user token", error);
    return null;
  }
  return data.user;
}

function extractToken(request: Request): string | undefined {
  const authHeader = request.headers.get("authorization");
  return authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : undefined;
}

// ---------------------------------------------------------------------------
// POST /api/skill-queue/cancel — cancel the queued skill
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  const user = await getUserFromToken(extractToken(request));
  if (!user) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const { data: rows, error: rowsErr } = await supabaseServer
    .from("player_skills")
    .select("user_id, skill_id, status, started_at, completes_at, trained_at")
    .eq("user_id", user.id);
  if (rowsErr) {
    return NextResponse.json({ error: "Failed to load player skills." }, { status: 500 });
  }

  const playerSkills: PlayerSkill[] = rows ?? [];
  const result = cancelQueued(playerSkills);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // Delete the queued row
  const removed = playerSkills.find((s) => s.status === "queued");
  if (removed) {
    await supabaseServer
      .from("player_skills")
      .delete()
      .eq("user_id", user.id)
      .eq("skill_id", removed.skill_id);
  }

  return NextResponse.json({ ok: true, playerSkills: result.newState });
}
