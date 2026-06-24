import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getAuthedUser } from "@/lib/mpEvents.server";
import { supabaseServer } from "@/lib/supabase/server";
import {
  computePressure,
  hasSkill,
  selectResolveText,
} from "@/lib/mpEncounters";
import type {
  EncounterResult,
  EncounterRun,
  EncounterView,
  LocationGameDef,
  ReframeOption,
} from "@/types/mpEncounters";

export { getAuthedUser, supabaseServer };

// ─── Result types (mirror mpRounds.server.ts RoundResult pattern) ─────
export type EncounterActionError = { ok: false; status: number; error: string };
export type EncounterActionOk<T> = { ok: true; data: T };
export type EncounterActionResult<T> =
  | EncounterActionOk<T>
  | EncounterActionError;

const fail = (status: number, error: string): EncounterActionError => ({
  ok: false,
  status,
  error,
});
const done = <T>(data: T): EncounterActionOk<T> => ({ ok: true, data });

// ─── Internal helpers ─────────────────────────────────────────────────

async function fetchTrainedSkills(
  client: SupabaseClient,
  userId: string
): Promise<string[]> {
  const { data, error } = await client
    .from("player_skills")
    .select("skill_id")
    .eq("user_id", userId)
    .eq("status", "trained");
  if (error) {
    console.error("[encounters] failed to fetch player skills", error);
    return [];
  }
  return ((data ?? []) as { skill_id: string }[]).map((r) => r.skill_id);
}

async function isPlayerPresent(
  client: SupabaseClient,
  eventId: string,
  locationId: string,
  userId: string
): Promise<boolean> {
  const { data } = await client
    .from("mp_event_assignments")
    .select("player_id")
    .eq("event_id", eventId)
    .eq("location_id", locationId)
    .eq("player_id", userId)
    .limit(1)
    .maybeSingle();
  return data !== null;
}

async function fetchGameDef(
  client: SupabaseClient,
  eventId: string,
  locationId: string
): Promise<LocationGameDef | null> {
  const { data, error } = await client
    .from("mp_location_games")
    .select(
      "id,event_id,location_id,kind,objection_text,insight_skill_id,insight_text,options"
    )
    .eq("event_id", eventId)
    .eq("location_id", locationId)
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[encounters] failed to fetch location game", error);
    return null;
  }
  if (!data) return null;
  const row = data as {
    id: string;
    event_id: string;
    location_id: string;
    kind: string;
    objection_text: string;
    insight_skill_id: string | null;
    insight_text: string | null;
    options: unknown;
  };
  return {
    id: row.id,
    event_id: row.event_id,
    location_id: row.location_id,
    kind: row.kind as "reframe_legitimize",
    objection_text: row.objection_text,
    insight_skill_id: row.insight_skill_id,
    insight_text: row.insight_text,
    options: row.options as ReframeOption[],
  };
}

async function fetchCurrentRound(
  client: SupabaseClient,
  eventId: string
): Promise<{ round_number: number; phase: string } | null> {
  const { data } = await client
    .from("mp_event_rounds")
    .select("round_number,phase")
    .eq("event_id", eventId)
    .limit(1)
    .maybeSingle();
  return (data as { round_number: number; phase: string } | null) ?? null;
}

async function fetchExistingRun(
  client: SupabaseClient,
  eventId: string,
  locationId: string,
  userId: string,
  roundNumber: number
): Promise<EncounterRun | null> {
  const { data } = await client
    .from("mp_encounter_runs")
    .select("option_id,pressure_contribution,resolved_text,round_number")
    .eq("event_id", eventId)
    .eq("location_id", locationId)
    .eq("player_id", userId)
    .eq("round_number", roundNumber)
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const row = data as {
    option_id: string;
    pressure_contribution: number;
    resolved_text: string;
    round_number: number;
  };
  return {
    option_id: row.option_id,
    pressure_contribution: row.pressure_contribution,
    resolved_text: row.resolved_text,
    round_number: row.round_number,
  };
}

// ─── Public: GET ──────────────────────────────────────────────────────

export async function getEncounterView(
  client: SupabaseClient,
  eventId: string,
  locationId: string,
  userId: string
): Promise<EncounterActionResult<EncounterView>> {
  const [gameDef, trainedSkills, roundRow] = await Promise.all([
    fetchGameDef(client, eventId, locationId),
    fetchTrainedSkills(client, userId),
    fetchCurrentRound(client, eventId),
  ]);

  if (!gameDef) {
    return fail(404, "No encounter game for this location.");
  }
  if (!roundRow) {
    return fail(404, "No round state for this event.");
  }

  const present = await isPlayerPresent(client, eventId, locationId, userId);
  if (!present) {
    return fail(403, "You must be present at this location to view its encounter.");
  }

  const myRun = await fetchExistingRun(
    client,
    eventId,
    locationId,
    userId,
    roundRow.round_number
  );

  return done({
    game: gameDef,
    insight_unlocked: hasSkill(trainedSkills, gameDef.insight_skill_id),
    options_with_skill: gameDef.options.map((opt) => ({
      ...opt,
      has_skill: hasSkill(trainedSkills, opt.skill_key),
    })),
    already_run_this_round: myRun !== null,
    my_run: myRun,
  });
}

// ─── Public: POST ─────────────────────────────────────────────────────
// Server owns skill math and pressure outcome — never trust client-supplied
// pressure values. Only option_id comes from the client.

export async function runEncounterAction(
  client: SupabaseClient,
  eventId: string,
  locationId: string,
  userId: string,
  optionId: unknown
): Promise<EncounterActionResult<EncounterResult>> {
  if (typeof optionId !== "string" || optionId.length === 0) {
    return fail(400, "option_id is required.");
  }

  const [gameDef, trainedSkills, roundRow] = await Promise.all([
    fetchGameDef(client, eventId, locationId),
    fetchTrainedSkills(client, userId),
    fetchCurrentRound(client, eventId),
  ]);

  if (!gameDef) return fail(404, "No encounter game for this location.");
  if (!roundRow) return fail(404, "No round state for this event.");
  if (roundRow.phase !== "active") {
    return fail(409, "Encounters can only be run during an active round.");
  }

  const present = await isPlayerPresent(client, eventId, locationId, userId);
  if (!present) {
    return fail(403, "You must be present at this location to run the encounter.");
  }

  const option = gameDef.options.find((o) => o.id === optionId);
  if (!option) return fail(400, "Unknown option_id.");

  const playerHasSkill = hasSkill(trainedSkills, option.skill_key);
  const pressure = computePressure(option, playerHasSkill);
  const resolvedText = selectResolveText(option, playerHasSkill);

  const { error: insertErr } = await client.from("mp_encounter_runs").insert({
    event_id: eventId,
    location_id: locationId,
    player_id: userId,
    round_number: roundRow.round_number,
    option_id: optionId,
    pressure_contribution: pressure,
    resolved_text: resolvedText,
  });

  if (insertErr) {
    if (insertErr.code === "23505") {
      return fail(409, "You've already run the encounter for this round.");
    }
    console.error("[encounters] failed to insert encounter run", insertErr);
    return fail(500, "Failed to record encounter run.");
  }

  return done({ pressure_contribution: pressure, resolved_text: resolvedText });
}
