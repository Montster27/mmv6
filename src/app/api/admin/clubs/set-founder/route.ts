import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase/server";
import { isUserAdmin } from "@/lib/adminAuthServer";
import { getAuthedUser, setClubFounder } from "@/lib/clubs.server";

// POST /api/admin/clubs/set-founder — admin-only. Assigns a club's founder,
// used to seat the SCA coordinator during early trials.
export async function POST(request: Request) {
  const user = await getAuthedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }
  if (!(await isUserAdmin(user))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = (await request.json().catch(() => null)) as
    | { club_id?: unknown; player_id?: unknown }
    | null;
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const result = await setClubFounder(
    supabaseServer,
    payload.club_id,
    payload.player_id
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ club: result.data });
}
