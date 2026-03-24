import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { shiftMoneyBand } from "@/core/chapter/state";
import { DEFAULT_TRACK_STATES, type TrackKey } from "@/types/tracks";

async function getUserFromToken(token?: string) {
  if (!token) return null;
  const { data, error } = await supabaseServer.auth.getUser(token);
  if (error) {
    console.error("[track-resolve] Failed to verify user token", error);
    return null;
  }
  return data.user;
}

/**
 * POST /api/tracks/resolve
 *
 * Body: { progress_id: string; option_key: string; day_index: number }
 *
 * Resolves a track storylet for the current user:
 * 1. Verifies the track_progress row belongs to the authenticated user
 * 2. Finds the chosen option on the current storylet
 * 3. Applies resource costs/rewards to today's day_state
 * 4. Applies track state transitions to track_progress.track_state
 * 5. Advances track_progress to next storylet (or marks COMPLETED)
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

  const progressId = (payload as Record<string, unknown>).progress_id;
  const { option_key, day_index } = payload as {
    option_key?: string;
    day_index?: number;
  };

  if (!progressId || !option_key || typeof day_index !== "number") {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // --- 1. Load progress and verify ownership ---
  const { data: progressRow, error: progressErr } = await supabaseServer
    .from("track_progress")
    .select("*")
    .eq("id", progressId)
    .eq("user_id", user.id)
    .single();

  if (progressErr || !progressRow) {
    return NextResponse.json({ error: "Progress not found" }, { status: 404 });
  }

  if (progressRow.state !== "ACTIVE") {
    return NextResponse.json({ error: "Track is not active" }, { status: 409 });
  }

  // --- 2. Load the current storylet ---
  const { data: storyletRow, error: storyletErr } = await supabaseServer
    .from("storylets")
    .select("id,track_id,storylet_key,choices,default_next_key,due_offset_days,expires_after_days")
    .eq("track_id", progressRow.track_id)
    .eq("storylet_key", progressRow.current_storylet_key)
    .single();

  if (storyletErr || !storyletRow) {
    return NextResponse.json({ error: "Storylet not found" }, { status: 404 });
  }

  const choices: Array<Record<string, unknown>> = Array.isArray(storyletRow.choices)
    ? storyletRow.choices
    : [];
  const chosenOption = choices.find(
    (c) => c.id === option_key || c.option_key === option_key
  );
  if (!chosenOption) {
    return NextResponse.json({ error: "Option not found" }, { status: 400 });
  }

  // --- 3. Apply resource effects ---
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

  const outcome = chosenOption.outcome as
    | { deltas?: { energy?: number; stress?: number; resources?: Record<string, number> } }
    | undefined;
  if (outcome?.deltas) {
    const d = outcome.deltas;
    if (typeof d.energy === "number" && d.energy !== 0) {
      resourceDeltas["energy"] = (resourceDeltas["energy"] ?? 0) + d.energy;
    }
    if (typeof d.stress === "number" && d.stress !== 0) {
      resourceDeltas["stress"] = (resourceDeltas["stress"] ?? 0) + d.stress;
    }
    if (d.resources) {
      for (const [k, v] of Object.entries(d.resources)) {
        if (typeof v === "number" && v !== 0) {
          resourceDeltas[k] = (resourceDeltas[k] ?? 0) + v;
        }
      }
    }
  }

  if (Object.keys(resourceDeltas).length > 0) {
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

  // --- 4. Apply track state transition ---
  const setsTrackState = chosenOption.sets_track_state as { state: string } | undefined;
  const newTrackState = setsTrackState?.state ?? null;

  if (newTrackState) {
    // Update track_progress.track_state
    await supabaseServer
      .from("track_progress")
      .update({ track_state: newTrackState, branch_key: newTrackState, updated_day: day_index })
      .eq("id", progressId);

    // Also update daily_states.stream_states for backward compatibility
    const { data: trackRow } = await supabaseServer
      .from("tracks")
      .select("key")
      .eq("id", progressRow.track_id)
      .single();

    if (trackRow) {
      const { data: dailyRow } = await supabaseServer
        .from("daily_states")
        .select("stream_states")
        .eq("user_id", user.id)
        .eq("day_index", day_index)
        .maybeSingle();

      const currentStates = (dailyRow?.stream_states as Record<string, string> | null) ?? {};
      const nextStates = { ...currentStates, [trackRow.key]: newTrackState };

      await supabaseServer
        .from("daily_states")
        .update({ stream_states: nextStates })
        .eq("user_id", user.id)
        .eq("day_index", day_index);
    }
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

  // --- 5. Advance track progress ---
  const nextKey: string | null =
    typeof chosenOption.next_key === "string"
      ? chosenOption.next_key
      : (typeof storyletRow.default_next_key === "string"
          ? storyletRow.default_next_key
          : null);

  if (nextKey) {
    const { data: nextStoryletRow } = await supabaseServer
      .from("storylets")
      .select("storylet_key,due_offset_days")
      .eq("track_id", progressRow.track_id)
      .eq("storylet_key", nextKey)
      .maybeSingle();

    const nextDueDay = nextStoryletRow
      ? progressRow.started_day + (nextStoryletRow.due_offset_days ?? 1)
      : day_index + 1;

    await supabaseServer
      .from("track_progress")
      .update({
        current_storylet_key: nextKey,
        storylet_due_day: nextDueDay,
        updated_day: day_index,
      })
      .eq("id", progressId);
  } else {
    // No next storylet → track complete
    await supabaseServer
      .from("track_progress")
      .update({
        state: "COMPLETED",
        completed_day: day_index,
        updated_day: day_index,
      })
      .eq("id", progressId);
  }

  // --- 6. Activate a new track if the choice triggers one ---
  const trackActivated = chosenOption._arc_activated as string | undefined;
  let activatedTrackKey: string | null = null;

  if (typeof trackActivated === "string" && trackActivated.length > 0) {
    try {
      // Strip arc_ prefix if present (legacy content)
      const lookupKey = trackActivated.replace(/^arc_/, "");

      const { data: targetTrack } = await supabaseServer
        .from("tracks")
        .select("id,key")
        .eq("key", lookupKey)
        .eq("is_enabled", true)
        .maybeSingle();

      if (targetTrack) {
        const { data: existingProgress } = await supabaseServer
          .from("track_progress")
          .select("id")
          .eq("user_id", user.id)
          .eq("track_id", targetTrack.id)
          .maybeSingle();

        if (!existingProgress) {
          const { data: firstStorylet } = await supabaseServer
            .from("storylets")
            .select("storylet_key,due_offset_days")
            .eq("track_id", targetTrack.id)
            .order("order_index", { ascending: true })
            .limit(1)
            .maybeSingle();

          if (firstStorylet) {
            const key = firstStorylet.storylet_key;
            const dueDay = day_index + (firstStorylet.due_offset_days ?? 0);
            await supabaseServer.from("track_progress").insert({
              user_id: user.id,
              track_id: targetTrack.id,
              state: "ACTIVE",
              current_storylet_key: key,
              storylet_due_day: dueDay,
              track_state: DEFAULT_TRACK_STATES[targetTrack.key as TrackKey] ?? null,
              defer_count: 0,
              started_day: day_index,
              updated_day: day_index,
            });
            activatedTrackKey = targetTrack.key;
            console.log(`[track-resolve] Activated track ${targetTrack.key} for user ${user.id}`);
          }
        }
      }
    } catch (err) {
      console.error("[track-resolve] Failed to activate track", trackActivated, err);
    }
  }

  // --- 7. Record to choice_log ---
  await supabaseServer.from("choice_log").insert({
    user_id: user.id,
    day: day_index,
    event_type: "STORYLET_RESOLVED",
    track_id: progressRow.track_id,
    track_progress_id: progressId,
    step_key: progressRow.current_storylet_key,
    option_key,
    meta: {
      next_key: nextKey ?? null,
      ...(activatedTrackKey ? { activated_track: activatedTrackKey } : {}),
    },
  });

  return NextResponse.json({
    ok: true,
    next_key: nextKey ?? null,
    activated_track: activatedTrackKey,
  });
}
