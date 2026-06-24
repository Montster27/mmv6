import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase/server";
import { getAuthedUser } from "@/lib/mpRounds.server";
import { getEventCoordinator } from "@/lib/mpAssignments.server";
import { isCoordinator } from "@/lib/mpAssignments";

// POST /api/events/[id]/reset — coordinator-only.
// Wipes all round/assignment/transit/exposure state for the event and
// re-seeds a fresh round 1 planning phase with all locations reset to
// contested (split 50/50). Does NOT delete the event or its locations.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const { id } = await params;

  const coordinatorId = await getEventCoordinator(supabaseServer, id);
  if (coordinatorId === null) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }
  if (!isCoordinator(user.id, coordinatorId)) {
    return NextResponse.json(
      { error: "Only the event coordinator can reset the event." },
      { status: 403 }
    );
  }

  // Wipe all mutable per-round state in dependency order.
  const [expErr, assignErr, transitErr, roundErr] = await Promise.all([
    supabaseServer.from("mp_event_exposure").delete().eq("event_id", id).then((r) => r.error),
    supabaseServer.from("mp_event_assignments").delete().eq("event_id", id).then((r) => r.error),
    supabaseServer.from("mp_event_transit").delete().eq("event_id", id).then((r) => r.error),
    supabaseServer.from("mp_event_rounds").delete().eq("event_id", id).then((r) => r.error),
  ]);

  const deleteErr = expErr ?? assignErr ?? transitErr ?? roundErr;
  if (deleteErr) {
    console.error("[reset] delete failed", deleteErr);
    return NextResponse.json({ error: "Reset failed during delete." }, { status: 500 });
  }

  // Re-seed round 1 in planning phase.
  const { error: insertErr } = await supabaseServer
    .from("mp_event_rounds")
    .insert({
      event_id: id,
      phase: "planning",
      round_number: 1,
      round_duration_seconds: 120,
      active_started_at: null,
      planning_deadline: null,
      ai_last_escalation_location_id: null,
    });

  if (insertErr) {
    console.error("[reset] round insert failed", insertErr);
    return NextResponse.json({ error: "Reset failed during round seed." }, { status: 500 });
  }

  // Reset all locations to contested / 50-50 split.
  const { error: locErr } = await supabaseServer
    .from("mp_event_locations")
    .update({ state: "contested", split: 50, prev_split: 50 })
    .eq("event_id", id);

  if (locErr) {
    console.error("[reset] location update failed", locErr);
    return NextResponse.json({ error: "Reset failed during location update." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
