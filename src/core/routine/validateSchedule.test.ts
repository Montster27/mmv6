import { describe, it, expect } from "vitest";
import { validateSchedule } from "./validateSchedule";
import type { RoutineActivity } from "@/types/routine";

const ACTIVITIES: RoutineActivity[] = [
  {
    id: "1", activity_key: "attend_classes", display_name: "Attend Classes",
    category: "academic", half_day_cost: 2, requirements: null,
    npc_deposits: [], skill_practice_ids: ["critical_analysis"],
    flavor_text: "", interruption_hooks: [], is_active: true,
  },
  {
    id: "2", activity_key: "library_study", display_name: "Library Study",
    category: "academic", half_day_cost: 1, requirements: null,
    npc_deposits: [], skill_practice_ids: ["critical_analysis"],
    flavor_text: "", interruption_hooks: [], is_active: true,
  },
  {
    id: "3", activity_key: "running", display_name: "Running",
    category: "physical", half_day_cost: 1, requirements: null,
    npc_deposits: [], skill_practice_ids: ["running_endurance"],
    flavor_text: "", interruption_hooks: [], is_active: true,
  },
  {
    id: "4", activity_key: "dorm_floor_time", display_name: "Hang on the Floor",
    category: "social", half_day_cost: 1, requirements: null,
    npc_deposits: [], skill_practice_ids: ["small_talk"],
    flavor_text: "", interruption_hooks: [], is_active: true,
  },
  {
    id: "5", activity_key: "library_shift", display_name: "Library Shift",
    category: "work", half_day_cost: 2, requirements: { requires_flag: "has_job_library" },
    npc_deposits: [], skill_practice_ids: ["budgeting"],
    flavor_text: "", interruption_hooks: [], is_active: true,
  },
  {
    id: "6", activity_key: "herald_meetings", display_name: "Herald Meetings",
    category: "creative", half_day_cost: 1, requirements: { requires_flag: "herald_intro" },
    npc_deposits: [], skill_practice_ids: ["creative_writing"],
    flavor_text: "", interruption_hooks: [], is_active: false,
  },
];

describe("validateSchedule", () => {
  it("accepts a schedule within budget", () => {
    const result = validateSchedule(
      [{ activity_key: "attend_classes" }, { activity_key: "running" }, { activity_key: "dorm_floor_time" }],
      ACTIVITIES,
      5,
      {},
    );
    expect(result).toEqual({ valid: true, totalCost: 4 });
  });

  it("accepts schedule at exact budget", () => {
    const result = validateSchedule(
      [{ activity_key: "attend_classes" }, { activity_key: "running" }, { activity_key: "dorm_floor_time" }, { activity_key: "library_study" }],
      ACTIVITIES,
      5,
      {},
    );
    expect(result).toEqual({ valid: true, totalCost: 5 });
  });

  it("rejects schedule exceeding budget", () => {
    const result = validateSchedule(
      [{ activity_key: "attend_classes" }, { activity_key: "library_study" }, { activity_key: "running" }, { activity_key: "dorm_floor_time" }],
      ACTIVITIES,
      4,
      {},
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("Too many activities");
    }
  });

  it("rejects empty selection", () => {
    const result = validateSchedule([], ACTIVITIES, 5, {});
    expect(result.valid).toBe(false);
  });

  it("rejects duplicate activities", () => {
    const result = validateSchedule(
      [{ activity_key: "running" }, { activity_key: "running" }],
      ACTIVITIES,
      5,
      {},
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("Duplicate");
    }
  });

  it("rejects unknown activity", () => {
    const result = validateSchedule(
      [{ activity_key: "nonexistent" }],
      ACTIVITIES,
      5,
      {},
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("Unknown");
    }
  });

  it("rejects locked activity when flag missing", () => {
    const result = validateSchedule(
      [{ activity_key: "library_shift" }],
      ACTIVITIES,
      5,
      {},
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("locked");
    }
  });

  it("accepts gated activity when flag present", () => {
    const result = validateSchedule(
      [{ activity_key: "library_shift" }],
      ACTIVITIES,
      5,
      { has_job_library: true },
    );
    expect(result).toEqual({ valid: true, totalCost: 2 });
  });

  it("rejects inactive activity", () => {
    const result = validateSchedule(
      [{ activity_key: "herald_meetings" }],
      ACTIVITIES,
      5,
      { herald_intro: true },
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("not available");
    }
  });
});
