/**
 * Server-side deposit application — Phase 4.
 *
 * Routes NPC deposits through the existing applyRelationshipEvents()
 * pure function, and skill practice through tickPracticeCredit().
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { DepositRecord } from "@/types/routine";
import type { RelationshipState, RelationshipEvent } from "@/lib/relationships";
import { applyRelationshipEvents } from "@/lib/relationships";
import { tickPracticeCredit } from "@/core/skills/practice";

export type ApplyDepositResult = {
  updatedRelationships: Record<string, RelationshipState>;
  skillCreditsApplied: number;
};

/**
 * Apply one day's deposits from the routine schedule.
 *
 * - NPC events route through applyRelationshipEvents (pure) and then
 *   persist via daily_states.relationships update.
 * - Skill credits route through tickPracticeCredit (existing Phase 2).
 */
export async function applyDayDeposits(
  supabase: SupabaseClient,
  userId: string,
  deposit: DepositRecord,
  diegeticDayIndex: number,
  currentRelationships: Record<string, RelationshipState>,
): Promise<ApplyDepositResult> {
  // ── 1. Apply NPC relationship events ──
  let updatedRelationships = currentRelationships;

  if (deposit.npc_events.length > 0) {
    const events: RelationshipEvent[] = deposit.npc_events.map((d) => ({
      npc_id: d.npc_id,
      type: d.type,
      magnitude: d.magnitude ?? 1,
    }));

    const { next } = applyRelationshipEvents(
      currentRelationships,
      events,
      {
        storylet_slug: `routine_${deposit.activity_key}`,
        choice_id: "weekly_deposit",
      },
    );
    updatedRelationships = next;

    // Persist updated relationships
    await supabase
      .from("daily_states")
      .update({ relationships: updatedRelationships })
      .eq("user_id", userId);
  }

  // ── 2. Apply skill practice credits ──
  let skillCreditsApplied = 0;

  if (deposit.skill_credits.length > 0) {
    const now = new Date();
    const credits = await tickPracticeCredit(
      supabase,
      userId,
      deposit.skill_credits,
      now,
      {
        storylet_key: `routine_${deposit.activity_key}`,
        choice_id: "weekly_practice",
      },
    );
    skillCreditsApplied = credits;
  }

  return { updatedRelationships, skillCreditsApplied };
}
