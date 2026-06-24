import { describe, expect, it } from "vitest";

import {
  CLUB_DESCRIPTION_MAX,
  CLUB_NAME_MAX,
  CLUB_NAME_MIN,
  canResolveApplication,
  validateClubInput,
} from "./clubs";

// ─────────────────────────────────────────────────────────────────────
// validateClubInput
// ─────────────────────────────────────────────────────────────────────

describe("validateClubInput", () => {
  it("accepts a valid name and description, trimming both", () => {
    const result = validateClubInput({
      name: "  Chess Club  ",
      description: "  We play chess.  ",
    });
    expect(result).toEqual({
      ok: true,
      value: { name: "Chess Club", description: "We play chess." },
    });
  });

  it("defaults description to an empty string when omitted", () => {
    const result = validateClubInput({ name: "Chess Club" });
    expect(result).toEqual({
      ok: true,
      value: { name: "Chess Club", description: "" },
    });
  });

  it("treats a null description as empty", () => {
    const result = validateClubInput({ name: "Chess Club", description: null });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.description).toBe("");
  });

  it("accepts names at the min and max length boundaries", () => {
    const min = validateClubInput({ name: "a".repeat(CLUB_NAME_MIN) });
    const max = validateClubInput({ name: "a".repeat(CLUB_NAME_MAX) });
    expect(min.ok).toBe(true);
    expect(max.ok).toBe(true);
  });

  it("rejects a name shorter than the minimum", () => {
    const result = validateClubInput({ name: "a".repeat(CLUB_NAME_MIN - 1) });
    expect(result.ok).toBe(false);
  });

  it("rejects a name longer than the maximum", () => {
    const result = validateClubInput({ name: "a".repeat(CLUB_NAME_MAX + 1) });
    expect(result.ok).toBe(false);
  });

  it("rejects a name that is only whitespace", () => {
    const result = validateClubInput({ name: "   " });
    expect(result.ok).toBe(false);
  });

  it("rejects a missing or non-string name", () => {
    expect(validateClubInput({}).ok).toBe(false);
    expect(validateClubInput({ name: 42 }).ok).toBe(false);
    expect(validateClubInput({ name: null }).ok).toBe(false);
  });

  it("rejects a non-string description", () => {
    const result = validateClubInput({ name: "Chess Club", description: 42 });
    expect(result.ok).toBe(false);
  });

  it("rejects a description longer than the maximum", () => {
    const result = validateClubInput({
      name: "Chess Club",
      description: "a".repeat(CLUB_DESCRIPTION_MAX + 1),
    });
    expect(result.ok).toBe(false);
  });

  it("accepts a description at the max length boundary", () => {
    const result = validateClubInput({
      name: "Chess Club",
      description: "a".repeat(CLUB_DESCRIPTION_MAX),
    });
    expect(result.ok).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────
// canResolveApplication
// ─────────────────────────────────────────────────────────────────────

describe("canResolveApplication", () => {
  it("allows resolving a pending application", () => {
    expect(canResolveApplication("pending")).toBe(true);
  });

  it("rejects resolving an already-resolved application", () => {
    expect(canResolveApplication("accepted")).toBe(false);
    expect(canResolveApplication("rejected")).toBe(false);
  });
});
