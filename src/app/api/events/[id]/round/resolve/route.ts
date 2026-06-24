import { NextResponse } from "next/server";

import { resolveRound, getAuthedUser, supabaseServer } from "@/lib/mpRounds.server";

// POST /api/events/[id]/round/resolve — resolves the active round.
// Open to any authenticated player: the coordinator can end the round
// early, and the board page auto-calls this route when the lazy-expiry
// tick fires (is_expired=true in the GET response). The exactly-once
// guard lives inside resolveRound (conditional UPDATE on phase='active').
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const { id } = await params;
  const result = await resolveRound(supabaseServer, id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true, ...result.data });
}
