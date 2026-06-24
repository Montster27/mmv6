import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase/server";
import { getAuthedUser, getEventDetail } from "@/lib/mpEvents.server";
import { getEventPresence } from "@/lib/mpAssignments.server";
import { getEventPhaseState } from "@/lib/mpRounds.server";
import type { EventDetailFull } from "@/types/mpRounds";

// GET /api/events/[id] — a single event with ordered locations, assignment
// presence (MP-03), and phase/round/transit state (MP-05). Everything the
// heatmap board needs in one round-trip. Authenticated players only.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const { id } = await params;
  const detail = await getEventDetail(supabaseServer, id);
  if (!detail) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const [presence, phaseState] = await Promise.all([
    getEventPresence(supabaseServer, id, user.id),
    getEventPhaseState(supabaseServer, id),
  ]);

  const body: EventDetailFull = { ...detail, ...presence, ...phaseState };
  return NextResponse.json(body);
}
