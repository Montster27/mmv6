import { NextResponse } from "next/server";

import { moveMember, getAuthedUser, supabaseServer } from "@/lib/mpRounds.server";

// POST /api/events/[id]/move — coordinator places a player in transit.
// Body: { player_id, to_location_id }
// The player is removed from their current assignment and placed in
// mp_event_transit with a server-stamped arrives_at. They contribute
// to neither location until arrival (finalized on resolveRound).
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const { id } = await params;
  const payload = (await request.json().catch(() => null)) as
    | { player_id?: unknown; to_location_id?: unknown }
    | null;
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const result = await moveMember(
    supabaseServer,
    id,
    payload.player_id,
    payload.to_location_id,
    user.id
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true, ...result.data });
}
