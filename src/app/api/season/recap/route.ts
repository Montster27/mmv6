import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase/server";
import { buildWorldDrift } from "@/core/season/worldDrift";
import type { PersonalRecap, WorldDriftRecap } from "@/types/recap";

type SeasonRow = {
  season_index: number;
  starts_at: string;
  ends_at: string;
};

function toUtcDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00Z`);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function toDateKey(value: string): string {
  return new Date(value).toISOString().slice(0, 10);
}

async function getUserFromToken(token?: string) {
  if (!token) return null;
  const { data, error } = await supabaseServer.auth.getUser(token);
  if (error) {
    console.error("Failed to verify user token", error);
    return null;
  }
  return data.user;
}

async function loadSeason(seasonIndex: number): Promise<SeasonRow | null> {
  const { data, error } = await supabaseServer
    .from("seasons")
    .select("season_index,starts_at,ends_at")
    .eq("season_index", seasonIndex)
    .limit(1)
    .maybeSingle<SeasonRow>();
  if (error) {
    console.error("Failed to load season", error);
    return null;
  }
  return data ?? null;
}

async function loadLatestSeason(): Promise<SeasonRow | null> {
  const { data, error } = await supabaseServer
    .from("seasons")
    .select("season_index,starts_at,ends_at")
    .order("season_index", { ascending: false })
    .limit(1)
    .maybeSingle<SeasonRow>();
  if (error) {
    console.error("Failed to load latest season", error);
    return null;
  }
  return data ?? null;
}

async function buildPersonalRecap(
  userId: string,
  season: SeasonRow
): Promise<PersonalRecap> {
  const start = toUtcDate(season.starts_at);
  const endExclusive = addDays(toUtcDate(season.ends_at), 1);

  const { data: sessionEvents } = await supabaseServer
    .from("events")
    .select("ts")
    .eq("user_id", userId)
    .eq("event_type", "session_start")
    .gte("ts", start.toISOString())
    .lt("ts", endExclusive.toISOString());

  const daysPlayedSet = new Set<string>(
    (sessionEvents ?? []).map((row) => toDateKey(row.ts))
  );

  const { data: completionEvents } = await supabaseServer
    .from("events")
    .select("ts")
    .eq("user_id", userId)
    .eq("event_type", "stage_complete")
    .eq("stage", "complete")
    .gte("ts", start.toISOString())
    .lt("ts", endExclusive.toISOString());

  const completionDays = new Set<string>(
    (completionEvents ?? []).map((row) => toDateKey(row.ts))
  );

  const { data: anomalies } = await supabaseServer
    .from("user_anomalies")
    .select("id")
    .eq("user_id", userId)
    .gte("discovered_at", start.toISOString())
    .lt("discovered_at", endExclusive.toISOString());

  const { data: hypotheses } = await supabaseServer
    .from("hypotheses")
    .select("id")
    .eq("user_id", userId)
    .gte("created_at", start.toISOString())
    .lt("created_at", endExclusive.toISOString());

  const { data: boosts } = await supabaseServer
    .from("social_actions")
    .select("id")
    .eq("from_user_id", userId)
    .eq("action_type", "boost")
    .gte("created_at", start.toISOString())
    .lt("created_at", endExclusive.toISOString());

  const daysPlayed = daysPlayedSet.size;
  const completions = completionDays.size;
  const completionRate = daysPlayed > 0 ? (completions / daysPlayed) * 100 : null;

  return {
    seasonIndex: season.season_index,
    daysPlayed,
    completionRate,
    anomaliesFound: anomalies?.length ?? 0,
    hypothesesWritten: hypotheses?.length ?? 0,
    boostsSent: boosts?.length ?? 0,
  };
}

async function buildWorldRecap(season: SeasonRow): Promise<WorldDriftRecap> {
  const start = toUtcDate(season.starts_at);
  const endExclusive = addDays(toUtcDate(season.ends_at), 1);

  const { data: sessionEvents } = await supabaseServer
    .from("events")
    .select("user_id,ts")
    .eq("event_type", "session_start")
    .gte("ts", start.toISOString())
    .lt("ts", endExclusive.toISOString());

  const activeUsers = new Set<string>((sessionEvents ?? []).map((row) => row.user_id));

  const { data: completionEvents } = await supabaseServer
    .from("events")
    .select("user_id")
    .eq("event_type", "stage_complete")
    .eq("stage", "complete")
    .gte("ts", start.toISOString())
    .lt("ts", endExclusive.toISOString());

  const completionUsers = new Set<string>(
    (completionEvents ?? []).map((row) => row.user_id)
  );

  const { data: boostEvents } = await supabaseServer
    .from("social_actions")
    .select("id")
    .eq("action_type", "boost")
    .gte("created_at", start.toISOString())
    .lt("created_at", endExclusive.toISOString());

  const { data: anomalyEvents } = await supabaseServer
    .from("user_anomalies")
    .select("id")
    .gte("discovered_at", start.toISOString())
    .lt("discovered_at", endExclusive.toISOString());

  const { data: sessionEndEvents } = await supabaseServer
    .from("events")
    .select("user_id,ts,event_type")
    .in("event_type", ["session_start", "session_end"])
    .gte("ts", start.toISOString())
    .lt("ts", endExclusive.toISOString());

  const sessionTimes = new Map<string, { start?: number; end?: number }>();
  for (const event of sessionEndEvents ?? []) {
    const dayKey = toDateKey(event.ts);
    const key = `${dayKey}:${event.user_id}`;
    const entry = sessionTimes.get(key) ?? {};
    const ts = Date.parse(event.ts);
    if (Number.isNaN(ts)) continue;
    if (event.event_type === "session_start") {
      entry.start = entry.start ? Math.min(entry.start, ts) : ts;
    } else if (event.event_type === "session_end") {
      entry.end = entry.end ? Math.max(entry.end, ts) : ts;
    }
    sessionTimes.set(key, entry);
  }

  let totalSessionDuration = 0;
  let sessionCount = 0;
  for (const entry of sessionTimes.values()) {
    if (entry.start && entry.end && entry.end >= entry.start) {
      totalSessionDuration += entry.end - entry.start;
      sessionCount += 1;
    }
  }

  const activeCount = activeUsers.size;
  const completionRate =
    activeCount > 0 ? (completionUsers.size / activeCount) * 100 : null;
  const boostsPerActive =
    activeCount > 0 ? (boostEvents?.length ?? 0) / activeCount : null;
  const anomaliesPerActive =
    activeCount > 0 ? (anomalyEvents?.length ?? 0) / activeCount : null;
  const avgSessionDurationMs =
    sessionCount > 0 ? totalSessionDuration / sessionCount : null;

  return buildWorldDrift({
    completionRate,
    boostsPerActive,
    anomaliesPerActive,
    avgSessionDurationMs,
  });
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : undefined;
  const user = await getUserFromToken(token);
  if (!user) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const seasonParam = Number(searchParams.get("season_index"));
  const latestSeason = await loadLatestSeason();
  const seasonIndex = Number.isFinite(seasonParam)
    ? seasonParam
    : Math.max(1, (latestSeason?.season_index ?? 1) - 1);

  const season = await loadSeason(seasonIndex);
  if (!season) {
    return NextResponse.json({ error: "Season not found" }, { status: 404 });
  }

  const { data: existing } = await supabaseServer
    .from("season_recaps")
    .select("personal,world")
    .eq("user_id", user.id)
    .eq("season_index", seasonIndex)
    .limit(1)
    .maybeSingle();

  if (existing?.personal && existing?.world) {
    return NextResponse.json({ personal: existing.personal, world: existing.world });
  }

  const personal = await buildPersonalRecap(user.id, season);
  const world = await buildWorldRecap(season);

  await supabaseServer
    .from("season_recaps")
    .upsert(
      {
        user_id: user.id,
        season_index: seasonIndex,
        personal,
        world,
      },
      { onConflict: "user_id,season_index" }
    );

  return NextResponse.json({ personal, world });
}
