import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { supabaseServer } from "@/lib/supabase/server";
import { canResolveApplication, validateClubInput } from "@/lib/clubs";
import type {
  Club,
  ClubApplication,
  ClubApplicationStatus,
  ClubApplicationView,
  ClubDetail,
  ClubDirectoryEntry,
  ClubMemberView,
  CurrentClub,
} from "@/types/clubs";

// ─────────────────────────────────────────────────────────────────────
// Clubs server logic (MP-01). All writes are service-role-mediated and run
// here so the route handlers stay thin. Membership is one-club-per-player
// (DB UNIQUE on club_members.player_id); the "SCA" is the seeded default
// club identified by is_system_seeded = true.
// ─────────────────────────────────────────────────────────────────────

export type ClubError = { ok: false; status: number; error: string };
export type ClubOk<T> = { ok: true; data: T };
export type ClubResult<T> = ClubOk<T> | ClubError;

const fail = (status: number, error: string): ClubError => ({
  ok: false,
  status,
  error,
});
const done = <T>(data: T): ClubOk<T> => ({ ok: true, data });

const UNIQUE_VIOLATION = "23505";
const FK_VIOLATION = "23503";

// ─── Auth ────────────────────────────────────────────────────────────

// Resolve the bearer-token user, matching the convention in
// /api/bootstrap and /api/newsnet/*.
export async function getAuthedUser(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : undefined;
  if (!token) return null;
  const { data, error } = await supabaseServer.auth.getUser(token);
  if (error) {
    console.error("[clubs] failed to verify token", error);
    return null;
  }
  return data.user;
}

// ─── Internal helpers ────────────────────────────────────────────────

type MembershipRow = { id: string; club_id: string };

async function fetchMembership(
  client: SupabaseClient,
  playerId: string
): Promise<MembershipRow | null> {
  const { data, error } = await client
    .from("club_members")
    .select("id,club_id")
    .eq("player_id", playerId)
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[clubs] failed to load membership", error);
    return null;
  }
  return (data as MembershipRow | null) ?? null;
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
    console.error("[clubs] failed to load display names", error);
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

async function assertFounder(
  client: SupabaseClient,
  clubId: string,
  userId: string
): Promise<ClubError | null> {
  const { data, error } = await client
    .from("clubs")
    .select("founder_player_id")
    .eq("id", clubId)
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[clubs] failed to load club for founder check", error);
    return fail(500, "Failed to verify founder.");
  }
  if (!data) return fail(404, "Club not found.");
  if ((data as { founder_player_id: string | null }).founder_player_id !== userId) {
    return fail(403, "Only the club founder can do that.");
  }
  return null;
}

// ─── Mutations ───────────────────────────────────────────────────────

// Caller becomes founder + first member. Blocked if already in a non-SCA
// club (must leave first); SCA membership is dropped automatically.
export async function createClub(
  client: SupabaseClient,
  userId: string,
  input: {
    name?: unknown;
    description?: unknown;
    is_open_to_applications?: unknown;
  }
): Promise<ClubResult<Club>> {
  const validation = validateClubInput(input);
  if (!validation.ok) return fail(400, validation.error);
  const { name, description } = validation.value;
  const isOpen =
    input.is_open_to_applications === undefined
      ? true
      : Boolean(input.is_open_to_applications);

  const membership = await fetchMembership(client, userId);
  let dropMembershipId: string | null = null;
  if (membership) {
    const { data: currentClub } = await client
      .from("clubs")
      .select("is_system_seeded")
      .eq("id", membership.club_id)
      .limit(1)
      .maybeSingle();
    const seeded = Boolean(
      (currentClub as { is_system_seeded?: boolean } | null)?.is_system_seeded
    );
    if (!seeded) {
      return fail(409, "Leave your current club before founding a new one.");
    }
    // In the SCA — that membership is auto-dropped on founding.
    dropMembershipId = membership.id;
  }

  // Insert the club first; a duplicate-name failure then leaves the caller's
  // existing membership untouched.
  const { data: clubRow, error: insertErr } = await client
    .from("clubs")
    .insert({
      name,
      description,
      is_open_to_applications: isOpen,
      is_system_seeded: false,
      founder_player_id: userId,
    })
    .select("*")
    .single();

  if (insertErr) {
    if (insertErr.code === UNIQUE_VIOLATION) {
      return fail(409, "A club with that name already exists.");
    }
    console.error("[clubs] failed to insert club", insertErr);
    return fail(500, "Failed to create club.");
  }
  const club = clubRow as Club;

  // Move membership: drop SCA (if any) then join the new club. Order matters
  // because club_members.player_id is UNIQUE.
  if (dropMembershipId) {
    await client.from("club_members").delete().eq("id", dropMembershipId);
  }
  const { error: memberErr } = await client
    .from("club_members")
    .insert({ club_id: club.id, player_id: userId });
  if (memberErr) {
    console.error("[clubs] failed to add founder as member", memberErr);
    return fail(500, "Club created but joining failed.");
  }

  return done(club);
}

// Create a pending application. Caller must not already be a member of the
// club, the club must be open, and there must be no existing pending row.
export async function applyToClub(
  client: SupabaseClient,
  userId: string,
  clubId: unknown
): Promise<ClubResult<ClubApplication>> {
  if (typeof clubId !== "string" || clubId.length === 0) {
    return fail(400, "club_id is required.");
  }

  const { data: clubRow, error: clubErr } = await client
    .from("clubs")
    .select("id,is_open_to_applications")
    .eq("id", clubId)
    .limit(1)
    .maybeSingle();
  if (clubErr) {
    console.error("[clubs] failed to load club for apply", clubErr);
    return fail(500, "Failed to load club.");
  }
  if (!clubRow) return fail(404, "Club not found.");
  if (!(clubRow as { is_open_to_applications: boolean }).is_open_to_applications) {
    return fail(409, "This club isn't accepting applications.");
  }

  const { data: existingMember } = await client
    .from("club_members")
    .select("id")
    .eq("player_id", userId)
    .eq("club_id", clubId)
    .limit(1)
    .maybeSingle();
  if (existingMember) {
    return fail(409, "You're already a member of this club.");
  }

  const { data: existingApp } = await client
    .from("club_applications")
    .select("id")
    .eq("club_id", clubId)
    .eq("applicant_player_id", userId)
    .eq("status", "pending")
    .limit(1)
    .maybeSingle();
  if (existingApp) {
    return fail(409, "You already have a pending application to this club.");
  }

  const { data: appRow, error: insertErr } = await client
    .from("club_applications")
    .insert({ club_id: clubId, applicant_player_id: userId, status: "pending" })
    .select("*")
    .single();
  if (insertErr) {
    if (insertErr.code === UNIQUE_VIOLATION) {
      return fail(409, "You already have a pending application to this club.");
    }
    console.error("[clubs] failed to insert application", insertErr);
    return fail(500, "Failed to apply.");
  }
  return done(appRow as ClubApplication);
}

// Founder-only. Moves the applicant into the club (dropping any current
// membership) and marks the application accepted.
export async function acceptApplication(
  client: SupabaseClient,
  userId: string,
  applicationId: unknown
): Promise<ClubResult<{ club_id: string; applicant_player_id: string }>> {
  if (typeof applicationId !== "string" || applicationId.length === 0) {
    return fail(400, "application_id is required.");
  }

  const { data: appRow, error: appErr } = await client
    .from("club_applications")
    .select("id,club_id,applicant_player_id,status")
    .eq("id", applicationId)
    .limit(1)
    .maybeSingle();
  if (appErr) {
    console.error("[clubs] failed to load application", appErr);
    return fail(500, "Failed to load application.");
  }
  if (!appRow) return fail(404, "Application not found.");
  const app = appRow as {
    id: string;
    club_id: string;
    applicant_player_id: string;
    status: ClubApplicationStatus;
  };
  if (!canResolveApplication(app.status)) {
    return fail(409, "This application has already been resolved.");
  }

  const founderError = await assertFounder(client, app.club_id, userId);
  if (founderError) return founderError;

  // Drop the applicant's current membership (incl. SCA), then join this club.
  await client
    .from("club_members")
    .delete()
    .eq("player_id", app.applicant_player_id);
  const { error: memberErr } = await client
    .from("club_members")
    .insert({ club_id: app.club_id, player_id: app.applicant_player_id });
  if (memberErr) {
    console.error("[clubs] failed to add accepted member", memberErr);
    return fail(500, "Failed to add member.");
  }

  const { error: updateErr } = await client
    .from("club_applications")
    .update({ status: "accepted", resolved_at: new Date().toISOString() })
    .eq("id", app.id);
  if (updateErr) {
    console.error("[clubs] failed to mark application accepted", updateErr);
    return fail(500, "Member added but updating the application failed.");
  }

  return done({
    club_id: app.club_id,
    applicant_player_id: app.applicant_player_id,
  });
}

// Founder-only. Marks the application rejected; the applicant may re-apply.
export async function rejectApplication(
  client: SupabaseClient,
  userId: string,
  applicationId: unknown
): Promise<ClubResult<{ id: string }>> {
  if (typeof applicationId !== "string" || applicationId.length === 0) {
    return fail(400, "application_id is required.");
  }

  const { data: appRow, error: appErr } = await client
    .from("club_applications")
    .select("id,club_id,status")
    .eq("id", applicationId)
    .limit(1)
    .maybeSingle();
  if (appErr) {
    console.error("[clubs] failed to load application", appErr);
    return fail(500, "Failed to load application.");
  }
  if (!appRow) return fail(404, "Application not found.");
  const app = appRow as {
    id: string;
    club_id: string;
    status: ClubApplicationStatus;
  };
  if (!canResolveApplication(app.status)) {
    return fail(409, "This application has already been resolved.");
  }

  const founderError = await assertFounder(client, app.club_id, userId);
  if (founderError) return founderError;

  const { error: updateErr } = await client
    .from("club_applications")
    .update({ status: "rejected", resolved_at: new Date().toISOString() })
    .eq("id", app.id);
  if (updateErr) {
    console.error("[clubs] failed to mark application rejected", updateErr);
    return fail(500, "Failed to reject application.");
  }

  return done({ id: app.id });
}

// Remove the caller from their current club. No SCA auto-rejoin — the player
// is clubless until they found or are accepted into another club.
export async function leaveClub(
  client: SupabaseClient,
  userId: string
): Promise<ClubResult<{ left_club_id: string | null }>> {
  const membership = await fetchMembership(client, userId);
  if (!membership) return fail(409, "You're not in a club.");
  const { error } = await client
    .from("club_members")
    .delete()
    .eq("id", membership.id);
  if (error) {
    console.error("[clubs] failed to leave club", error);
    return fail(500, "Failed to leave club.");
  }
  return done({ left_club_id: membership.club_id });
}

// Admin-only (gating is the route's responsibility). Assigns the founder of a
// club — used to seat the SCA's coordinator during early trials.
export async function setClubFounder(
  client: SupabaseClient,
  clubId: unknown,
  playerId: unknown
): Promise<ClubResult<Club>> {
  if (typeof clubId !== "string" || clubId.length === 0) {
    return fail(400, "club_id is required.");
  }
  if (typeof playerId !== "string" || playerId.length === 0) {
    return fail(400, "player_id is required.");
  }
  const { data, error } = await client
    .from("clubs")
    .update({ founder_player_id: playerId })
    .eq("id", clubId)
    .select("*")
    .maybeSingle();
  if (error) {
    if (error.code === FK_VIOLATION) {
      return fail(400, "player_id is not a valid user.");
    }
    console.error("[clubs] failed to set founder", error);
    return fail(500, "Failed to set founder.");
  }
  if (!data) return fail(404, "Club not found.");
  return done(data as Club);
}

// ─── Reads ───────────────────────────────────────────────────────────

// Directory list with member counts, founder names, and viewer-relative
// flags. SCA sorts first, then oldest clubs first.
export async function listClubsForViewer(
  client: SupabaseClient,
  userId: string
): Promise<{ clubs: ClubDirectoryEntry[]; current_club_id: string | null }> {
  const [clubsResp, membersResp, pendingResp] = await Promise.all([
    client
      .from("clubs")
      .select(
        "id,name,description,is_open_to_applications,is_system_seeded,founder_player_id,created_at"
      )
      .order("is_system_seeded", { ascending: false })
      .order("created_at", { ascending: true }),
    client.from("club_members").select("club_id,player_id"),
    client
      .from("club_applications")
      .select("club_id")
      .eq("applicant_player_id", userId)
      .eq("status", "pending"),
  ]);

  if (clubsResp.error) {
    console.error("[clubs] failed to list clubs", clubsResp.error);
    return { clubs: [], current_club_id: null };
  }

  const clubRows = (clubsResp.data ?? []) as {
    id: string;
    name: string;
    description: string;
    is_open_to_applications: boolean;
    is_system_seeded: boolean;
    founder_player_id: string | null;
    created_at: string;
  }[];
  const memberRows = (membersResp.data ?? []) as {
    club_id: string;
    player_id: string;
  }[];
  const pendingRows = (pendingResp.data ?? []) as { club_id: string }[];

  const memberCounts = new Map<string, number>();
  let currentClubId: string | null = null;
  for (const m of memberRows) {
    memberCounts.set(m.club_id, (memberCounts.get(m.club_id) ?? 0) + 1);
    if (m.player_id === userId) currentClubId = m.club_id;
  }
  const pendingClubIds = new Set(pendingRows.map((r) => r.club_id));

  const founderNames = await fetchDisplayNames(
    client,
    clubRows
      .map((c) => c.founder_player_id)
      .filter((x): x is string => Boolean(x))
  );

  const clubs: ClubDirectoryEntry[] = clubRows.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    is_open_to_applications: c.is_open_to_applications,
    is_system_seeded: c.is_system_seeded,
    member_count: memberCounts.get(c.id) ?? 0,
    founder_display_name: c.founder_player_id
      ? founderNames.get(c.founder_player_id) ?? null
      : null,
    viewer_is_member: currentClubId === c.id,
    viewer_has_pending_application: pendingClubIds.has(c.id),
  }));

  return { clubs, current_club_id: currentClubId };
}

export async function getClubDetail(
  client: SupabaseClient,
  userId: string,
  clubId: string
): Promise<ClubDetail | null> {
  const { data: clubRow, error } = await client
    .from("clubs")
    .select(
      "id,name,description,is_open_to_applications,is_system_seeded,founder_player_id"
    )
    .eq("id", clubId)
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[clubs] failed to load club detail", error);
    return null;
  }
  if (!clubRow) return null;
  const club = clubRow as {
    id: string;
    name: string;
    description: string;
    is_open_to_applications: boolean;
    is_system_seeded: boolean;
    founder_player_id: string | null;
  };

  const viewerIsFounder = club.founder_player_id === userId;

  const { data: memberData } = await client
    .from("club_members")
    .select("player_id,joined_at")
    .eq("club_id", clubId)
    .order("joined_at", { ascending: true });
  const members = (memberData ?? []) as {
    player_id: string;
    joined_at: string;
  }[];

  let pendingApps: {
    id: string;
    applicant_player_id: string;
    applied_at: string;
  }[] = [];
  if (viewerIsFounder) {
    const { data: appData } = await client
      .from("club_applications")
      .select("id,applicant_player_id,applied_at")
      .eq("club_id", clubId)
      .eq("status", "pending")
      .order("applied_at", { ascending: true });
    pendingApps = (appData ?? []) as typeof pendingApps;
  }

  let viewerHasPending = false;
  if (!viewerIsFounder) {
    const { data: ownApp } = await client
      .from("club_applications")
      .select("id")
      .eq("club_id", clubId)
      .eq("applicant_player_id", userId)
      .eq("status", "pending")
      .limit(1)
      .maybeSingle();
    viewerHasPending = Boolean(ownApp);
  }

  const names = await fetchDisplayNames(client, [
    ...members.map((m) => m.player_id),
    ...pendingApps.map((a) => a.applicant_player_id),
    ...(club.founder_player_id ? [club.founder_player_id] : []),
  ]);

  const memberViews: ClubMemberView[] = members.map((m) => ({
    player_id: m.player_id,
    display_name: names.get(m.player_id) ?? null,
    joined_at: m.joined_at,
    is_founder: club.founder_player_id === m.player_id,
  }));

  const applicationViews: ClubApplicationView[] = pendingApps.map((a) => ({
    id: a.id,
    applicant_player_id: a.applicant_player_id,
    applicant_display_name: names.get(a.applicant_player_id) ?? null,
    applied_at: a.applied_at,
  }));

  return {
    id: club.id,
    name: club.name,
    description: club.description,
    is_open_to_applications: club.is_open_to_applications,
    is_system_seeded: club.is_system_seeded,
    founder_player_id: club.founder_player_id,
    founder_display_name: club.founder_player_id
      ? names.get(club.founder_player_id) ?? null
      : null,
    members: memberViews,
    pending_applications: applicationViews,
    viewer_is_founder: viewerIsFounder,
    viewer_is_member: members.some((m) => m.player_id === userId),
    viewer_has_pending_application: viewerHasPending,
  };
}

// The caller's current club, for the player chrome / bootstrap response.
export async function getCurrentClub(
  client: SupabaseClient,
  userId: string
): Promise<CurrentClub | null> {
  const membership = await fetchMembership(client, userId);
  if (!membership) return null;
  const { data, error } = await client
    .from("clubs")
    .select("id,name")
    .eq("id", membership.club_id)
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data as CurrentClub;
}
