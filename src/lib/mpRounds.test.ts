import { describe, expect, it } from "vitest";

import {
  AI_CON_DRIFT,
  PRESSURE_THRESHOLD,
  applyStateDelta,
  computeAiDrift,
  computeRemainingSeconds,
  isRoundExpired,
  placeholderPresenceScore,
} from "./mpRounds";

// ─────────────────────────────────────────────────────────────────────
// placeholderPresenceScore — flat contribution per player
// ─────────────────────────────────────────────────────────────────────

describe("placeholderPresenceScore", () => {
  it("returns the player count unchanged", () => {
    expect(placeholderPresenceScore(0)).toBe(0);
    expect(placeholderPresenceScore(3)).toBe(3);
    expect(placeholderPresenceScore(10)).toBe(10);
  });
});

// ─────────────────────────────────────────────────────────────────────
// applyStateDelta — one step per boundary, no double-jump
// ─────────────────────────────────────────────────────────────────────

describe("applyStateDelta", () => {
  it("moves contested → leaning_yes when pro meets threshold", () => {
    expect(applyStateDelta("contested", PRESSURE_THRESHOLD, 0)).toBe(
      "leaning_yes"
    );
  });

  it("moves contested → leaning_no when con meets threshold", () => {
    expect(applyStateDelta("contested", 0, PRESSURE_THRESHOLD)).toBe(
      "leaning_no"
    );
  });

  it("does not skip steps: contested + heavy pro stays leaning_yes (no double-jump)", () => {
    expect(applyStateDelta("contested", PRESSURE_THRESHOLD * 10, 0)).toBe(
      "leaning_yes"
    );
  });

  it("moves leaning_yes → won when pro meets threshold", () => {
    expect(applyStateDelta("leaning_yes", PRESSURE_THRESHOLD, 0)).toBe("won");
  });

  it("moves leaning_yes → contested when con meets threshold (pushback)", () => {
    expect(applyStateDelta("leaning_yes", 0, PRESSURE_THRESHOLD)).toBe(
      "contested"
    );
  });

  it("moves leaning_no → lost when con meets threshold", () => {
    expect(applyStateDelta("leaning_no", 0, PRESSURE_THRESHOLD)).toBe("lost");
  });

  it("moves leaning_no → contested when pro meets threshold (recovery)", () => {
    expect(applyStateDelta("leaning_no", PRESSURE_THRESHOLD, 0)).toBe(
      "contested"
    );
  });

  it("leaves state unchanged when neither threshold is met", () => {
    expect(applyStateDelta("contested", 0, 0)).toBe("contested");
    expect(applyStateDelta("leaning_yes", PRESSURE_THRESHOLD - 1, 0)).toBe(
      "leaning_yes"
    );
  });

  it("terminal states are not reversed in this slice", () => {
    expect(applyStateDelta("won", PRESSURE_THRESHOLD * 10, 0)).toBe("won");
    expect(applyStateDelta("lost", PRESSURE_THRESHOLD * 10, 0)).toBe("lost");
  });
});

// ─────────────────────────────────────────────────────────────────────
// computeAiDrift — con drift + escalation target selection
// ─────────────────────────────────────────────────────────────────────

describe("computeAiDrift", () => {
  const loc = (
    id: string,
    state: Parameters<typeof computeAiDrift>[0][number]["state"],
    display_order: number
  ) => ({ id, state, display_order });

  it("applies AI_CON_DRIFT to every non-terminal location", () => {
    const locations = [
      loc("a", "contested", 1),
      loc("b", "leaning_yes", 2),
      loc("c", "leaning_no", 3),
      loc("d", "won", 4),
      loc("e", "lost", 5),
    ];
    const { conBumps } = computeAiDrift(locations);
    expect(conBumps["a"]).toBe(AI_CON_DRIFT);
    expect(conBumps["b"]).toBe(AI_CON_DRIFT);
    expect(conBumps["c"]).toBe(AI_CON_DRIFT);
    expect(conBumps["d"]).toBeUndefined();
    expect(conBumps["e"]).toBeUndefined();
  });

  it("picks leaning_no as escalation target over contested (tier priority)", () => {
    const locations = [
      loc("contested-loc", "contested", 1),
      loc("leanno-loc", "leaning_no", 2),
    ];
    const { escalated_id } = computeAiDrift(locations);
    expect(escalated_id).toBe("leanno-loc");
  });

  it("picks contested over leaning_yes as escalation target", () => {
    const locations = [
      loc("leanyes-loc", "leaning_yes", 1),
      loc("contested-loc", "contested", 2),
    ];
    const { escalated_id } = computeAiDrift(locations);
    expect(escalated_id).toBe("contested-loc");
  });

  it("breaks ties within a tier by lowest display_order", () => {
    const locations = [
      loc("c-high", "leaning_no", 5),
      loc("c-low", "leaning_no", 2),
    ];
    const { escalated_id } = computeAiDrift(locations);
    expect(escalated_id).toBe("c-low");
  });

  it("returns null escalation when all locations are terminal", () => {
    const locations = [
      loc("a", "won", 1),
      loc("b", "lost", 2),
    ];
    const { escalated_id, conBumps } = computeAiDrift(locations);
    expect(escalated_id).toBeNull();
    expect(Object.keys(conBumps)).toHaveLength(0);
  });

  it("demo scenario: West Dorm (leaning_no) is the escalation target", () => {
    // Mirrors the First Renfaire starting state.
    const locations = [
      loc("1c000000-0000-4000-a000-000000000001", "lost", 1),        // Admin Building
      loc("1c000000-0000-4000-a000-000000000002", "contested", 2),   // Merchant Row
      loc("1c000000-0000-4000-a000-000000000003", "leaning_yes", 3), // South Dorm
      loc("1c000000-0000-4000-a000-000000000004", "contested", 4),   // North Dorm
      loc("1c000000-0000-4000-a000-000000000005", "leaning_no", 5),  // West Dorm
      loc("1c000000-0000-4000-a000-000000000006", "contested", 6),   // Dining Hall
    ];
    const { escalated_id } = computeAiDrift(locations);
    expect(escalated_id).toBe("1c000000-0000-4000-a000-000000000005"); // West Dorm
  });
});

// ─────────────────────────────────────────────────────────────────────
// computeRemainingSeconds
// ─────────────────────────────────────────────────────────────────────

describe("computeRemainingSeconds", () => {
  it("returns null when activeStartedAt is null (planning phase)", () => {
    expect(computeRemainingSeconds(null, 120)).toBeNull();
  });

  it("returns a positive value when the round is still running", () => {
    const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString();
    const remaining = computeRemainingSeconds(fiveSecondsAgo, 120);
    expect(remaining).not.toBeNull();
    expect(remaining!).toBeGreaterThan(100);
    expect(remaining!).toBeLessThanOrEqual(115);
  });

  it("returns a negative or zero value when the round has expired", () => {
    const longAgo = new Date(Date.now() - 200_000).toISOString();
    const remaining = computeRemainingSeconds(longAgo, 120);
    expect(remaining).not.toBeNull();
    expect(remaining!).toBeLessThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────
// isRoundExpired
// ─────────────────────────────────────────────────────────────────────

describe("isRoundExpired", () => {
  it("is false when activeStartedAt is null", () => {
    expect(isRoundExpired(null, 120)).toBe(false);
  });

  it("is false when the round is still within its duration", () => {
    const justNow = new Date(Date.now() - 1000).toISOString();
    expect(isRoundExpired(justNow, 120)).toBe(false);
  });

  it("is true when the round has exceeded its duration", () => {
    const longAgo = new Date(Date.now() - 200_000).toISOString();
    expect(isRoundExpired(longAgo, 120)).toBe(true);
  });

  it("is true at exactly the boundary (0 seconds remaining)", () => {
    const exactBoundary = new Date(Date.now() - 120_000 - 100).toISOString();
    expect(isRoundExpired(exactBoundary, 120)).toBe(true);
  });
});
