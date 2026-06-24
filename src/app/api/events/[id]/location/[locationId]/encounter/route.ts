import { NextResponse } from "next/server";

import {
  getAuthedUser,
  getEncounterView,
  runEncounterAction,
  supabaseServer,
} from "@/lib/mpEncounters.server";

type Params = { params: Promise<{ id: string; locationId: string }> };

// GET /api/events/[id]/location/[locationId]/encounter
// Returns the encounter definition tailored to the caller's skills.
// Requires the caller to be present at the location.
export async function GET(
  request: Request,
  { params }: Params
) {
  const user = await getAuthedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  const { id: eventId, locationId } = await params;
  const result = await getEncounterView(
    supabaseServer,
    eventId,
    locationId,
    user.id
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data);
}

// POST /api/events/[id]/location/[locationId]/encounter
// Body: { option_id: string }
// Resolves pressure server-side, writes mp_encounter_runs, returns resolve text.
// One run per player per round (409 on duplicate).
export async function POST(
  request: Request,
  { params }: Params
) {
  const user = await getAuthedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  const { id: eventId, locationId } = await params;
  const body = (await request.json().catch(() => null)) as
    | { option_id?: unknown }
    | null;
  const result = await runEncounterAction(
    supabaseServer,
    eventId,
    locationId,
    user.id,
    body?.option_id
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data);
}
