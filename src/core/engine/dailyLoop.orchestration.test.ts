import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Storylet, StoryletRun } from "@/types/storylets";
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
import { selectStorylets } from "@/core/storylets/selectStorylets";
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

function mockRuns(count: number): StoryletRun[] {
  const runs: StoryletRun[] = [];
  if (count >= 1) {
    runs.push({
      id: "r1",
      user_id: "u",
      day_index: 2,
      storylet_id: "a",
      choice_id: "c1",
    });
  }
  if (count >= 2) {
    runs.push({
      id: "r2",
      user_id: "u",
      day_index: 2,
      storylet_id: "b",
      choice_id: "c2",
    });
  }
  return runs;
}

beforeEach(() => {
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
});

describe("getOrCreateDailyRun", () => {
  it("returns allocation stage when no allocation saved", async () => {
    vi.mocked(fetchTimeAllocation).mockResolvedValue(null);
    const run = await getOrCreateDailyRun("u", new Date());
    expect(run.stage).toBe("allocation");
  });

  it("returns storylet_1 when allocation exists and no runs", async () => {
    vi.mocked(fetchTodayRuns).mockResolvedValue([]);
    const run = await getOrCreateDailyRun("u", new Date());
    expect(run.stage).toBe("storylet_1");
  });

  it("returns storylet_2 when one run exists", async () => {
    vi.mocked(fetchTodayRuns).mockResolvedValue(mockRuns(1));
    const run = await getOrCreateDailyRun("u", new Date());
    expect(run.stage).toBe("storylet_2");
  });

  it("returns microtask when eligible and not done", async () => {
    vi.mocked(fetchTodayRuns).mockResolvedValue(mockRuns(2));
    vi.mocked(fetchMicroTaskRun).mockResolvedValue(null);
    const run = await getOrCreateDailyRun("u", new Date());
    expect(run.stage).toBe("microtask");
  });

  it("returns social when microtask done and boost available", async () => {
    vi.mocked(fetchTodayRuns).mockResolvedValue(mockRuns(2));
    vi.mocked(fetchMicroTaskRun).mockResolvedValue({
      id: "m",
      user_id: "u",
      day_index: 2,
      task_id: "pattern_match_v1",
      status: "completed",
      score: 2,
      duration_ms: 1000,
      created_at: new Date().toISOString(),
    });
    vi.mocked(hasSentBoostToday).mockResolvedValue(false);
    const run = await getOrCreateDailyRun("u", new Date());
    expect(run.stage).toBe("social");
  });

  it("returns reflection when boost already sent", async () => {
    vi.mocked(fetchTodayRuns).mockResolvedValue(mockRuns(2));
    vi.mocked(fetchMicroTaskRun).mockResolvedValue({
      id: "m",
      user_id: "u",
      day_index: 2,
      task_id: "pattern_match_v1",
      status: "completed",
      score: 2,
      duration_ms: 1000,
      created_at: new Date().toISOString(),
    });
    vi.mocked(hasSentBoostToday).mockResolvedValue(true);
    const run = await getOrCreateDailyRun("u", new Date());
    expect(run.stage).toBe("reflection");
  });

  it("returns complete when reflection done", async () => {
    vi.mocked(fetchTodayRuns).mockResolvedValue(mockRuns(2));
    vi.mocked(fetchMicroTaskRun).mockResolvedValue({
      id: "m",
      user_id: "u",
      day_index: 2,
      task_id: "pattern_match_v1",
      status: "completed",
      score: 2,
      duration_ms: 1000,
      created_at: new Date().toISOString(),
    });
    vi.mocked(isReflectionDone).mockReturnValue(true);
    const run = await getOrCreateDailyRun("u", new Date());
    expect(run.stage).toBe("complete");
  });
});
