import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase/server";
import { getAuthedUser, listClubsForViewer } from "@/lib/clubs.server";

// GET /api/clubs — directory of all clubs with member counts, founder names,
// and viewer-relative flags for the Apply button.
export async function GET(request: Request) {
  const user = await getAuthedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const result = await listClubsForViewer(supabaseServer, user.id);
  return NextResponse.json(result);
}
