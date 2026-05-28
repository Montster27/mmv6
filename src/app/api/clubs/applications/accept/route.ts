import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase/server";
import { acceptApplication, getAuthedUser } from "@/lib/clubs.server";

// POST /api/clubs/applications/accept — founder accepts an application.
export async function POST(request: Request) {
  const user = await getAuthedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as
    | { application_id?: unknown }
    | null;
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const result = await acceptApplication(
    supabaseServer,
    user.id,
    payload.application_id
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true, ...result.data });
}
