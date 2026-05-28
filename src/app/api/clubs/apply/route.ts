import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase/server";
import { applyToClub, getAuthedUser } from "@/lib/clubs.server";

// POST /api/clubs/apply — file a pending application to a club.
export async function POST(request: Request) {
  const user = await getAuthedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as
    | { club_id?: unknown }
    | null;
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const result = await applyToClub(supabaseServer, user.id, payload.club_id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ application: result.data }, { status: 201 });
}
