import { describe, expect, it } from "vitest";

import {
  buildDormPhoneRelayRound,
  scoreDormPhoneRelayRound,
  toDormPhoneRelayMiniGameResult,
} from "@/lib/minigames/dormPhoneRelay";

describe("dormPhoneRelay", () => {
  it("scales up to three calls at high difficulty", () => {
    const round = buildDormPhoneRelayRound(0.9, undefined, () => 0.2);

    expect(round.difficultyLevel).toBe(3);
    expect(round.currentCalls).toHaveLength(3);
    expect(round.interruptions).toBe(true);
  });

  it("scores correct deliveries and returns relationship events", () => {
    const round = buildDormPhoneRelayRound(
      0.2,
      {
        residents: [
          {
            id: "npc_roommate_scott",
            name: "Scott",
            roomLabel: "214",
          },
        ],
        callerPool: ["Mrs. Hines"],
        messagePool: ["Call home after ten.", "Meet in the lounge at nine."],
      },
      () => 0.1
    );

    const summary = scoreDormPhoneRelayRound(round, [
      {
        callId: round.currentCalls[0].id,
        residentId: "npc_roommate_scott",
        message: round.currentCalls[0].message,
      },
    ]);

    expect(summary.won).toBe(true);
    expect(summary.correctDeliveries).toBe(1);
    expect(summary.relationshipEvents).toEqual([
      {
        npc_id: "npc_roommate_scott",
        type: "SMALL_KINDNESS",
      },
    ]);
  });

  it("applies configured hook rules on mistakes", () => {
    const round = buildDormPhoneRelayRound(0.5, undefined, () => 0.4);
    const summary = scoreDormPhoneRelayRound(
      round,
      round.currentCalls.map((call) => ({
        callId: call.id,
        residentId: null,
        message: null,
      })),
      {
        hooks: {
          onMistake: {
            chance: 1,
            anomalyIds: ["anomaly_wrong_call"],
            anomalyText: "The wrong resident swears the phone never rang.",
          },
        },
      }
    );

    expect(summary.anomalyIds).toEqual(["anomaly_wrong_call"]);
    expect(summary.anomalyText).toBe(
      "The wrong resident swears the phone never rang."
    );
  });

  it("packages metadata for narrative integration", () => {
    const round = buildDormPhoneRelayRound(0.2, undefined, () => 0.3);
    const summary = scoreDormPhoneRelayRound(
      round,
      round.currentCalls.map((call) => ({
        callId: call.id,
        residentId: call.targetResidentId,
        message: call.message,
      }))
    );

    const result = toDormPhoneRelayMiniGameResult(
      round,
      summary,
      round.currentCalls.map((call) => ({
        callId: call.id,
        residentId: call.targetResidentId,
        message: call.message,
      }))
    );

    expect(result.won).toBe(true);
    expect(result.meta?.forcedOutcomeId).toBe("success");
    expect(result.meta?.callCount).toBe(round.currentCalls.length);
  });
});
