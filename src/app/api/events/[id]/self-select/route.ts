import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase/server";
import { getAuthedUser, selfSelectLocation } from "@/lib/mpAssignments.server";

// POST /api/events/[id]/self-select — caller shows up at a location. Body:
// { location_id }. Any authenticated player; rejected if the coordinator has
// already placed the caller (enforced in selfSelectLocation).
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
    | { location_id?: unknown }
    | null;
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const result = await selfSelectLocation(
    supabaseServer,
    id,
    payload.location_id,
    user.id
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true, ...result.data });
}
