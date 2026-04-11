/**
 * Placeholder parabolic training-time curve for the skill queue.
 *
 * Phase 1 playtest values — intentionally untuned.
 * These will be replaced with a real parabolic curve in Phase 5
 * once we have 7–10 days of real playtest data.
 *
 * SKILL_TIME_SCALE env var (default 1) lets testers compress times.
 * Set NEXT_PUBLIC_SKILL_TIME_SCALE=0.01 to turn 4 hours into ~2.4 minutes.
 */

const TIER_SECONDS: Record<1 | 2 | 3, number> = {
  1: 4 * 3600,     // 4 hours
  2: 24 * 3600,    // 24 hours
  3: 168 * 3600,   // 168 hours (7 days)
};

function getTimeScale(): number {
  const raw =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_SKILL_TIME_SCALE
      : undefined;
  if (!raw) return 1;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export function baseTrainSeconds(tier: 1 | 2 | 3): number {
  return Math.round(TIER_SECONDS[tier] * getTimeScale());
}
