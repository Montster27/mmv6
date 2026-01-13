import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase/server";
import { isUserAdmin } from "@/lib/adminAuthServer";

async function getUserFromToken(token?: string) {
  if (!token) return null;
  const { data, error } = await supabaseServer.auth.getUser(token);
  if (error) {
    console.error("Failed to verify user token", error);
    return null;
  }
  return data.user;
}

async function ensureAdmin(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : undefined;
  const user = await getUserFromToken(token);
  if (!user) return null;
  const ok = await isUserAdmin(user);
  return ok ? user : null;
}

export async function POST(request: Request) {
  const admin = await ensureAdmin(request);
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const body = await request.json();
  const userId = typeof body?.user_id === "string" ? body.user_id : "";
  const experimentId =
    typeof body?.experiment_id === "string" ? body.experiment_id : "";
  const variant = typeof body?.variant === "string" ? body.variant : "";

  if (!userId || !experimentId || !variant) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const { data: experiment } = await supabaseServer
    .from("experiments")
    .select("id,variants")
    .eq("id", experimentId)
    .limit(1)
    .maybeSingle();

  if (!experiment || !(experiment.variants ?? []).includes(variant)) {
    return NextResponse.json({ error: "Invalid experiment or variant" }, { status: 400 });
  }

  const { error } = await supabaseServer
    .from("user_experiments")
    .upsert(
      {
        user_id: userId,
        experiment_id: experimentId,
        variant,
        override: true,
      },
      { onConflict: "user_id,experiment_id" }
    );

  if (error) {
    console.error("Failed to override experiment", error);
    return NextResponse.json({ error: "Failed to override" }, { status: 500 });
  }

  await supabaseServer.from("events").insert({
    user_id: admin.id,
    event_type: "experiment_override_set",
    payload: { experiment_id: experimentId, variant, user_id: userId },
  });

  return NextResponse.json({ ok: true });
}
