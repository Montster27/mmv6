// ensureCadenceUpToDate removed — day advancement is now exclusively sleep-driven
// via /api/day/advance-day. No wall-clock auto-advance.
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
import { fetchDayState, createDayStateFromPrevious } from "@/lib/dayState";
import { getFeatureFlags } from "@/lib/featureFlags";
import { getChapterOneState } from "@/core/chapter/state";
import type { ResourceSnapshot } from "@/core/resources/resourceDelta";
import { computeMorale } from "@/core/resources/resourceDelta";
import { CHAPTER_ONE_LAST_DAY, ROUTINE_MODE_START_DAY } from "@/core/chapter/constants";
import { computeWeekStart } from "@/core/routine/constants";
import type { RoutineActivity, RoutineWeekState, PlayerScheduleSelection } from "@/types/routine";
import { selectTrackStorylets, buildInitialTrackProgress } from "@/core/tracks/selectTrackStorylets";
import { CHAPTER_ONE_TRACK_KEYS } from "@/types/tracks";
import type { Track, TrackProgress, TrackStoryletRow, TrackStorylet } from "@/types/tracks";
import type { StoryletChoice } from "@/types/storylets";
import { supabase } from "@/lib/supabase/browser";
import type { DailyRun, DailyRunStage } from "@/types/dailyRun";

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

  // Read-only: day advancement happens exclusively via /api/day/advance-day
  const { data: dailyStateRow } = await supabase
    .from("daily_states")
    .select("day_index,last_day_completed,last_day_index_completed")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (!dailyStateRow) throw new Error("No daily state found for user.");
  const dayIndex = dailyStateRow.day_index;
  const alreadyCompletedToday =
    dailyStateRow.last_day_completed === todayUtc &&
    dailyStateRow.last_day_index_completed === dayIndex;

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
    fetchDayState(userId, dayIndex),
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
  // If player_day_state is missing (e.g. reached this day via pre-refactor code),
  // create it lazily. This does NOT advance day_index — it just creates the row
  // for the current day with morning defaults.
  let dayState = dayStateRaw ?? await createDayStateFromPrevious(userId, dayIndex);
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

  let storylets = storyletsSelected;

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
  const chapterOneMode =
    featureFlags.chapterOneScarcityEnabled && dayIndex <= CHAPTER_ONE_LAST_DAY;
  // Setup is handled via auto-default posture above; no additional setup gate needed.
  const setupNeeded = false;
  const baseStage = computeStage(
    Boolean(allocation) || (chapterOneMode && !featureFlags.resources),
    runsForPair.length,
    alreadyCompletedToday,
    // In chapterOneMode legacy storylets are replaced by arc beats — always treat as
    // having content so computeStage never short-circuits to "complete" prematurely.
    chapterOneMode ? true : hasStorylets,
    reflectionDone,
    funPulseEligible,
    funPulseDone
  );
  const stage =
    !alreadyCompletedToday && setupNeeded ? "setup" : baseStage;

  const chapterOneState = chapterOneMode ? getChapterOneState(daily ?? null) : null;

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
  // Track storylet scheduler (Chapter One)
  // ---------------------------------------------------------------------------
  let trackStorylets: TrackStorylet[] = [];
  if (chapterOneMode) {
    try {
      // 1. Load Chapter One track definitions
      const { data: trackDefs, error: trackDefsError } = await supabase
        .from("tracks")
        .select("id,key,title,description,tags,is_enabled,category,chapter")
        .in("key", CHAPTER_ONE_TRACK_KEYS)
        .eq("is_enabled", true);

      if (trackDefsError) {
        console.error("[daily-run] tracks query failed:", trackDefsError);
      }
      if (!trackDefs || trackDefs.length === 0) {
        console.warn("[daily-run] No tracks found. Keys queried:", CHAPTER_ONE_TRACK_KEYS);
      }

      const tracks: Track[] = (trackDefs ?? []).map((r) => ({
        id: r.id,
        key: r.key,
        title: r.title,
        description: r.description ?? "",
        category: r.category ?? "life_stream",
        chapter: r.chapter ?? "one",
        tags: Array.isArray(r.tags) ? r.tags : [],
        is_enabled: Boolean(r.is_enabled),
      }));

      if (tracks.length > 0) {
        const trackIds = tracks.map((t) => t.id);

        // 2. Load storylets for these tracks
        const { data: storyletRows, error: storyletRowsError } = await supabase
          .from("storylets")
          .select("id,slug,track_id,storylet_key,order_index,title,body,choices,nodes,default_next_key,due_offset_days,expires_after_days,is_active,tags,requirements,weight,introduces_npc,segment,time_cost_hours,is_conflict")
          .in("track_id", trackIds)
          .order("order_index");

        if (storyletRowsError) {
          console.error("[daily-run] storylets query failed:", storyletRowsError);
        }
        console.log("[daily-run] Loaded", storyletRows?.length ?? 0, "track storylets for", trackIds.length, "tracks");

        const trackStoryletRows: TrackStoryletRow[] = (storyletRows ?? []).map((r) => ({
          id: r.id,
          slug: r.slug,
          track_id: r.track_id,
          storylet_key: r.storylet_key,
          order_index: r.order_index ?? 0,
          title: r.title,
          body: r.body,
          choices: Array.isArray(r.choices) ? r.choices : [],
          nodes: Array.isArray(r.nodes) ? r.nodes : null,
          default_next_key: r.default_next_key ?? null,
          due_offset_days: r.due_offset_days ?? 0,
          expires_after_days: r.expires_after_days ?? 0,
          is_active: Boolean(r.is_active),
          tags: Array.isArray(r.tags) ? r.tags : [],
          requirements: r.requirements ?? {},
          weight: r.weight ?? 1,
          introduces_npc: r.introduces_npc ?? undefined,
          segment: (r.segment as TrackStoryletRow["segment"]) ?? null,
          time_cost_hours: r.time_cost_hours ?? 1,
          is_conflict: Boolean(r.is_conflict),
        }));

        // 3. Load or create track progress for this user
        const { data: progressRows } = await supabase
          .from("track_progress")
          .select("id,user_id,track_id,state,current_storylet_key,storylet_due_day,defer_count,track_state,started_day,updated_day,completed_day,failure_reason,branch_key,resolved_storylet_keys,next_key_override")
          .eq("user_id", userId)
          .in("track_id", trackIds);

        let progress: TrackProgress[] = (progressRows ?? []).map((r) => ({
          id: r.id,
          user_id: r.user_id,
          track_id: r.track_id,
          state: r.state as TrackProgress["state"],
          current_storylet_key: r.current_storylet_key,
          storylet_due_day: r.storylet_due_day,
          defer_count: r.defer_count ?? 0,
          track_state: r.track_state ?? null,
          started_day: r.started_day,
          updated_day: r.updated_day,
          completed_day: r.completed_day ?? null,
          failure_reason: r.failure_reason ?? null,
          branch_key: r.branch_key ?? null,
          resolved_storylet_keys: Array.isArray(r.resolved_storylet_keys) ? r.resolved_storylet_keys : [],
          next_key_override: (r.next_key_override as string | null) ?? null,
        }));

        // 4. Ensure progress exists for every track that has storylets but no progress yet.
        const trackIdsWithProgress = new Set(progress.map((p) => p.track_id));
        const tracksNeedingProgress = tracks.filter(
          (t) =>
            !trackIdsWithProgress.has(t.id) &&
            trackStoryletRows.some((s) => s.track_id === t.id)
        );

        if (tracksNeedingProgress.length > 0) {
          const toInsert = buildInitialTrackProgress(userId, tracksNeedingProgress, trackStoryletRows, dayIndex);
          if (toInsert.length > 0) {
            const { data: inserted } = await supabase
              .from("track_progress")
              .insert(toInsert)
              .select("id,user_id,track_id,state,current_storylet_key,storylet_due_day,defer_count,track_state,started_day,updated_day,completed_day,failure_reason,branch_key,resolved_storylet_keys,next_key_override");
            progress = [
              ...progress,
              ...(inserted ?? []).map((r) => ({
                id: r.id,
                user_id: r.user_id,
                track_id: r.track_id,
                state: r.state as TrackProgress["state"],
                current_storylet_key: r.current_storylet_key,
                storylet_due_day: r.storylet_due_day,
                defer_count: r.defer_count ?? 0,
                track_state: r.track_state ?? null,
                started_day: r.started_day,
                updated_day: r.updated_day,
                completed_day: r.completed_day ?? null,
                failure_reason: r.failure_reason ?? null,
                branch_key: r.branch_key ?? null,
                resolved_storylet_keys: Array.isArray(r.resolved_storylet_keys) ? r.resolved_storylet_keys : [],
                next_key_override: (r.next_key_override as string | null) ?? null,
              })),
            ];
          }
        }

        // 5a. Load player's trained skills (Phase 2 — skill gating + modifiers)
        const { data: trainedSkillRows } = await supabase
          .from("player_skills")
          .select("skill_id")
          .eq("user_id", userId)
          .eq("status", "trained");
        const trainedSkillIds = new Set(
          (trainedSkillRows ?? []).map((r: { skill_id: string }) => r.skill_id)
        );

        // 5b. Load resolved choice option_keys per track (for requires_choice gating).
        // choice_log.option_key stores the choice "id" value from the storylet JSON.
        // Scoped per track — cross-track gating is a future extension.
        const resolvedChoicesByTrack = new Map<string, Set<string>>();
        if (progress.length > 0) {
          const { data: choiceLogs } = await supabase
            .from("choice_log")
            .select("track_id,option_key")
            .eq("user_id", userId)
            .in("track_id", trackIds)
            .eq("event_type", "STORYLET_RESOLVED")
            .not("option_key", "is", null);

          for (const log of choiceLogs ?? []) {
            if (!log.track_id || !log.option_key) continue;
            const set = resolvedChoicesByTrack.get(log.track_id) ?? new Set<string>();
            set.add(log.option_key as string);
            resolvedChoicesByTrack.set(log.track_id, set);
          }
        }

        // 6. Select due storylets and format for DailyRun
        const currentSeg = dayStateRaw?.current_segment ?? 'morning';
        const hoursLeft = dayStateRaw?.hours_remaining ?? 16;
        console.log("[daily-run] selectTrackStorylets input:", {
          dayIndex,
          progressCount: progress.length,
          progressKeys: progress.map(p => `${p.current_storylet_key}@day${p.storylet_due_day}(${p.state})`),
          storyletCount: trackStoryletRows.length,
          currentSegment: currentSeg,
          hoursRemaining: hoursLeft,
        });
        const dueStorylets = selectTrackStorylets({
          dayIndex,
          progress,
          storylets: trackStoryletRows,
          tracks,
          currentSegment: currentSeg,
          hoursRemaining: hoursLeft,
          resolvedChoicesByTrack,
          trainedSkillIds,
        });
        console.log("[daily-run] selectTrackStorylets returned", dueStorylets.length, "storylets:", dueStorylets.map(d => d.storylet.slug));

        // Phase 2: filter choices by requires_skill and annotate skill_modifier
        function processChoicesForSkills(
          choices: StoryletChoice[],
          playerTrainedSkills: Set<string>
        ): StoryletChoice[] {
          return choices
            .filter((choice) => {
              // Hide choices where requires_skill is not met (binary: trained or not)
              if (choice.requires_skill?.skill_id) {
                return playerTrainedSkills.has(choice.requires_skill.skill_id);
              }
              return true;
            })
            .map((choice) => {
              // Annotate skill_modifier: swap reaction_text when modifier is active
              if (
                choice.skill_modifier?.skill_id &&
                playerTrainedSkills.has(choice.skill_modifier.skill_id) &&
                choice.reaction_with_skill
              ) {
                return {
                  ...choice,
                  reaction_text: choice.reaction_with_skill,
                };
              }
              return choice;
            });
        }

        trackStorylets = dueStorylets.map((due) => ({
          progress_id: due.progress.id,
          track_key: due.track.key,
          storylet_key: due.storylet.storylet_key,
          title: due.storylet.title,
          body: due.storylet.body,
          options: processChoicesForSkills(due.storylet.choices, trainedSkillIds),
          nodes: due.storylet.nodes ?? null,
          expires_on_day: due.expires_on_day,
          introduces_npc: due.storylet.introduces_npc,
          segment: due.storylet.segment ?? null,
          is_conflict: Boolean(due.storylet.is_conflict),
        }));
      }
    } catch (err) {
      console.error("[daily-run] Failed to load track storylets", err);
    }
  }

  // ---------------------------------------------------------------------------
  // Routine-week mode detection (Phase 4)
  // ---------------------------------------------------------------------------
  let gameMode: "daily" | "routine_schedule" = "daily";
  let routineActivities: RoutineActivity[] | undefined;
  let routineWeekState: RoutineWeekState | undefined;
  let committedSchedule: PlayerScheduleSelection[] | undefined;
  let interruptionCard: { text: string; storylet_key: string } | null = null;

  if (chapterOneMode && dayIndex >= ROUTINE_MODE_START_DAY) {
    const routineWeekStart = computeWeekStart(dayIndex);

    // Load routine_week_state for this week
    const { data: rwsRow } = await supabase
      .from("routine_week_state")
      .select("*")
      .eq("user_id", userId)
      .eq("diegetic_week_start", routineWeekStart)
      .maybeSingle();

    if (rwsRow) {
      routineWeekState = rwsRow as RoutineWeekState;

      if (routineWeekState.status === "interrupted" && routineWeekState.interruption_storylet_key) {
        // Player is mid-interruption — show the interruption storylet in daily mode.
        // The interruption card text gives a one-sentence transition.
        gameMode = "daily";
        interruptionCard = {
          text: routineWeekState.interruption_reason === "calendar_beat"
            ? "Something comes up that needs your attention."
            : routineWeekState.interruption_reason === "gate_threshold"
            ? "A relationship has shifted. Someone wants to talk."
            : "Someone you haven't seen in a while tracks you down.",
          storylet_key: routineWeekState.interruption_storylet_key,
        };
      } else if (routineWeekState.status === "committed") {
        // Week is committed and ticking — stay in daily mode while tick runs
        // (the tick API advances day-by-day; the client calls /api/routine/tick lazily)
        gameMode = "daily";
      } else if (routineWeekState.status === "completed") {
        // Week completed — next week needs scheduling
        const nextWeekStart = routineWeekStart + 7;
        const { data: nextRws } = await supabase
          .from("routine_week_state")
          .select("status")
          .eq("user_id", userId)
          .eq("diegetic_week_start", nextWeekStart)
          .maybeSingle();

        if (!nextRws) {
          // No state for next week — player needs to schedule
          gameMode = "routine_schedule";
        }
      }
    } else {
      // No routine_week_state for this week — player needs to schedule
      gameMode = "routine_schedule";
    }

    // When in scheduling mode, load available activities
    if (gameMode === "routine_schedule") {
      const { data: activityRows } = await supabase
        .from("routine_activities")
        .select("*")
        .eq("is_active", true)
        .order("half_day_cost", { ascending: true });

      routineActivities = (activityRows ?? []) as RoutineActivity[];
    }

    // Load committed schedule if exists
    if (routineWeekState && (routineWeekState.status === "committed" || routineWeekState.status === "interrupted")) {
      const { data: schedRows } = await supabase
        .from("player_routine_schedules")
        .select("activity_key")
        .eq("user_id", userId)
        .eq("diegetic_week_start", routineWeekState.diegetic_week_start);

      committedSchedule = (schedRows ?? []).map((r) => ({
        activity_key: (r as { activity_key: string }).activity_key,
      }));
    }
  }

  // In chapterOneMode: if track storylets are available the stage must not be "complete"
  // so the client renders them instead of the "Daily complete" screen.
  // When no storylets match the current segment but the day still has hours left,
  // keep stage as "storylet_1" so the client shows the SegmentTransitionCard
  // instead of auto-completing the day.
  const dayDone = (dayStateRaw?.current_segment ?? 'morning') === 'night' || (dayStateRaw?.hours_remaining ?? 16) <= 0;
  const resolvedStage: typeof stage =
    // In routine_schedule mode, force storylet_1 so the client renders the calendar
    gameMode === "routine_schedule"
      ? "storylet_1"
      : chapterOneMode && trackStorylets.length > 0 && !alreadyCompletedToday
      ? "storylet_1"
      : chapterOneMode && trackStorylets.length === 0 && !alreadyCompletedToday
      ? (dayDone ? "complete" : "storylet_1")
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
        current_segment: dayState.current_segment ?? 'morning',
        hours_remaining: dayState.hours_remaining ?? 16,
        hours_committed: dayState.hours_committed ?? 0,
      }
      : null,
    chapterOneState: chapterOneState ?? undefined,
    trackStorylets: trackStorylets.length > 0 ? trackStorylets : undefined,
    // Phase 4: Routine-Week Mode
    gameMode,
    routineActivities,
    routineWeekState,
    committedSchedule,
    interruptionCard,
    seasonResetNeeded,
    newSeasonIndex: seasonResetNeeded ? currentSeasonIndex : undefined,
    seasonRecap: seasonResetNeeded ? seasonRecap : undefined,
    seasonContext,
  };
}
