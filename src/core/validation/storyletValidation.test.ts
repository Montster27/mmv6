import { describe, expect, it } from "vitest";

import {
  coerceStoryletRow,
  validateStorylet,
  validateStoryletIssues,
} from "./storyletValidation";

const valid = {
  id: "s1",
  slug: "slug",
  title: "Title",
  body: "Body",
  choices: [
    { id: "a", label: "A" },
    { id: "b", label: "B", outcome: { stress: -1 } },
  ],
  is_active: true,
};

describe("storyletValidation", () => {
  it("validates a well-formed storylet", () => {
    const res = validateStorylet(valid);
    expect(res.ok).toBe(true);
  });

  it("rejects invalid choices", () => {
    const invalidChoices = { ...valid, choices: "not-array" };
    const res = validateStorylet(invalidChoices);
    expect(res.ok).toBe(false);
  });

  it("coerces missing choices to an empty array", () => {
    const coerced = coerceStoryletRow({ ...valid, choices: null });
    expect(Array.isArray(coerced.choices)).toBe(true);
    expect(coerced.choices.length).toBe(0);
  });

  it("accepts probabilistic outcomes with weights", () => {
    const withOutcomes = {
      ...valid,
      choices: [
        {
          id: "A",
          label: "Option A",
          outcomes: [
            { id: "success", weight: 70, text: "ok" },
            { id: "fail", weight: 30, text: "nope" },
          ],
        },
      ],
    };
    const res = validateStorylet(withOutcomes);
    expect(res.ok).toBe(true);
  });

  it("accepts checks on choices", () => {
    const withCheck = {
      ...valid,
      choices: [
        {
          id: "A",
          label: "Option A",
          check: { id: "focus_check", baseChance: 0.5, skillWeights: { focus: 0.02 } },
          outcomes: [
            { id: "success", weight: 1, text: "ok" },
            { id: "failure", weight: 1, text: "nope" },
          ],
        },
      ],
    };
    const res = validateStorylet(withCheck);
    expect(res.ok).toBe(true);
  });

  it("rejects invalid probabilistic outcomes", () => {
    const withBadOutcomes = {
      ...valid,
      choices: [
        {
          id: "A",
          label: "Option A",
          outcomes: [{ id: "oops", weight: 0 }],
        },
      ],
    };
    const res = validateStorylet(withBadOutcomes);
    expect(res.ok).toBe(false);
  });

  it("rejects duplicate choice ids", () => {
    const invalid = {
      ...valid,
      choices: [
        { id: "dup", label: "A" },
        { id: "dup", label: "B" },
      ],
    };
    const res = validateStorylet(invalid);
    expect(res.ok).toBe(false);
  });

  it("rejects duplicate outcome ids", () => {
    const invalid = {
      ...valid,
      choices: [
        {
          id: "A",
          label: "Option A",
          outcomes: [
            { id: "same", weight: 1 },
            { id: "same", weight: 2 },
          ],
        },
      ],
    };
    const res = validateStorylet(invalid);
    expect(res.ok).toBe(false);
  });

  it("rejects invalid season requirements", () => {
    const invalidReq = {
      ...valid,
      requirements: { min_season_index: 3, max_season_index: 1 },
    };
    const res = validateStorylet(invalidReq);
    expect(res.ok).toBe(false);
  });

  it("rejects non-numeric season allowlist", () => {
    const invalidReq = {
      ...valid,
      requirements: { seasons_any: ["1"] },
    };
    const res = validateStorylet(invalidReq);
    expect(res.ok).toBe(false);
  });

  it("warns on unknown requirement keys", () => {
    const invalidReq = {
      ...valid,
      requirements: { unknown_key: true },
    };
    const res = validateStoryletIssues(invalidReq);
    expect(res.errors.length).toBe(0);
    expect(res.warnings.length).toBe(1);
  });

  it("rejects invalid audience rollout percent", () => {
    const invalidReq = {
      ...valid,
      requirements: { audience: { rollout_pct: 200 } },
    };
    const res = validateStorylet(invalidReq);
    expect(res.ok).toBe(false);
  });

  it("rejects invalid audience experiment variants", () => {
    const invalidReq = {
      ...valid,
      requirements: {
        audience: { experiment: { id: "exp", variants_any: [1] } },
      },
    };
    const res = validateStorylet(invalidReq);
    expect(res.ok).toBe(false);
  });

  // ── max_total_runs ──────────────────────────────────────────────────────

  it("accepts a valid max_total_runs integer", () => {
    const res = validateStorylet({ ...valid, requirements: { max_total_runs: 1 } });
    expect(res.ok).toBe(true);
  });

  it("rejects max_total_runs that is not a positive integer", () => {
    expect(validateStorylet({ ...valid, requirements: { max_total_runs: 0 } }).ok).toBe(false);
    expect(validateStorylet({ ...valid, requirements: { max_total_runs: -1 } }).ok).toBe(false);
    expect(validateStorylet({ ...valid, requirements: { max_total_runs: 1.5 } }).ok).toBe(false);
    expect(validateStorylet({ ...valid, requirements: { max_total_runs: "1" } }).ok).toBe(false);
  });

  // ── requires_npc_met / requires_npc_not_met ─────────────────────────────

  it("accepts valid requires_npc_met array", () => {
    const res = validateStorylet({
      ...valid,
      requirements: { requires_npc_met: ["npc_floor_keith"] },
    });
    expect(res.ok).toBe(true);
  });

  it("rejects requires_npc_met that is not an array", () => {
    const res = validateStorylet({
      ...valid,
      requirements: { requires_npc_met: "npc_floor_keith" },
    });
    expect(res.ok).toBe(false);
  });

  it("rejects requires_npc_met entries not starting with npc_", () => {
    const res = validateStorylet({
      ...valid,
      requirements: { requires_npc_met: ["cal"] },
    });
    expect(res.ok).toBe(false);
  });

  it("accepts valid requires_npc_not_met array", () => {
    const res = validateStorylet({
      ...valid,
      requirements: { requires_npc_not_met: ["npc_floor_keith"] },
    });
    expect(res.ok).toBe(true);
  });

  // ── NPC name-leak detection ─────────────────────────────────────────────

  it("warns when body text contains an unguarded NPC name", () => {
    const withNameLeak = { ...valid, body: "You spot Doug across the hall." };
    const res = validateStoryletIssues(withNameLeak);
    expect(res.warnings.some((w) => w.path === "body" && w.message.includes("Doug"))).toBe(true);
  });

  it("does not warn about NPC name when requires_npc_met is set", () => {
    const guarded = {
      ...valid,
      body: "You find Doug at the table.",
      requirements: { requires_npc_met: ["npc_floor_doug"] },
    };
    const res = validateStoryletIssues(guarded);
    expect(res.warnings.some((w) => w.path === "body" && w.message.includes("Doug"))).toBe(false);
  });

  it("warns when a choice label contains an unguarded NPC name", () => {
    const withLabelLeak = {
      ...valid,
      choices: [{ id: "a", label: "Follow Doug to the table" }],
    };
    const res = validateStoryletIssues(withLabelLeak);
    expect(
      res.warnings.some((w) => w.path.startsWith("choices") && w.message.includes("Doug"))
    ).toBe(true);
  });

  it("does not warn about NPC name in choice label when storylet requires that NPC met", () => {
    const guarded = {
      ...valid,
      choices: [{ id: "a", label: "Ask Doug about the club" }],
      requirements: { requires_npc_met: ["npc_floor_doug"] },
    };
    const res = validateStoryletIssues(guarded);
    expect(
      res.warnings.some((w) => w.path.startsWith("choices") && w.message.includes("Doug"))
    ).toBe(false);
  });
});
