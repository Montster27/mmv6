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
vi.mock("@/lib/dailyInteractions", () => ({
  ensureSkillBankUpToDate: vi.fn(),
  ensureTensionsUpToDate: vi.fn(),
  fetchSkillAllocations: vi.fn(),
  fetchTensions: vi.fn(),
  fetchSkillBank: vi.fn(),
  fetchPosture: vi.fn(),
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
  fetchSkillBank,
  fetchTensions,
} from "@/lib/dailyInteractions";
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
});

describe("daily loop validation", () => {
  it("moves from setup to allocation once blockers clear", async () => {
    vi.mocked(fetchTensions).mockResolvedValue([
      {
        user_id: "u",
        day_index: 2,
        key: "unfinished_assignment",
        severity: 1,
        expires_day_index: 4,
        resolved_at: null,
        meta: null,
      },
    ]);
    vi.mocked(fetchSkillBank).mockResolvedValue({
      user_id: "u",
      available_points: 0,
      cap: 2,
      last_awarded_day_index: 2,
    });

    const setupRun = await getOrCreateDailyRun("u", new Date());
    expect(setupRun.stage).toBe("setup");

    vi.mocked(fetchTensions).mockResolvedValue([
      {
        user_id: "u",
        day_index: 2,
        key: "unfinished_assignment",
        severity: 1,
        expires_day_index: 4,
        resolved_at: new Date().toISOString(),
        meta: null,
      },
    ]);
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
});
