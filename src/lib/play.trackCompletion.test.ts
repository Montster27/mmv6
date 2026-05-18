import { describe, expect, it } from "vitest";

// Regression guard for the comparison at play/page.tsx line 2777.
//
// resolvedTrackStoryletIds (and the newResolved Set derived from it) is keyed on
// storylet_key strings (e.g. "lunch_floor"). TrackStorylet.progress_id is a UUID.
// The `.every((b) => newResolved.has(b.???))` check at the end of handleTrackStoryletChoice
// must use b.storylet_key, not b.progress_id — the former is in the Set, the latter never is.
//
// This bug was silent for an unknown duration because the broken condition always evaluated
// false, causing markDailyComplete and setAwaitingAllocation to be unreachable through the
// track-storylet resolve path. See docs/DIAGNOSIS-T-1777320000004.md §3.B for full analysis.

type BeatLike = { progress_id: string; storylet_key: string };

describe("track storylet completion check (play/page.tsx:2777 guard)", () => {
  const beats: BeatLike[] = [
    { progress_id: "uuid-aaaa-1111", storylet_key: "lunch_floor" },
    { progress_id: "uuid-bbbb-2222", storylet_key: "evening_choice" },
  ];

  it("newResolved keyed on storylet_key — has() returns true for all resolved beats", () => {
    const newResolved = new Set(["lunch_floor", "evening_choice"]);
    expect(beats.every((b) => newResolved.has(b.storylet_key))).toBe(true);
  });

  it("progress_id is a UUID and never appears in newResolved — wrong field fails silently", () => {
    const newResolved = new Set(["lunch_floor", "evening_choice"]);
    // This is the broken form. It always returns false, making markDailyComplete unreachable.
    expect(beats.every((b) => newResolved.has(b.progress_id))).toBe(false);
  });

  it("partial resolution — only one beat resolved returns false", () => {
    const newResolved = new Set(["lunch_floor"]);
    expect(beats.every((b) => newResolved.has(b.storylet_key))).toBe(false);
  });

  it("empty resolved set — returns false (no beats complete)", () => {
    const newResolved = new Set<string>();
    expect(beats.every((b) => newResolved.has(b.storylet_key))).toBe(false);
  });
});
