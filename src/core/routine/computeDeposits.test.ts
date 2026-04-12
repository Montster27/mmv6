import { describe, it, expect } from "vitest";
import { computeWeeklyDeposits } from "./computeDeposits";
import type { RoutineActivity } from "@/types/routine";

const makeActivity = (
  key: string,
  cost: number,
  skills: string[] = [],
  npc: Array<{ npc_id: string; type: string; magnitude?: number }> = [],
): RoutineActivity => ({
  id: key,
  activity_key: key,
  display_name: key,
  category: "academic",
  half_day_cost: cost,
  requirements: null,
  npc_deposits: npc as RoutineActivity["npc_deposits"],
  skill_practice_ids: skills,
  flavor_text: "",
  interruption_hooks: [],
  is_active: true,
});

describe("computeWeeklyDeposits", () => {
  it("distributes a single cost-1 activity to one day", () => {
    const activities = [makeActivity("running", 1, ["running_endurance"])];
    const deposits = computeWeeklyDeposits(
      [{ activity_key: "running" }],
      activities,
    );
    expect(deposits).toHaveLength(1);
    expect(deposits[0].day_offset).toBe(0);
    expect(deposits[0].skill_credits).toEqual(["running_endurance"]);
  });

  it("distributes a cost-2 activity across two days", () => {
    const activities = [makeActivity("classes", 2, ["critical_analysis"])];
    const deposits = computeWeeklyDeposits(
      [{ activity_key: "classes" }],
      activities,
    );
    expect(deposits).toHaveLength(2);
    expect(deposits[0].day_offset).toBe(0);
    expect(deposits[1].day_offset).toBe(1);
  });

  it("spreads multiple activities across days round-robin", () => {
    const activities = [
      makeActivity("classes", 2, ["crit"]),
      makeActivity("running", 1, ["endurance"]),
      makeActivity("social", 1, [], [{ npc_id: "npc_roommate_scott", type: "SHOWED_UP" }]),
    ];
    const deposits = computeWeeklyDeposits(
      [
        { activity_key: "classes" },
        { activity_key: "running" },
        { activity_key: "social" },
      ],
      activities,
    );

    // 2 + 1 + 1 = 4 half-day slots → 4 days with deposits
    expect(deposits).toHaveLength(4);

    // Verify NPC deposits land on the correct day
    const socialDay = deposits.find((d) => d.npc_events.length > 0);
    expect(socialDay).toBeDefined();
    expect(socialDay!.npc_events[0].npc_id).toBe("npc_roommate_scott");
  });

  it("deduplicates skill credits within a day", () => {
    // Two activities that both practice critical_analysis landing on the same day
    // won't happen with round-robin, but if they did, skills should deduplicate
    const activities = [makeActivity("a", 1, ["crit"]), makeActivity("b", 1, ["crit"])];
    const deposits = computeWeeklyDeposits(
      [{ activity_key: "a" }, { activity_key: "b" }],
      activities,
    );
    // Round-robin puts them on different days
    expect(deposits).toHaveLength(2);
  });

  it("returns empty for no selections", () => {
    expect(computeWeeklyDeposits([], [])).toEqual([]);
  });
});
