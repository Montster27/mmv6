import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase/server";
import { createClub, getAuthedUser } from "@/lib/clubs.server";

// POST /api/clubs/create — caller becomes founder + first member.
export async function POST(request: Request) {
  const user = await getAuthedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as
    | { name?: unknown; description?: unknown; is_open_to_applications?: unknown }
    | null;
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const result = await createClub(supabaseServer, user.id, payload);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ club: result.data }, { status: 201 });
}
