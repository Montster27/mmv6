/**
 * Pure interruption detection — Phase 4.
 *
 * After each day's deposits are applied, check three trigger types
 * (in priority order) for conditions that should pull the player
 * back into an authored storylet:
 *
 *   1. Gate threshold trip — a relational or skill threshold crossed
 *   2. Calendar beat — a storylet due on this diegetic day
 *   3. NPC patience timer — an NPC ignored for too long
 */

import type { RelationshipState } from "@/lib/relationships";
import type {
  InterruptionTrigger,
  CalendarBeat,
  DepositRecord,
} from "@/types/routine";

// ---------------------------------------------------------------------------
// Gate threshold configuration (hardcoded for Phase 4, tunable in Phase 5)
// ---------------------------------------------------------------------------

type GateThreshold = {
  npc_id: string;
  field: keyof Pick<RelationshipState, "trust" | "reliability" | "relationship">;
  value: number;
  direction: "above" | "below";
  storylet_key: string;
  description: string;
};

const GATE_THRESHOLDS: GateThreshold[] = [
  {
    npc_id: "npc_roommate_scott",
    field: "reliability",
    value: 2,
    direction: "above",
    storylet_key: "scott_connection_beat",
    description: "Scott catches you in the hall. He has something to say.",
  },
];

// ---------------------------------------------------------------------------
// NPC patience configuration
// ---------------------------------------------------------------------------

type PatienceConfig = {
  npc_id: string;
  storylet_key: string;
  description: string;
};

const PATIENCE_NPCS: PatienceConfig[] = [
  {
    npc_id: "npc_roommate_scott",
    storylet_key: "scott_patience_beat",
    description: "You realize you haven't really talked to Scott in a while.",
  },
];

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

export type CheckInterruptionsArgs = {
  /** Day within the week (0-6). */
  weekDay: number;
  /** Absolute diegetic day_index. */
  diegeticDayIndex: number;
  /** Deposits applied on this day (null if no activity). */
  depositsToday: DepositRecord | null;
  /** Current NPC relationship states (after deposits applied). */
  relationships: Record<string, RelationshipState>;
  /** Skill IDs the player has trained. */
  trainedSkillIds: Set<string>;
  /** Calendar beats loaded from storylets table. */
  calendarBeats: CalendarBeat[];
  /** Map of npc_id → last day_index that NPC received a deposit. */
  npcDepositHistory: Map<string, number>;
  /** How many days of absence triggers the patience timer. */
  patienceThresholdDays: number;
  /** Gate thresholds that have already fired (avoid re-firing). */
  firedGateKeys?: Set<string>;
};

export function checkInterruptions(
  args: CheckInterruptionsArgs,
): InterruptionTrigger | null {
  const {
    weekDay,
    diegeticDayIndex,
    relationships,
    calendarBeats,
    npcDepositHistory,
    patienceThresholdDays,
    firedGateKeys = new Set(),
  } = args;

  // ── 1. Gate threshold trips (highest priority) ──
  for (const gate of GATE_THRESHOLDS) {
    const key = `${gate.npc_id}:${gate.field}:${gate.direction}`;
    if (firedGateKeys.has(key)) continue;

    const rel = relationships[gate.npc_id];
    if (!rel) continue;

    const val = rel[gate.field] as number;
    const tripped =
      gate.direction === "above" ? val >= gate.value : val <= gate.value;

    if (tripped) {
      return {
        type: "gate_threshold",
        storylet_key: gate.storylet_key,
        fires_on_day: weekDay,
        description: gate.description,
      };
    }
  }

  // ── 2. Calendar beats ──
  for (const beat of calendarBeats) {
    if (beat.due_offset_days === diegeticDayIndex) {
      return {
        type: "calendar_beat",
        storylet_key: beat.storylet_key,
        fires_on_day: weekDay,
        description: `Something pulls you out of your routine.`,
      };
    }
  }

  // ── 3. NPC patience timer ──
  for (const cfg of PATIENCE_NPCS) {
    const rel = relationships[cfg.npc_id];
    if (!rel || !rel.met) continue; // Only fire for NPCs the player has met

    const lastDeposit = npcDepositHistory.get(cfg.npc_id) ?? 0;
    const daysSinceDeposit = diegeticDayIndex - lastDeposit;

    if (daysSinceDeposit >= patienceThresholdDays) {
      return {
        type: "npc_patience",
        storylet_key: cfg.storylet_key,
        fires_on_day: weekDay,
        description: cfg.description,
      };
    }
  }

  return null;
}
