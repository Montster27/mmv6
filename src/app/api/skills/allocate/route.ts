import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase/server";
import { skillCostForLevel } from "@/core/sim/skillProgression";
import { getCurrentDayIndex } from "@/app/api/arcs/arcDay";

async function getUserFromToken(token?: string) {
  if (!token) return null;
  const { data, error } = await supabaseServer.auth.getUser(token);
  if (error) {
    console.error("Failed to verify user token", error);
    return null;
  }
  return data.user;
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : undefined;
  const user = await getUserFromToken(token);
  if (!user) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { skillKey } = payload as { skillKey?: string };
  if (!skillKey || typeof skillKey !== "string" || skillKey.trim().length > 64) {
    return NextResponse.json({ error: "Invalid skill key." }, { status: 400 });
  }

  const currentDay = await getCurrentDayIndex(user.id);

  const { data: bank, error: bankError } = await supabaseServer
    .from("skill_bank")
    .select("user_id,available_points,cap,last_awarded_day_index")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (bankError) {
    console.error("Failed to load skill bank", bankError);
    return NextResponse.json({ error: "Failed to load skill bank." }, { status: 500 });
  }

  if (!bank || bank.available_points <= 0) {
    return NextResponse.json({ error: "No skill points available." }, { status: 400 });
  }

  const { data: priorAllocations, error: priorError } = await supabaseServer
    .from("skill_point_allocations")
    .select("skill_key")
    .eq("user_id", user.id)
    .eq("skill_key", skillKey.trim());

  if (priorError) {
    console.error("Failed to load skill level", priorError);
    return NextResponse.json({ error: "Failed to load skill level." }, { status: 500 });
  }

  const currentLevel = (priorAllocations ?? []).length;
  const nextLevel = currentLevel + 1;
  const cost = skillCostForLevel(nextLevel);
  if (bank.available_points < cost) {
    return NextResponse.json(
      { error: "Not enough skill points for this level." },
      { status: 400 }
    );
  }

  const allocationPayload = {
    user_id: user.id,
    day_index: currentDay,
    skill_key: skillKey.trim(),
    points: cost,
  };

  const { error: insertError } = await supabaseServer
    .from("skill_point_allocations")
    .insert(allocationPayload);

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json(
        { error: "Skill already allocated today." },
        { status: 409 }
      );
    }
    console.error("Failed to insert skill allocation", insertError);
    return NextResponse.json({ error: "Failed to allocate skill." }, { status: 500 });
  }

  const { data: updated, error: updateError } = await supabaseServer
    .from("skill_bank")
    .update({ available_points: bank.available_points - cost })
    .eq("user_id", user.id)
    .gte("available_points", cost)
    .select("available_points");

  if (updateError || !updated || updated.length === 0) {
    const { error: rollbackError } = await supabaseServer
      .from("skill_point_allocations")
      .delete()
      .match({
        user_id: user.id,
        day_index: currentDay,
        skill_key: skillKey.trim(),
      });
    if (rollbackError) {
      console.error("Failed to rollback skill allocation", rollbackError);
    }
    if (updateError) {
      console.error("Failed to decrement skill bank", updateError);
      return NextResponse.json(
        { error: "Failed to decrement skill bank." },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: "Failed to decrement skill bank." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
