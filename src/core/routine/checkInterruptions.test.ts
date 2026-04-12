import { describe, it, expect } from "vitest";
import { checkInterruptions } from "./checkInterruptions";
import type { RelationshipState } from "@/lib/relationships";
import type { CalendarBeat } from "@/types/routine";

const makeRel = (overrides: Partial<RelationshipState> = {}): RelationshipState => ({
  met: true,
  knows_name: true,
  knows_face: true,
  relationship: 5,
  trust: 0,
  reliability: 0,
  emotionalLoad: 0,
  ...overrides,
});

describe("checkInterruptions", () => {
  it("returns null when no triggers fire", () => {
    const result = checkInterruptions({
      weekDay: 0,
      diegeticDayIndex: 8,
      depositsToday: null,
      relationships: { npc_roommate_scott: makeRel({ reliability: 0 }) },
      trainedSkillIds: new Set(),
      calendarBeats: [],
      npcDepositHistory: new Map([["npc_roommate_scott", 7]]),
      patienceThresholdDays: 14,
    });
    expect(result).toBeNull();
  });

  it("fires gate threshold when Scott reliability crosses 2", () => {
    const result = checkInterruptions({
      weekDay: 3,
      diegeticDayIndex: 10,
      depositsToday: null,
      relationships: { npc_roommate_scott: makeRel({ reliability: 2 }) },
      trainedSkillIds: new Set(),
      calendarBeats: [],
      npcDepositHistory: new Map([["npc_roommate_scott", 10]]),
      patienceThresholdDays: 14,
    });
    expect(result).not.toBeNull();
    expect(result!.type).toBe("gate_threshold");
    expect(result!.storylet_key).toBe("scott_connection_beat");
  });

  it("does not re-fire an already-fired gate", () => {
    const result = checkInterruptions({
      weekDay: 3,
      diegeticDayIndex: 10,
      depositsToday: null,
      relationships: { npc_roommate_scott: makeRel({ reliability: 3 }) },
      trainedSkillIds: new Set(),
      calendarBeats: [],
      npcDepositHistory: new Map([["npc_roommate_scott", 10]]),
      patienceThresholdDays: 14,
      firedGateKeys: new Set(["npc_roommate_scott:reliability:above"]),
    });
    expect(result).toBeNull();
  });

  it("fires calendar beat when diegetic day matches", () => {
    const calendarBeats: CalendarBeat[] = [
      { storylet_key: "job_board", due_offset_days: 7, segment: "afternoon", track_key: "money" },
    ];
    const result = checkInterruptions({
      weekDay: 0,
      diegeticDayIndex: 7,
      depositsToday: null,
      relationships: {},
      trainedSkillIds: new Set(),
      calendarBeats,
      npcDepositHistory: new Map(),
      patienceThresholdDays: 14,
    });
    expect(result).not.toBeNull();
    expect(result!.type).toBe("calendar_beat");
    expect(result!.storylet_key).toBe("job_board");
  });

  it("fires NPC patience timer after threshold", () => {
    const result = checkInterruptions({
      weekDay: 5,
      diegeticDayIndex: 21,
      depositsToday: null,
      relationships: { npc_roommate_scott: makeRel() },
      trainedSkillIds: new Set(),
      calendarBeats: [],
      npcDepositHistory: new Map([["npc_roommate_scott", 5]]), // 16 days ago
      patienceThresholdDays: 14,
    });
    expect(result).not.toBeNull();
    expect(result!.type).toBe("npc_patience");
    expect(result!.storylet_key).toBe("scott_patience_beat");
  });

  it("does not fire patience timer for unmet NPCs", () => {
    const result = checkInterruptions({
      weekDay: 5,
      diegeticDayIndex: 21,
      depositsToday: null,
      relationships: { npc_roommate_scott: makeRel({ met: false }) },
      trainedSkillIds: new Set(),
      calendarBeats: [],
      npcDepositHistory: new Map([["npc_roommate_scott", 0]]),
      patienceThresholdDays: 14,
    });
    expect(result).toBeNull();
  });

  it("prioritizes gate threshold over calendar beat", () => {
    const result = checkInterruptions({
      weekDay: 0,
      diegeticDayIndex: 7,
      depositsToday: null,
      relationships: { npc_roommate_scott: makeRel({ reliability: 3 }) },
      trainedSkillIds: new Set(),
      calendarBeats: [
        { storylet_key: "job_board", due_offset_days: 7, segment: "afternoon", track_key: "money" },
      ],
      npcDepositHistory: new Map([["npc_roommate_scott", 7]]),
      patienceThresholdDays: 14,
    });
    expect(result!.type).toBe("gate_threshold");
  });
});
