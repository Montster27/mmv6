import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase/server";
import { getAuthedUser, leaveLocation } from "@/lib/mpAssignments.server";

// POST /api/events/[id]/leave — caller removes their own assignment (either
// source). No body.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const { id } = await params;
  const result = await leaveLocation(supabaseServer, id, user.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true, ...result.data });
}
