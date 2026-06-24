import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase/server";
import { isUserAdmin } from "@/lib/adminAuthServer";
import { getCurrentClub } from "@/lib/clubs.server";

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

async function ensurePlayerRecords(userId: string, email: string | null) {
  await supabaseServer.from("profiles").upsert({ id: userId, email }, { onConflict: "id" });

  const { data: characterExisting } = await supabaseServer
    .from("characters")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (!characterExisting) {
    await supabaseServer.from("characters").insert({ user_id: userId, name: null });
  }

  const { data: dailyExisting } = await supabaseServer
    .from("daily_states")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (!dailyExisting) {
    await supabaseServer.from("daily_states").insert({ user_id: userId });
  }

  const { data: publicProfileExisting } = await supabaseServer
    .from("public_profiles")
    .select("user_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (!publicProfileExisting) {
    const displayName = `Player-${userId.slice(0, 6)}`;
    await supabaseServer
      .from("public_profiles")
      .insert({ user_id: userId, display_name: displayName });
  }

  // Every new character defaults into the seeded SCA club (MP-01). One club
  // per player, so only join when they have no membership yet. The SCA is
  // identified by is_system_seeded = true (robust to name changes).
  const { data: clubMembership } = await supabaseServer
    .from("club_members")
    .select("id")
    .eq("player_id", userId)
    .limit(1)
    .maybeSingle();
  if (!clubMembership) {
    const { data: sca } = await supabaseServer
      .from("clubs")
      .select("id")
      .eq("is_system_seeded", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (sca) {
      await supabaseServer
        .from("club_members")
        .insert({ club_id: (sca as { id: string }).id, player_id: userId });
    }
  }
}

export async function GET(request: Request) {
  const user = await ensureAuthed(request);
  if (!user) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  await ensurePlayerRecords(user.id, user.email ?? null);

  const [isAdmin, experiments, membership, club] = await Promise.all([
    isUserAdmin(user),
    supabaseServer
      .from("user_experiments")
      .select("experiment_id,variant")
      .eq("user_id", user.id),
    supabaseServer
      .from("group_members")
      .select("group_id,role")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle(),
    getCurrentClub(supabaseServer, user.id),
  ]);

  const assignments = (experiments.data ?? []).reduce<Record<string, string>>(
    (acc, row) => {
      acc[row.experiment_id] = row.variant;
      return acc;
    },
    {}
  );

  let group: { id: string; name: string; join_code: string } | null = null;
  if (membership.data?.group_id) {
    const { data: groupRow } = await supabaseServer
      .from("groups")
      .select("id,name,join_code")
      .eq("id", membership.data.group_id)
      .limit(1)
      .maybeSingle();
    if (groupRow) group = groupRow;
  }

  return NextResponse.json({
    userId: user.id,
    email: user.email ?? null,
    isAdmin,
    experiments: assignments,
    group,
    club,
  });
}
