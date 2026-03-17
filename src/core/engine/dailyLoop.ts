import { ensureCadenceUpToDate } from "@/lib/cadence";
import { runsForTodayPair, computeStage } from "@/core/engine/dailyLoop.utils";
import {
  fetchDailyState,
  fetchTimeAllocation,
  fetchTodayRuns,
  fetchTodayStoryletCandidates,
  fetchRecentStoryletRuns,
} from "@/lib/play";
import { getReflection, isReflectionDone } from "@/lib/reflections";
import { selectStorylets } from "@/core/storylets/selectStorylets";
import { performSeasonReset } from "@/core/season/seasonReset";
import { getSeasonContext } from "@/core/season/getSeasonContext";
import { shouldShowFunPulse } from "@/core/funPulse/shouldShowFunPulse";
import { getFunPulse } from "@/lib/funPulse";
import { buildStoryletContext } from "@/core/engine/storyletContext";
import { ensureUserInCohort } from "@/lib/cohorts";
import { listActiveInitiativesCatalog } from "@/lib/content/initiatives";
import { listFactions } from "@/lib/factions";
import {
  ensureUserAlignmentRows,
  fetchRecentAlignmentEvents,
  fetchUserAlignment,
  hasAlignmentEvent,
  applyAlignmentDelta,
} from "@/lib/alignment";
import {
  fetchStaleDirectiveForCohort,
  getOrCreateWeeklyDirective,
  updateDirectiveStatus,
} from "@/lib/directives";
import { computeUnlockedContent } from "@/lib/unlocks";
import {
  fetchInitiativeProgress,
  fetchOpenInitiativesForCohort,
  fetchUserContributionStatus,
  fetchInitiativeForWeek,
  getOrCreateWeeklyInitiative,
  closeInitiative,
} from "@/lib/initiatives";
import {
  computeWeekWindow,
  getOrComputeCohortWeeklyInfluence,
  getOrComputeWeeklySnapshot,
  getOrComputeWorldWeeklyInfluence,
} from "@/lib/worldState";
import {
  ensureSkillBankUpToDate,
  ensureTensionsUpToDate,
  fetchSkillAllocations,
  fetchSkillLevels,
  fetchPosture,
  fetchSkillBank,
  fetchTensions,
  upsertPosture,
} from "@/lib/dailyInteractions";
import { ensureDayStateUpToDate } from "@/lib/dayState";
import { getFeatureFlags } from "@/lib/featureFlags";
import { getArcOneState } from "@/core/arcOne/state";
import type { ResourceSnapshot } from "@/core/resources/resourceDelta";
import { computeMorale } from "@/core/resources/resourceDelta";
import { ARC_ONE_LAST_DAY } from "@/core/arcOne/constants";
import { selectArcBeats, buildInitialArcInstances } from "@/core/arcs/selectArcBeats";
import { ARC_ONE_STREAM_KEYS, ARC_KEY_TO_STREAM_ID } from "@/types/arcOneStreams";
import { supabase } from "@/lib/supabase/browser";
import type { DailyRun, DailyRunStage, ArcBeat } from "@/types/dailyRun";
import type { ArcDefinition, ArcInstance, ArcStep } from "@/domain/arcs/types";

import type { Storylet, StoryletRun } from "@/types/storylets";

const DIRECTIVE_TAGS: Record<string, string[]> = {
  neo_assyrian: ["work", "cash", "leverage"],
  dynastic_consortium: ["study", "research", "tech"],
  templar_remnant: ["duty", "faith", "order"],
  bormann_network: ["security", "secrecy", "force"],
};


function devLogStage(snapshot: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "production") {
    console.info("[daily-run]", snapshot);
  }
}


export async function getOrCreateDailyRun(
  userId: string,
  today: Date,
  options?: {
    experiments?: Record<string, string>;
    isAdmin?: boolean;
  }
): Promise<DailyRun> {
  const todayUtc = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  )
    .toISOString()
    .slice(0, 10);

  const seasonContext = await getSeasonContext(userId, today);
  const currentSeasonIndex = seasonContext.currentSeason.season_index;
  const userSeason = seasonContext.userSeason;
  let seasonResetNeeded = false;
  let seasonRecap = null;
  if (userSeason.current_season_index !== currentSeasonIndex) {
    seasonRecap = await performSeasonReset(userId, currentSeasonIndex, userSeason);
    seasonResetNeeded = true;
    seasonContext.userSeason = {
      ...userSeason,
      current_season_index: currentSeasonIndex,
      last_seen_season_index: currentSeasonIndex,
      last_reset_at: new Date().toISOString(),
      last_recap: seasonRecap ?? userSeason.last_recap,
    };
  }

  const cadence = await ensureCadenceUpToDate(userId);
  const dayIndex = cadence.dayIndex;

  const featureFlags = getFeatureFlags();
  if (featureFlags.skills) {
    await ensureSkillBankUpToDate(userId, dayIndex);
  }
  await ensureTensionsUpToDate(userId, dayIndex);

  const [
    daily,
    dayStateRaw,
    allocation,
    runs,
    storyletsRaw,
    tensions,
    skillBankRaw,
    postureRaw,
    allocationsRaw,
    skillsRaw,
  ] = await Promise.all([
    fetchDailyState(userId),
    ensureDayStateUpToDate(userId, dayIndex).catch(() => null),
    fetchTimeAllocation(userId, dayIndex),
    fetchTodayRuns(userId, dayIndex),
    fetchTodayStoryletCandidates(seasonContext.currentSeason.season_index),
    fetchTensions(userId, dayIndex),
    featureFlags.skills ? fetchSkillBank(userId) : Promise.resolve(null),
    fetchPosture(userId, dayIndex),
    featureFlags.skills ? fetchSkillAllocations(userId, dayIndex) : Promise.resolve([]),
    featureFlags.skills ? fetchSkillLevels(userId) : Promise.resolve(null),
    // Note: we fetch recent history separately below.
  ]);
  let dayState = dayStateRaw;
  const skillBank = featureFlags.skills ? skillBankRaw : null;
  const allocations = featureFlags.skills ? allocationsRaw : [];
  const skills = featureFlags.skills ? skillsRaw : null;
  let postureResolved = postureRaw;
  if (!postureResolved) {
    // auto-default posture for user test build (can be reverted)
    const createdAt = new Date().toISOString();
    try {
      await upsertPosture({
        user_id: userId,
        day_index: dayIndex,
        posture: "steady",
        created_at: createdAt,
      });
    } catch (error) {
      console.error("Failed to auto-default posture", error);
    }
    postureResolved = {
      user_id: userId,
      day_index: dayIndex,
      posture: "steady",
      created_at: createdAt,
    };
  }

  const [allocationSeed, recentRuns, cohort] = await Promise.all([
    !allocation && dayIndex > 0
      ? fetchTimeAllocation(userId, dayIndex - 1).catch(() => null)
      : Promise.resolve(null),
    // Pass dayIndex as daysBack so fromDay=0 — gives all-time history needed
    // for max_total_runs lifetime caps in selectStorylets.
    fetchRecentStoryletRuns(userId, dayIndex, dayIndex).catch(() => []),
    ensureUserInCohort(userId).catch(() => null),
  ]);
  const cohortId = cohort?.cohortId ?? null;

  // Build resource snapshot from current dayState. Used for storylet gating and scoring bonuses.
  const resourceSnapshot: ResourceSnapshot | null = dayState
    ? {
        energy: daily?.energy ?? 100,
        stress: daily?.stress ?? 0,
        knowledge: dayState.knowledge,
        cashOnHand: dayState.cashOnHand,
        socialLeverage: dayState.socialLeverage,
        physicalResilience: dayState.physicalResilience,
        morale: computeMorale(daily?.energy ?? 100, daily?.stress ?? 0),
      }
    : null;

  let factions: DailyRun["factions"] = [];
  let alignment = {} as Record<string, number>;
  let contentInitiatives = [] as Awaited<ReturnType<typeof listActiveInitiativesCatalog>>;
  let recentEvents = [] as DailyRun["recentAlignmentEvents"];
  let unlocks: ReturnType<typeof computeUnlockedContent> = {
    unlockedArcKeys: [],
    unlockedInitiativeKeys: [],
  };
  let directiveRow = null as Awaited<ReturnType<typeof getOrCreateWeeklyDirective>> | null;
  let directiveSummary = null as DailyRun["directive"];
  const initiativesEnabled = featureFlags.alignment;

  if (featureFlags.alignment) {
    const [alignmentRows, factionsResult, initiativesResult, events] =
      await Promise.all([
        (async () => {
          await ensureUserAlignmentRows(userId).catch(() => { });
          return fetchUserAlignment(userId);
        })(),
        listFactions(),
        listActiveInitiativesCatalog(),
        fetchRecentAlignmentEvents(userId, dayIndex).catch(() => []),
      ]);
    factions = factionsResult;
    contentInitiatives = initiativesResult;
    recentEvents = events;
    alignment = alignmentRows.reduce<Record<string, number>>((acc, row) => {
      acc[row.faction_key] = row.score;
      return acc;
    }, {});
    unlocks = computeUnlockedContent(alignment, [], contentInitiatives);
    directiveRow = cohortId
      ? await getOrCreateWeeklyDirective(
        cohortId,
        dayIndex,
        unlocks.unlockedInitiativeKeys
      ).catch(() => null)
      : null;
    directiveSummary = directiveRow
      ? {
        faction_key: directiveRow.faction_key,
        title: directiveRow.title,
        description: directiveRow.description,
        target_type: directiveRow.target_type,
        target_key: directiveRow.target_key,
        week_end_day_index: directiveRow.week_end_day_index,
        status: directiveRow.status,
      }
      : null;
  }
  const directiveTags =
    directiveRow?.faction_key && DIRECTIVE_TAGS[directiveRow.faction_key]
      ? DIRECTIVE_TAGS[directiveRow.faction_key]
      : [];

  const storyletsSelected = selectStorylets({
    seed: `${userId}-${dayIndex}`,
    userId,
    dayIndex,
    seasonIndex: seasonContext.currentSeason.season_index,
    dailyState: daily ?? null,
    allStorylets: storyletsRaw,
    recentRuns,
    experiments: options?.experiments,
    isAdmin: options?.isAdmin,
    resourceSnapshot,
    context: buildStoryletContext({
      posture: postureResolved,
      tensions,
      directiveTags,
      resourceSnapshot,
    }),
  });

  const entrySlug = "s1_room_212_wake";
  let storylets = storyletsSelected;

  const shouldForceEntry =
    featureFlags.arcOneScarcityEnabled &&
    dayIndex === 1 &&
    seasonContext.currentSeason?.season_index >= 0;

  if (shouldForceEntry) {
    const entryStorylet = storyletsRaw.find(
      (storylet) => storylet.slug === entrySlug
    );
    if (entryStorylet) {
      storylets = [
        entryStorylet,
        ...storylets.filter((storylet) => storylet.id !== entryStorylet!.id),
      ].slice(0, 3);
    } else {
      console.warn("Arc One entry storylet not found in candidates.");
    }
  }

  let initiatives = null as DailyRun["initiatives"];

  if (cohortId && initiativesEnabled) {
    await getOrCreateWeeklyInitiative(cohortId, dayIndex, directiveRow);
  }

  if (cohortId && initiativesEnabled) {
    const staleDirective = await fetchStaleDirectiveForCohort(cohortId, dayIndex).catch(
      () => null
    );
    if (staleDirective) {
      const initiative = await fetchInitiativeForWeek(
        cohortId,
        staleDirective.week_start_day_index
      );
      if (initiative && initiative.status === "open" && dayIndex > initiative.ends_day_index) {
        const progress = await fetchInitiativeProgress(initiative.id);
        const nextStatus = progress >= initiative.goal ? "completed" : "expired";
        try {
          await closeInitiative(initiative.id);
          await updateDirectiveStatus(staleDirective.id, nextStatus);
          staleDirective.status = nextStatus;
        } catch (err) {
          console.error("Failed to close initiative or update directive", err);
        }
      }

      if (staleDirective.status === "completed") {
        const alreadyRewarded = await hasAlignmentEvent({
          userId,
          source: "directive",
          sourceRef: staleDirective.id,
        }).catch(() => false);
        if (!alreadyRewarded) {
          await applyAlignmentDelta({
            userId,
            dayIndex,
            factionKey: staleDirective.faction_key,
            delta: 2,
            source: "directive",
            sourceRef: staleDirective.id,
          }).catch(() => { });
        }
      }
    }
  }

  if (cohortId && initiativesEnabled) {
    const openInitiatives = await fetchOpenInitiativesForCohort(cohortId, dayIndex);
    const enriched = await Promise.all(
      openInitiatives.map(async (initiative) => {
        const [contributedToday, progress] = await Promise.all([
          fetchUserContributionStatus(initiative.id, userId, dayIndex),
          fetchInitiativeProgress(initiative.id),
        ]);
        return { ...initiative, contributedToday, progress };
      })
    );
    initiatives = enriched;
  }

  const reflection = await getReflection(userId, dayIndex);
  const reflectionDone = isReflectionDone(reflection);
  const funPulseEligible = featureFlags.funPulse
    ? shouldShowFunPulse(dayIndex, currentSeasonIndex)
    : false;
  const funPulseRow =
    funPulseEligible && featureFlags.funPulse
      ? await getFunPulse(userId, currentSeasonIndex, dayIndex)
      : null;
  const funPulseDone = featureFlags.funPulse ? Boolean(funPulseRow) : false;

  const hasStorylets = storylets.length > 0;
  const runsForPair = runsForTodayPair(runs, storylets);
  const arcOneMode =
    featureFlags.arcOneScarcityEnabled && dayIndex <= ARC_ONE_LAST_DAY;
  // Setup is handled via auto-default posture above; no additional setup gate needed.
  const setupNeeded = false;
  const baseStage = computeStage(
    Boolean(allocation) || (arcOneMode && !featureFlags.resources),
    runsForPair.length,
    cadence.alreadyCompletedToday,
    // In arcOneMode legacy storylets are replaced by arc beats — always treat as
    // having content so computeStage never short-circuits to "complete" prematurely.
    arcOneMode ? true : hasStorylets,
    reflectionDone,
    funPulseEligible,
    funPulseDone
  );
  const stage =
    !cadence.alreadyCompletedToday && setupNeeded ? "setup" : baseStage;

  const arcOneState = arcOneMode ? getArcOneState(daily ?? null) : null;

  devLogStage({
    dayIndex,
    hasAllocation: Boolean(allocation),
    runsForPair: runsForPair.length,
    reflectionDone,
    needsSetup: setupNeeded,
    stage,
  });

  const availableArcs: DailyRun["availableArcs"] = [];

  // ---------------------------------------------------------------------------
  // Arc One beat scheduler
  // ---------------------------------------------------------------------------
  let arcBeats: ArcBeat[] = [];
  if (arcOneMode) {
    try {
      // 1. Load the six Arc One arc definitions
      const { data: arcDefs } = await supabase
        .from("arc_definitions")
        .select("id,key,title,description,tags,is_enabled")
        .in("key", ARC_ONE_STREAM_KEYS)
        .eq("is_enabled", true);

      const streamArcs: ArcDefinition[] = (arcDefs ?? []).map((r) => ({
        id: r.id,
        key: r.key,
        title: r.title,
        description: r.description,
        tags: Array.isArray(r.tags) ? r.tags : [],
        is_enabled: Boolean(r.is_enabled),
      }));

      if (streamArcs.length > 0) {
        const arcIds = streamArcs.map((a) => a.id);

        // 2. Load steps for these arcs from unified storylets table
        const { data: stepRows } = await supabase
          .from("storylets")
          .select("id,slug,arc_id,step_key,order_index,title,body,choices,default_next_step_key,due_offset_days,expires_after_days,is_active,tags,requirements,weight,introduces_npc")
          .in("arc_id", arcIds)
          .order("order_index");

        const streamSteps: ArcStep[] = (stepRows ?? []).map((r) => ({
          id: r.id,
          slug: r.slug,
          arc_id: r.arc_id,
          step_key: r.step_key,
          order_index: r.order_index ?? 0,
          title: r.title,
          body: r.body,
          choices: Array.isArray(r.choices) ? r.choices : [],
          default_next_step_key: r.default_next_step_key ?? null,
          due_offset_days: r.due_offset_days ?? 0,
          expires_after_days: r.expires_after_days ?? 0,
          is_active: Boolean(r.is_active),
          tags: Array.isArray(r.tags) ? r.tags : [],
          requirements: r.requirements ?? {},
          weight: r.weight ?? 1,
          introduces_npc: r.introduces_npc ?? undefined,
        }));

        // 3. Load or create arc instances for this user
        const { data: instanceRows } = await supabase
          .from("arc_instances")
          .select("id,user_id,arc_id,state,current_step_key,step_due_day,step_defer_count,started_day,updated_day,completed_day,failure_reason,branch_key")
          .eq("user_id", userId)
          .in("arc_id", arcIds);

        let instances: ArcInstance[] = (instanceRows ?? []).map((r) => ({
          id: r.id,
          user_id: r.user_id,
          arc_id: r.arc_id,
          state: r.state as ArcInstance["state"],
          current_step_key: r.current_step_key,
          step_due_day: r.step_due_day,
          step_defer_count: r.step_defer_count,
          started_day: r.started_day,
          updated_day: r.updated_day,
          completed_day: r.completed_day ?? null,
          failure_reason: r.failure_reason ?? null,
          branch_key: r.branch_key ?? null,
        }));

        // 4. On day 1 (or whenever there are no instances yet), create them
        if (instances.length === 0 && streamSteps.length > 0) {
          const toInsert = buildInitialArcInstances(userId, streamArcs, streamSteps, dayIndex);
          if (toInsert.length > 0) {
            const { data: inserted } = await supabase
              .from("arc_instances")
              .insert(toInsert)
              .select("id,user_id,arc_id,state,current_step_key,step_due_day,step_defer_count,started_day,updated_day,completed_day,failure_reason,branch_key");
            instances = (inserted ?? []).map((r) => ({
              id: r.id,
              user_id: r.user_id,
              arc_id: r.arc_id,
              state: r.state as ArcInstance["state"],
              current_step_key: r.current_step_key,
              step_due_day: r.step_due_day,
              step_defer_count: r.step_defer_count,
              started_day: r.started_day,
              updated_day: r.updated_day,
              completed_day: r.completed_day ?? null,
              failure_reason: r.failure_reason ?? null,
              branch_key: r.branch_key ?? null,
            }));
          }
        }

        // 5. Select due beats and format for DailyRun
        const dueSteps = selectArcBeats({ dayIndex, instances, steps: streamSteps, arcs: streamArcs });
        arcBeats = dueSteps.map((due) => ({
          instance_id: due.instance.id,
          arc_key: due.arc.key,
          stream_id: ARC_KEY_TO_STREAM_ID[due.arc.key] ?? due.arc.key.replace("arc_", ""),
          title: due.step.title,
          body: due.step.body,
          options: due.step.choices,
          expires_on_day: due.expires_on_day,
        }));
      }
    } catch (err) {
      console.error("[daily-run] Failed to load arc beats", err);
    }
  }

  // In arcOneMode: if beats are available the stage must not be "complete" so the
  // client renders them instead of the "Daily complete ✓" screen.  If beats are
  // empty but the day is not yet marked complete we let the auto-complete logic
  // in the client handle the transition gracefully.
  const resolvedStage: typeof stage =
    arcOneMode && arcBeats.length > 0 && !cadence.alreadyCompletedToday
      ? "storylet_1"
      : arcOneMode && arcBeats.length === 0 && !cadence.alreadyCompletedToday
      ? "complete"
      : stage;

  const { weekStart, weekEnd } = computeWeekWindow(dayIndex);
  const [worldInfluence, cohortInfluence, rivalrySnapshot] = await Promise.all([
    featureFlags.alignment
      ? getOrComputeWorldWeeklyInfluence(weekStart, weekEnd).catch(() => ({}))
      : Promise.resolve(null),
    featureFlags.alignment && cohortId
      ? getOrComputeCohortWeeklyInfluence(cohortId, weekStart, weekEnd).catch(
        () => ({})
      )
      : Promise.resolve(null),
    featureFlags.alignment
      ? getOrComputeWeeklySnapshot(weekStart, weekEnd).catch(
        () => ({ topCohorts: [] })
      )
      : Promise.resolve({ topCohorts: [] }),
  ]);

  return {
    userId,
    dayIndex,
    date: todayUtc,
    stage: resolvedStage,
    allocation: allocation ?? null,
    allocationSeed,
    storylets,
    storyletRunsToday: runs,
    tensions,
    skillBank: featureFlags.skills ? skillBank : null,
    posture: postureResolved,
    allocations: featureFlags.skills ? allocations : [],
    skills: featureFlags.skills ? skills ?? undefined : undefined,
    nextSkillUnlockDay: featureFlags.skills ? 2 : undefined,
    cohortId,
    arc: null,
    factions: featureFlags.alignment ? factions : [],
    alignment: featureFlags.alignment ? alignment : undefined,
    unlocks: featureFlags.alignment
      ? {
        arcKeys: [],
        initiativeKeys: unlocks.unlockedInitiativeKeys,
      }
      : undefined,
    availableArcs: featureFlags.alignment ? availableArcs : [],
    recentAlignmentEvents: featureFlags.alignment ? recentEvents : undefined,
    worldState: featureFlags.alignment
      ? {
        weekStart,
        weekEnd,
        influence: worldInfluence ?? {},
      }
      : undefined,
    cohortState:
      featureFlags.alignment && cohortInfluence
        ? {
          weekStart,
          weekEnd,
          influence: cohortInfluence,
        }
        : null,
    rivalry: featureFlags.alignment
      ? {
        topCohorts: rivalrySnapshot.topCohorts,
      }
      : undefined,
    directive: featureFlags.alignment ? directiveSummary : null,
    initiatives,
    reflectionStatus: reflectionDone ? "done" : "pending",
    funPulseEligible,
    funPulseDone,
    dailyState: daily,
    dayState: dayState
      ? {
        energy: dayState.energy,
        stress: dayState.stress,
        cashOnHand: dayState.cashOnHand,
        knowledge: dayState.knowledge,
        socialLeverage: dayState.socialLeverage,
        physicalResilience: dayState.physicalResilience,
        total_study: dayState.total_study,
        total_work: dayState.total_work,
        total_social: dayState.total_social,
        total_health: dayState.total_health,
        total_fun: dayState.total_fun,
      }
      : null,
    arcOneState: arcOneState ?? undefined,
    arcBeats: arcBeats.length > 0 ? arcBeats : undefined,
    seasonResetNeeded,
    newSeasonIndex: seasonResetNeeded ? currentSeasonIndex : undefined,
    seasonRecap: seasonResetNeeded ? seasonRecap : undefined,
    seasonContext,
  };
}
