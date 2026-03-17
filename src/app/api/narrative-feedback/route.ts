import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase/server";
import { VALID_RATING_VALUES } from "@/lib/narrativeFeedbackConfig";

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
  if (!user)
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const {
    storyletId,
    dayIndex,
    historicallyAccurate,
    engagement,
    emotionalResonance,
    choiceQuality,
    comment,
  } = payload as Record<string, unknown>;

  if (!storyletId || typeof storyletId !== "string") {
    return NextResponse.json(
      { error: "Missing storyletId" },
      { status: 400 }
    );
  }
  if (typeof dayIndex !== "number") {
    return NextResponse.json(
      { error: "Missing dayIndex" },
      { status: 400 }
    );
  }

  // Validate all rating fields against shared config
  const ratings = { historicallyAccurate, engagement, emotionalResonance, choiceQuality };
  for (const [key, validSet] of Object.entries(VALID_RATING_VALUES)) {
    const val = ratings[key as keyof typeof ratings];
    if (typeof val !== "string" || !validSet.has(val)) {
      return NextResponse.json({ error: `Invalid ${key}` }, { status: 400 });
    }
  }

  const { error } = await supabaseServer.from("narrative_feedback").insert({
    user_id: user.id,
    storylet_id: storyletId,
    day_index: dayIndex,
    historically_accurate: historicallyAccurate,
    engagement,
    emotional_resonance: emotionalResonance,
    choice_quality: choiceQuality,
    comment: typeof comment === "string" ? comment.slice(0, 2000) : null,
  });

  if (error) {
    console.error("Failed to store narrative feedback", error);
    return NextResponse.json(
      { error: "Failed to store feedback" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
