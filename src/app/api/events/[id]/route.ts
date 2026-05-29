import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase/server";
import { getAuthedUser, getEventDetail } from "@/lib/mpEvents.server";
import { getEventPresence } from "@/lib/mpAssignments.server";
import type { EventDetailWithPresence } from "@/types/mpAssignments";

// GET /api/events/[id] — a single event with its ordered locations plus the
// assignment presence (MP-03): per-location present players, viewer-relative
// flags, and — for a coordinator viewer — the sponsoring-club roster. Folded
// into one response so the heatmap page makes a single fetch.
// Authenticated players only.
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
  const presence = await getEventPresence(supabaseServer, id, user.id);
  const body: EventDetailWithPresence = { ...detail, ...presence };
  return NextResponse.json(body);
}
