import { describe, expect, it } from "vitest";

import {
  assignmentSourceLabel,
  canSelfSelect,
  isCoordinator,
  presenceCountLabel,
  summarizePresence,
} from "./mpAssignments";
import type { AssignmentSource, PresentPlayer } from "@/types/mpAssignments";

const player = (
  player_id: string,
  source: AssignmentSource
): PresentPlayer => ({ player_id, display_name: null, source });

// ─────────────────────────────────────────────────────────────────────
// isCoordinator — coordinator-only authorization, fails closed on null
// ─────────────────────────────────────────────────────────────────────

describe("isCoordinator", () => {
  it("is true only when the caller matches the coordinator", () => {
    expect(isCoordinator("u1", "u1")).toBe(true);
  });

  it("is false when the caller is a different user", () => {
    expect(isCoordinator("u2", "u1")).toBe(false);
  });

  it("fails closed when no coordinator is seated (null)", () => {
    expect(isCoordinator("u1", null)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────
// canSelfSelect — a player may self-select unless coordinator-placed
// ─────────────────────────────────────────────────────────────────────

describe("canSelfSelect", () => {
  it("allows self-selection when unassigned", () => {
    expect(canSelfSelect(null)).toBe(true);
  });

  it("allows moving when already self-selected", () => {
    expect(canSelfSelect({ source: "self_selected" })).toBe(true);
  });

  it("blocks self-selection when the coordinator has placed the player", () => {
    expect(canSelfSelect({ source: "coordinator" })).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────
// assignmentSourceLabel
// ─────────────────────────────────────────────────────────────────────

describe("assignmentSourceLabel", () => {
  it("labels coordinator placements as Deployed", () => {
    expect(assignmentSourceLabel("coordinator")).toBe("Deployed");
  });

  it("labels self-selection as Showed up", () => {
    expect(assignmentSourceLabel("self_selected")).toBe("Showed up");
  });
});

// ─────────────────────────────────────────────────────────────────────
// summarizePresence — per-source counts driving the card label
// ─────────────────────────────────────────────────────────────────────

describe("summarizePresence", () => {
  it("counts an empty list as all zeros", () => {
    expect(summarizePresence([])).toEqual({
      deployed: 0,
      self_selected: 0,
      total: 0,
    });
  });

  it("splits counts by source", () => {
    const players = [
      player("a", "coordinator"),
      player("b", "coordinator"),
      player("c", "self_selected"),
    ];
    expect(summarizePresence(players)).toEqual({
      deployed: 2,
      self_selected: 1,
      total: 3,
    });
  });
});

// ─────────────────────────────────────────────────────────────────────
// presenceCountLabel
// ─────────────────────────────────────────────────────────────────────

describe("presenceCountLabel", () => {
  it("reads Empty when no one is present", () => {
    expect(presenceCountLabel(summarizePresence([]))).toBe("Empty");
  });

  it("joins both sources with a middot", () => {
    const players = [
      player("a", "coordinator"),
      player("b", "coordinator"),
      player("c", "self_selected"),
    ];
    expect(presenceCountLabel(summarizePresence(players))).toBe(
      "2 deployed · 1 showed up"
    );
  });

  it("shows only the present source", () => {
    expect(
      presenceCountLabel(summarizePresence([player("a", "self_selected")]))
    ).toBe("1 showed up");
    expect(
      presenceCountLabel(summarizePresence([player("a", "coordinator")]))
    ).toBe("1 deployed");
  });
});
