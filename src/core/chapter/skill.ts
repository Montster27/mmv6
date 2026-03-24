import type { SkillFlags } from "@/core/chapter/types";

export function parseSkillRequirement(
  requirement?: string | null
): { key: keyof SkillFlags; min: number } | null {
  if (!requirement) return null;
  const [rawKey, rawMin] = requirement.split(":");
  const key = rawKey.trim() as keyof SkillFlags;
  if (!key) return null;
  const min = rawMin ? Number(rawMin) : 1;
  return {
    key,
    min: Number.isFinite(min) ? min : 1,
  };
}
