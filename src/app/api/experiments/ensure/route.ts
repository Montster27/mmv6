import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase/server";
import { chooseVariant } from "@/core/experiments/assign";

async function getUserFromToken(token?: string) {
  if (!token) return null;
  const { data, error } = await supabaseServer.auth.getUser(token);
  if (error) {
    console.error("Failed to verify user token", error);
    return null;
  }
  return data.user;
}

async function ensureAuthed(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : undefined;
  return getUserFromToken(token);
}

export async function POST(request: Request) {
  const user = await ensureAuthed(request);
  if (!user) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const body = await request.json();
  const experimentId = typeof body?.experiment_id === "string" ? body.experiment_id : "";
  if (!experimentId) {
    return NextResponse.json({ error: "Missing experiment_id" }, { status: 400 });
  }

  const { data: experiment } = await supabaseServer
    .from("experiments")
    .select("id,variants,active")
    .eq("id", experimentId)
    .limit(1)
    .maybeSingle();

  if (!experiment || !experiment.active) {
    return NextResponse.json({ error: "Experiment not found" }, { status: 404 });
  }

  const { data: existing } = await supabaseServer
    .from("user_experiments")
    .select("variant,override")
    .eq("user_id", user.id)
    .eq("experiment_id", experimentId)
    .limit(1)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ variant: existing.variant, override: existing.override });
  }

  const variant = chooseVariant(user.id, experimentId, experiment.variants ?? []);

  const { error } = await supabaseServer
    .from("user_experiments")
    .insert({
      user_id: user.id,
      experiment_id: experimentId,
      variant,
      override: false,
    });

  if (error) {
    console.error("Failed to assign experiment", error);
    return NextResponse.json({ error: "Failed to assign experiment" }, { status: 500 });
  }

  await supabaseServer.from("events").insert({
    user_id: user.id,
    event_type: "experiment_assigned",
    payload: { experiment_id: experimentId, variant },
  });

  return NextResponse.json({ variant, override: false });
}
