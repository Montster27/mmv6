import { NextResponse } from "next/server";

import { startRound, getAuthedUser, supabaseServer } from "@/lib/mpRounds.server";

// POST /api/events/[id]/round/start — coordinator advances planning → active.
// Idempotent guard: fails with 409 if the round is already active/resolving.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const { id } = await params;
  const result = await startRound(supabaseServer, id, user.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true, ...result.data });
}
