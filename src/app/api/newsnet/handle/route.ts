import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase/server";
import { HANDLE_REGEX } from "@/lib/newsnet";
import {
  getReservedHandles,
  getUserFromAuthHeader,
} from "@/lib/newsnet.server";

// ─────────────────────────────────────────────────────────────────────
// /api/newsnet/handle
//
// GET  → { handle: string | null } for the current player
// POST → set a handle (set-once, unique case-insensitive, validation,
//                       reservation list against NPC attribution handles)
// ─────────────────────────────────────────────────────────────────────

const POSTGRES_UNIQUE_VIOLATION = "23505";

// ─── GET /api/newsnet/handle ─────────────────────────────────────────

export async function GET(request: Request) {
  const user = await getUserFromAuthHeader(
    supabaseServer,
    request.headers.get("authorization")
  );
  if (!user) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const { data, error } = await supabaseServer
    .from("player_handles")
    .select("handle")
    .eq("player_id", user.id)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[newsnet] failed to load handle", error);
    return NextResponse.json({ error: "Failed to load handle" }, { status: 500 });
  }

  return NextResponse.json({
    handle: data ? (data as { handle: string }).handle : null,
  });
}

// ─── POST /api/newsnet/handle ────────────────────────────────────────

export async function POST(request: Request) {
  const user = await getUserFromAuthHeader(
    supabaseServer,
    request.headers.get("authorization")
  );
  if (!user) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as
    | { handle?: unknown }
    | null;
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (typeof payload.handle !== "string") {
    return NextResponse.json(
      { error: "handle_invalid", detail: "Handle must be a string" },
      { status: 422 }
    );
  }
  const handle = payload.handle.trim();

  // Regex check (length + allowed characters).
  if (!HANDLE_REGEX.test(handle)) {
    return NextResponse.json(
      {
        error: "handle_invalid",
        detail: "Handle must be 2–20 characters, letters / numbers / underscore only",
      },
      { status: 422 }
    );
  }

  // Set-once: if the player already has a handle, refuse.
  const { data: existingRow, error: existingErr } = await supabaseServer
    .from("player_handles")
    .select("handle")
    .eq("player_id", user.id)
    .limit(1)
    .maybeSingle();

  if (existingErr) {
    console.error("[newsnet] failed to read existing handle", existingErr);
    return NextResponse.json({ error: "Failed to read handle" }, { status: 500 });
  }
  if (existingRow) {
    return NextResponse.json(
      {
        error: "handle_already_set",
        handle: (existingRow as { handle: string }).handle,
      },
      { status: 409 }
    );
  }

  // Reservation list: parse NPC attributions out of harvest_items.
  // Throws → bubble as 500 (loading reserved handles is essential).
  const reserved = await getReservedHandles(supabaseServer);
  if (reserved.has(handle.toLowerCase())) {
    return NextResponse.json(
      {
        error: "handle_reserved",
        detail: "That handle is reserved. Pick something else.",
      },
      { status: 422 }
    );
  }

  // Insert. Race-safe via the case-insensitive unique index + the column
  // UNIQUE — if two requests land at once, one returns 23505 / 409.
  const { data: inserted, error: insertErr } = await supabaseServer
    .from("player_handles")
    .insert({ player_id: user.id, handle })
    .select("handle, chosen_at")
    .single();

  if (insertErr) {
    if (
      (insertErr as { code?: string }).code === POSTGRES_UNIQUE_VIOLATION
    ) {
      return NextResponse.json(
        { error: "handle_taken", detail: "Someone else has that handle. Pick something else." },
        { status: 409 }
      );
    }
    console.error("[newsnet] failed to insert handle", insertErr);
    return NextResponse.json({ error: "Failed to set handle" }, { status: 500 });
  }

  return NextResponse.json(inserted, { status: 201 });
}
