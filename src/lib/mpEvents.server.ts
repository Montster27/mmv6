import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { supabaseServer } from "@/lib/supabase/server";
import type {
  MpEventDetail,
  MpEventListEntry,
  MpEventLocation,
  MpEventStatus,
} from "@/types/mpEvents";

// ─────────────────────────────────────────────────────────────────────
// Coordinated-events server logic (MP-02). Reads only at this stage — the
// heatmap is view-only. Untyped `.from("mp_events")` with manual casts,
// matching the clubs/newsnet precedent (the Supabase client is untyped).
// ─────────────────────────────────────────────────────────────────────

// Resolve the bearer-token user, matching /api/clubs and /api/newsnet/*.
export async function getAuthedUser(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : undefined;
  if (!token) return null;
  const { data, error } = await supabaseServer.auth.getUser(token);
  if (error) {
    console.error("[events] failed to verify token", error);
    return null;
  }
  return data.user;
}

type EventRow = {
  id: string;
  name: string;
  description: string | null;
  status: MpEventStatus;
  scheduled_at: string | null;
  sponsoring_club_id: string;
};

const EVENT_COLUMNS =
  "id,name,description,status,scheduled_at,sponsoring_club_id";

async function fetchClubNames(
  client: SupabaseClient,
  ids: string[]
): Promise<Map<string, string | null>> {
  const map = new Map<string, string | null>();
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return map;
  const { data, error } = await client
    .from("clubs")
    .select("id,name")
    .in("id", unique);
  if (error) {
    console.error("[events] failed to load club names", error);
    return map;
  }
  for (const row of (data ?? []) as { id: string; name: string | null }[]) {
    map.set(row.id, row.name ?? null);
  }
  return map;
}

// All events, newest first, with the sponsoring club name resolved.
export async function listEvents(
  client: SupabaseClient
): Promise<MpEventListEntry[]> {
  const { data, error } = await client
    .from("mp_events")
    .select(EVENT_COLUMNS)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[events] failed to list events", error);
    return [];
  }
  const rows = (data ?? []) as EventRow[];
  const names = await fetchClubNames(
    client,
    rows.map((r) => r.sponsoring_club_id)
  );
  return rows.map((r) => ({
    ...r,
    sponsoring_club_name: names.get(r.sponsoring_club_id) ?? null,
  }));
}

// Single event with its sponsoring club name and locations ordered by
// display_order. Returns null when the event id is unknown (or malformed,
// in which case the underlying query errors and we log + return null).
export async function getEventDetail(
  client: SupabaseClient,
  eventId: string
): Promise<MpEventDetail | null> {
  const { data: eventRow, error } = await client
    .from("mp_events")
    .select(EVENT_COLUMNS)
    .eq("id", eventId)
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[events] failed to load event detail", error);
    return null;
  }
  if (!eventRow) return null;
  const event = eventRow as EventRow;

  const [locationsResp, names] = await Promise.all([
    client
      .from("mp_event_locations")
      .select("id,event_id,name,location_type,state,display_order")
      .eq("event_id", eventId)
      .order("display_order", { ascending: true }),
    fetchClubNames(client, [event.sponsoring_club_id]),
  ]);
  if (locationsResp.error) {
    console.error("[events] failed to load event locations", locationsResp.error);
  }
  const locations = (locationsResp.data ?? []) as MpEventLocation[];

  return {
    ...event,
    sponsoring_club_name: names.get(event.sponsoring_club_id) ?? null,
    locations,
  };
}
