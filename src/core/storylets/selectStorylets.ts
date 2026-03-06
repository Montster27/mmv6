import type { DailyState } from "@/types/daily";
import type { Storylet, StoryletRun } from "@/types/storylets";
import type { StoryletContext } from "@/core/engine/storyletContext";
import type { ResourceSnapshot } from "@/core/resources/resourceDelta";
import { pctInRollout } from "@/core/eligibility/rollout";

type Requirements = {
  min_day_index?: number;
  max_day_index?: number;
  requires_tags_any?: string[];
  vectors_min?: Record<string, number>;
  min_season_index?: number;
  max_season_index?: number;
  seasons_any?: number[];
  /**
   * Hard cap on lifetime runs. Set to 1 for one-shot events (orientation
   * fair, first class, bookstore visit, etc.) that must never repeat.
   * Requires recentRuns to include all-time history (not just 7-day window).
   */
  max_total_runs?: number;
  /**
   * Storylet-level NPC prerequisite: every listed NPC must have met=true
   * in the player's relationship state. Use when the storylet body or
   * premise assumes prior contact with that person.
   */
  requires_npc_met?: string[];
  /**
   * Inverse guard: none of the listed NPCs may be met yet. Useful for
   * "first encounter" storylets that should not surface after introduction.
   */
  requires_npc_not_met?: string[];
  /**
   * Self-referential preclusion: if this string appears in the player's
   * preclusion_gates array, this storylet is permanently closed. The value
   * is the storylet's own slug, set on the storylet's requirements field.
   */
  requires_not_precluded?: string;
  audience?: {
    rollout_pct?: number;
    experiment?: { id?: string; variants_any?: string[] };
    allow_admin?: boolean;
  };
  /** Resource gates — storylet is hidden until the player has accumulated enough. */
  requires_cash_min?: number;
  requires_knowledge_min?: number;
  requires_social_leverage_min?: number;
  requires_physical_resilience_min?: number;
  /**
   * Arc One money band gate. Storylet only surfaces when the player's
   * current money_band matches one of the listed values.
   * Values: "tight" | "okay" | "comfortable"
   */
  requires_money_band?: Array<"tight" | "okay" | "comfortable">;
  [key: string]: unknown;
};

type SelectorArgs = {
  seed: string;
  userId: string;
  dayIndex: number;
  seasonIndex: number;
  dailyState: DailyState | null;
  allStorylets: Storylet[];
  recentRuns: StoryletRun[];
  forcedStorylet?: Storylet | null;
  experiments?: Record<string, string>;
  isAdmin?: boolean;
  context?: StoryletContext | null;
  /** Current resource levels used for resource gate checks. */
  resourceSnapshot?: ResourceSnapshot | null;
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

function hasSeasonRules(req: Requirements): boolean {
  return (
    typeof req.min_season_index === "number" ||
    typeof req.max_season_index === "number" ||
    (Array.isArray(req.seasons_any) && req.seasons_any.length > 0)
  );
}

function hasAudienceRules(req: Requirements): boolean {
  return (
    typeof req.audience?.rollout_pct === "number" ||
    Boolean(req.audience?.experiment?.id) ||
    typeof req.audience?.allow_admin === "boolean"
  );
}

function meetsSeasonRules(req: Requirements, seasonIndex: number): boolean {
  if (Array.isArray(req.seasons_any) && req.seasons_any.length > 0) {
    if (!req.seasons_any.includes(seasonIndex)) return false;
  }
  if (
    typeof req.min_season_index === "number" &&
    seasonIndex < req.min_season_index
  ) {
    return false;
  }
  if (
    typeof req.max_season_index === "number" &&
    seasonIndex > req.max_season_index
  ) {
    return false;
  }
  return true;
}

function meetsRequirements(
  storylet: Storylet,
  dayIndex: number,
  dailyState: DailyState | null,
  seasonIndex: number,
  userId: string,
  experiments: Record<string, string>,
  isAdmin: boolean,
  opts?: { ignoreSeason?: boolean; ignoreAudience?: boolean; ignoreResources?: boolean },
  resourceSnapshot?: ResourceSnapshot | null
): boolean {
  const req = (storylet.requirements || {}) as Requirements;
  if (typeof req.min_day_index === "number" && dayIndex < req.min_day_index) return false;
  if (typeof req.max_day_index === "number" && dayIndex > req.max_day_index) return false;

  // Resource gates — skip when relaxing constraints for pool-padding fallback
  if (!opts?.ignoreResources) {
    if (typeof req.requires_cash_min === "number") {
      if ((resourceSnapshot?.cashOnHand ?? 0) < req.requires_cash_min) return false;
    }
    if (typeof req.requires_knowledge_min === "number") {
      if ((resourceSnapshot?.knowledge ?? 0) < req.requires_knowledge_min) return false;
    }
    if (typeof req.requires_social_leverage_min === "number") {
      if ((resourceSnapshot?.socialLeverage ?? 0) < req.requires_social_leverage_min) return false;
    }
    if (typeof req.requires_physical_resilience_min === "number") {
      if ((resourceSnapshot?.physicalResilience ?? 0) < req.requires_physical_resilience_min) return false;
    }
    // Money band gate: storylet only surfaces when player's current band matches
    if (Array.isArray(req.requires_money_band) && req.requires_money_band.length > 0) {
      const band = (dailyState as any)?.money_band as string | undefined;
      if (!band || !req.requires_money_band.includes(band as "tight" | "okay" | "comfortable")) {
        return false;
      }
    }
  }

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

  if (!opts?.ignoreSeason && hasSeasonRules(req)) {
    if (!meetsSeasonRules(req, seasonIndex)) return false;
  }

  // Storylet-level NPC guards (relationship state)
  if (Array.isArray(req.requires_npc_met) && req.requires_npc_met.length > 0) {
    const rels = (dailyState as any)?.relationships as Record<string, { met?: boolean }> | undefined;
    for (const npcId of req.requires_npc_met) {
      if (!rels?.[npcId]?.met) return false;
    }
  }
  if (Array.isArray(req.requires_npc_not_met) && req.requires_npc_not_met.length > 0) {
    const rels = (dailyState as any)?.relationships as Record<string, { met?: boolean }> | undefined;
    for (const npcId of req.requires_npc_not_met) {
      if (rels?.[npcId]?.met) return false;
    }
  }

  if (typeof req.requires_not_precluded === "string") {
    const gates = (dailyState as any)?.preclusion_gates as string[] | undefined;
    if (Array.isArray(gates) && gates.includes(req.requires_not_precluded)) return false;
  }

  if (!opts?.ignoreAudience && req.audience && typeof req.audience === "object" && !Array.isArray(req.audience)) {
    const audience = req.audience as Requirements["audience"];
    if (audience?.allow_admin && isAdmin) return true;
    if (typeof audience?.rollout_pct === "number") {
      if (!pctInRollout(userId, storylet.id || storylet.slug || "", audience.rollout_pct)) {
        return false;
      }
    }
    if (audience?.experiment && audience.experiment.id && audience.experiment.variants_any) {
      const assigned = experiments[audience.experiment.id];
      if (!assigned || !audience.experiment.variants_any.includes(assigned)) {
        return false;
      }
    }
  }

  return true;
}

function scoreStorylet(
  storylet: Storylet,
  seed: string,
  context?: StoryletContext | null
): number {
  const base = hashString(`${seed}:${storylet.id}`);
  const weight = storylet.weight ?? 100;
  const tags = storylet.tags ?? [];
  const hasTag = (tag: string) => tags.includes(tag);
  let bonus = 0;
  const posture = context?.posture ?? null;
  if (posture === "push" && (hasTag("study") || hasTag("work"))) {
    bonus += 0.2;
  } else if (posture === "recover" && hasTag("health")) {
    bonus += 0.2;
  } else if (posture === "connect" && hasTag("social")) {
    bonus += 0.2;
  } else if (
    posture === "steady" &&
    (hasTag("study") || hasTag("work") || hasTag("social") || hasTag("health"))
  ) {
    bonus += 0.1;
  }

  const tensions = context?.unresolvedTensionKeys ?? [];
  if (tensions.includes("unfinished_assignment") && hasTag("study")) {
    bonus += 0.2;
  }
  if (tensions.includes("fatigue") && hasTag("health")) {
    bonus += 0.2;
  }

  const directiveTags = context?.directiveTags ?? [];
  if (directiveTags.length > 0 && tagsIntersect(tags, directiveTags)) {
    bonus += 0.05;
  }

  // Resource-aware bonuses: surface thematically appropriate content based on
  // the player's accumulated capital.
  const res = context?.resourceSnapshot;
  if (res) {
    // Broke players get "budget_stress" stories floated to the top
    if (res.cashOnHand < 10 && hasTag("budget_stress")) bonus += 0.25;
    // Flush players get "treat_yourself" options surfaced
    if (res.cashOnHand > 50 && hasTag("treat_yourself")) bonus += 0.15;
    // Academic storylets rise for studious players
    if (res.knowledge > 30 && hasTag("academic")) bonus += 0.15;
    // Social storylets rise for socially active players
    if (res.socialLeverage > 30 && hasTag("social")) bonus += 0.1;
    // Fitness storylets rise for health-focused players
    if (res.physicalResilience > 50 && hasTag("health")) bonus += 0.1;
  }

  return base / (Math.max(weight, 1) * (1 + bonus));
}

function partitionOnboarding(storylets: Storylet[]): { onboarding: Storylet[]; others: Storylet[] } {
  const onboarding = storylets.filter((s) => (s.tags || []).includes("onboarding"));
  const others = storylets.filter((s) => !(s.tags || []).includes("onboarding"));
  return { onboarding, others };
}

function pickTop(
  storylets: Storylet[],
  seed: string,
  count: number,
  context?: StoryletContext | null
): Storylet[] {
  return [...storylets]
    .sort((a, b) => scoreStorylet(a, seed, context) - scoreStorylet(b, seed, context))
    .slice(0, count);
}

export function selectStorylets({
  seed,
  userId,
  dayIndex,
  seasonIndex,
  dailyState,
  allStorylets,
  recentRuns,
  forcedStorylet,
  experiments = {},
  isAdmin = false,
  context = null,
  resourceSnapshot = null,
}: SelectorArgs): Storylet[] {
  const todayUsedIds = new Set(
    recentRuns.filter((r) => r.day_index === dayIndex).map((r) => r.storylet_id)
  );

  const recentIds = new Set(
    recentRuns
      .filter((r) => r.day_index >= dayIndex - 7 && r.day_index < dayIndex)
      .map((r) => r.storylet_id)
  );

  // Build all-time run counts (recentRuns must cover full history for
  // max_total_runs to work correctly; see dailyLoop.ts daysBack value).
  const allTimeRunCounts = new Map<string, number>();
  for (const run of recentRuns) {
    allTimeRunCounts.set(run.storylet_id, (allTimeRunCounts.get(run.storylet_id) ?? 0) + 1);
  }

  const activeStorylets = allStorylets
    .filter((s) => s.is_active)
    .filter((s) => {
      const req = (s.requirements ?? {}) as Requirements;
      if (typeof req.max_total_runs !== "number") return true;
      return (allTimeRunCounts.get(s.id) ?? 0) < req.max_total_runs;
    });

  const baseEligible = activeStorylets.filter(
    (s) =>
      !todayUsedIds.has(s.id) &&
      meetsRequirements(s, dayIndex, dailyState, seasonIndex, userId, experiments, isAdmin, undefined, resourceSnapshot)
  );

  const preferred = baseEligible.filter((s) => !recentIds.has(s.id));

  const { onboarding, others } = partitionOnboarding(preferred);
  const onboardingEligible = dayIndex <= 3 ? onboarding : [];

  let picked: Storylet[] = [];
  if (
    forcedStorylet &&
    forcedStorylet.is_active &&
    !todayUsedIds.has(forcedStorylet.id)
  ) {
    const forcedReq = (forcedStorylet.requirements || {}) as Requirements;
    if (
      process.env.NODE_ENV !== "production" &&
      hasSeasonRules(forcedReq) &&
      !meetsSeasonRules(forcedReq, seasonIndex)
    ) {
      console.warn(
        `[storylets] Forced storylet ${forcedStorylet.slug ?? forcedStorylet.id} excluded by season gating.`
      );
    }
    if (
      process.env.NODE_ENV !== "production" &&
      hasAudienceRules(forcedReq) &&
      !meetsRequirements(
        forcedStorylet,
        dayIndex,
        dailyState,
        seasonIndex,
        userId,
        experiments,
        isAdmin,
        undefined,
        resourceSnapshot
      )
    ) {
      console.warn(
        `[storylets] Forced storylet ${forcedStorylet.slug ?? forcedStorylet.id} excluded by audience gating.`
      );
    }
    picked.push(forcedStorylet);
  }
  if (onboardingEligible.length > 0) {
    picked.push(...pickTop(onboardingEligible, seed, 2, context));
  }

  if (picked.length < 2) {
    const remaining = preferred.filter((s) => !picked.includes(s));
    picked.push(...pickTop(remaining, seed, 3 - picked.length, context));
  }

  if (picked.length < 2) {
    const remaining = baseEligible.filter((s) => !picked.includes(s));
    picked.push(...pickTop(remaining, seed, 2 - picked.length, context));
  }

  if (picked.length < 2 && baseEligible.length < 2) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Season gating reduced pool; using fallback.");
    }
    const nonSeasonEligible = activeStorylets.filter((s) => {
      if (todayUsedIds.has(s.id)) return false;
      const req = (s.requirements || {}) as Requirements;
      return (
        !hasSeasonRules(req) &&
        !hasAudienceRules(req) &&
        meetsRequirements(s, dayIndex, dailyState, seasonIndex, userId, experiments, isAdmin, {
          ignoreSeason: true,
        }, resourceSnapshot)
      );
    });
    const nonSeasonPreferred = nonSeasonEligible.filter((s) => !recentIds.has(s.id));
    const remaining = nonSeasonPreferred.filter((s) => !picked.includes(s));
    picked.push(...pickTop(remaining, seed, 2 - picked.length, context));
  }

  if (picked.length < 2 && baseEligible.length < 2) {
    const relaxedEligible = activeStorylets.filter((s) => {
      if (todayUsedIds.has(s.id)) return false;
      return meetsRequirements(
        s,
        dayIndex,
        dailyState,
        seasonIndex,
        userId,
        experiments,
        isAdmin,
        { ignoreSeason: true },
        resourceSnapshot
      );
    });
    const relaxedPreferred = relaxedEligible.filter((s) => !recentIds.has(s.id));
    const remaining = relaxedPreferred.filter((s) => !picked.includes(s));
    picked.push(...pickTop(remaining, seed, 2 - picked.length, context));
  }

  if (picked.length < 2) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Audience gating reduced pool; using fallback.");
    }
    const relaxedAudience = activeStorylets.filter((s) => {
      if (todayUsedIds.has(s.id)) return false;
      return meetsRequirements(
        s,
        dayIndex,
        dailyState,
        seasonIndex,
        userId,
        experiments,
        isAdmin,
        { ignoreSeason: true, ignoreAudience: true },
        resourceSnapshot
      );
    });
    const remaining = relaxedAudience.filter((s) => !picked.includes(s));
    picked.push(...pickTop(remaining, seed, 2 - picked.length, context));
  }

  if (picked.length < 3) {
    // Pad to 3 while still honouring NPC gates and max_total_runs.
    // Season/audience/resource requirements are intentionally relaxed here so
    // we always have something to show, but a storylet must never appear before
    // the player has met its required NPCs.
    const remaining = activeStorylets.filter((s) => {
      if (picked.includes(s) || todayUsedIds.has(s.id)) return false;
      return meetsRequirements(
        s,
        dayIndex,
        dailyState,
        seasonIndex,
        userId,
        experiments,
        isAdmin,
        { ignoreSeason: true, ignoreAudience: true, ignoreResources: true }
      );
    });
    picked.push(...pickTop(remaining, seed, 3 - picked.length, context));
  }

  return picked.slice(0, 3);
}

// Export helpers for tests
export const _testOnly = {
  hashString,
  meetsRequirements,
  hasSeasonRules,
  hasAudienceRules,
  meetsSeasonRules,
  pickTop,
  scoreStorylet,
};
