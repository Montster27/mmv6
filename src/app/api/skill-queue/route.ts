import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase/server";
import { tick } from "@/core/skills/queue";
import type { PlayerSkill } from "@/types/skills";

// ---------------------------------------------------------------------------
// Auth helper (same pattern as other routes)
// ---------------------------------------------------------------------------

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
// GET /api/skill-queue — fetch current skill state (runs tick lazily)
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  const user = await getUserFromToken(extractToken(request));
  if (!user) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  // Load definitions (for tick promotion)
  const { data: defs, error: defsErr } = await supabaseServer
    .from("skill_definitions")
    .select("skill_id, display_name, tier, domain, base_train_seconds, prerequisite_skill_ids");
  if (defsErr) {
    console.error("Failed to load skill_definitions", defsErr);
    return NextResponse.json({ error: "Failed to load skills." }, { status: 500 });
  }

  // Load player skills
  const { data: rows, error: rowsErr } = await supabaseServer
    .from("player_skills")
    .select("user_id, skill_id, status, started_at, completes_at, trained_at")
    .eq("user_id", user.id);
  if (rowsErr) {
    console.error("Failed to load player_skills", rowsErr);
    return NextResponse.json({ error: "Failed to load player skills." }, { status: 500 });
  }

  const playerSkills: PlayerSkill[] = rows ?? [];
  const defMap = new Map(
    (defs ?? []).map((d) => [d.skill_id, { base_train_seconds: d.base_train_seconds }])
  );

  // Lazy tick
  const { newState, justCompleted } = tick(playerSkills, defMap, new Date());

  // Persist any changes from tick
  if (justCompleted.length > 0) {
    for (const ps of newState) {
      const original = playerSkills.find((o) => o.skill_id === ps.skill_id);
      if (!original || original.status !== ps.status) {
        await supabaseServer
          .from("player_skills")
          .upsert(
            {
              user_id: user.id,
              skill_id: ps.skill_id,
              status: ps.status,
              started_at: ps.started_at,
              completes_at: ps.completes_at,
              trained_at: ps.trained_at,
            },
            { onConflict: "user_id,skill_id" }
          );
      }
    }
  }

  return NextResponse.json({
    definitions: defs ?? [],
    playerSkills: newState,
    justCompleted,
  });
}
