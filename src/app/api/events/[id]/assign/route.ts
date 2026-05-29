import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase/server";
import { assignMember, getAuthedUser } from "@/lib/mpAssignments.server";

// POST /api/events/[id]/assign — coordinator deploys a sponsoring-club member
// to a location. Body: { location_id, player_id }. Coordinator-only (enforced
// in assignMember).
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
    | { location_id?: unknown; player_id?: unknown }
    | null;
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const result = await assignMember(
    supabaseServer,
    id,
    payload.location_id,
    payload.player_id,
    user.id
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true, ...result.data });
}
