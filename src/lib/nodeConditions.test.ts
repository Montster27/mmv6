import { describe, it, expect } from "vitest";
import type { DialogueNode, MicroChoice, NodeCondition } from "@/types/storylets";
import type { PlayerIdentity } from "@/types/identity";
import type { PeriodStanceState } from "@/core/chapter/types";
import {
  evaluateNodeCondition,
  resolveNodeText,
  resolveMicroLabel,
  type PlayerContext,
} from "./nodeConditions";

const EMPTY_FLAGS = new Set<string>();

const IDENTITY_QUEER_POC: PlayerIdentity = {
  race: "south_asian",
  gender: "man",
  sexuality: "gay",
};

const IDENTITY_DEFAULT: PlayerIdentity = {
  race: "unspecified",
  gender: "unspecified",
  sexuality: "unspecified",
};

const PERIOD_BUSY: PeriodStanceState = {
  challenged: 2,
  deflected: 1,
  absorbed: 0,
};

const ctx = (partial: Partial<PlayerContext> = {}): PlayerContext => ({
  identity: IDENTITY_DEFAULT,
  periodStance: { challenged: 0, deflected: 0, absorbed: 0 },
  priorPeriodStance: null,
  ...partial,
});

describe("evaluateNodeCondition", () => {
  it("returns true when condition is undefined", () => {
    expect(evaluateNodeCondition(undefined, EMPTY_FLAGS)).toBe(true);
  });

  it("honors flag predicate", () => {
    const cond: NodeCondition = { flag: "hallway_challenged" };
    expect(evaluateNodeCondition(cond, new Set(["hallway_challenged"]))).toBe(true);
    expect(evaluateNodeCondition(cond, EMPTY_FLAGS)).toBe(false);
  });

  it("honors all_flags predicate as conjunction", () => {
    const cond: NodeCondition = { all_flags: ["a", "b"] };
    expect(evaluateNodeCondition(cond, new Set(["a", "b"]))).toBe(true);
    expect(evaluateNodeCondition(cond, new Set(["a"]))).toBe(false);
  });

  it("honors npc_memory lookup with dotted key", () => {
    const cond: NodeCondition = { npc_memory: "npc_keith.met" };
    const relWithMet = { npc_keith: { met: true } };
    const relWithoutMet = { npc_keith: { met: false } };
    expect(evaluateNodeCondition(cond, EMPTY_FLAGS, relWithMet)).toBe(true);
    expect(evaluateNodeCondition(cond, EMPTY_FLAGS, relWithoutMet)).toBe(false);
    expect(evaluateNodeCondition(cond, EMPTY_FLAGS, {})).toBe(false);
  });

  it("honors identity predicate", () => {
    const cond: NodeCondition = {
      identity: { attribute: "sexuality", in: ["gay", "bi", "questioning"] },
    };
    expect(
      evaluateNodeCondition(cond, EMPTY_FLAGS, null, ctx({ identity: IDENTITY_QUEER_POC }))
    ).toBe(true);
    expect(
      evaluateNodeCondition(cond, EMPTY_FLAGS, null, ctx({ identity: IDENTITY_DEFAULT }))
    ).toBe(false);
  });

  it("honors period_stance threshold (default min=1)", () => {
    const cond: NodeCondition = { period_stance: { tag: "challenged" } };
    expect(
      evaluateNodeCondition(cond, EMPTY_FLAGS, null, ctx({ periodStance: PERIOD_BUSY }))
    ).toBe(true);
    expect(
      evaluateNodeCondition(cond, EMPTY_FLAGS, null, ctx({ periodStance: { challenged: 0, deflected: 0, absorbed: 0 } }))
    ).toBe(false);
  });

  it("honors period_stance threshold with explicit min", () => {
    const cond: NodeCondition = { period_stance: { tag: "challenged", min: 3 } };
    expect(
      evaluateNodeCondition(cond, EMPTY_FLAGS, null, ctx({ periodStance: PERIOD_BUSY }))
    ).toBe(false);
    expect(
      evaluateNodeCondition(cond, EMPTY_FLAGS, null, ctx({ periodStance: { challenged: 3, deflected: 0, absorbed: 0 } }))
    ).toBe(true);
  });

  it("honors prior_period_stance exact match", () => {
    const cond: NodeCondition = { prior_period_stance: "absorbed" };
    expect(
      evaluateNodeCondition(cond, EMPTY_FLAGS, null, ctx({ priorPeriodStance: "absorbed" }))
    ).toBe(true);
    expect(
      evaluateNodeCondition(cond, EMPTY_FLAGS, null, ctx({ priorPeriodStance: "challenged" }))
    ).toBe(false);
    expect(
      evaluateNodeCondition(cond, EMPTY_FLAGS, null, ctx({ priorPeriodStance: null }))
    ).toBe(false);
  });

  it("ANDs multiple predicates together", () => {
    const cond: NodeCondition = {
      flag: "saw_beat",
      identity: { attribute: "race", in: ["south_asian"] },
    };
    expect(
      evaluateNodeCondition(cond, new Set(["saw_beat"]), null, ctx({ identity: IDENTITY_QUEER_POC }))
    ).toBe(true);
    expect(
      evaluateNodeCondition(cond, EMPTY_FLAGS, null, ctx({ identity: IDENTITY_QUEER_POC }))
    ).toBe(false);
    expect(
      evaluateNodeCondition(cond, new Set(["saw_beat"]), null, ctx({ identity: IDENTITY_DEFAULT }))
    ).toBe(false);
  });
});

describe("resolveNodeText", () => {
  const node: DialogueNode = {
    id: "n",
    text: "default prose",
    text_variants: [
      {
        condition: { prior_period_stance: "challenged" },
        text: "they've learned from you",
      },
      {
        condition: { flag: "second_time" },
        text: "familiar shape now",
      },
    ],
  };

  it("falls back to node.text when no variant matches", () => {
    expect(resolveNodeText(node, EMPTY_FLAGS, null, ctx())).toBe("default prose");
  });

  it("returns first matching variant", () => {
    expect(
      resolveNodeText(node, EMPTY_FLAGS, null, ctx({ priorPeriodStance: "challenged" }))
    ).toBe("they've learned from you");
  });

  it("stops at first match (top-to-bottom)", () => {
    // both predicates would match; first one wins
    expect(
      resolveNodeText(
        node,
        new Set(["second_time"]),
        null,
        ctx({ priorPeriodStance: "challenged" })
      )
    ).toBe("they've learned from you");
  });

  it("returns node.text for node without variants", () => {
    const plainNode: DialogueNode = { id: "p", text: "just text" };
    expect(resolveNodeText(plainNode, EMPTY_FLAGS)).toBe("just text");
  });
});

describe("resolveMicroLabel", () => {
  const micro: MicroChoice = {
    id: "m",
    label: "default label",
    next: "choices",
    label_variants: [
      {
        condition: { identity: { attribute: "gender", in: ["woman"] } },
        label: "you bristle",
      },
    ],
  };

  it("returns default label when variants do not match", () => {
    expect(
      resolveMicroLabel(micro, EMPTY_FLAGS, null, ctx({ identity: IDENTITY_DEFAULT }))
    ).toBe("default label");
  });

  it("returns variant when condition matches", () => {
    expect(
      resolveMicroLabel(micro, EMPTY_FLAGS, null, ctx({
        identity: { race: "unspecified", gender: "woman", sexuality: "unspecified" },
      }))
    ).toBe("you bristle");
  });
});
