import type { DailyState } from "@/types/daily";
import type { Storylet, StoryletRun } from "@/types/storylets";
import { fallbackStorylet } from "@/core/validation/storyletValidation";

type Requirements = {
  min_day_index?: number;
  max_day_index?: number;
  requires_tags_any?: string[];
  vectors_min?: Record<string, number>;
  [key: string]: unknown;
};

type SelectorArgs = {
  seed: string;
  dayIndex: number;
  dailyState: DailyState | null;
  allStorylets: Storylet[];
  recentRuns: StoryletRun[];
};

function hashString(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return h;
}

function tagsIntersect(a: string[] | undefined, b: string[] | undefined): boolean {
  if (!a || !b || a.length === 0 || b.length === 0) return false;
  const setA = new Set(a);
  return b.some((t) => setA.has(t));
}

function meetsRequirements(
  storylet: Storylet,
  dayIndex: number,
  dailyState: DailyState | null
): boolean {
  const req = (storylet.requirements || {}) as Requirements;
  if (typeof req.min_day_index === "number" && dayIndex < req.min_day_index) return false;
  if (typeof req.max_day_index === "number" && dayIndex > req.max_day_index) return false;

  if (Array.isArray(req.requires_tags_any) && req.requires_tags_any.length > 0) {
    if (!tagsIntersect(storylet.tags ?? [], req.requires_tags_any)) return false;
  }

  if (req.vectors_min && typeof req.vectors_min === "object" && dailyState?.vectors) {
    for (const [key, min] of Object.entries(req.vectors_min)) {
      if (typeof min === "number") {
        const current = (dailyState.vectors as Record<string, unknown>)[key];
        if (typeof current !== "number" || current < min) return false;
      }
    }
  }

  return true;
}

function scoreStorylet(storylet: Storylet, seed: string): number {
  const base = hashString(`${seed}:${storylet.id}`);
  const weight = storylet.weight ?? 100;
  return base / Math.max(weight, 1);
}

function partitionOnboarding(storylets: Storylet[]): { onboarding: Storylet[]; others: Storylet[] } {
  const onboarding = storylets.filter((s) => (s.tags || []).includes("onboarding"));
  const others = storylets.filter((s) => !(s.tags || []).includes("onboarding"));
  return { onboarding, others };
}

function pickTop(storylets: Storylet[], seed: string, count: number): Storylet[] {
  return [...storylets]
    .sort((a, b) => scoreStorylet(a, seed) - scoreStorylet(b, seed))
    .slice(0, count);
}

export function selectStorylets({
  seed,
  dayIndex,
  dailyState,
  allStorylets,
  recentRuns,
}: SelectorArgs): Storylet[] {
  const todayUsedIds = new Set(
    recentRuns.filter((r) => r.day_index === dayIndex).map((r) => r.storylet_id)
  );

  const recentIds = new Set(
    recentRuns
      .filter((r) => r.day_index >= dayIndex - 7 && r.day_index < dayIndex)
      .map((r) => r.storylet_id)
  );

  const activeStorylets = allStorylets.filter((s) => s.is_active);

  const baseEligible = activeStorylets.filter(
    (s) => !todayUsedIds.has(s.id) && meetsRequirements(s, dayIndex, dailyState)
  );

  const preferred = baseEligible.filter((s) => !recentIds.has(s.id));

  const { onboarding, others } = partitionOnboarding(preferred);
  const onboardingEligible = dayIndex <= 3 ? onboarding : [];

  let picked: Storylet[] = [];
  if (onboardingEligible.length > 0) {
    picked.push(...pickTop(onboardingEligible, seed, 2));
  }

  if (picked.length < 2) {
    const remaining = preferred.filter((s) => !picked.includes(s));
    picked.push(...pickTop(remaining, seed, 2 - picked.length));
  }

  if (picked.length < 2) {
    const remaining = baseEligible.filter((s) => !picked.includes(s));
    picked.push(...pickTop(remaining, seed, 2 - picked.length));
  }

  if (picked.length < 2) {
    const remaining = activeStorylets.filter((s) => !picked.includes(s) && !todayUsedIds.has(s.id));
    picked.push(...pickTop(remaining, seed, 2 - picked.length));
  }

  if (picked.length === 0) {
    return [];
  }

  // If still fewer than 2, duplicate fallback to keep length 2 for UI simplicity.
  while (picked.length < 2) {
    picked.push(fallbackStorylet());
  }

  return picked.slice(0, 2);
}

// Export helpers for tests
export const _testOnly = {
  hashString,
  meetsRequirements,
  pickTop,
  scoreStorylet,
};
