import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase/server";
import { getAuthedUser, getClubDetail } from "@/lib/clubs.server";

// GET /api/clubs/[id] — club detail. Members are always returned; pending
// applications are included only when the viewer is the founder.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const { id } = await params;
  const detail = await getClubDetail(supabaseServer, user.id, id);
  if (!detail) {
    return NextResponse.json({ error: "Club not found" }, { status: 404 });
  }
  return NextResponse.json(detail);
}
