import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase/server";
import { fetchSkillWeb, applySkillGrowth } from "@/domain/skills/growth";
import type { SkillGrowthEntry } from "@/types/skillWeb";

async function getUserFromToken(token?: string) {
  if (!token) return null;
  const { data, error } = await supabaseServer.auth.getUser(token);
  if (error) return null;
  return data.user;
}

/** GET — fetch full skill web state */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : undefined;
  const user = await getUserFromToken(token);
  if (!user)
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const state = await fetchSkillWeb(user.id);
  return NextResponse.json(state);
}

/** POST — apply skill growth from a storylet choice */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : undefined;
  const user = await getUserFromToken(token);
  if (!user)
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const payload = await request.json().catch(() => null);
  if (!payload || !Array.isArray(payload.skill_growth)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const entries = payload.skill_growth as SkillGrowthEntry[];

  // Validate entries
  for (const e of entries) {
    if (
      typeof e.skill !== "string" ||
      typeof e.increment !== "number" ||
      e.increment < 1
    ) {
      return NextResponse.json(
        { error: "Invalid skill growth entry" },
        { status: 400 }
      );
    }
  }

  const result = await applySkillGrowth(user.id, entries);
  return NextResponse.json(result);
}
