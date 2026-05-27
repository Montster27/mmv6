// ─────────────────────────────────────────────────────────────────────
// NewsNet — shared types, constants, and PURE helpers
//
// This module is safe to import from any environment (server, client,
// test). Server-only helpers — anything that touches a Supabase client
// or the auth header — live in `newsnet.server.ts`.
// ─────────────────────────────────────────────────────────────────────

export const NEWSNET_BOARDS = ["net.philosophy", "net.misc", "rec.music"] as const;
export type NewsNetBoard = (typeof NEWSNET_BOARDS)[number];

export function isNewsNetBoard(value: unknown): value is NewsNetBoard {
  return typeof value === "string" && (NEWSNET_BOARDS as readonly string[]).includes(value);
}

export const HANDLE_REGEX = /^[A-Za-z0-9_]{2,20}$/;
export const POST_BODY_MIN = 1;
export const POST_BODY_MAX = 1000;
export const FEED_LIMIT_DEFAULT = 50;
export const FEED_LIMIT_MAX = 100;

export type NewsNetFeedSource = "player" | "npc";

export interface NewsNetFeedPost {
  id: string;
  handle: string;
  board: NewsNetBoard;
  body: string;
  in_game_day: number;
  posted_at: string; // ISO string
  source: NewsNetFeedSource;
}

export interface NewsNetCursor {
  in_game_day: number;
  posted_at: string;
  id: string;
}

// ─── Attribution parsing ─────────────────────────────────────────────

/**
 * Parses the handle component out of an attribution string like
 * `pklein @ net.college` → `pklein`. Falls back to the raw input
 * (lowercased, trimmed) if no `@` separator is present.
 */
export function parseAttributionHandle(attribution: string): string {
  const atIdx = attribution.indexOf("@");
  const left = atIdx >= 0 ? attribution.slice(0, atIdx) : attribution;
  return left.trim().toLowerCase();
}

// ─── Cursor encode/decode ────────────────────────────────────────────

export function encodeCursor(cursor: NewsNetCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeCursor(raw: string): NewsNetCursor | null {
  try {
    const json = Buffer.from(raw, "base64url").toString("utf8");
    const parsed = JSON.parse(json);
    if (
      typeof parsed?.in_game_day === "number" &&
      typeof parsed?.posted_at === "string" &&
      typeof parsed?.id === "string"
    ) {
      return parsed as NewsNetCursor;
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Feed sort + merge ───────────────────────────────────────────────

/**
 * Compares two feed entries for sort order: in_game_day DESC, posted_at DESC,
 * id ASC (id as a stable tiebreaker so cursor pagination is deterministic).
 */
export function compareFeedEntries(a: NewsNetFeedPost, b: NewsNetFeedPost): number {
  if (a.in_game_day !== b.in_game_day) return b.in_game_day - a.in_game_day;
  if (a.posted_at !== b.posted_at) return a.posted_at < b.posted_at ? 1 : -1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Returns true when `entry` is older than the cursor (i.e. should be returned
 * AFTER the cursor in feed-display order — sorted DESC by day/posted_at).
 */
export function entryComesAfterCursor(
  entry: NewsNetFeedPost,
  cursor: NewsNetCursor
): boolean {
  if (entry.in_game_day !== cursor.in_game_day) {
    return entry.in_game_day < cursor.in_game_day;
  }
  if (entry.posted_at !== cursor.posted_at) {
    return entry.posted_at < cursor.posted_at;
  }
  return entry.id > cursor.id;
}

export interface MergeFeedInput {
  playerPosts: NewsNetFeedPost[];
  npcPosts: NewsNetFeedPost[];
  limit: number;
  cursor: NewsNetCursor | null;
}

export interface MergeFeedResult {
  posts: NewsNetFeedPost[];
  next_cursor: string | null;
}

/**
 * Merges player + NPC posts, applies cursor filter, sorts, slices to limit,
 * and emits the next cursor if there's more data after.
 *
 * The merge does not deduplicate by content — only by id. NPC ids and player
 * ids come from different ID spaces so collisions are impossible in practice,
 * but the sort guarantees stability either way.
 */
export function mergeFeed({
  playerPosts,
  npcPosts,
  limit,
  cursor,
}: MergeFeedInput): MergeFeedResult {
  const combined: NewsNetFeedPost[] = [];
  for (const p of playerPosts) {
    if (cursor && !entryComesAfterCursor(p, cursor)) continue;
    combined.push(p);
  }
  for (const n of npcPosts) {
    if (cursor && !entryComesAfterCursor(n, cursor)) continue;
    combined.push(n);
  }

  combined.sort(compareFeedEntries);
  const sliced = combined.slice(0, limit);

  const hasMore = combined.length > limit;
  const last = sliced[sliced.length - 1];
  const next_cursor =
    hasMore && last
      ? encodeCursor({
          in_game_day: last.in_game_day,
          posted_at: last.posted_at,
          id: last.id,
        })
      : null;

  return { posts: sliced, next_cursor };
}

// ─── harvest_items row → feed post ───────────────────────────────────

export interface HarvestUsenetRow {
  slug: string;
  body: string;
  attribution: string | null;
  day_min: number;
  day_max: number | null;
  gate_requires: string | null;
  board: string | null;
  created_at: string;
}

export function harvestRowToFeedPost(row: HarvestUsenetRow): NewsNetFeedPost {
  // Display the handle portion of the attribution; the full `handle @ newsgroup`
  // string would clash with player handles in the feed UI.
  const handle = row.attribution ? parseAttributionHandle(row.attribution) : "anonymous";
  return {
    id: row.slug,
    handle,
    board: (row.board ?? "net.misc") as NewsNetBoard,
    body: row.body,
    in_game_day: row.day_min, // NPC's in-game date == when it first becomes visible
    posted_at: row.created_at,
    source: "npc",
  };
}
