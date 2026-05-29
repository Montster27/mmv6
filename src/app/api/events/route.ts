import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase/server";
import { getAuthedUser, listEvents } from "@/lib/mpEvents.server";

// GET /api/events — all coordinated events with sponsoring club names.
// Authenticated players only; visible regardless of club affiliation.
export async function GET(request: Request) {
  const user = await getAuthedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const events = await listEvents(supabaseServer);
  return NextResponse.json({ events });
}
