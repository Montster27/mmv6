import type { SkillFlags } from "@/core/chapter/types";

export type OpportunityType =
  | "campus_job"
  | "research_position"
  | "student_newspaper"
  | "performance_slot"
  | "leadership_fast_track";

/** Display labels for each opportunity variant. */
export const OPPORTUNITY_LABELS: Record<OpportunityType, string> = {
  campus_job: "Campus Job",
  research_position: "Research Position",
  student_newspaper: "Student Newspaper",
  performance_slot: "Open Audition",
  leadership_fast_track: "Student Government Fast-Track",
};

/**
 * Select the Stream 5 (First Opportunity) variant for this playthrough.
 *
 * The type is chosen based on the player's highest-scoring skill flag.
 * Ties are broken deterministically by `seed` (typically userId + dayIndex).
 *
 * Mapping:
 *   practicalHustle    → campus_job
 *   studyDiscipline    → research_position
 *   socialEase         → student_newspaper
 *   assertiveness      → performance_slot
 *   assertiveness+social (tied top) → leadership_fast_track
 */
export function selectOpportunityType(
  skillFlags: SkillFlags,
  seed: string
): OpportunityType {
  const scores: Array<{ type: OpportunityType; score: number }> = [
    { type: "campus_job", score: skillFlags.practicalHustle * 2 },
    { type: "research_position", score: skillFlags.studyDiscipline * 2 },
    {
      type: "student_newspaper",
      score: skillFlags.socialEase + skillFlags.studyDiscipline,
    },
    { type: "performance_slot", score: skillFlags.assertiveness * 2 },
    {
      type: "leadership_fast_track",
      score: skillFlags.assertiveness + skillFlags.socialEase,
    },
  ];

  const maxScore = Math.max(...scores.map((s) => s.score));
  const topTypes = scores
    .filter((s) => s.score === maxScore)
    .map((s) => s.type);

  if (topTypes.length === 1) return topTypes[0];

  // Deterministic tiebreaker via seed hash
  const hash = [...seed].reduce(
    (h, c) => ((h * 31 + c.charCodeAt(0)) >>> 0),
    0
  );
  return topTypes[hash % topTypes.length];
}
