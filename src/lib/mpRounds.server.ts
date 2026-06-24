import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { supabaseServer } from "@/lib/supabase/server";
import { getAuthedUser } from "@/lib/mpEvents.server";
import { getEventCoordinator } from "@/lib/mpAssignments.server";
import { isCoordinator } from "@/lib/mpAssignments";
import {
  TRANSIT_LAG_SECONDS,
  RISK_COST,
  applyStateDelta,
  computeAiDrift,
  computeRemainingSeconds,
  isRoundExpired,
  placeholderPresenceScore,
  stateToSplit,
} from "@/lib/mpRounds";
import type { MpEventLocationState } from "@/types/mpEvents";
import type {
  EventPhaseState,
  MpEventRound,
  MpPhase,
  MpTransitState,
} from "@/types/mpRounds";

// ─────────────────────────────────────────────────────────────────────
// Event Phase Machine — server logic (MP-05). All writes are
// service-role-mediated. Authorization for coordinator-only actions is
// enforced here. Untyped .from() + manual casts, matching the mp*
// precedent. Lazy-expiry tick: no cron in this slice — is_expired=true
// in the GET response signals the board page to call POST .../resolve;
// the conditional-UPDATE guard in resolveRound ensures exactly-once
// resolution regardless of racing clients.
// ─────────────────────────────────────────────────────────────────────

export { getAuthedUser };

export type RoundError = { ok: false; status: number; error: string };
export type RoundOk<T> = { ok: true; data: T };
export type RoundResult<T> = RoundOk<T> | RoundError;

const fail = (status: number, error: string): RoundError => ({
  ok: false,
  status,
  error,
});
const done = <T>(data: T): RoundOk<T> => ({ ok: true, data });

// ─── Internal helpers ────────────────────────────────────────────────

type RoundRow = {
  id: string;
  event_id: string;
  phase: MpPhase;
  round_number: number;
  active_started_at: string | null;
  round_duration_seconds: number;
  planning_deadline: string | null;
  ai_last_escalation_location_id: string | null;
};

async function fetchRoundRow(
  client: SupabaseClient,
  eventId: string
): Promise<RoundRow | null> {
  const { data, error } = await client
    .from("mp_event_rounds")
    .select(
      "id,event_id,phase,round_number,active_started_at,round_duration_seconds,planning_deadline,ai_last_escalation_location_id"
    )
    .eq("event_id", eventId)
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[rounds] failed to fetch round row", error);
    return null;
  }
  return (data as RoundRow | null) ?? null;
}

type TransitRow = {
  id: string;
  event_id: string;
  player_id: string;
  from_location_id: string;
  to_location_id: string;
  departed_at: string;
  arrives_at: string;
};

async function fetchTransitRows(
  client: SupabaseClient,
  eventId: string
): Promise<TransitRow[]> {
  const { data, error } = await client
    .from("mp_event_transit")
    .select(
      "id,event_id,player_id,from_location_id,to_location_id,departed_at,arrives_at"
    )
    .eq("event_id", eventId);
  if (error) {
    console.error("[rounds] failed to fetch transit rows", error);
    return [];
  }
  return (data ?? []) as TransitRow[];
}

async function fetchDisplayNames(
  client: SupabaseClient,
  ids: string[]
): Promise<Map<string, string | null>> {
  const map = new Map<string, string | null>();
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return map;
  const { data, error } = await client
    .from("public_profiles")
    .select("user_id,display_name")
    .in("user_id", unique);
  if (error) {
    console.error("[rounds] failed to load display names", error);
    return map;
  }
  for (const row of (data ?? []) as {
    user_id: string;
    display_name: string | null;
  }[]) {
    map.set(row.user_id, row.display_name ?? null);
  }
  return map;
}

// ─── Public reads ─────────────────────────────────────────────────────

export async function getEventPhaseState(
  client: SupabaseClient,
  eventId: string
): Promise<EventPhaseState> {
  const [roundRow, transitRows] = await Promise.all([
    fetchRoundRow(client, eventId),
    fetchTransitRows(client, eventId),
  ]);

  // If no round row exists yet (e.g. the event predates this migration),
  // return a safe planning default so the board doesn't break.
  if (!roundRow) {
    return {
      phase: "planning",
      round_number: 1,
      remaining_seconds: null,
      is_expired: false,
      round_duration_seconds: 120,
      active_started_at: null,
      ai_last_escalation_location_id: null,
      transit: [],
    };
  }

  const remaining = computeRemainingSeconds(
    roundRow.active_started_at,
    roundRow.round_duration_seconds
  );
  const expired = isRoundExpired(
    roundRow.active_started_at,
    roundRow.round_duration_seconds
  );

  // Enrich transit rows with display names.
  const names = await fetchDisplayNames(
    client,
    transitRows.map((t) => t.player_id)
  );
  const transit: MpTransitState[] = transitRows.map((t) => ({
    ...t,
    display_name: names.get(t.player_id) ?? null,
  }));

  return {
    phase: roundRow.phase,
    round_number: roundRow.round_number,
    remaining_seconds: remaining,
    is_expired: expired,
    round_duration_seconds: roundRow.round_duration_seconds,
    active_started_at: roundRow.active_started_at,
    ai_last_escalation_location_id: roundRow.ai_last_escalation_location_id,
    transit,
  };
}

// ─── Mutations ────────────────────────────────────────────────────────

// Coordinator-only. planning → active; stamps active_started_at.
export async function startRound(
  client: SupabaseClient,
  eventId: string,
  callerId: string
): Promise<RoundResult<{ round_number: number }>> {
  const coordinatorId = await getEventCoordinator(client, eventId);
  if (coordinatorId === null) return fail(404, "Event not found.");
  if (!isCoordinator(callerId, coordinatorId)) {
    return fail(403, "Only the event coordinator can start a round.");
  }

  const roundRow = await fetchRoundRow(client, eventId);
  if (!roundRow) return fail(404, "Round state not found for this event.");
  if (roundRow.phase !== "planning") {
    return fail(409, `Round is already ${roundRow.phase}; cannot start.`);
  }

  const { error } = await client
    .from("mp_event_rounds")
    .update({ phase: "active", active_started_at: new Date().toISOString() })
    .eq("event_id", eventId)
    .eq("phase", "planning");
  if (error) {
    console.error("[rounds] failed to start round", error);
    return fail(500, "Failed to start round.");
  }
  return done({ round_number: roundRow.round_number });
}

// Open to coordinator or the lazy-expiry path (any authed caller). The
// conditional UPDATE on phase='active' is the single-resolution guard —
// whichever call wins the UPDATE proceeds; concurrent calls get 409.
export async function resolveRound(
  client: SupabaseClient,
  eventId: string
): Promise<RoundResult<{ round_number: number }>> {
  // Step 1: try to claim the resolving slot (exactly-once guard).
  const { data: claimed, error: claimErr } = await client
    .from("mp_event_rounds")
    .update({ phase: "resolving" })
    .eq("event_id", eventId)
    .eq("phase", "active")
    .select("id,round_number,round_duration_seconds,active_started_at")
    .maybeSingle();
  if (claimErr) {
    console.error("[rounds] failed to claim resolving slot", claimErr);
    return fail(500, "Failed to resolve round.");
  }
  if (!claimed) {
    // 0 rows updated — either not active or already resolving.
    return fail(409, "Round is not active or is already being resolved.");
  }
  const roundRow = claimed as {
    id: string;
    round_number: number;
    round_duration_seconds: number;
    active_started_at: string | null;
  };

  // Step 2: finalize arrived transit players.
  const now = new Date().toISOString();
  const { data: arrivals, error: arrErr } = await client
    .from("mp_event_transit")
    .select("player_id,to_location_id,event_id")
    .eq("event_id", eventId)
    .lte("arrives_at", now);
  if (arrErr) {
    console.error("[rounds] failed to fetch arrived transit", arrErr);
  }
  const arrived = (arrivals ?? []) as {
    player_id: string;
    to_location_id: string;
    event_id: string;
  }[];

  for (const a of arrived) {
    // Delete existing assignment (if any) then place at destination.
    await client
      .from("mp_event_assignments")
      .delete()
      .eq("event_id", a.event_id)
      .eq("player_id", a.player_id);
    await client.from("mp_event_assignments").insert({
      event_id: a.event_id,
      location_id: a.to_location_id,
      player_id: a.player_id,
      assignment_source: "coordinator",
      assigned_by_player_id: null,
    });
    await client
      .from("mp_event_transit")
      .delete()
      .eq("event_id", a.event_id)
      .eq("player_id", a.player_id);
  }

  // Step 3: count present players per location (placeholder pressure).
  const { data: assignments, error: assignErr } = await client
    .from("mp_event_assignments")
    .select("location_id,player_id")
    .eq("event_id", eventId);
  if (assignErr) {
    console.error("[rounds] failed to fetch assignments for pressure", assignErr);
  }
  const countByLocation = new Map<string, number>();
  for (const a of (assignments ?? []) as {
    location_id: string;
    player_id: string;
  }[]) {
    countByLocation.set(
      a.location_id,
      (countByLocation.get(a.location_id) ?? 0) + 1
    );
  }

  // Step 3b: Merchant Row encounter pressure (replaces placeholder for this
  // location only). Sum of signed pressure_contribution from mp_encounter_runs
  // for the just-completed round. Positive → pro; negative → extra con.
  // TODO(single-slice debt): hardcoded to Merchant Row; generalize when other
  // locations have mp_location_games rows.
  const MERCHANT_ROW_ID = "1c000000-0000-4000-a000-000000000002";
  const { data: encRuns, error: encErr } = await client
    .from("mp_encounter_runs")
    .select("pressure_contribution")
    .eq("event_id", eventId)
    .eq("location_id", MERCHANT_ROW_ID)
    .eq("round_number", roundRow.round_number);
  if (encErr) {
    console.error("[rounds] failed to fetch encounter runs for pressure", encErr);
  }
  const merchantEncounterTotal = (
    (encRuns ?? []) as { pressure_contribution: number }[]
  ).reduce((sum, r) => sum + r.pressure_contribution, 0);

  // Step 4: fetch location states + compute AI drift.
  const { data: locations, error: locErr } = await client
    .from("mp_event_locations")
    .select("id,state,display_order,lane,split,prev_split")
    .eq("event_id", eventId);
  if (locErr) {
    console.error("[rounds] failed to fetch locations", locErr);
  }
  const locRows = (locations ?? []) as {
    id: string;
    state: MpEventLocationState;
    display_order: number;
    lane: "safe" | "risk";
    split: number;
    prev_split: number;
  }[];

  const { conBumps, escalated_id } = computeAiDrift(locRows);

  // Step 5: apply net deltas — update state, split, and prev_split for every
  // location. Merchant Row uses real encounter pressure; all others use the
  // placeholder flat presence score.
  const locationUpdates: {
    id: string;
    state: MpEventLocationState;
    split: number;
    prev_split: number;
  }[] = [];
  for (const loc of locRows) {
    let proScore: number;
    let conScore: number;
    if (loc.id === MERCHANT_ROW_ID) {
      proScore = Math.max(0, merchantEncounterTotal);
      // Trap options contribute negative total → extra con on top of AI drift.
      conScore =
        (conBumps[loc.id] ?? 0) + Math.max(0, -merchantEncounterTotal);
    } else {
      proScore = placeholderPresenceScore(countByLocation.get(loc.id) ?? 0);
      conScore = conBumps[loc.id] ?? 0;
    }
    const newState = applyStateDelta(loc.state, proScore, conScore);
    locationUpdates.push({
      id: loc.id,
      state: newState,
      split: stateToSplit(newState),
      prev_split: loc.split,
    });
  }

  for (const update of locationUpdates) {
    const { error: updateErr } = await client
      .from("mp_event_locations")
      .update({ state: update.state, split: update.split, prev_split: update.prev_split })
      .eq("id", update.id);
    if (updateErr) {
      console.error("[rounds] failed to update location state", updateErr);
    }
  }

  // Step 5b: accrue exposure for each assigned player based on the lane they
  // worked this round. Risk lanes cost more; a clubmate on the ground reduces
  // the solo cost to RISK_COST.risk_covered.
  {
    const playersByLocation = new Map<string, string[]>();
    for (const a of (assignments ?? []) as {
      location_id: string;
      player_id: string;
    }[]) {
      const bucket = playersByLocation.get(a.location_id) ?? [];
      bucket.push(a.player_id);
      playersByLocation.set(a.location_id, bucket);
    }
    const laneByLocation = new Map(locRows.map((l) => [l.id, l.lane]));

    const exposureIncrements: { player_id: string; cost: number }[] = [];
    for (const a of (assignments ?? []) as {
      location_id: string;
      player_id: string;
    }[]) {
      const lane = laneByLocation.get(a.location_id) ?? "safe";
      const othersHere = (
        playersByLocation.get(a.location_id) ?? []
      ).filter((id) => id !== a.player_id).length;
      const cost =
        lane === "risk"
          ? othersHere > 0
            ? RISK_COST.risk_covered
            : RISK_COST.risk_solo
          : RISK_COST.safe;
      exposureIncrements.push({ player_id: a.player_id, cost });
    }

    if (exposureIncrements.length > 0) {
      const { data: currentRows } = await client
        .from("mp_event_exposure")
        .select("player_id,exposure")
        .eq("event_id", eventId)
        .in(
          "player_id",
          exposureIncrements.map((e) => e.player_id)
        );
      const currentByPlayer = new Map(
        (
          (currentRows ?? []) as { player_id: string; exposure: number }[]
        ).map((r) => [r.player_id, r.exposure])
      );

      for (const inc of exposureIncrements) {
        const newExposure = Math.min(
          100,
          (currentByPlayer.get(inc.player_id) ?? 0) + inc.cost
        );
        const { error: expErr } = await client
          .from("mp_event_exposure")
          .upsert(
            {
              event_id: eventId,
              player_id: inc.player_id,
              exposure: newExposure,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "event_id,player_id" }
          );
        if (expErr) {
          console.error("[rounds] failed to upsert exposure", expErr);
        }
      }
    }
  }

  // Step 6: advance phase back to planning, increment round number.
  const { error: advanceErr } = await client
    .from("mp_event_rounds")
    .update({
      phase: "planning",
      round_number: roundRow.round_number + 1,
      active_started_at: null,
      ai_last_escalation_location_id: escalated_id,
    })
    .eq("event_id", eventId)
    .eq("phase", "resolving");
  if (advanceErr) {
    console.error("[rounds] failed to advance round", advanceErr);
    return fail(500, "Round resolved but failed to advance state.");
  }

  return done({ round_number: roundRow.round_number + 1 });
}

// Coordinator-only. Removes the player from their current assignment (if
// any) and places them in transit toward to_location_id with a server-
// stamped arrives_at. The player contributes to neither location until
// arrival (finalized on resolveRound).
export async function moveMember(
  client: SupabaseClient,
  eventId: string,
  playerId: unknown,
  toLocationId: unknown,
  callerId: string
): Promise<RoundResult<{ arrives_at: string }>> {
  if (typeof playerId !== "string" || playerId.length === 0) {
    return fail(400, "player_id is required.");
  }
  if (typeof toLocationId !== "string" || toLocationId.length === 0) {
    return fail(400, "to_location_id is required.");
  }

  const coordinatorId = await getEventCoordinator(client, eventId);
  if (coordinatorId === null) return fail(404, "Event not found.");
  if (!isCoordinator(callerId, coordinatorId)) {
    return fail(403, "Only the event coordinator can move members.");
  }

  // Confirm destination belongs to this event.
  const { data: locRow, error: locErr } = await client
    .from("mp_event_locations")
    .select("id")
    .eq("id", toLocationId)
    .eq("event_id", eventId)
    .limit(1)
    .maybeSingle();
  if (locErr || !locRow) {
    return fail(400, "That location isn't part of this event.");
  }

  // Capture current location BEFORE deleting (from_location_id is nullable).
  const { data: currentAssign } = await client
    .from("mp_event_assignments")
    .select("location_id")
    .eq("event_id", eventId)
    .eq("player_id", playerId)
    .limit(1)
    .maybeSingle();
  const fromLocationId =
    (currentAssign as { location_id: string } | null)?.location_id ?? null;

  // Remove existing assignment (player leaves their current location).
  await client
    .from("mp_event_assignments")
    .delete()
    .eq("event_id", eventId)
    .eq("player_id", playerId);

  // Clear any existing transit row (handles double-move by coordinator).
  await client
    .from("mp_event_transit")
    .delete()
    .eq("event_id", eventId)
    .eq("player_id", playerId);

  const departedAt = new Date();
  const arrivesAt = new Date(
    departedAt.getTime() + TRANSIT_LAG_SECONDS * 1000
  );

  const { error: insertErr } = await client.from("mp_event_transit").insert({
    event_id: eventId,
    player_id: playerId,
    from_location_id: fromLocationId,
    to_location_id: toLocationId,
    departed_at: departedAt.toISOString(),
    arrives_at: arrivesAt.toISOString(),
  });
  if (insertErr) {
    console.error("[rounds] failed to insert transit row", insertErr);
    return fail(500, "Failed to place player in transit.");
  }
  return done({ arrives_at: arrivesAt.toISOString() });
}

// Expose supabaseServer for the route handlers that need it directly.
export { supabaseServer };
