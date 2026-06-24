import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getAuthedUser } from "@/lib/mpEvents.server";
import { canSelfSelect, isCoordinator } from "@/lib/mpAssignments";
import type {
  AssignmentSource,
  EventPresence,
  LocationPresence,
  PresentPlayer,
  RosterMember,
  ViewerAssignment,
} from "@/types/mpAssignments";

// ─────────────────────────────────────────────────────────────────────
// Coordinated-events assignment server logic (MP-03). All writes are
// service-role-mediated and run here so the route handlers stay thin.
// Authorization (coordinator-only assigns/unassigns, self-only
// self-select/leave) is enforced in code — there are no client write RLS
// policies. Untyped `.from()` + manual casts, matching the clubs / mpEvents
// precedent. Moving a player is delete-then-insert (mirrors the clubs
// membership-move precedent); UNIQUE(event_id, player_id) is the backstop.
// ─────────────────────────────────────────────────────────────────────

// The events subsystem shares one bearer-token resolver; re-export it so the
// assignment routes import auth + actions from this single module.
export { getAuthedUser };

export type AssignError = { ok: false; status: number; error: string };
export type AssignOk<T> = { ok: true; data: T };
export type AssignResult<T> = AssignOk<T> | AssignError;

const fail = (status: number, error: string): AssignError => ({
  ok: false,
  status,
  error,
});
const done = <T>(data: T): AssignOk<T> => ({ ok: true, data });

const UNIQUE_VIOLATION = "23505";
const FK_VIOLATION = "23503";

// ─── Internal helpers ────────────────────────────────────────────────

type EventClub = { club_id: string; coordinator_id: string | null };

// Resolve an event's sponsoring club and its coordinator (the club founder)
// in one place. Returns null when the event id is unknown.
async function getEventClub(
  client: SupabaseClient,
  eventId: string
): Promise<EventClub | null> {
  const { data: eventRow, error: eventErr } = await client
    .from("mp_events")
    .select("sponsoring_club_id")
    .eq("id", eventId)
    .limit(1)
    .maybeSingle();
  if (eventErr) {
    console.error("[assignments] failed to load event", eventErr);
    return null;
  }
  if (!eventRow) return null;
  const clubId = (eventRow as { sponsoring_club_id: string }).sponsoring_club_id;

  const { data: clubRow, error: clubErr } = await client
    .from("clubs")
    .select("founder_player_id")
    .eq("id", clubId)
    .limit(1)
    .maybeSingle();
  if (clubErr) {
    console.error("[assignments] failed to load sponsoring club", clubErr);
    return { club_id: clubId, coordinator_id: null };
  }
  return {
    club_id: clubId,
    coordinator_id:
      (clubRow as { founder_player_id: string | null } | null)
        ?.founder_player_id ?? null,
  };
}

// Coordinator = founder of the event's sponsoring club. null when the event
// is unknown or the club has no founder yet (e.g. the SCA before an admin
// seats one). A null coordinator fails coordinator-gated actions closed.
export async function getEventCoordinator(
  client: SupabaseClient,
  eventId: string
): Promise<string | null> {
  const eventClub = await getEventClub(client, eventId);
  return eventClub?.coordinator_id ?? null;
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
    console.error("[assignments] failed to load display names", error);
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

type ExistingAssignment = {
  location_id: string;
  assignment_source: AssignmentSource;
};

async function fetchAssignment(
  client: SupabaseClient,
  eventId: string,
  playerId: string
): Promise<ExistingAssignment | null> {
  const { data, error } = await client
    .from("mp_event_assignments")
    .select("location_id,assignment_source")
    .eq("event_id", eventId)
    .eq("player_id", playerId)
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[assignments] failed to load assignment", error);
    return null;
  }
  return (data as ExistingAssignment | null) ?? null;
}

// Confirm a location belongs to the event before assigning to it.
async function locationBelongsToEvent(
  client: SupabaseClient,
  eventId: string,
  locationId: string
): Promise<boolean> {
  const { data, error } = await client
    .from("mp_event_locations")
    .select("id")
    .eq("id", locationId)
    .eq("event_id", eventId)
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[assignments] failed to verify location", error);
    return false;
  }
  return Boolean(data);
}

async function isClubMember(
  client: SupabaseClient,
  clubId: string,
  playerId: string
): Promise<boolean> {
  const { data, error } = await client
    .from("club_members")
    .select("id")
    .eq("club_id", clubId)
    .eq("player_id", playerId)
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[assignments] failed to verify club membership", error);
    return false;
  }
  return Boolean(data);
}

// Delete-then-insert: clears any existing assignment for (event, player)
// then writes the new one. Mirrors the clubs membership-move precedent.
async function placeAssignment(
  client: SupabaseClient,
  row: {
    event_id: string;
    location_id: string;
    player_id: string;
    assignment_source: AssignmentSource;
    assigned_by_player_id: string | null;
  }
): Promise<AssignError | null> {
  await client
    .from("mp_event_assignments")
    .delete()
    .eq("event_id", row.event_id)
    .eq("player_id", row.player_id);
  const { error } = await client.from("mp_event_assignments").insert(row);
  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return fail(409, "That player already has an assignment for this event.");
    }
    if (error.code === FK_VIOLATION) {
      return fail(400, "Unknown event, location, or player.");
    }
    console.error("[assignments] failed to place assignment", error);
    return fail(500, "Failed to record assignment.");
  }
  return null;
}

// ─── Mutations ───────────────────────────────────────────────────────

// Coordinator-only. Deploys a sponsoring-club member to a location.
export async function assignMember(
  client: SupabaseClient,
  eventId: string,
  locationId: unknown,
  playerId: unknown,
  callerId: string
): Promise<AssignResult<{ event_id: string; location_id: string; player_id: string }>> {
  if (typeof locationId !== "string" || locationId.length === 0) {
    return fail(400, "location_id is required.");
  }
  if (typeof playerId !== "string" || playerId.length === 0) {
    return fail(400, "player_id is required.");
  }

  const eventClub = await getEventClub(client, eventId);
  if (!eventClub) return fail(404, "Event not found.");
  if (!isCoordinator(callerId, eventClub.coordinator_id)) {
    return fail(403, "Only the event coordinator can assign members.");
  }
  if (!(await locationBelongsToEvent(client, eventId, locationId))) {
    return fail(400, "That location isn't part of this event.");
  }
  if (!(await isClubMember(client, eventClub.club_id, playerId))) {
    return fail(400, "That player isn't a member of the sponsoring club.");
  }

  const placeErr = await placeAssignment(client, {
    event_id: eventId,
    location_id: locationId,
    player_id: playerId,
    assignment_source: "coordinator",
    assigned_by_player_id: callerId,
  });
  if (placeErr) return placeErr;

  return done({ event_id: eventId, location_id: locationId, player_id: playerId });
}

// Coordinator-only. Removes a player's assignment for this event.
export async function unassignMember(
  client: SupabaseClient,
  eventId: string,
  playerId: unknown,
  callerId: string
): Promise<AssignResult<{ player_id: string }>> {
  if (typeof playerId !== "string" || playerId.length === 0) {
    return fail(400, "player_id is required.");
  }

  const coordinatorId = await getEventCoordinator(client, eventId);
  if (coordinatorId === null) return fail(404, "Event not found.");
  if (!isCoordinator(callerId, coordinatorId)) {
    return fail(403, "Only the event coordinator can unassign members.");
  }

  const { error } = await client
    .from("mp_event_assignments")
    .delete()
    .eq("event_id", eventId)
    .eq("player_id", playerId);
  if (error) {
    console.error("[assignments] failed to unassign member", error);
    return fail(500, "Failed to unassign member.");
  }
  return done({ player_id: playerId });
}

// Caller acts on themselves. Any authenticated player may self-select (need
// not be in the sponsoring club), unless the coordinator has placed them.
export async function selfSelectLocation(
  client: SupabaseClient,
  eventId: string,
  locationId: unknown,
  callerId: string
): Promise<AssignResult<{ location_id: string }>> {
  if (typeof locationId !== "string" || locationId.length === 0) {
    return fail(400, "location_id is required.");
  }

  if (!(await locationBelongsToEvent(client, eventId, locationId))) {
    return fail(400, "That location isn't part of this event.");
  }

  const existing = await fetchAssignment(client, eventId, callerId);
  if (!canSelfSelect(existing ? { source: existing.assignment_source } : null)) {
    return fail(409, "The coordinator has placed you. Ask them to move you.");
  }

  const placeErr = await placeAssignment(client, {
    event_id: eventId,
    location_id: locationId,
    player_id: callerId,
    assignment_source: "self_selected",
    assigned_by_player_id: null,
  });
  if (placeErr) return placeErr;

  return done({ location_id: locationId });
}

// Caller removes their own assignment (either source).
export async function leaveLocation(
  client: SupabaseClient,
  eventId: string,
  callerId: string
): Promise<AssignResult<{ left: boolean }>> {
  const { error } = await client
    .from("mp_event_assignments")
    .delete()
    .eq("event_id", eventId)
    .eq("player_id", callerId);
  if (error) {
    console.error("[assignments] failed to leave location", error);
    return fail(500, "Failed to leave location.");
  }
  return done({ left: true });
}

// ─── Reads ───────────────────────────────────────────────────────────

// Presence for the heatmap, folded into the event detail response. Returns
// per-location present players, viewer-relative flags, and — for a
// coordinator viewer — the full sponsoring-club roster with each member's
// current assignment. "Online" is not modelled: the roster lists every
// sponsoring-club member regardless of activity (the simpler MP-03 slice).
export async function getEventPresence(
  client: SupabaseClient,
  eventId: string,
  viewerId: string
): Promise<EventPresence> {
  const eventClub = await getEventClub(client, eventId);
  const coordinatorId = eventClub?.coordinator_id ?? null;
  const viewerIsCoordinator = isCoordinator(viewerId, coordinatorId);

  const { data: assignData, error: assignErr } = await client
    .from("mp_event_assignments")
    .select("player_id,location_id,assignment_source")
    .eq("event_id", eventId);
  if (assignErr) {
    console.error("[assignments] failed to load presence", assignErr);
  }
  const assignments = (assignData ?? []) as {
    player_id: string;
    location_id: string;
    assignment_source: AssignmentSource;
  }[];

  let memberIds: string[] = [];
  if (viewerIsCoordinator && eventClub) {
    const { data: memberData, error: memberErr } = await client
      .from("club_members")
      .select("player_id")
      .eq("club_id", eventClub.club_id);
    if (memberErr) {
      console.error("[assignments] failed to load club roster", memberErr);
    }
    memberIds = ((memberData ?? []) as { player_id: string }[]).map(
      (m) => m.player_id
    );
  }

  const names = await fetchDisplayNames(client, [
    ...assignments.map((a) => a.player_id),
    ...memberIds,
  ]);

  const byLocation = new Map<string, PresentPlayer[]>();
  const byPlayer = new Map<
    string,
    { location_id: string; source: AssignmentSource }
  >();
  for (const a of assignments) {
    const player: PresentPlayer = {
      player_id: a.player_id,
      display_name: names.get(a.player_id) ?? null,
      source: a.assignment_source,
    };
    const list = byLocation.get(a.location_id) ?? [];
    list.push(player);
    byLocation.set(a.location_id, list);
    byPlayer.set(a.player_id, {
      location_id: a.location_id,
      source: a.assignment_source,
    });
  }

  const presence: LocationPresence[] = [...byLocation.entries()].map(
    ([location_id, players]) => ({ location_id, players })
  );

  const viewerCurrent = byPlayer.get(viewerId) ?? null;
  const viewerAssignment: ViewerAssignment | null = viewerCurrent
    ? { location_id: viewerCurrent.location_id, source: viewerCurrent.source }
    : null;

  let roster: RosterMember[] = [];
  if (viewerIsCoordinator) {
    roster = memberIds.map((pid) => ({
      player_id: pid,
      display_name: names.get(pid) ?? null,
      current: byPlayer.get(pid) ?? null,
    }));
    roster.sort((a, b) =>
      (a.display_name ?? "").localeCompare(b.display_name ?? "")
    );
  }

  return {
    coordinator_player_id: coordinatorId,
    viewer_is_coordinator: viewerIsCoordinator,
    viewer_assignment: viewerAssignment,
    presence,
    roster,
  };
}
