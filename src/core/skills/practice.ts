/**
 * Diegetic-practice hook — Phase 2
 *
 * When a player picks a storylet choice with `practices_skills`, this module
 * subtracts PRACTICE_CREDIT_SECONDS from the currently active training skill
 * (if it matches). Silent acceleration: no notification, no UI feedback.
 *
 * Rules:
 *   - Only accelerates the *active* skill (status='active'), not queued or trained.
 *   - completes_at can never move earlier than `now` — immediate completion is fine.
 *   - If the skill isn't active or doesn't match, nothing happens (no error).
 *   - An audit row is always written to skill_practice_events for Phase 5 tuning.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

/** Default 15 real minutes. Override via PRACTICE_CREDIT_SECONDS env var. */
const DEFAULT_PRACTICE_CREDIT_SECONDS = 900;

function getPracticeCreditSeconds(): number {
  const envVal = process.env.PRACTICE_CREDIT_SECONDS;
  if (envVal) {
    const parsed = parseInt(envVal, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return DEFAULT_PRACTICE_CREDIT_SECONDS;
}

/**
 * Subtract practice credit from the player's active training skill.
 *
 * For each skillId in `skillIds`, if it matches the player's currently active
 * training skill, move `completes_at` earlier by PRACTICE_CREDIT_SECONDS.
 * Never moves earlier than `now` (immediate completion).
 *
 * @returns The number of skills that received credit.
 */
export async function tickPracticeCredit(
  supabase: SupabaseClient,
  userId: string,
  skillIds: string[],
  now: Date,
  meta: { storylet_key: string; choice_id: string }
): Promise<number> {
  if (!skillIds || skillIds.length === 0) return 0;

  // Load the player's currently active skill
  const { data: activeSkill, error: activeErr } = await supabase
    .from("player_skills")
    .select("skill_id, completes_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (activeErr) {
    console.error("[practice] Failed to load active skill:", activeErr);
    return 0;
  }

  if (!activeSkill || !activeSkill.completes_at) return 0;

  const creditSeconds = getPracticeCreditSeconds();
  const nowMs = now.getTime();
  let creditsApplied = 0;

  for (const skillId of skillIds) {
    if (skillId !== activeSkill.skill_id) continue;

    // Calculate new completes_at: subtract credit, but never earlier than now
    const currentCompletesAt = new Date(activeSkill.completes_at).getTime();
    const newCompletesAtMs = Math.max(nowMs, currentCompletesAt - creditSeconds * 1000);
    const newCompletesAt = new Date(newCompletesAtMs).toISOString();

    // Update the skill's completes_at
    const { error: updateErr } = await supabase
      .from("player_skills")
      .update({ completes_at: newCompletesAt })
      .eq("user_id", userId)
      .eq("skill_id", skillId)
      .eq("status", "active");

    if (updateErr) {
      console.error("[practice] Failed to update completes_at:", updateErr);
      continue;
    }

    // Write audit row
    const { error: auditErr } = await supabase
      .from("skill_practice_events")
      .insert({
        user_id: userId,
        skill_id: skillId,
        storylet_key: meta.storylet_key,
        choice_id: meta.choice_id,
        credit_seconds: creditSeconds,
        applied_at: now.toISOString(),
      });

    if (auditErr) {
      // Non-fatal — don't break the resolve flow
      console.error("[practice] Failed to write audit row:", auditErr);
    }

    creditsApplied++;
    // Only one active skill at a time, so we can break after the first match
    break;
  }

  return creditsApplied;
}
