import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase/server";
import {
  FEED_LIMIT_DEFAULT,
  FEED_LIMIT_MAX,
  POST_BODY_MAX,
  POST_BODY_MIN,
  decodeCursor,
  harvestRowToFeedPost,
  isNewsNetBoard,
  mergeFeed,
  type HarvestUsenetRow,
  type NewsNetBoard,
  type NewsNetFeedPost,
} from "@/lib/newsnet";
import {
  getCurrentDayIndex,
  getPlayerArcFlags,
  getUserFromAuthHeader,
} from "@/lib/newsnet.server";

// ─────────────────────────────────────────────────────────────────────
// /api/newsnet/posts
//
// GET  → merged feed (player posts + NPC harvest items) for a board
// POST → write a player post (server-stamps player_id, handle, in_game_day)
//
// Important invariants:
//   • Feed read does NOT call draw_harvest_item() and does NOT write
//     player_arc_flags. Browsing the feed must never silently arm Arc Two
//     reveal gates.
//   • The POST handler ignores any client-supplied in_game_day; the server
//     reads it from daily_states.day_index for the authenticated user.
// ─────────────────────────────────────────────────────────────────────

const PLAYER_OVERFETCH_FACTOR = 2;

// ─── GET /api/newsnet/posts ──────────────────────────────────────────

export async function GET(request: Request) {
  const user = await getUserFromAuthHeader(
    supabaseServer,
    request.headers.get("authorization")
  );
  if (!user) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const board = url.searchParams.get("board");
  if (!board || !isNewsNetBoard(board)) {
    return NextResponse.json(
      { error: "Invalid board. Must be one of: net.philosophy, net.misc, rec.music" },
      { status: 400 }
    );
  }

  const limitRaw = url.searchParams.get("limit");
  let limit = FEED_LIMIT_DEFAULT;
  if (limitRaw !== null) {
    const parsed = Number.parseInt(limitRaw, 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      return NextResponse.json(
        { error: "Invalid limit (must be a positive integer)" },
        { status: 400 }
      );
    }
    limit = Math.min(parsed, FEED_LIMIT_MAX);
  }

  const cursorRaw = url.searchParams.get("cursor");
  const cursor = cursorRaw ? decodeCursor(cursorRaw) : null;
  if (cursorRaw && !cursor) {
    return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });
  }

  // Reader's current day — required for the NPC day-window filter.
  // If the user has no daily_states row, treat them as Day 0 so they still
  // see anything visible on Day 0 (currently nothing, but the boards stay
  // browsable instead of erroring).
  const readerDay = (await getCurrentDayIndex(supabaseServer, user.id)) ?? 0;
  const playerFlags = await getPlayerArcFlags(supabaseServer, user.id);
  const overfetch = Math.min(limit * PLAYER_OVERFETCH_FACTOR, FEED_LIMIT_MAX);

  // Fetch in parallel.
  const [playerResp, npcResp] = await Promise.all([
    supabaseServer
      .from("newsnet_posts")
      .select("id,handle,board,body,in_game_day,posted_at")
      .eq("board", board)
      .order("in_game_day", { ascending: false })
      .order("posted_at", { ascending: false })
      .limit(overfetch),
    supabaseServer
      .from("harvest_items")
      .select("slug,body,attribution,day_min,day_max,gate_requires,board,created_at")
      .eq("type", "usenet")
      .eq("board", board)
      .lte("day_min", readerDay),
  ]);

  if (playerResp.error) {
    console.error("[newsnet] failed to load player posts", playerResp.error);
    return NextResponse.json({ error: "Failed to load posts" }, { status: 500 });
  }
  if (npcResp.error) {
    console.error("[newsnet] failed to load NPC posts", npcResp.error);
    return NextResponse.json({ error: "Failed to load posts" }, { status: 500 });
  }

  // Apply day_max + gate_requires filters in JS (Supabase JS client can't
  // express "day_max IS NULL OR day_max >= readerDay" in a single .or()
  // call cleanly when combined with the rest of the predicate).
  const filteredNpcRows = (npcResp.data ?? []).filter((row) => {
    const r = row as HarvestUsenetRow;
    if (r.day_max !== null && r.day_max < readerDay) return false;
    if (r.gate_requires && !playerFlags.has(r.gate_requires)) return false;
    return true;
  });

  const playerPosts: NewsNetFeedPost[] = (playerResp.data ?? []).map((row) => {
    const r = row as {
      id: string;
      handle: string;
      board: NewsNetBoard;
      body: string;
      in_game_day: number;
      posted_at: string;
    };
    return {
      id: r.id,
      handle: r.handle,
      board: r.board,
      body: r.body,
      in_game_day: r.in_game_day,
      posted_at: r.posted_at,
      source: "player",
    };
  });

  const npcPosts: NewsNetFeedPost[] = filteredNpcRows.map((row) =>
    harvestRowToFeedPost(row as HarvestUsenetRow)
  );

  const merged = mergeFeed({ playerPosts, npcPosts, limit, cursor });

  return NextResponse.json(merged);
}

// ─── POST /api/newsnet/posts ─────────────────────────────────────────

export async function POST(request: Request) {
  const user = await getUserFromAuthHeader(
    supabaseServer,
    request.headers.get("authorization")
  );
  if (!user) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as
    | { board?: unknown; body?: unknown }
    | null;
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Validate board.
  if (!isNewsNetBoard(payload.board)) {
    return NextResponse.json(
      { error: "Invalid board. Must be one of: net.philosophy, net.misc, rec.music" },
      { status: 400 }
    );
  }
  const board = payload.board as NewsNetBoard;

  // Validate body.
  if (
    typeof payload.body !== "string" ||
    payload.body.length < POST_BODY_MIN ||
    payload.body.length > POST_BODY_MAX
  ) {
    return NextResponse.json(
      { error: `Body must be between ${POST_BODY_MIN} and ${POST_BODY_MAX} characters` },
      { status: 400 }
    );
  }
  const body = payload.body;

  // Lookup the player's handle. 412 if not yet set — UI is expected to
  // gate the compose form on handle existence, but we enforce here too.
  const { data: handleRow, error: handleErr } = await supabaseServer
    .from("player_handles")
    .select("handle")
    .eq("player_id", user.id)
    .limit(1)
    .maybeSingle();

  if (handleErr) {
    console.error("[newsnet] failed to read handle for post", handleErr);
    return NextResponse.json({ error: "Failed to verify handle" }, { status: 500 });
  }
  if (!handleRow) {
    return NextResponse.json(
      { error: "handle_not_set", detail: "Set a handle via POST /api/newsnet/handle first" },
      { status: 412 }
    );
  }
  const handle = (handleRow as { handle: string }).handle;

  // Server-stamp the in-game day. Any client-supplied in_game_day is ignored.
  const dayIndex = await getCurrentDayIndex(supabaseServer, user.id);
  if (dayIndex === null) {
    return NextResponse.json(
      { error: "no_day_state", detail: "Start your game before posting" },
      { status: 412 }
    );
  }

  const { data: inserted, error: insertErr } = await supabaseServer
    .from("newsnet_posts")
    .insert({
      player_id: user.id,
      handle,
      board,
      body,
      in_game_day: dayIndex,
    })
    .select("id,handle,board,body,in_game_day,posted_at")
    .single();

  if (insertErr) {
    console.error("[newsnet] failed to insert post", insertErr);
    return NextResponse.json({ error: "Failed to write post" }, { status: 500 });
  }

  const row = inserted as {
    id: string;
    handle: string;
    board: NewsNetBoard;
    body: string;
    in_game_day: number;
    posted_at: string;
  };
  const response: NewsNetFeedPost = {
    id: row.id,
    handle: row.handle,
    board: row.board,
    body: row.body,
    in_game_day: row.in_game_day,
    posted_at: row.posted_at,
    source: "player",
  };
  return NextResponse.json(response, { status: 201 });
}
