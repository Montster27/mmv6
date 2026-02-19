import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Storylet } from "@/types/storylets";
import type { DailyState } from "@/types/daily";

vi.mock("@/lib/cadence", () => ({
  ensureCadenceUpToDate: vi.fn(),
}));
vi.mock("@/lib/play", () => ({
  fetchDailyState: vi.fn(),
  fetchTimeAllocation: vi.fn(),
  fetchTodayRuns: vi.fn(),
  fetchTodayStoryletCandidates: vi.fn(),
  fetchRecentStoryletRuns: vi.fn(),
}));
vi.mock("@/lib/social", () => ({
  hasSentBoostToday: vi.fn(),
}));
vi.mock("@/lib/reflections", () => ({
  getReflection: vi.fn(),
  isReflectionDone: vi.fn(),
}));
vi.mock("@/lib/microtasks", () => ({
  fetchMicroTaskRun: vi.fn(),
}));
vi.mock("@/core/arcs/arcEngine", () => ({
  getOrStartArc: vi.fn(),
  getArcNextStepStorylet: vi.fn(),
}));
vi.mock("@/core/season/getSeasonContext", () => ({
  getSeasonContext: vi.fn(),
}));
vi.mock("@/core/season/seasonReset", () => ({
  performSeasonReset: vi.fn(),
}));
vi.mock("@/core/funPulse/shouldShowFunPulse", () => ({
  shouldShowFunPulse: vi.fn(),
}));
vi.mock("@/lib/funPulse", () => ({
  getFunPulse: vi.fn(),
}));
vi.mock("@/core/storylets/selectStorylets", () => ({
  selectStorylets: vi.fn(),
}));
vi.mock("@/core/validation/storyletValidation", () => ({
  fallbackStorylet: vi.fn(() => ({
    id: "fallback",
    slug: "fallback",
    title: "Fallback",
    body: "",
    choices: [],
    is_active: true,
  })),
}));

vi.mock("@/lib/featureFlags", () => ({
  getFeatureFlags: vi.fn(() => ({
    arcFirstEnabled: false,
    skills: true,
    funPulse: true,
    alignment: true,
    arcs: true,
    resources: true,
    remnantSystemEnabled: true,
    verticalSlice30Enabled: false,
    rookieCircleEnabled: false,
    askOfferBoardEnabled: false,
    buddySystemEnabled: false,
    afterActionCompareEnabled: false,
    contentStudioLiteEnabled: false,
    contentStudioGraphEnabled: false,
    contentStudioPreviewEnabled: false,
    contentStudioHistoryEnabled: false,
    contentStudioPublishEnabled: false,
    contentStudioRemnantRulesEnabled: false,
  })),
}));
vi.mock("@/lib/dailyInteractions", () => ({
  ensureSkillBankUpToDate: vi.fn(),
  ensureTensionsUpToDate: vi.fn(),
  fetchSkillAllocations: vi.fn(),
  fetchSkillLevels: vi.fn(),
  fetchTensions: vi.fn(),
  fetchSkillBank: vi.fn(),
  fetchPosture: vi.fn(),
}));
vi.mock("@/lib/dayState", () => ({
  ensureDayStateUpToDate: vi.fn(),
}));
vi.mock("@/lib/cohorts", () => ({
  ensureUserInCohort: vi.fn(),
}));
vi.mock("@/lib/content/arcs", () => ({
  fetchArcByKey: vi.fn(),
  listActiveArcs: vi.fn(),
}));
vi.mock("@/lib/content/initiatives", () => ({
  listActiveInitiativesCatalog: vi.fn(),
}));
vi.mock("@/lib/arcs", () => ({
  fetchArcCurrentStepContent: vi.fn(),
  fetchArcInstance: vi.fn(),
  fetchArcInstancesByKeys: vi.fn(),
}));
vi.mock("@/lib/factions", () => ({
  listFactions: vi.fn(),
}));
vi.mock("@/lib/alignment", () => ({
  ensureUserAlignmentRows: vi.fn(),
  fetchUserAlignment: vi.fn(),
  fetchRecentAlignmentEvents: vi.fn(),
  hasAlignmentEvent: vi.fn(),
  applyAlignmentDelta: vi.fn(),
}));
vi.mock("@/lib/directives", () => ({
  getOrCreateWeeklyDirective: vi.fn(),
  fetchStaleDirectiveForCohort: vi.fn(),
  updateDirectiveStatus: vi.fn(),
}));
vi.mock("@/lib/initiatives", () => ({
  fetchInitiativeProgress: vi.fn(),
  fetchOpenInitiativesForCohort: vi.fn(),
  fetchUserContributionStatus: vi.fn(),
  getOrCreateWeeklyInitiative: vi.fn(),
  fetchInitiativeForWeek: vi.fn(),
  closeInitiative: vi.fn(),
}));
vi.mock("@/lib/worldState", () => ({
  computeWeekWindow: vi.fn(),
  getOrComputeCohortWeeklyInfluence: vi.fn(),
  getOrComputeWorldWeeklyInfluence: vi.fn(),
  getOrComputeWeeklySnapshot: vi.fn(),
}));

import { ensureCadenceUpToDate } from "@/lib/cadence";
import {
  fetchDailyState,
  fetchTimeAllocation,
  fetchTodayRuns,
  fetchTodayStoryletCandidates,
  fetchRecentStoryletRuns,
} from "@/lib/play";
import { hasSentBoostToday } from "@/lib/social";
import { getReflection, isReflectionDone } from "@/lib/reflections";
import { fetchMicroTaskRun } from "@/lib/microtasks";
import { getArcNextStepStorylet, getOrStartArc } from "@/core/arcs/arcEngine";
import { getSeasonContext } from "@/core/season/getSeasonContext";
import { performSeasonReset } from "@/core/season/seasonReset";
import { selectStorylets } from "@/core/storylets/selectStorylets";
import { shouldShowFunPulse } from "@/core/funPulse/shouldShowFunPulse";
import { getFunPulse } from "@/lib/funPulse";
import {
  ensureSkillBankUpToDate,
  ensureTensionsUpToDate,
  fetchPosture,
  fetchSkillAllocations,
  fetchSkillLevels,
  fetchSkillBank,
  fetchTensions,
} from "@/lib/dailyInteractions";
import { ensureDayStateUpToDate } from "@/lib/dayState";
import { ensureUserInCohort } from "@/lib/cohorts";
import { fetchArcByKey } from "@/lib/content/arcs";
import { listActiveArcs } from "@/lib/content/arcs";
import { listActiveInitiativesCatalog } from "@/lib/content/initiatives";
import {
  fetchArcCurrentStepContent,
  fetchArcInstance,
  fetchArcInstancesByKeys,
} from "@/lib/arcs";
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
import {
  fetchInitiativeProgress,
  fetchOpenInitiativesForCohort,
  fetchUserContributionStatus,
  getOrCreateWeeklyInitiative,
  fetchInitiativeForWeek,
  closeInitiative,
} from "@/lib/initiatives";
import {
  computeWeekWindow,
  getOrComputeCohortWeeklyInfluence,
  getOrComputeWorldWeeklyInfluence,
  getOrComputeWeeklySnapshot,
} from "@/lib/worldState";
import { getOrCreateDailyRun } from "@/core/engine/dailyLoop";

const storyletA: Storylet = {
  id: "a",
  slug: "a",
  title: "A",
  body: "",
  choices: [],
  is_active: true,
};

const storyletB: Storylet = { ...storyletA, id: "b", slug: "b", title: "B" };

const dailyState: DailyState = {
  id: "d",
  user_id: "u",
  day_index: 2,
  energy: 50,
  stress: 40,
  vectors: {},
};

const dayState = {
  user_id: "u",
  day_index: 2,
  energy: 70,
  stress: 20,
  cashOnHand: 0,
  knowledge: 0,
  socialLeverage: 0,
  physicalResilience: 50,
  total_study: 0,
  total_work: 0,
  total_social: 0,
  total_health: 0,
  total_fun: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

beforeEach(() => {
  vi.mocked(getSeasonContext).mockResolvedValue({
    currentSeason: {
      season_index: 1,
      starts_at: "2024-01-01",
      ends_at: "2024-01-28",
    },
    daysRemaining: 10,
    userSeason: {
      id: "s1",
      user_id: "u",
      current_season_index: 1,
      last_seen_season_index: 1,
      last_reset_at: null,
      last_recap: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  });
  vi.mocked(performSeasonReset).mockResolvedValue({
    lastSeasonIndex: 1,
    anomaliesFoundCount: 0,
    hypothesesCount: 0,
    topVector: null,
  });
  vi.mocked(ensureCadenceUpToDate).mockResolvedValue({
    dayIndex: 2,
    alreadyCompletedToday: false,
  });
  vi.mocked(fetchDailyState).mockResolvedValue(dailyState);
  vi.mocked(ensureDayStateUpToDate).mockResolvedValue(dayState);
  vi.mocked(fetchTimeAllocation).mockResolvedValue({
    study: 20,
    work: 20,
    social: 20,
    health: 20,
    fun: 20,
  });
  vi.mocked(fetchTodayRuns).mockResolvedValue([]);
  vi.mocked(fetchTodayStoryletCandidates).mockResolvedValue([storyletA, storyletB]);
  vi.mocked(fetchRecentStoryletRuns).mockResolvedValue([]);
  vi.mocked(hasSentBoostToday).mockResolvedValue(false);
  vi.mocked(getReflection).mockResolvedValue(null);
  vi.mocked(isReflectionDone).mockReturnValue(false);
  vi.mocked(fetchMicroTaskRun).mockResolvedValue(null);
  vi.mocked(getOrStartArc).mockResolvedValue(null);
  vi.mocked(getArcNextStepStorylet).mockReturnValue(null);
  vi.mocked(selectStorylets).mockReturnValue([storyletA, storyletB]);
  vi.mocked(shouldShowFunPulse).mockReturnValue(false);
  vi.mocked(getFunPulse).mockResolvedValue(null);
  vi.mocked(ensureSkillBankUpToDate).mockResolvedValue();
  vi.mocked(ensureTensionsUpToDate).mockResolvedValue();
  vi.mocked(fetchTensions).mockResolvedValue([]);
  vi.mocked(fetchSkillBank).mockResolvedValue({
    user_id: "u",
    available_points: 0,
    cap: 0,
    last_awarded_day_index: null,
  });
  vi.mocked(fetchPosture).mockResolvedValue({
    user_id: "u",
    day_index: 2,
    posture: "steady",
    created_at: new Date().toISOString(),
  });
  vi.mocked(fetchSkillAllocations).mockResolvedValue([]);
  vi.mocked(fetchSkillLevels).mockResolvedValue({
    focus: 0,
    memory: 0,
    networking: 0,
    grit: 0,
  });
  vi.mocked(ensureUserInCohort).mockResolvedValue({ cohortId: "c1" });
  vi.mocked(fetchArcByKey).mockResolvedValue(null);
  vi.mocked(listActiveArcs).mockResolvedValue([]);
  vi.mocked(fetchArcInstance).mockResolvedValue(null);
  vi.mocked(fetchArcCurrentStepContent).mockResolvedValue(null);
  vi.mocked(fetchArcInstancesByKeys).mockResolvedValue([]);
  vi.mocked(ensureUserAlignmentRows).mockResolvedValue();
  vi.mocked(listFactions).mockResolvedValue([
    {
      key: "neo_assyrian",
      name: "Neo-Assyrian Ledger",
      ideology: "Order through leverage.",
      aesthetic: "Steel",
      created_at: new Date().toISOString(),
    },
    {
      key: "dynastic_consortium",
      name: "Dynastic Consortium",
      ideology: "Knowledge as inheritance.",
      aesthetic: "Marble",
      created_at: new Date().toISOString(),
    },
    {
      key: "templar_remnant",
      name: "Templar Remnant",
      ideology: "Duty before doubt.",
      aesthetic: "Cloth",
      created_at: new Date().toISOString(),
    },
    {
      key: "bormann_network",
      name: "Bormann Network",
      ideology: "Secrecy survives.",
      aesthetic: "Smoke",
      created_at: new Date().toISOString(),
    },
  ]);
  vi.mocked(fetchUserAlignment).mockResolvedValue([
    {
      user_id: "u",
      faction_key: "neo_assyrian",
      score: 1,
      updated_at: new Date().toISOString(),
    },
  ]);
  vi.mocked(fetchRecentAlignmentEvents).mockResolvedValue([]);
  vi.mocked(listActiveInitiativesCatalog).mockResolvedValue([]);
  vi.mocked(fetchStaleDirectiveForCohort).mockResolvedValue(null);
  vi.mocked(updateDirectiveStatus).mockResolvedValue();
  vi.mocked(fetchInitiativeForWeek).mockResolvedValue(null);
  vi.mocked(closeInitiative).mockResolvedValue();
  vi.mocked(hasAlignmentEvent).mockResolvedValue(false);
  vi.mocked(applyAlignmentDelta).mockResolvedValue();
  vi.mocked(computeWeekWindow).mockReturnValue({ weekStart: 1, weekEnd: 7 });
  vi.mocked(getOrComputeWorldWeeklyInfluence).mockResolvedValue({});
  vi.mocked(getOrComputeCohortWeeklyInfluence).mockResolvedValue({});
  vi.mocked(getOrComputeWeeklySnapshot).mockResolvedValue({ topCohorts: [] });
  vi.mocked(getOrCreateWeeklyDirective).mockResolvedValue({
    id: "d1",
    cohort_id: "c1",
    faction_key: "neo_assyrian",
    week_start_day_index: 1,
    week_end_day_index: 7,
    title: "Secure the signal chain",
    description: "Document the inconsistency.",
    target_type: "initiative",
    target_key: "campus_signal_watch",
    status: "active",
    created_at: new Date().toISOString(),
  });
  vi.mocked(getOrCreateWeeklyInitiative).mockResolvedValue(null);
  vi.mocked(fetchOpenInitiativesForCohort).mockResolvedValue([]);
  vi.mocked(fetchUserContributionStatus).mockResolvedValue(false);
  vi.mocked(fetchInitiativeProgress).mockResolvedValue(0);
});

describe("daily loop validation", () => {
  it("moves from setup to allocation once blockers clear", async () => {
    vi.mocked(fetchPosture).mockResolvedValue(null);
    vi.mocked(fetchSkillBank).mockResolvedValue({
      user_id: "u",
      available_points: 0,
      cap: 2,
      last_awarded_day_index: 2,
    });

    const setupRun = await getOrCreateDailyRun("u", new Date());
    expect(setupRun.stage).toBe("setup");

    vi.mocked(fetchPosture).mockResolvedValue({
      user_id: "u",
      day_index: 2,
      posture: "steady",
      created_at: new Date().toISOString(),
    });
    vi.mocked(fetchTimeAllocation).mockResolvedValue(null);

    const allocationRun = await getOrCreateDailyRun("u", new Date());
    expect(allocationRun.stage).toBe("allocation");
  });

  it("progresses through storylet flow when setup blockers absent", async () => {
    vi.mocked(fetchTimeAllocation).mockResolvedValue({
      study: 20,
      work: 20,
      social: 20,
      health: 20,
      fun: 20,
    });

    const run = await getOrCreateDailyRun("u", new Date());
    expect(run.stage).toBe("storylet_1");
  });

  it("includes microtask only when eligible", async () => {
    vi.mocked(fetchTodayRuns).mockResolvedValue([
      { id: "r1", user_id: "u", day_index: 2, storylet_id: "a", choice_id: "c1" },
      { id: "r2", user_id: "u", day_index: 2, storylet_id: "b", choice_id: "c2" },
    ]);
    vi.mocked(fetchMicroTaskRun).mockResolvedValue(null);

    const run = await getOrCreateDailyRun("u", new Date());
    expect(run.stage).toBe("microtask");
  });

  it("attaches cohort, arc, and initiatives", async () => {
    vi.mocked(fetchArcByKey).mockResolvedValue({
      key: "anomaly_001",
      title: "Anomaly 001",
      description: "Test arc",
      tags: [],
      is_active: true,
      created_at: new Date().toISOString(),
    });
    vi.mocked(fetchArcInstance).mockResolvedValue({
      id: "inst-1",
      user_id: "u",
      arc_key: "anomaly_001",
      status: "active",
      started_day_index: 2,
      current_step: 1,
      updated_at: new Date().toISOString(),
      meta: null,
    });
    vi.mocked(fetchArcCurrentStepContent).mockResolvedValue({
      arc_key: "anomaly_001",
      step_index: 1,
      title: "Step 1",
      body: "Body",
      choices: [],
      created_at: new Date().toISOString(),
    });
    vi.mocked(fetchOpenInitiativesForCohort).mockResolvedValue([
      {
        id: "init-1",
        cohort_id: "c1",
        key: "week_0",
        title: "Quiet Logistics",
        description: "Test initiative",
        created_at: new Date().toISOString(),
        starts_day_index: 1,
        ends_day_index: 7,
        status: "open",
        goal: 100,
        meta: null,
      },
    ]);
    vi.mocked(fetchUserContributionStatus).mockResolvedValue(true);
    vi.mocked(fetchInitiativeProgress).mockResolvedValue(5);

    const run = await getOrCreateDailyRun("u", new Date());
    expect(run.cohortId).toBe("c1");
    expect(run.arc?.arc_key).toBe("anomaly_001");
    expect(run.initiatives?.length).toBe(1);
    expect(run.initiatives?.[0]?.contributedToday).toBe(true);
    expect(run.factions?.length).toBeGreaterThan(0);
    expect(run.alignment?.neo_assyrian).toBe(1);
    expect(run.directive?.faction_key).toBe("neo_assyrian");
    expect(run.unlocks?.arcKeys).toEqual([]);
    expect(run.recentAlignmentEvents?.length).toBe(0);
    expect(run.worldState?.weekStart).toBe(1);
    expect(run.cohortState?.weekStart).toBe(1);
    expect(run.rivalry?.topCohorts).toEqual([]);
  });

  it("attaches available arcs from unlocks", async () => {
    vi.mocked(listActiveArcs).mockResolvedValue([
      {
        key: "anomaly_002",
        title: "Anomaly 002",
        description: "Test arc",
        tags: [],
        is_active: true,
        created_at: new Date().toISOString(),
      },
    ]);
    vi.mocked(fetchUserAlignment).mockResolvedValue([
      {
        user_id: "u",
        faction_key: "neo_assyrian",
        score: 6,
        updated_at: new Date().toISOString(),
      },
    ]);
    vi.mocked(fetchArcInstancesByKeys).mockResolvedValue([]);

    const run = await getOrCreateDailyRun("u", new Date());
    expect(run.availableArcs?.[0]?.key).toBe("anomaly_002");
  });

  it("applies directive payoff once after completion", async () => {
    vi.mocked(ensureCadenceUpToDate).mockResolvedValue({
      dayIndex: 8,
      alreadyCompletedToday: false,
    });
    vi.mocked(fetchStaleDirectiveForCohort).mockResolvedValue({
      id: "d1",
      cohort_id: "c1",
      faction_key: "neo_assyrian",
      week_start_day_index: 1,
      week_end_day_index: 7,
      title: "Test",
      description: "Test",
      target_type: "initiative",
      target_key: "campus_signal_watch",
      status: "active",
      created_at: new Date().toISOString(),
    });
    vi.mocked(fetchInitiativeForWeek).mockResolvedValue({
      id: "init-1",
      cohort_id: "c1",
      key: "week_0",
      title: "Initiative",
      description: "Desc",
      created_at: new Date().toISOString(),
      starts_day_index: 1,
      ends_day_index: 7,
      status: "open",
      goal: 3,
      meta: null,
    });
    vi.mocked(fetchInitiativeProgress).mockResolvedValue(5);
    vi.mocked(hasAlignmentEvent).mockResolvedValue(false);

    await getOrCreateDailyRun("u", new Date());

    expect(updateDirectiveStatus).toHaveBeenCalledWith("d1", "completed");
    expect(applyAlignmentDelta).toHaveBeenCalled();
  });
});
