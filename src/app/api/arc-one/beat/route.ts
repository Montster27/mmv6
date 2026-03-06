import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { normalizeStreamStates, setStreamState } from "@/core/arcOne/streamState";
import { shiftMoneyBand } from "@/core/arcOne/state";
import type { StreamId } from "@/types/arcOneStreams";

async function getUserFromToken(token?: string) {
  if (!token) return null;
  const { data, error } = await supabaseServer.auth.getUser(token);
  if (error) {
    console.error("[arc-beat] Failed to verify user token", error);
    return null;
  }
  return data.user;
}

/**
 * POST /api/arc-one/beat
 *
 * Body: { instance_id: string; option_key: string; day_index: number }
 *
 * Resolves an arc beat for the current user:
 * 1. Verifies the instance belongs to the authenticated user
 * 2. Finds the chosen option on the current step
 * 3. Applies resource costs/rewards to today's day_state
 * 4. Applies stream state transitions to daily_states.stream_states
 * 5. Advances arc_instance to next step (or marks COMPLETED)
 * 6. Records to choice_log
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : undefined;
  const user = await getUserFromToken(token);
  if (!user) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { instance_id, option_key, day_index } = payload as {
    instance_id?: string;
    option_key?: string;
    day_index?: number;
  };

  if (!instance_id || !option_key || typeof day_index !== "number") {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // --- 1. Load instance and verify ownership ---
  const { data: instanceRow, error: instanceErr } = await supabaseServer
    .from("arc_instances")
    .select("*")
    .eq("id", instance_id)
    .eq("user_id", user.id)
    .single();

  if (instanceErr || !instanceRow) {
    return NextResponse.json({ error: "Instance not found" }, { status: 404 });
  }

  if (instanceRow.state !== "ACTIVE") {
    return NextResponse.json({ error: "Instance is not active" }, { status: 409 });
  }

  // --- 2. Load the current step ---
  const { data: stepRow, error: stepErr } = await supabaseServer
    .from("arc_steps")
    .select("*")
    .eq("arc_id", instanceRow.arc_id)
    .eq("step_key", instanceRow.current_step_key)
    .single();

  if (stepErr || !stepRow) {
    return NextResponse.json({ error: "Step not found" }, { status: 404 });
  }

  const options: Array<Record<string, unknown>> = Array.isArray(stepRow.options)
    ? stepRow.options
    : [];
  const chosenOption = options.find((o) => o.option_key === option_key);
  if (!chosenOption) {
    return NextResponse.json({ error: "Option not found" }, { status: 400 });
  }

  // --- 3. Apply resource effects (costs & rewards) ---
  const costs = chosenOption.costs as Record<string, Record<string, number>> | undefined;
  const rewards = chosenOption.rewards as Record<string, Record<string, number>> | undefined;
  const energyCost = typeof chosenOption.energy_cost === "number" ? chosenOption.energy_cost : 0;

  const resourceDeltas: Record<string, number> = {};
  if (costs?.resources) {
    for (const [k, v] of Object.entries(costs.resources)) {
      resourceDeltas[k] = (resourceDeltas[k] ?? 0) - v;
    }
  }
  if (rewards?.resources) {
    for (const [k, v] of Object.entries(rewards.resources)) {
      resourceDeltas[k] = (resourceDeltas[k] ?? 0) + v;
    }
  }
  if (energyCost > 0) {
    resourceDeltas["energy"] = (resourceDeltas["energy"] ?? 0) - energyCost;
  }

  // Apply deltas to day_state row for this user + day
  if (Object.keys(resourceDeltas).length > 0) {
    // Fetch current day state
    const { data: dayStateRow } = await supabaseServer
      .from("day_states")
      .select("*")
      .eq("user_id", user.id)
      .eq("day_index", day_index)
      .maybeSingle();

    if (dayStateRow) {
      const updates: Record<string, number> = {};
      for (const [k, delta] of Object.entries(resourceDeltas)) {
        const current = typeof (dayStateRow as Record<string, unknown>)[k] === "number"
          ? (dayStateRow as Record<string, number>)[k]
          : 0;
        updates[k] = current + delta;
      }
      if (Object.keys(updates).length > 0) {
        await supabaseServer
          .from("day_states")
          .update(updates)
          .eq("user_id", user.id)
          .eq("day_index", day_index);
      }
    }
  }

  // --- 4. Apply stream state transition ---
  const setsStreamState = chosenOption.sets_stream_state as
    | { stream: string; state: string }
    | undefined;

  if (setsStreamState?.stream && setsStreamState?.state) {
    // Load current stream_states from daily_states
    const { data: dailyRow } = await supabaseServer
      .from("daily_states")
      .select("stream_states,money_band")
      .eq("user_id", user.id)
      .eq("day_index", day_index)
      .maybeSingle();

    const currentStates = normalizeStreamStates(dailyRow?.stream_states);
    const nextStates = setStreamState(
      currentStates,
      setsStreamState.stream as StreamId,
      setsStreamState.state
    );

    await supabaseServer
      .from("daily_states")
      .update({ stream_states: nextStates })
      .eq("user_id", user.id)
      .eq("day_index", day_index);

    // Also update branch_key on the instance for denormalized reads
    await supabaseServer
      .from("arc_instances")
      .update({ branch_key: setsStreamState.state, updated_day: day_index })
      .eq("id", instance_id);
  }

  // Apply money band shift if specified
  const moneyEffect = chosenOption.money_effect as "improve" | "worsen" | undefined;
  if (moneyEffect) {
    const { data: dailyRow } = await supabaseServer
      .from("daily_states")
      .select("money_band")
      .eq("user_id", user.id)
      .eq("day_index", day_index)
      .maybeSingle();

    const currentBand = (dailyRow?.money_band as "tight" | "okay" | "comfortable") ?? "okay";
    const nextBand = shiftMoneyBand(currentBand, moneyEffect);
    await supabaseServer
      .from("daily_states")
      .update({ money_band: nextBand })
      .eq("user_id", user.id)
      .eq("day_index", day_index);
  }

  // --- 5. Advance arc instance ---
  const nextStepKey =
    typeof chosenOption.next_step_key === "string"
      ? chosenOption.next_step_key
      : (typeof stepRow.default_next_step_key === "string" ? stepRow.default_next_step_key : null);

  if (nextStepKey) {
    // Load next step to get its due_offset_days
    const { data: nextStepRow } = await supabaseServer
      .from("arc_steps")
      .select("step_key,due_offset_days")
      .eq("arc_id", instanceRow.arc_id)
      .eq("step_key", nextStepKey)
      .maybeSingle();

    const nextDueDay = nextStepRow
      ? instanceRow.started_day + nextStepRow.due_offset_days
      : day_index + 1;

    await supabaseServer
      .from("arc_instances")
      .update({
        current_step_key: nextStepKey,
        step_due_day: nextDueDay,
        updated_day: day_index,
      })
      .eq("id", instance_id);
  } else {
    // No next step → arc complete
    await supabaseServer
      .from("arc_instances")
      .update({
        state: "COMPLETED",
        completed_day: day_index,
        updated_day: day_index,
      })
      .eq("id", instance_id);
  }

  // --- 6. Record to choice_log ---
  await supabaseServer.from("choice_log").insert({
    user_id: user.id,
    day: day_index,
    event_type: "STEP_RESOLVED",
    arc_id: instanceRow.arc_id,
    arc_instance_id: instance_id,
    step_key: instanceRow.current_step_key,
    option_key,
    meta: { next_step_key: nextStepKey ?? null },
  });

  return NextResponse.json({ ok: true, next_step_key: nextStepKey ?? null });
}
