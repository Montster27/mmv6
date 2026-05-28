import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase/server";
import { getAuthedUser, leaveClub } from "@/lib/clubs.server";

// POST /api/clubs/leave — remove the caller from their current club.
// No SCA auto-rejoin.
export async function POST(request: Request) {
  const user = await getAuthedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const result = await leaveClub(supabaseServer, user.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true, left_club_id: result.data.left_club_id });
}
