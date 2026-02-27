import { describe, it, expect } from "vitest";
import {
  applyRelationshipEvents,
  ensureRelationshipDefaults,
  migrateLegacyNpcMemory,
} from "@/lib/relationships";

const source = { storylet_slug: "test", choice_id: "choice" };

describe("relationships", () => {
  it("seeds defaults for Dana and Miguel", () => {
    const { next } = ensureRelationshipDefaults({});
    expect(next.npc_roommate_dana.met).toBe(true);
    expect(next.npc_roommate_dana.knows_name).toBe(true);
    expect(next.npc_roommate_dana.relationship).toBe(6);
    expect(next.npc_connector_miguel.met).toBe(false);
    expect(next.npc_connector_miguel.knows_name).toBe(false);
    expect(next.npc_connector_miguel.relationship).toBe(5);
  });

  it("clamps relationship within 1..10", () => {
    const { next } = applyRelationshipEvents(
      {
        npc_roommate_dana: {
          met: true,
          knows_name: true,
          knows_face: true,
          relationship: 10,
        },
      },
      [{ npc_id: "npc_roommate_dana", type: "SMALL_KINDNESS", magnitude: 5 }],
      source
    );
    expect(next.npc_roommate_dana.relationship).toBe(10);
  });

  it("INTRODUCED_SELF sets knowledge and bumps relationship", () => {
    const { next } = applyRelationshipEvents(
      {},
      [{ npc_id: "npc_connector_miguel", type: "INTRODUCED_SELF", magnitude: 1 }],
      source
    );
    expect(next.npc_connector_miguel.met).toBe(true);
    expect(next.npc_connector_miguel.knows_name).toBe(true);
    expect(next.npc_connector_miguel.knows_face).toBe(true);
    expect(next.npc_connector_miguel.relationship).toBeGreaterThan(5);
  });

  it("OVERHEARD_NAME sets knows_name without met", () => {
    const { next } = applyRelationshipEvents(
      {},
      [{ npc_id: "npc_connector_miguel", type: "OVERHEARD_NAME", magnitude: 1 }],
      source
    );
    expect(next.npc_connector_miguel.knows_name).toBe(true);
    expect(next.npc_connector_miguel.met).toBe(false);
  });

  it("phone then dining results in consistent state", () => {
    const afterPhone = applyRelationshipEvents(
      {},
      [{ npc_id: "npc_connector_miguel", type: "OVERHEARD_NAME", magnitude: 1 }],
      source
    ).next;
    const afterMeet = applyRelationshipEvents(
      afterPhone,
      [{ npc_id: "npc_connector_miguel", type: "INTRODUCED_SELF", magnitude: 1 }],
      source
    ).next;
    expect(afterMeet.npc_connector_miguel.knows_name).toBe(true);
    expect(afterMeet.npc_connector_miguel.met).toBe(true);
  });

  it("legacy trust maps into relationship", () => {
    const { next } = migrateLegacyNpcMemory({}, {
      npc_roommate_dana: { trust: 2, met: true, knows_name: true },
    });
    expect(next.npc_roommate_dana.relationship).toBeGreaterThanOrEqual(5);
    expect(next.npc_roommate_dana.met).toBe(true);
  });
});
