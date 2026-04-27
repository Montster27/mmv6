/**
 * Unit tests for the harness's private `navigateTo` walk-internal navigator.
 *
 * `navigateTo` operates on `walkState` only — no DB, no network. We construct
 * a harness, hand-author its `walkState`, and assert post-conditions on
 * `walkState.currentNodeId` / `walkState.terminal`.
 */

import { describe, it, expect } from "vitest";
import { PlaythroughHarness } from "./harness";
import type { DialogueNode } from "@/types/storylets";

// `navigateTo` is private and `WalkState` is not exported. Cast through `any`
// to reach both — the brief explicitly endorses this for tests.
function navigate(h: PlaythroughHarness, dest: string): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (h as any).navigateTo(dest);
}

function makeHarness(
  nodes: DialogueNode[],
  flags: string[] = []
): PlaythroughHarness {
  const h = new PlaythroughHarness();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (h as any).walkState = {
    storyletKey: "test_storylet",
    currentNodeId: null,
    flags: new Set(flags),
    nodes,
    terminal: null,
  };
  return h;
}

function readWalk(h: PlaythroughHarness): {
  currentNodeId: string | null;
  terminal: "choices" | "exit" | null;
} {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ws = (h as any).walkState;
  return { currentNodeId: ws.currentNodeId, terminal: ws.terminal };
}

describe("navigateTo", () => {
  it("auto-advances through a text-only chain to the first interactive node", () => {
    const nodes: DialogueNode[] = [
      { id: "intro_a", text: "first beat", next: "intro_b" },
      { id: "intro_b", text: "second beat", next: "ask" },
      {
        id: "ask",
        text: "what now?",
        micro_choices: [{ id: "x", label: "X", next: "choices" }],
      },
    ];
    const h = makeHarness(nodes);

    navigate(h, "intro_a");

    expect(readWalk(h).currentNodeId).toBe("ask");
    expect(readWalk(h).terminal).toBe(null);
  });

  it("lands on a node when its flag condition is met", () => {
    const nodes: DialogueNode[] = [
      {
        id: "gated",
        text: "interactive",
        condition: { flag: "key" },
        micro_choices: [{ id: "x", label: "X", next: "choices" }],
      },
    ];
    const h = makeHarness(nodes, ["key"]);

    navigate(h, "gated");

    expect(readWalk(h).currentNodeId).toBe("gated");
    expect(readWalk(h).terminal).toBe(null);
  });

  it("skips a condition-failed node via `else_next`", () => {
    const nodes: DialogueNode[] = [
      {
        id: "gated",
        text: "if-branch",
        condition: { flag: "missing" },
        else_next: "fallback",
        next: "after",
      },
      {
        id: "fallback",
        text: "else-branch",
        micro_choices: [{ id: "x", label: "X", next: "choices" }],
      },
      {
        id: "after",
        text: "would-be-next",
        micro_choices: [{ id: "y", label: "Y", next: "choices" }],
      },
    ];
    const h = makeHarness(nodes);

    navigate(h, "gated");

    expect(readWalk(h).currentNodeId).toBe("fallback");
    expect(readWalk(h).terminal).toBe(null);
  });

  it("falls through to `next` when condition fails and no `else_next`", () => {
    const nodes: DialogueNode[] = [
      {
        id: "gated",
        text: "if-branch",
        condition: { all_flags: ["a", "b"] },
        next: "after",
      },
      {
        id: "after",
        text: "fallback",
        micro_choices: [{ id: "x", label: "X", next: "choices" }],
      },
    ];
    const h = makeHarness(nodes, ["a"]); // missing "b"

    navigate(h, "gated");

    expect(readWalk(h).currentNodeId).toBe("after");
  });

  it("short-circuits when destination is `choices`", () => {
    const h = makeHarness([
      {
        id: "any",
        text: "x",
        micro_choices: [{ id: "x", label: "X", next: "choices" }],
      },
    ]);

    navigate(h, "choices");

    expect(readWalk(h).currentNodeId).toBe(null);
    expect(readWalk(h).terminal).toBe("choices");
  });

  it("short-circuits when destination is `exit`", () => {
    const h = makeHarness([
      {
        id: "any",
        text: "x",
        micro_choices: [{ id: "x", label: "X", next: "choices" }],
      },
    ]);

    navigate(h, "exit");

    expect(readWalk(h).currentNodeId).toBe(null);
    expect(readWalk(h).terminal).toBe("exit");
  });

  it("falls through to `choices` when destination is unknown", () => {
    const h = makeHarness([
      {
        id: "real",
        text: "x",
        micro_choices: [{ id: "x", label: "X", next: "choices" }],
      },
    ]);

    navigate(h, "nonexistent_id");

    expect(readWalk(h).currentNodeId).toBe(null);
    expect(readWalk(h).terminal).toBe("choices");
  });

  it("treats a text-only node with no `next` as terminal `exit`", () => {
    const nodes: DialogueNode[] = [
      { id: "dead_end", text: "goodbye" }, // no next, no micro_choices
    ];
    const h = makeHarness(nodes);

    navigate(h, "dead_end");

    expect(readWalk(h).currentNodeId).toBe(null);
    expect(readWalk(h).terminal).toBe("exit");
  });

  it("treats an `npc_memory` predicate as met (real game writes the underlying state)", () => {
    const nodes: DialogueNode[] = [
      {
        id: "memory_gated",
        text: "intro",
        condition: { npc_memory: "npc_x.flag_y" },
        micro_choices: [{ id: "x", label: "X", next: "choices" }],
      },
    ];
    const h = makeHarness(nodes); // no flags written

    navigate(h, "memory_gated");

    expect(readWalk(h).currentNodeId).toBe("memory_gated");
  });

  it("throws when recursion exceeds 32 hops", () => {
    // Build a 40-deep text-only chain → cycle-cap should fire.
    const nodes: DialogueNode[] = [];
    for (let i = 0; i < 40; i++) {
      nodes.push({
        id: `n${i}`,
        text: `step ${i}`,
        next: `n${i + 1}`,
      });
    }
    const h = makeHarness(nodes);

    expect(() => navigate(h, "n0")).toThrow(/recursion cap/);
  });
});
