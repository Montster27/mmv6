import { describe, expect, it } from "vitest";

import {
  compareFeedEntries,
  decodeCursor,
  encodeCursor,
  entryComesAfterCursor,
  harvestRowToFeedPost,
  isNewsNetBoard,
  mergeFeed,
  parseAttributionHandle,
  type HarvestUsenetRow,
  type NewsNetFeedPost,
} from "./newsnet";

// ─────────────────────────────────────────────────────────────────────
// Pure helpers
// ─────────────────────────────────────────────────────────────────────

describe("parseAttributionHandle", () => {
  it("extracts the handle before the @ separator", () => {
    expect(parseAttributionHandle("pklein @ net.college")).toBe("pklein");
    expect(parseAttributionHandle("nv_observer @ net.misc")).toBe("nv_observer");
  });

  it("handles attributions with no spaces around @", () => {
    expect(parseAttributionHandle("rwalsh@mit.edu")).toBe("rwalsh");
  });

  it("lowercases the result", () => {
    expect(parseAttributionHandle("Cassandra_7 @ net.misc")).toBe("cassandra_7");
  });

  it("falls back to the raw string when there is no @", () => {
    expect(parseAttributionHandle("anonymous")).toBe("anonymous");
  });
});

describe("isNewsNetBoard", () => {
  it("accepts the three valid boards", () => {
    expect(isNewsNetBoard("net.philosophy")).toBe(true);
    expect(isNewsNetBoard("net.misc")).toBe(true);
    expect(isNewsNetBoard("rec.music")).toBe(true);
  });

  it("rejects unknown values", () => {
    expect(isNewsNetBoard("net.sports")).toBe(false);
    expect(isNewsNetBoard("")).toBe(false);
    expect(isNewsNetBoard(null)).toBe(false);
    expect(isNewsNetBoard(42)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Cursor encode/decode
// ─────────────────────────────────────────────────────────────────────

describe("cursor encode/decode", () => {
  it("round-trips a valid cursor", () => {
    const cursor = {
      in_game_day: 4,
      posted_at: "2026-09-04T14:22:07.000Z",
      id: "11111111-2222-3333-4444-555555555555",
    };
    const decoded = decodeCursor(encodeCursor(cursor));
    expect(decoded).toEqual(cursor);
  });

  it("returns null for malformed base64", () => {
    expect(decodeCursor("not-base64!@#$")).toBeNull();
  });

  it("returns null for valid base64 with wrong shape", () => {
    const bad = Buffer.from(JSON.stringify({ foo: "bar" }), "utf8").toString("base64url");
    expect(decodeCursor(bad)).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────
// Sort + cursor predicate
// ─────────────────────────────────────────────────────────────────────

function post(overrides: Partial<NewsNetFeedPost>): NewsNetFeedPost {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    handle: "test",
    board: "net.misc",
    body: "hello",
    in_game_day: 1,
    posted_at: "2026-09-01T00:00:00.000Z",
    source: "player",
    ...overrides,
  };
}

describe("compareFeedEntries", () => {
  it("sorts in_game_day DESC", () => {
    const a = post({ in_game_day: 7 });
    const b = post({ in_game_day: 4 });
    expect(compareFeedEntries(a, b)).toBeLessThan(0); // a before b
    expect(compareFeedEntries(b, a)).toBeGreaterThan(0);
  });

  it("breaks day ties by posted_at DESC", () => {
    const a = post({ in_game_day: 4, posted_at: "2026-09-05T12:00:00.000Z" });
    const b = post({ in_game_day: 4, posted_at: "2026-09-05T08:00:00.000Z" });
    expect(compareFeedEntries(a, b)).toBeLessThan(0);
  });

  it("breaks full ties by id ASC for stable cursor ordering", () => {
    const a = post({ id: "aaaa" });
    const b = post({ id: "bbbb" });
    expect(compareFeedEntries(a, b)).toBeLessThan(0);
  });
});

describe("entryComesAfterCursor", () => {
  const cursor = {
    in_game_day: 4,
    posted_at: "2026-09-04T14:22:07.000Z",
    id: "mid",
  };

  it("returns true for older day", () => {
    expect(entryComesAfterCursor(post({ in_game_day: 3 }), cursor)).toBe(true);
  });

  it("returns false for newer day", () => {
    expect(entryComesAfterCursor(post({ in_game_day: 7 }), cursor)).toBe(false);
  });

  it("returns true for same day, earlier posted_at", () => {
    expect(
      entryComesAfterCursor(
        post({ in_game_day: 4, posted_at: "2026-09-04T08:00:00.000Z" }),
        cursor
      )
    ).toBe(true);
  });

  it("returns false for the exact cursor entry", () => {
    expect(
      entryComesAfterCursor(
        post({
          in_game_day: 4,
          posted_at: "2026-09-04T14:22:07.000Z",
          id: "mid",
        }),
        cursor
      )
    ).toBe(false);
  });

  it("uses id ASC as the final tiebreaker (entries with id > cursor.id come after)", () => {
    expect(
      entryComesAfterCursor(
        post({
          in_game_day: 4,
          posted_at: "2026-09-04T14:22:07.000Z",
          id: "zzzz",
        }),
        cursor
      )
    ).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────
// mergeFeed — the integration shape
// ─────────────────────────────────────────────────────────────────────

describe("mergeFeed", () => {
  it("interleaves player and NPC posts by sort key", () => {
    const playerPosts = [
      post({ id: "p1", in_game_day: 5, posted_at: "2026-09-05T10:00:00.000Z", source: "player" }),
      post({ id: "p2", in_game_day: 3, posted_at: "2026-09-03T10:00:00.000Z", source: "player" }),
    ];
    const npcPosts = [
      post({ id: "n1", in_game_day: 4, posted_at: "2026-09-04T10:00:00.000Z", source: "npc" }),
    ];
    const result = mergeFeed({ playerPosts, npcPosts, limit: 50, cursor: null });
    expect(result.posts.map((p) => p.id)).toEqual(["p1", "n1", "p2"]);
    expect(result.next_cursor).toBeNull();
  });

  it("emits a next_cursor when results exceed the limit", () => {
    const make = (i: number) =>
      post({
        id: `p${i}`,
        in_game_day: i,
        posted_at: `2026-09-${String(i).padStart(2, "0")}T10:00:00.000Z`,
        source: "player",
      });
    const playerPosts = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(make);
    const result = mergeFeed({ playerPosts, npcPosts: [], limit: 5, cursor: null });
    expect(result.posts.map((p) => p.id)).toEqual(["p10", "p9", "p8", "p7", "p6"]);
    expect(result.next_cursor).not.toBeNull();

    // The cursor should round-trip and locate the next page correctly.
    const decoded = decodeCursor(result.next_cursor!);
    expect(decoded?.id).toBe("p6");
    expect(decoded?.in_game_day).toBe(6);
  });

  it("returns no next_cursor when total entries fit within the limit", () => {
    const result = mergeFeed({
      playerPosts: [post({ id: "p1", in_game_day: 1 })],
      npcPosts: [],
      limit: 50,
      cursor: null,
    });
    expect(result.next_cursor).toBeNull();
    expect(result.posts).toHaveLength(1);
  });

  it("applies the cursor filter — entries at or before cursor are dropped", () => {
    const cursor = {
      in_game_day: 5,
      posted_at: "2026-09-05T10:00:00.000Z",
      id: "p5",
    };
    const playerPosts = [
      post({ id: "p7", in_game_day: 7 }), // before cursor — drop
      post({
        id: "p5",
        in_game_day: 5,
        posted_at: "2026-09-05T10:00:00.000Z",
      }), // exact cursor — drop
      post({ id: "p3", in_game_day: 3 }), // after cursor — keep
    ];
    const result = mergeFeed({ playerPosts, npcPosts: [], limit: 50, cursor });
    expect(result.posts.map((p) => p.id)).toEqual(["p3"]);
  });
});

// ─────────────────────────────────────────────────────────────────────
// harvest_items → feed post mapping
// ─────────────────────────────────────────────────────────────────────

describe("harvestRowToFeedPost", () => {
  const row: HarvestUsenetRow = {
    slug: "harvest_usenet_texture_001",
    body: "Newsgroup: net.college\n...etc",
    attribution: "pklein @ net.college",
    day_min: 1,
    day_max: null,
    gate_requires: null,
    board: "net.misc",
    created_at: "2026-04-19T10:00:00.000Z",
  };

  it("uses the slug as id", () => {
    expect(harvestRowToFeedPost(row).id).toBe("harvest_usenet_texture_001");
  });

  it("uses the parsed handle (left of @) from attribution", () => {
    expect(harvestRowToFeedPost(row).handle).toBe("pklein");
  });

  it("uses day_min as in_game_day", () => {
    expect(harvestRowToFeedPost(row).in_game_day).toBe(1);
  });

  it("uses created_at as posted_at", () => {
    expect(harvestRowToFeedPost(row).posted_at).toBe("2026-04-19T10:00:00.000Z");
  });

  it("marks the source as npc", () => {
    expect(harvestRowToFeedPost(row).source).toBe("npc");
  });

  it("falls back to 'anonymous' handle when attribution is null", () => {
    expect(
      harvestRowToFeedPost({ ...row, attribution: null }).handle
    ).toBe("anonymous");
  });

  it("falls back to net.misc when board is null", () => {
    expect(
      harvestRowToFeedPost({ ...row, board: null }).board
    ).toBe("net.misc");
  });
});
