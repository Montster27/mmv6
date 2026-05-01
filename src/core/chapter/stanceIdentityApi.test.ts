/**
 * API-surface smoke test for the period_stance + identity helpers. Documents
 * the public entry points the storylet engine and content tooling should
 * import from. Failing this test means a helper moved or lost its export —
 * update the imports downstream before changing this.
 */
import { describe, it, expect } from "vitest";

describe("storylet engine identity/stance API surface", () => {
  it("exposes playerHasIdentity from src/lib/playerIdentity", async () => {
    const mod = await import("@/lib/playerIdentity");
    expect(typeof mod.playerHasIdentity).toBe("function");
    expect(typeof mod.fetchPlayerIdentity).toBe("function");
    expect(typeof mod.saveCharacterIdentity).toBe("function");
  });

  it("exposes periodStanceCount + getDominantPeriodStance from core/chapter/state", async () => {
    const mod = await import("./state");
    expect(typeof mod.periodStanceCount).toBe("function");
    expect(typeof mod.getDominantPeriodStance).toBe("function");
    expect(typeof mod.bumpPeriodStance).toBe("function");
  });

  it("exposes getPriorPeriodStance + writers from src/lib/play", async () => {
    const mod = await import("@/lib/play");
    expect(typeof mod.getPriorPeriodStance).toBe("function");
    expect(typeof mod.updatePeriodStanceState).toBe("function");
    expect(typeof mod.logPeriodStanceEvent).toBe("function");
  });

  it("exposes the node-condition evaluator and variant resolvers", async () => {
    const mod = await import("@/lib/nodeConditions");
    expect(typeof mod.evaluateNodeCondition).toBe("function");
    expect(typeof mod.resolveNodeText).toBe("function");
    expect(typeof mod.resolveMicroLabel).toBe("function");
  });

  it("exposes the conditional events_emitted resolver", async () => {
    const mod = await import("@/lib/eventsEmitted");
    expect(typeof mod.resolveEventsEmitted).toBe("function");
    expect(typeof mod.flattenAllEvents).toBe("function");
  });
});
