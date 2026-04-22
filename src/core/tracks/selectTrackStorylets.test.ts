import { describe, expect, it } from "vitest";

import { selectTrackStorylets } from "@/core/tracks/selectTrackStorylets";
import type {
  Track,
  TrackProgress,
  TrackStoryletRow,
} from "@/types/tracks";

// ────────────────────────────────────────────────────────────────────────────
// Fixture factories
// ────────────────────────────────────────────────────────────────────────────

function makeTrack(overrides: Partial<Track> = {}): Track {
  return {
    id: overrides.id ?? "track_a",
    key: "track_a",
    title: "Track A",
    description: "",
    category: "life",
    chapter: "chapter_one",
    is_enabled: true,
    tags: [],
    ...overrides,
  };
}

function makeProgress(overrides: Partial<TrackProgress> = {}): TrackProgress {
  return {
    id: overrides.id ?? "progress_a",
    user_id: "user_1",
    track_id: "track_a",
    state: "ACTIVE",
    current_storylet_key: "s1",
    storylet_due_day: 0,
    track_state: null,
    started_day: 0,
    defer_count: 0,
    updated_day: 0,
    resolved_storylet_keys: [],
    next_key_override: null,
    ...overrides,
  };
}

function makeStorylet(
  key: string,
  overrides: Partial<TrackStoryletRow> = {}
): TrackStoryletRow {
  return {
    id: overrides.id ?? `storylet_${key}`,
    slug: key,
    title: key,
    body: "",
    choices: [],
    is_active: true,
    weight: 100,
    tags: [],
    requirements: {},
    track_id: "track_a",
    storylet_key: key,
    order_index: 0,
    due_offset_days: 0,
    expires_after_days: 7,
    ...overrides,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Invariant 1: Never re-serve a resolved storylet
// (from both pool and override paths)
// ────────────────────────────────────────────────────────────────────────────

describe("selectTrackStorylets — invariant 1: resolved storylets excluded", () => {
  it("excludes a resolved storylet from the pool", () => {
    const track = makeTrack();
    const progress = makeProgress({
      resolved_storylet_keys: ["s1"],
    });
    const storylets = [
      makeStorylet("s1", { due_offset_days: 0, expires_after_days: 7 }),
      makeStorylet("s2", { due_offset_days: 0, expires_after_days: 7 }),
    ];

    const result = selectTrackStorylets({
      dayIndex: 1,
      progress: [progress],
      storylets,
      tracks: [track],
    });

    expect(result.map((r) => r.storylet.storylet_key)).toEqual(["s2"]);
  });

  it("clears stale next_key_override pointing at a resolved storylet and falls through to pool", () => {
    const track = makeTrack();
    const progress = makeProgress({
      resolved_storylet_keys: ["s1"],
      next_key_override: "s1",
    });
    const storylets = [
      makeStorylet("s1", { due_offset_days: 0, expires_after_days: 7 }),
      makeStorylet("s2", { due_offset_days: 0, expires_after_days: 7 }),
    ];

    const result = selectTrackStorylets({
      dayIndex: 1,
      progress: [progress],
      storylets,
      tracks: [track],
    });

    expect(result.map((r) => r.storylet.storylet_key)).toEqual(["s2"]);
  });

  it("returns no storylet when every candidate is resolved", () => {
    const track = makeTrack();
    const progress = makeProgress({
      resolved_storylet_keys: ["s1", "s2"],
    });
    const storylets = [makeStorylet("s1"), makeStorylet("s2")];

    const result = selectTrackStorylets({
      dayIndex: 1,
      progress: [progress],
      storylets,
      tracks: [track],
    });

    expect(result).toEqual([]);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Invariant 2: Expiry window boundaries
// Regression guard for the first_morning NULL-expiry bug class.
// ────────────────────────────────────────────────────────────────────────────

describe("selectTrackStorylets — invariant 2: expiry window boundaries", () => {
  it("is NOT available the day before due_offset_days", () => {
    const track = makeTrack();
    const progress = makeProgress({ started_day: 0 });
    const storylets = [
      makeStorylet("s1", { due_offset_days: 2, expires_after_days: 3 }),
    ];

    const result = selectTrackStorylets({
      dayIndex: 1,
      progress: [progress],
      storylets,
      tracks: [track],
    });

    expect(result).toEqual([]);
  });

  it("IS available on the exact due_offset_days day", () => {
    const track = makeTrack();
    const progress = makeProgress({ started_day: 0 });
    const storylets = [
      makeStorylet("s1", { due_offset_days: 2, expires_after_days: 3 }),
    ];

    const result = selectTrackStorylets({
      dayIndex: 2,
      progress: [progress],
      storylets,
      tracks: [track],
    });

    expect(result.map((r) => r.storylet.storylet_key)).toEqual(["s1"]);
  });

  it("IS available on the last eligible day (due + expires_after)", () => {
    const track = makeTrack();
    const progress = makeProgress({ started_day: 0 });
    const storylets = [
      makeStorylet("s1", { due_offset_days: 2, expires_after_days: 3 }),
    ];

    // Last eligible day: 2 + 3 = 5
    const result = selectTrackStorylets({
      dayIndex: 5,
      progress: [progress],
      storylets,
      tracks: [track],
    });

    expect(result.map((r) => r.storylet.storylet_key)).toEqual(["s1"]);
  });

  it("is NOT available the day after the expiry window ends", () => {
    const track = makeTrack();
    const progress = makeProgress({ started_day: 0 });
    const storylets = [
      makeStorylet("s1", { due_offset_days: 2, expires_after_days: 3 }),
    ];

    const result = selectTrackStorylets({
      dayIndex: 6,
      progress: [progress],
      storylets,
      tracks: [track],
    });

    expect(result).toEqual([]);
  });

  it("with expires_after_days=0 is available only on the due day", () => {
    // This is the first_morning bug class: NULL → 0 defaulted gives a 1-day window.
    const track = makeTrack();
    const progress = makeProgress({ started_day: 0 });
    const storylets = [
      makeStorylet("s1", { due_offset_days: 0, expires_after_days: 0 }),
    ];

    const day0 = selectTrackStorylets({
      dayIndex: 0,
      progress: [progress],
      storylets,
      tracks: [track],
    });
    const day1 = selectTrackStorylets({
      dayIndex: 1,
      progress: [progress],
      storylets,
      tracks: [track],
    });

    expect(day0.map((r) => r.storylet.storylet_key)).toEqual(["s1"]);
    expect(day1).toEqual([]);
  });

  it("respects started_day offset (not just dayIndex)", () => {
    const track = makeTrack();
    // Track started on day 3, storylet due 2 days later → due on day 5.
    const progress = makeProgress({ started_day: 3 });
    const storylets = [
      makeStorylet("s1", { due_offset_days: 2, expires_after_days: 2 }),
    ];

    expect(
      selectTrackStorylets({
        dayIndex: 4,
        progress: [progress],
        storylets,
        tracks: [track],
      })
    ).toEqual([]);

    expect(
      selectTrackStorylets({
        dayIndex: 5,
        progress: [progress],
        storylets,
        tracks: [track],
      }).map((r) => r.storylet.storylet_key)
    ).toEqual(["s1"]);

    expect(
      selectTrackStorylets({
        dayIndex: 7,
        progress: [progress],
        storylets,
        tracks: [track],
      }).map((r) => r.storylet.storylet_key)
    ).toEqual(["s1"]);

    expect(
      selectTrackStorylets({
        dayIndex: 8,
        progress: [progress],
        storylets,
        tracks: [track],
      })
    ).toEqual([]);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Invariant 3: next_key_override wins over pool
// ────────────────────────────────────────────────────────────────────────────

describe("selectTrackStorylets — invariant 3: override beats pool", () => {
  it("serves the override storylet even when a pool candidate has earlier expiry", () => {
    const track = makeTrack();
    const progress = makeProgress({ next_key_override: "s_override" });
    const storylets = [
      // Pool candidate expires sooner (urgent) — would win in a pure pool scan.
      makeStorylet("s_urgent", { due_offset_days: 0, expires_after_days: 1 }),
      // Override target expires much later.
      makeStorylet("s_override", { due_offset_days: 0, expires_after_days: 10 }),
    ];

    const result = selectTrackStorylets({
      dayIndex: 1,
      progress: [progress],
      storylets,
      tracks: [track],
    });

    expect(result.map((r) => r.storylet.storylet_key)).toEqual(["s_override"]);
  });

  it("skips the track entirely when override is set but not yet due", () => {
    const track = makeTrack();
    const progress = makeProgress({ next_key_override: "s_future" });
    const storylets = [
      makeStorylet("s_available", { due_offset_days: 0, expires_after_days: 10 }),
      makeStorylet("s_future", { due_offset_days: 5, expires_after_days: 5 }),
    ];

    const result = selectTrackStorylets({
      dayIndex: 1,
      progress: [progress],
      storylets,
      tracks: [track],
    });

    // Override gate is "in flight" — the engine waits for it rather than
    // falling through to the pool. Prevents out-of-order chain serving.
    expect(result).toEqual([]);
  });

  it("falls through to pool when override storylet is expired", () => {
    const track = makeTrack();
    const progress = makeProgress({ next_key_override: "s_expired" });
    const storylets = [
      makeStorylet("s_expired", { due_offset_days: 0, expires_after_days: 1 }),
      makeStorylet("s_fresh", { due_offset_days: 0, expires_after_days: 10 }),
    ];

    const result = selectTrackStorylets({
      dayIndex: 5, // past s_expired's window (0..1)
      progress: [progress],
      storylets,
      tracks: [track],
    });

    expect(result.map((r) => r.storylet.storylet_key)).toEqual(["s_fresh"]);
  });

  it("falls through to pool when override points at a missing storylet key", () => {
    const track = makeTrack();
    const progress = makeProgress({ next_key_override: "s_does_not_exist" });
    const storylets = [makeStorylet("s_real", { due_offset_days: 0, expires_after_days: 7 })];

    const result = selectTrackStorylets({
      dayIndex: 1,
      progress: [progress],
      storylets,
      tracks: [track],
    });

    expect(result.map((r) => r.storylet.storylet_key)).toEqual(["s_real"]);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Invariant 4: Urgency sort — soonest expiry first
// ────────────────────────────────────────────────────────────────────────────

describe("selectTrackStorylets — invariant 4: urgency ordering", () => {
  it("within a single track, picks the candidate that expires soonest", () => {
    const track = makeTrack();
    const progress = makeProgress();
    const storylets = [
      makeStorylet("s_late", { due_offset_days: 0, expires_after_days: 10 }),
      makeStorylet("s_soon", { due_offset_days: 0, expires_after_days: 2 }),
      makeStorylet("s_mid", { due_offset_days: 0, expires_after_days: 5 }),
    ];

    const result = selectTrackStorylets({
      dayIndex: 1,
      progress: [progress],
      storylets,
      tracks: [track],
    });

    expect(result.map((r) => r.storylet.storylet_key)).toEqual(["s_soon"]);
  });

  it("across tracks, orders results by expires_on_day ascending", () => {
    const trackA = makeTrack({ id: "track_a", key: "track_a" });
    const trackB = makeTrack({ id: "track_b", key: "track_b" });
    const progA = makeProgress({ id: "p_a", track_id: "track_a" });
    const progB = makeProgress({ id: "p_b", track_id: "track_b" });
    const storylets = [
      makeStorylet("a1", { track_id: "track_a", due_offset_days: 0, expires_after_days: 10 }),
      makeStorylet("b1", { track_id: "track_b", due_offset_days: 0, expires_after_days: 3 }),
    ];

    const result = selectTrackStorylets({
      dayIndex: 1,
      progress: [progA, progB],
      storylets,
      tracks: [trackA, trackB],
    });

    // b1 expires sooner (day 3) than a1 (day 10), so b1 must come first.
    expect(result.map((r) => r.storylet.storylet_key)).toEqual(["b1", "a1"]);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Invariant 5: Global maxStorylets cap
// ────────────────────────────────────────────────────────────────────────────

describe("selectTrackStorylets — invariant 5: maxStorylets cap", () => {
  it("caps total results at maxStorylets even with more tracks eligible", () => {
    const tracks = [
      makeTrack({ id: "t1", key: "t1" }),
      makeTrack({ id: "t2", key: "t2" }),
      makeTrack({ id: "t3", key: "t3" }),
    ];
    const progress = [
      makeProgress({ id: "p1", track_id: "t1" }),
      makeProgress({ id: "p2", track_id: "t2" }),
      makeProgress({ id: "p3", track_id: "t3" }),
    ];
    const storylets = [
      makeStorylet("s1", { track_id: "t1", expires_after_days: 1 }),
      makeStorylet("s2", { track_id: "t2", expires_after_days: 2 }),
      makeStorylet("s3", { track_id: "t3", expires_after_days: 3 }),
    ];

    const result = selectTrackStorylets({
      dayIndex: 0,
      progress,
      storylets,
      tracks,
      maxStorylets: 2,
    });

    expect(result).toHaveLength(2);
    // Most urgent kept.
    expect(result.map((r) => r.storylet.storylet_key)).toEqual(["s1", "s2"]);
  });

  it("returns at most one storylet per track (pool scan picks one winner)", () => {
    const track = makeTrack();
    const progress = makeProgress();
    const storylets = [
      makeStorylet("s1", { expires_after_days: 1 }),
      makeStorylet("s2", { expires_after_days: 2 }),
      makeStorylet("s3", { expires_after_days: 3 }),
    ];

    const result = selectTrackStorylets({
      dayIndex: 0,
      progress: [progress],
      storylets,
      tracks: [track],
      maxStorylets: 5, // Would allow more if they came from multiple tracks.
    });

    expect(result).toHaveLength(1);
    expect(result[0].storylet.storylet_key).toBe("s1");
  });

  it("default cap is 2 when maxStorylets is omitted", () => {
    const tracks = [
      makeTrack({ id: "t1", key: "t1" }),
      makeTrack({ id: "t2", key: "t2" }),
      makeTrack({ id: "t3", key: "t3" }),
    ];
    const progress = [
      makeProgress({ id: "p1", track_id: "t1" }),
      makeProgress({ id: "p2", track_id: "t2" }),
      makeProgress({ id: "p3", track_id: "t3" }),
    ];
    const storylets = [
      makeStorylet("s1", { track_id: "t1", expires_after_days: 1 }),
      makeStorylet("s2", { track_id: "t2", expires_after_days: 2 }),
      makeStorylet("s3", { track_id: "t3", expires_after_days: 3 }),
    ];

    const result = selectTrackStorylets({
      dayIndex: 0,
      progress,
      storylets,
      tracks,
    });

    expect(result).toHaveLength(2);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Invariant 6: Requirement AND logic
// (is_active + segment + requires_choice + requires_skill)
// ────────────────────────────────────────────────────────────────────────────

describe("selectTrackStorylets — invariant 6: requirements all gate", () => {
  it("excludes is_active=false storylets", () => {
    const track = makeTrack();
    const progress = makeProgress();
    const storylets = [
      makeStorylet("s_off", { is_active: false }),
      makeStorylet("s_on"),
    ];

    const result = selectTrackStorylets({
      dayIndex: 1,
      progress: [progress],
      storylets,
      tracks: [track],
    });

    expect(result.map((r) => r.storylet.storylet_key)).toEqual(["s_on"]);
  });

  it("respects segment filter when currentSegment is set", () => {
    const track = makeTrack();
    const progress = makeProgress();
    const storylets = [
      makeStorylet("s_morning", { segment: "morning" }),
      makeStorylet("s_evening", { segment: "evening" }),
      makeStorylet("s_any", { segment: null }),
    ];

    const result = selectTrackStorylets({
      dayIndex: 1,
      progress: [progress],
      storylets,
      tracks: [track],
      currentSegment: "morning",
    });

    const keys = result.map((r) => r.storylet.storylet_key);
    // Only one per track — urgency sort (all equal) uses array order; both
    // s_morning and s_any match. Either is acceptable; evening must NOT appear.
    expect(keys).not.toContain("s_evening");
    expect(keys.length).toBe(1);
  });

  it("requires_choice (track-scoped) gates the storylet", () => {
    const track = makeTrack();
    const progress = makeProgress();
    const storylets = [
      makeStorylet("s_locked", {
        requirements: { requires_choice: "picked_a" },
      }),
    ];

    // Not resolved → excluded.
    const locked = selectTrackStorylets({
      dayIndex: 1,
      progress: [progress],
      storylets,
      tracks: [track],
    });
    expect(locked).toEqual([]);

    // Resolved → visible.
    const unlocked = selectTrackStorylets({
      dayIndex: 1,
      progress: [progress],
      storylets,
      tracks: [track],
      resolvedChoicesByTrack: new Map([["track_a", new Set(["picked_a"])]]),
    });
    expect(unlocked.map((r) => r.storylet.storylet_key)).toEqual(["s_locked"]);
  });

  it("requires_choice is track-scoped — choice on a different track does NOT unlock", () => {
    const trackA = makeTrack({ id: "track_a", key: "track_a" });
    const trackB = makeTrack({ id: "track_b", key: "track_b" });
    const progA = makeProgress({ id: "p_a", track_id: "track_a" });
    const progB = makeProgress({ id: "p_b", track_id: "track_b" });
    const storylets = [
      makeStorylet("s_b_locked", {
        track_id: "track_b",
        requirements: { requires_choice: "picked_a" },
      }),
    ];

    const result = selectTrackStorylets({
      dayIndex: 1,
      progress: [progA, progB],
      storylets,
      tracks: [trackA, trackB],
      // Choice recorded on track_a, but storylet is on track_b — must NOT unlock.
      resolvedChoicesByTrack: new Map([["track_a", new Set(["picked_a"])]]),
    });

    expect(result).toEqual([]);
  });

  it("requires_skill gates by global trained-skill set", () => {
    const track = makeTrack();
    const progress = makeProgress();
    const storylets = [
      makeStorylet("s_skill_gated", {
        requirements: { requires_skill: { skill_id: "piano" } },
      }),
    ];

    const locked = selectTrackStorylets({
      dayIndex: 1,
      progress: [progress],
      storylets,
      tracks: [track],
    });
    expect(locked).toEqual([]);

    const unlocked = selectTrackStorylets({
      dayIndex: 1,
      progress: [progress],
      storylets,
      tracks: [track],
      trainedSkillIds: new Set(["piano"]),
    });
    expect(unlocked.map((r) => r.storylet.storylet_key)).toEqual(["s_skill_gated"]);
  });

  it("combined requires_choice AND requires_skill — both must pass", () => {
    const track = makeTrack();
    const progress = makeProgress();
    const storylets = [
      makeStorylet("s_combo", {
        requirements: {
          requires_choice: "picked_a",
          requires_skill: { skill_id: "piano" },
        },
      }),
    ];

    // Only choice: still locked.
    expect(
      selectTrackStorylets({
        dayIndex: 1,
        progress: [progress],
        storylets,
        tracks: [track],
        resolvedChoicesByTrack: new Map([["track_a", new Set(["picked_a"])]]),
      })
    ).toEqual([]);

    // Only skill: still locked.
    expect(
      selectTrackStorylets({
        dayIndex: 1,
        progress: [progress],
        storylets,
        tracks: [track],
        trainedSkillIds: new Set(["piano"]),
      })
    ).toEqual([]);

    // Both: unlocked.
    expect(
      selectTrackStorylets({
        dayIndex: 1,
        progress: [progress],
        storylets,
        tracks: [track],
        resolvedChoicesByTrack: new Map([["track_a", new Set(["picked_a"])]]),
        trainedSkillIds: new Set(["piano"]),
      }).map((r) => r.storylet.storylet_key)
    ).toEqual(["s_combo"]);
  });

  it("requires_flag gates the storylet (track-scoped)", () => {
    const track = makeTrack();
    const progress = makeProgress();
    const storylets = [
      makeStorylet("s_flag_gated", {
        requirements: { requires_flag: "has_job_research" },
      }),
    ];

    // No flags → excluded.
    const locked = selectTrackStorylets({
      dayIndex: 1,
      progress: [progress],
      storylets,
      tracks: [track],
    });
    expect(locked).toEqual([]);

    // Flag set → visible.
    const unlocked = selectTrackStorylets({
      dayIndex: 1,
      progress: [progress],
      storylets,
      tracks: [track],
      flagsByTrack: new Map([["track_a", new Set(["has_job_research"])]]),
    });
    expect(unlocked.map((r) => r.storylet.storylet_key)).toEqual(["s_flag_gated"]);
  });

  it("requires_flag is cross-track via globalFlags — flag set on track A unlocks storylet on track B", () => {
    // Regression guard for the tuesday_terminal → the_post gate: a flag set by
    // a choice on the belonging track must unlock an opportunity-track storylet.
    const trackA = makeTrack({ id: "track_a", key: "track_a" });
    const trackB = makeTrack({ id: "track_b", key: "track_b" });
    const progA = makeProgress({ id: "p_a", track_id: "track_a" });
    const progB = makeProgress({ id: "p_b", track_id: "track_b" });
    const storylets = [
      makeStorylet("s_b_flag_gated", {
        track_id: "track_b",
        requirements: { requires_flag: "my_flag" },
      }),
    ];

    // flagsByTrack alone (track_a) does NOT unlock — per-track map only holds
    // the track that wrote the flag.
    const lockedWithoutGlobal = selectTrackStorylets({
      dayIndex: 1,
      progress: [progA, progB],
      storylets,
      tracks: [trackA, trackB],
      flagsByTrack: new Map([["track_a", new Set(["my_flag"])]]),
    });
    expect(lockedWithoutGlobal).toEqual([]);

    // With globalFlags populated (as dailyLoop does in practice) the gate opens.
    const unlockedWithGlobal = selectTrackStorylets({
      dayIndex: 1,
      progress: [progA, progB],
      storylets,
      tracks: [trackA, trackB],
      flagsByTrack: new Map([["track_a", new Set(["my_flag"])]]),
      globalFlags: new Set(["my_flag"]),
    });
    expect(unlockedWithGlobal.map((r) => r.storylet.storylet_key)).toEqual([
      "s_b_flag_gated",
    ]);
  });

  it("combined requires_flag AND requires_choice — both must pass", () => {
    const track = makeTrack();
    const progress = makeProgress();
    const storylets = [
      makeStorylet("s_combo_flag", {
        requirements: {
          requires_choice: "picked_a",
          requires_flag: "some_flag",
        },
      }),
    ];

    // Only choice → locked.
    expect(
      selectTrackStorylets({
        dayIndex: 1,
        progress: [progress],
        storylets,
        tracks: [track],
        resolvedChoicesByTrack: new Map([["track_a", new Set(["picked_a"])]]),
      })
    ).toEqual([]);

    // Only flag → locked.
    expect(
      selectTrackStorylets({
        dayIndex: 1,
        progress: [progress],
        storylets,
        tracks: [track],
        flagsByTrack: new Map([["track_a", new Set(["some_flag"])]]),
      })
    ).toEqual([]);

    // Both → unlocked.
    expect(
      selectTrackStorylets({
        dayIndex: 1,
        progress: [progress],
        storylets,
        tracks: [track],
        resolvedChoicesByTrack: new Map([["track_a", new Set(["picked_a"])]]),
        flagsByTrack: new Map([["track_a", new Set(["some_flag"])]]),
      }).map((r) => r.storylet.storylet_key)
    ).toEqual(["s_combo_flag"]);
  });

  it("unknown requirement keys pass (forward-compatible)", () => {
    const track = makeTrack();
    const progress = makeProgress();
    const storylets = [
      makeStorylet("s_future", {
        requirements: { requires_some_future_thing: "foo" },
      }),
    ];

    const result = selectTrackStorylets({
      dayIndex: 1,
      progress: [progress],
      storylets,
      tracks: [track],
    });

    expect(result.map((r) => r.storylet.storylet_key)).toEqual(["s_future"]);
  });

  it("excludes storylets on tracks where progress.state !== ACTIVE", () => {
    const track = makeTrack();
    const progress = makeProgress({ state: "COMPLETED" });
    const storylets = [makeStorylet("s1")];

    const result = selectTrackStorylets({
      dayIndex: 1,
      progress: [progress],
      storylets,
      tracks: [track],
    });

    expect(result).toEqual([]);
  });

  it("excludes storylets on tracks with is_enabled=false", () => {
    const track = makeTrack({ is_enabled: false });
    const progress = makeProgress();
    const storylets = [makeStorylet("s1")];

    const result = selectTrackStorylets({
      dayIndex: 1,
      progress: [progress],
      storylets,
      tracks: [track],
    });

    expect(result).toEqual([]);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Invariant 7: Conflict-storylet segment bypass
// is_conflict=true + hoursRemaining < 4 → bypass segment gate.
// ────────────────────────────────────────────────────────────────────────────

describe("selectTrackStorylets — invariant 7: conflict segment bypass", () => {
  it("does NOT bypass segment when hoursRemaining >= 4 (not time-tight)", () => {
    const track = makeTrack();
    const progress = makeProgress();
    const storylets = [
      makeStorylet("s_conflict", {
        segment: "evening",
        is_conflict: true,
      }),
    ];

    const result = selectTrackStorylets({
      dayIndex: 1,
      progress: [progress],
      storylets,
      tracks: [track],
      currentSegment: "morning",
      hoursRemaining: 8,
    });

    expect(result).toEqual([]);
  });

  it("DOES bypass segment when is_conflict=true AND hoursRemaining < 4", () => {
    const track = makeTrack();
    const progress = makeProgress();
    const storylets = [
      makeStorylet("s_conflict", {
        segment: "evening",
        is_conflict: true,
      }),
    ];

    const result = selectTrackStorylets({
      dayIndex: 1,
      progress: [progress],
      storylets,
      tracks: [track],
      currentSegment: "morning",
      hoursRemaining: 3,
    });

    expect(result.map((r) => r.storylet.storylet_key)).toEqual(["s_conflict"]);
  });

  it("does NOT bypass when time-tight but is_conflict=false", () => {
    const track = makeTrack();
    const progress = makeProgress();
    const storylets = [
      makeStorylet("s_normal", {
        segment: "evening",
        is_conflict: false,
      }),
    ];

    const result = selectTrackStorylets({
      dayIndex: 1,
      progress: [progress],
      storylets,
      tracks: [track],
      currentSegment: "morning",
      hoursRemaining: 3,
    });

    expect(result).toEqual([]);
  });

  it("boundary: hoursRemaining === 4 is NOT time-tight (strict less-than)", () => {
    const track = makeTrack();
    const progress = makeProgress();
    const storylets = [
      makeStorylet("s_conflict", {
        segment: "evening",
        is_conflict: true,
      }),
    ];

    const result = selectTrackStorylets({
      dayIndex: 1,
      progress: [progress],
      storylets,
      tracks: [track],
      currentSegment: "morning",
      hoursRemaining: 4,
    });

    expect(result).toEqual([]);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Invariant 8: Preclusion — permanently locked-out storylets excluded
// ────────────────────────────────────────────────────────────────────────────

describe("selectTrackStorylets — invariant 8: preclusion", () => {
  it("excludes a precluded storylet from the pool", () => {
    const track = makeTrack();
    const progress = makeProgress();
    const storylets = [
      makeStorylet("s_available"),
      makeStorylet("s_precluded", { expires_after_days: 7 }),
    ];

    const result = selectTrackStorylets({
      dayIndex: 1,
      progress: [progress],
      storylets,
      tracks: [track],
      precludedKeys: new Set(["s_precluded"]),
    });

    expect(result.map((r) => r.storylet.storylet_key)).toEqual(["s_available"]);
  });

  it("preclusion is cross-track — precludes storylets on any track", () => {
    const trackA = makeTrack({ id: "track_a", key: "track_a" });
    const trackB = makeTrack({ id: "track_b", key: "track_b" });
    const progA = makeProgress({ id: "p_a", track_id: "track_a" });
    const progB = makeProgress({ id: "p_b", track_id: "track_b" });
    const storylets = [
      makeStorylet("s_a", { track_id: "track_a" }),
      makeStorylet("s_b_precluded", { track_id: "track_b" }),
    ];

    const result = selectTrackStorylets({
      dayIndex: 1,
      progress: [progA, progB],
      storylets,
      tracks: [trackA, trackB],
      precludedKeys: new Set(["s_b_precluded"]),
    });

    expect(result.map((r) => r.storylet.storylet_key)).toEqual(["s_a"]);
  });

  it("returns nothing when all candidates are precluded", () => {
    const track = makeTrack();
    const progress = makeProgress();
    const storylets = [makeStorylet("s1"), makeStorylet("s2")];

    const result = selectTrackStorylets({
      dayIndex: 1,
      progress: [progress],
      storylets,
      tracks: [track],
      precludedKeys: new Set(["s1", "s2"]),
    });

    expect(result).toEqual([]);
  });
});
