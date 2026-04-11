import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase/server";
import { startTraining, queueNext, tick } from "@/core/skills/queue";
import type { PlayerSkill } from "@/types/skills";

// ---------------------------------------------------------------------------
// Auth
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
// POST /api/skill-queue/train — start or queue a skill
// Body: { skillId: string }
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  const user = await getUserFromToken(extractToken(request));
  if (!user) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body.skillId !== "string") {
    return NextResponse.json({ error: "Missing skillId" }, { status: 400 });
  }
  const { skillId } = body as { skillId: string };

  // Validate skill exists
  const { data: def, error: defErr } = await supabaseServer
    .from("skill_definitions")
    .select("skill_id, base_train_seconds")
    .eq("skill_id", skillId)
    .maybeSingle();
  if (defErr || !def) {
    return NextResponse.json({ error: "Unknown skill." }, { status: 400 });
  }

  // Load all definitions (for tick)
  const { data: allDefs } = await supabaseServer
    .from("skill_definitions")
    .select("skill_id, base_train_seconds");
  const defMap = new Map(
    (allDefs ?? []).map((d) => [d.skill_id, { base_train_seconds: d.base_train_seconds }])
  );

  // Load current player skills
  const { data: rows, error: rowsErr } = await supabaseServer
    .from("player_skills")
    .select("user_id, skill_id, status, started_at, completes_at, trained_at")
    .eq("user_id", user.id);
  if (rowsErr) {
    return NextResponse.json({ error: "Failed to load player skills." }, { status: 500 });
  }

  let playerSkills: PlayerSkill[] = rows ?? [];

  // Run tick first (lazy evaluation)
  const tickResult = tick(playerSkills, defMap, new Date());
  playerSkills = tickResult.newState;

  // Decide: startTraining if no active, otherwise queueNext
  const now = new Date();
  const hasActive = playerSkills.some((s) => s.status === "active");

  const result = hasActive
    ? queueNext(playerSkills, skillId)
    : startTraining(playerSkills, skillId, def.base_train_seconds, now);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // Persist all changed rows
  for (const ps of result.newState) {
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

  // Also persist any tick changes (completed skills)
  if (tickResult.justCompleted.length > 0) {
    for (const ps of tickResult.newState) {
      const inResult = result.newState.find((r) => r.skill_id === ps.skill_id);
      if (!inResult) {
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
    ok: true,
    playerSkills: result.newState,
    justCompleted: tickResult.justCompleted,
  });
}
